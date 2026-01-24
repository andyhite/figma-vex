import type { ExportOptions, TokenConfig } from '@shared/types';
import { DEFAULT_CONFIG } from '@shared/types';
import { toCssName } from '@plugin/formatters/nameFormatter';
import { parseDescription } from '@plugin/utils/descriptionParser';
import { resolveValue } from '@plugin/services/valueResolver';

/**
 * Generates the SCSS file header comment.
 */
export function generateScssHeader(fileName: string): string {
  return [
    '//',
    '// Auto-generated SCSS Variables',
    `// Exported from Figma: ${fileName}`,
    `// Generated: ${new Date().toISOString()}`,
    '//',
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
 * Exports variables to SCSS format.
 */
export async function exportToScss(
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  options: ExportOptions
): Promise<string> {
  if (variables.length === 0) {
    return '// No variables found in this file';
  }

  const filteredCollections = filterCollections(collections, options.selectedCollections);

  const lines: string[] = [generateScssHeader(fileName)];

  const processVariable = async (variable: Variable, modeId: string): Promise<string> => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      ...parseDescription(variable.description),
    };

    const value = variable.valuesByMode[modeId];
    if (value === undefined) return '';

    const scssName = toCssName(variable.name);
    const prefixedName = options.prefix ? `$${options.prefix}-${scssName}` : `$${scssName}`;
    const scssValue = await resolveValue(
      value,
      modeId,
      variables,
      variable.resolvedType,
      config,
      options.prefix
    );

    // Convert var() references to SCSS variable references
    const scssValueFormatted = scssValue.replace(/var\(--([^)]+)\)/g, (_, varName) => {
      return `$${varName}`;
    });

    return `${prefixedName}: ${scssValueFormatted};`;
  };

  for (const collection of filteredCollections) {
    if (options.includeCollectionComments) {
      lines.push(`// Collection: ${collection.name}`);
    }

    const collectionVars = getCollectionVariables(variables, collection.id);

    for (const variable of collectionVars) {
      const line = await processVariable(variable, collection.defaultModeId);
      if (line) lines.push(line);
    }

    if (filteredCollections.indexOf(collection) < filteredCollections.length - 1) {
      lines.push('');
    }
  }

  return lines.join('\n');
}
