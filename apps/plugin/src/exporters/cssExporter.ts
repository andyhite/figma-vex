import type { ExportOptions, TokenConfig, StyleCollection } from '@figma-vex/shared';
import { DEFAULT_CONFIG } from '@figma-vex/shared';
import { getVariableCssName } from '@plugin/formatters/nameFormatter';
import { parseDescription } from '@plugin/utils/descriptionParser';
import { resolveValue } from '@plugin/services/valueResolver';
import { filterCollections, getCollectionVariables } from '@plugin/utils/collectionUtils';
import { exportStylesToCssVariables, exportStylesAsCssClasses } from './styleExporter';

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
 * Exports variables (and optionally styles) to CSS custom properties format.
 */
export async function exportToCss(
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  options: ExportOptions,
  styles?: StyleCollection
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

    const cssName = getVariableCssName(variable, options.prefix, options.nameFormatRules);
    const cssValue = await resolveValue(
      value,
      modeId,
      variables,
      variable.resolvedType,
      config,
      options.prefix,
      0,
      new Set(),
      collections,
      options.exportAsCalcExpressions ?? false,
      options.remBaseVariableId,
      'css'
    );

    return `${indent}--${cssName}: ${cssValue};`;
  };

  if (options.useModesAsSelectors) {
    let stylesAdded = false;

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

        // Add style variables to the default mode selector only (styles don't have modes)
        if (
          isDefault &&
          !stylesAdded &&
          options.includeStyles &&
          styles &&
          options.styleOutputMode !== 'classes'
        ) {
          const styleLines = exportStylesToCssVariables(styles, options, '  ');
          lines.push(...styleLines);
          stylesAdded = true;
        }

        lines.push('}', '');
      }
    }

    // If no default mode was found, add styles to a separate :root block
    if (!stylesAdded && options.includeStyles && styles && options.styleOutputMode !== 'classes') {
      lines.push(`${selector} {`);
      const styleLines = exportStylesToCssVariables(styles, options, '  ');
      lines.push(...styleLines);
      lines.push('}', '');
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

    // Add style variables inside the selector block
    if (options.includeStyles && styles && options.styleOutputMode !== 'classes') {
      const styleLines = exportStylesToCssVariables(styles, options, '  ');
      lines.push(...styleLines);
    }

    lines.push('}');
  }

  // Add style classes outside the selector block
  if (options.includeStyles && styles && options.styleOutputMode === 'classes') {
    lines.push('');
    const styleClasses = exportStylesAsCssClasses(styles, options);
    lines.push(...styleClasses);
  }

  return lines.join('\n');
}
