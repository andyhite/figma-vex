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
