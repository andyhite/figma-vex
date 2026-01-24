import type { ExportOptions, TokenConfig } from '@shared/types';
import { DEFAULT_CONFIG } from '@shared/types';
import { toCssName, toPrefixedName } from '@plugin/formatters/nameFormatter';
import { parseDescription } from '@plugin/utils/descriptionParser';
import { resolveValue } from '@plugin/services/valueResolver';
import { filterCollections, getCollectionVariables } from '@plugin/utils/collectionUtils';

/**
 * Generates the CSS file header comment.
 */
export function generateCssHeader(fileName: string): string {
  return [
    '/**',
    ' * Auto-generated CSS Custom Properties',
    ` * Exported from Figma: ${fileName}`,
    ` * Generated: ${new Date().toISOString()}`,
    ' */',
    '',
  ].join('\n');
}

/**
 * Exports variables to CSS custom properties format.
 */
export async function exportToCss(
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  options: ExportOptions
): Promise<string> {
  if (variables.length === 0) {
    return '/* No variables found in this file */';
  }

  const filteredCollections = filterCollections(collections, options.selectedCollections);
  const selector = (options.selector != null ? options.selector.trim() : null) || ':root';

  const lines: string[] = [generateCssHeader(fileName)];

  const processVariable = async (
    variable: Variable,
    modeId: string,
    indent = '  '
  ): Promise<string> => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      ...parseDescription(variable.description),
    };

    const value = variable.valuesByMode[modeId];
    if (value === undefined) return '';

    const cssName = toCssName(variable.name);
    const prefixedName = toPrefixedName(cssName, options.prefix);
    const cssValue = await resolveValue(
      value,
      modeId,
      variables,
      variable.resolvedType,
      config,
      options.prefix
    );

    return `${indent}--${prefixedName}: ${cssValue};`;
  };

  if (options.useModesAsSelectors) {
    for (const collection of filteredCollections) {
      if (options.includeCollectionComments) {
        lines.push(`/* Collection: ${collection.name} */`);
      }

      for (const mode of collection.modes) {
        const isDefault = mode.name.toLowerCase() === 'default';
        const modeSelector = isDefault
          ? selector
          : `${selector}[data-theme="${mode.name.toLowerCase()}"], .theme-${mode.name.toLowerCase()}`;

        if (options.includeModeComments) {
          lines.push(`/* Mode: ${mode.name} */`);
        }

        lines.push(`${modeSelector} {`);

        const collectionVars = getCollectionVariables(variables, collection.id);

        for (const variable of collectionVars) {
          const line = await processVariable(variable, mode.modeId, '  ');
          if (line) lines.push(line);
        }

        lines.push('}', '');
      }
    }
  } else {
    lines.push(`${selector} {`);

    for (const collection of filteredCollections) {
      if (options.includeCollectionComments) {
        lines.push(`  /* ${collection.name} */`);
      }

      const collectionVars = getCollectionVariables(variables, collection.id);

      for (const variable of collectionVars) {
        const line = await processVariable(variable, collection.defaultModeId, '  ');
        if (line) lines.push(line);
      }

      if (filteredCollections.indexOf(collection) < filteredCollections.length - 1) {
        lines.push('');
      }
    }

    lines.push('}');
  }

  return lines.join('\n');
}
