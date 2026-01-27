import { toCssName, toPrefixedName } from '@plugin/formatters/nameFormatter';

/**
 * Lookup map entry containing variable and its collection
 */
export interface VariableLookupEntry {
  variable: Variable;
  collection: VariableCollection;
}

/**
 * Builds a lookup map from CSS variable names to Figma variables.
 * Keys are in the format "--[prefix-]variable-name" matching the CSS export format.
 *
 * @param variables - All Figma variables
 * @param collections - All variable collections
 * @param prefix - Optional CSS variable prefix
 * @returns Map from CSS variable name to variable entry
 */
export function buildVariableLookup(
  variables: Variable[],
  collections: VariableCollection[],
  prefix: string
): Map<string, VariableLookupEntry> {
  const lookup = new Map<string, VariableLookupEntry>();
  const collectionMap = new Map(collections.map((c) => [c.id, c]));

  for (const variable of variables) {
    const collection = collectionMap.get(variable.variableCollectionId);
    if (!collection) continue;

    // Match the CSS export format: just the variable name, no collection prefix
    const variableName = toCssName(variable.name);
    const cssName = `--${toPrefixedName(variableName, prefix)}`;

    lookup.set(cssName, { variable, collection });
  }

  return lookup;
}

/**
 * Looks up a variable by its CSS var() reference.
 *
 * @param varRef - The var() reference, e.g., "var(--spacing-base)"
 * @param lookup - The lookup map from buildVariableLookup
 * @returns The variable entry or undefined if not found
 */
export function lookupVariable(
  varRef: string,
  lookup: Map<string, VariableLookupEntry>
): VariableLookupEntry | undefined {
  // Extract the variable name from var(--name) syntax
  const match = varRef.match(/var\((--[^)]+)\)/);
  if (!match) return undefined;

  return lookup.get(match[1]);
}

/**
 * Extracts all var() references from an expression.
 *
 * @param expression - The expression string
 * @returns Array of var() references found (may contain duplicates)
 */
export function extractVarReferences(expression: string): string[] {
  const regex = /var\(--[^)]+\)/g;
  return expression.match(regex) ?? [];
}

/**
 * Extracts all path references from an expression.
 * Path references are single-quoted strings like 'Spacing/base', 'base', or 'Collection/Path/Name'.
 * Handles escaped quotes: 'Brand\'s Color/primary'
 *
 * @param expression - The expression string
 * @returns Array of path references found (may contain duplicates)
 */
export function extractPathReferences(expression: string): string[] {
  // Match single-quoted strings, handling escaped quotes
  const regex = /'((?:[^'\\]|\\.)+)'/g;
  const matches: string[] = [];
  let match;
  while ((match = regex.exec(expression)) !== null) {
    // Unescape the path
    const path = match[1].replace(/\\(.)/g, '$1');
    matches.push(path);
  }
  return matches;
}

/**
 * Looks up a variable by its Figma path (collection name + variable name).
 * Supports both full paths (Collection/Group/Variable) and short paths (Variable).
 * Throws an error if the path is ambiguous (found in multiple collections).
 *
 * @param path - The Figma path, e.g., "Spacing/base" or "Primitives/Spacing/base"
 * @param variables - All available variables
 * @param collections - All available collections
 * @returns The variable entry or null if not found
 * @throws Error if path is ambiguous (found in multiple collections)
 */
export function lookupByPath(
  path: string,
  variables: Variable[],
  collections: VariableCollection[]
): VariableLookupEntry | null {
  const collectionMap = new Map(collections.map((c) => [c.id, c]));

  const matches = variables
    .map((variable) => {
      const collection = collectionMap.get(variable.variableCollectionId);
      if (!collection) return null;

      // Build full path: CollectionName/VariableName
      const fullPath = `${collection.name}/${variable.name}`;
      const shortPath = variable.name;

      // Check if path matches full path or short path
      if (fullPath === path || shortPath === path) {
        return { variable, collection };
      }

      return null;
    })
    .filter((entry): entry is VariableLookupEntry => entry !== null);

  if (matches.length === 0) return null;
  if (matches.length === 1) return matches[0];

  // Ambiguous - multiple matches found
  const collectionNames = matches.map((m) => m.collection.name).join(', ');
  throw new Error(
    `Ambiguous reference '${path}' found in collections: ${collectionNames}. Use 'CollectionName/${path}' to disambiguate.`
  );
}
