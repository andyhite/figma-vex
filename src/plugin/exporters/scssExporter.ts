import type { ExportOptions, TokenConfig } from '@shared/types';
import { DEFAULT_CONFIG } from '@shared/types';
import { toCssName } from '@plugin/formatters/nameFormatter';
import { parseDescription } from '@plugin/utils/descriptionParser';
import { resolveValue } from '@plugin/services/valueResolver';
import { filterCollections, getCollectionVariables } from '@plugin/utils/collectionUtils';

/**
 * Converts CSS var() references to SCSS variable references.
 * Handles edge cases like fallback values with nested parentheses:
 * - var(--foo) -> $foo
 * - var(--foo, red) -> $foo
 * - var(--foo, rgb(0,0,0)) -> $foo
 */
function convertVarToScss(value: string): string {
  let result = '';
  let i = 0;

  while (i < value.length) {
    // Check for var( pattern
    if (value.slice(i, i + 6) === 'var(--') {
      // Extract variable name (letters, numbers, hyphens, underscores)
      let j = i + 6;
      while (j < value.length && /[a-zA-Z0-9_-]/.test(value[j])) {
        j++;
      }
      const varName = value.slice(i + 6, j);

      // Skip to the closing paren, accounting for nested parens
      let depth = 1;
      while (j < value.length && depth > 0) {
        if (value[j] === '(') depth++;
        else if (value[j] === ')') depth--;
        j++;
      }

      result += `$${varName}`;
      i = j;
    } else {
      result += value[i];
      i++;
    }
  }

  return result;
}

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
    // Only captures the variable name, ignoring any fallback values
    const scssValueFormatted = convertVarToScss(scssValue);

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
