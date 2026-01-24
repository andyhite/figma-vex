import type { ExportOptions } from '@shared/types';
import { toCssName, toPrefixedName } from '@plugin/formatters/nameFormatter';

/**
 * Generates the TypeScript file header comment.
 */
export function generateTypeScriptHeader(fileName: string): string {
  return [
    '/**',
    ' * Auto-generated TypeScript types for CSS Custom Properties',
    ` * Exported from Figma: ${fileName}`,
    ` * Generated: ${new Date().toISOString()}`,
    ' */',
    '',
  ].join('\n');
}

/**
 * Filters collections based on selected collection IDs.
 */
function filterCollections(
  collections: VariableCollection[],
  selectedCollectionIds?: string[]
): VariableCollection[] {
  if (selectedCollectionIds && selectedCollectionIds.length > 0) {
    return collections.filter((c) => selectedCollectionIds.includes(c.id));
  }
  return collections;
}

/**
 * Gets variables for a collection, sorted alphabetically.
 */
function getCollectionVariables(variables: Variable[], collectionId: string): Variable[] {
  return variables
    .filter((v) => v.variableCollectionId === collectionId)
    .sort((a, b) => toCssName(a.name).localeCompare(toCssName(b.name)));
}

/**
 * Exports variables to TypeScript type definitions.
 */
export async function exportToTypeScript(
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  options: ExportOptions
): Promise<string> {
  if (variables.length === 0) {
    return '// No variables found in this file';
  }

  const filteredCollections = filterCollections(collections, options.selectedCollections);

  const lines: string[] = [generateTypeScriptHeader(fileName), 'export type CSSVariableName ='];

  const variableNames: string[] = [];

  for (const collection of filteredCollections) {
    const collectionVars = getCollectionVariables(variables, collection.id);

    for (const variable of collectionVars) {
      const cssName = toCssName(variable.name);
      const prefixedName = toPrefixedName(cssName, options.prefix);
      variableNames.push(`  | "--${prefixedName}"`);
    }
  }

  if (variableNames.length === 0) {
    return '// No variables found in this file';
  }

  lines.push(...variableNames);
  lines.push(';');
  lines.push('');
  lines.push("declare module 'csstype' {");
  lines.push('  interface Properties {');
  lines.push('    [key: CSSVariableName]: string | number;');
  lines.push('  }');
  lines.push('}');

  return lines.join('\n');
}
