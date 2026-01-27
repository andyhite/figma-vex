import type { ExportOptions, TokenConfig, StyleCollection } from '@figma-vex/shared';
import { DEFAULT_CONFIG } from '@figma-vex/shared';
import { getVariableCssName } from '@plugin/formatters/nameFormatter';
import { parseDescription } from '@plugin/utils/descriptionParser';
import { resolveValue } from '@plugin/services/valueResolver';
import { filterCollections, getCollectionVariables } from '@plugin/utils/collectionUtils';
import {
  resolvePaintValue,
  resolveTextProperties,
  resolveEffectValue,
  resolveGridValue,
} from '@plugin/services/styleValueResolver';
import { toStyleCssName, toStyleClassName } from '@plugin/formatters/styleFormatter';

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
export function generateScssHeader(fileName: string, customHeader?: string): string {
  if (customHeader) {
    return customHeader + '\n';
  }
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
 * Exports variables (and optionally styles) to SCSS format.
 */
export async function exportToScss(
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  options: ExportOptions,
  styles?: StyleCollection
): Promise<string> {
  if (variables.length === 0) {
    return '// No variables found in this file';
  }

  const filteredCollections = filterCollections(collections, options.selectedCollections);

  const lines: string[] = [generateScssHeader(fileName, options.headerBanner)];

  const processVariable = async (variable: Variable, modeId: string): Promise<string> => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      ...parseDescription(variable.description),
    };

    const value = variable.valuesByMode[modeId];
    if (value === undefined) return '';

    const cssName = getVariableCssName(variable, options.prefix, options.nameFormatRules);
    const prefixedName = `$${cssName}`;
    const scssValue = await resolveValue(
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
      'scss'
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

  // Add styles if included
  if (options.includeStyles && styles) {
    const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];

    if (options.styleOutputMode === 'classes') {
      // Generate SCSS mixins for styles
      lines.push('');
      lines.push('// ═══ Figma Style Mixins ═══');
      lines.push(...exportStylesToScssMixins(styles, options, styleTypes));
    } else {
      // Generate SCSS variables for styles
      lines.push('');
      lines.push('// ═══ Figma Style Variables ═══');
      lines.push(...exportStylesToScssVariables(styles, options, styleTypes));
    }
  }

  return lines.join('\n');
}

/**
 * Exports styles as SCSS variables
 */
function exportStylesToScssVariables(
  styles: StyleCollection,
  options: ExportOptions,
  styleTypes: string[]
): string[] {
  const lines: string[] = [];

  if (styleTypes.includes('paint') && styles.paint.length > 0) {
    lines.push('// Paint Styles');
    for (const style of styles.paint) {
      const config: TokenConfig = { ...DEFAULT_CONFIG, ...parseDescription(style.description) };
      const scssName = toStyleCssName(style.name);
      const prefixedName = options.prefix ? `$${options.prefix}-${scssName}` : `$${scssName}`;
      const value = resolvePaintValue(style, config);
      lines.push(`${prefixedName}: ${value};`);
    }
  }

  if (styleTypes.includes('text') && styles.text.length > 0) {
    lines.push('// Text Styles');
    for (const style of styles.text) {
      const config: TokenConfig = { ...DEFAULT_CONFIG, ...parseDescription(style.description) };
      const scssName = toStyleCssName(style.name);
      const baseName = options.prefix ? `$${options.prefix}-${scssName}` : `$${scssName}`;
      const props = resolveTextProperties(style, config);
      for (const [prop, value] of Object.entries(props)) {
        lines.push(`${baseName}-${prop}: ${value};`);
      }
    }
  }

  if (styleTypes.includes('effect') && styles.effect.length > 0) {
    lines.push('// Effect Styles');
    for (const style of styles.effect) {
      const config: TokenConfig = { ...DEFAULT_CONFIG, ...parseDescription(style.description) };
      const scssName = toStyleCssName(style.name);
      const prefixedName = options.prefix ? `$${options.prefix}-${scssName}` : `$${scssName}`;
      const value = resolveEffectValue(style, config);
      lines.push(`${prefixedName}: ${value};`);
    }
  }

  if (styleTypes.includes('grid') && styles.grid.length > 0) {
    lines.push('// Grid Styles');
    for (const style of styles.grid) {
      const scssName = toStyleCssName(style.name);
      const prefixedName = options.prefix ? `$${options.prefix}-${scssName}` : `$${scssName}`;
      const value = resolveGridValue(style);
      lines.push(`${prefixedName}: ${value};`);
    }
  }

  return lines;
}

/**
 * Exports styles as SCSS mixins
 */
function exportStylesToScssMixins(
  styles: StyleCollection,
  options: ExportOptions,
  styleTypes: string[]
): string[] {
  const lines: string[] = [];

  if (styleTypes.includes('paint') && styles.paint.length > 0) {
    lines.push('// Paint Style Mixins');
    for (const style of styles.paint) {
      const config: TokenConfig = { ...DEFAULT_CONFIG, ...parseDescription(style.description) };
      const mixinName = toStyleClassName(style.name, options.prefix);
      const value = resolvePaintValue(style, config);
      lines.push(`@mixin ${mixinName}($property: color) {`);
      lines.push(`  #{$property}: ${value};`);
      lines.push('}');
      lines.push('');
    }
  }

  if (styleTypes.includes('text') && styles.text.length > 0) {
    lines.push('// Text Style Mixins');
    for (const style of styles.text) {
      const config: TokenConfig = { ...DEFAULT_CONFIG, ...parseDescription(style.description) };
      const mixinName = toStyleClassName(style.name, options.prefix);
      const props = resolveTextProperties(style, config);
      lines.push(`@mixin ${mixinName} {`);
      for (const [prop, value] of Object.entries(props)) {
        lines.push(`  ${prop}: ${value};`);
      }
      lines.push('}');
      lines.push('');
    }
  }

  if (styleTypes.includes('effect') && styles.effect.length > 0) {
    lines.push('// Effect Style Mixins');
    for (const style of styles.effect) {
      const config: TokenConfig = { ...DEFAULT_CONFIG, ...parseDescription(style.description) };
      const mixinName = toStyleClassName(style.name, options.prefix);
      const value = resolveEffectValue(style, config);
      lines.push(`@mixin ${mixinName} {`);
      lines.push(`  box-shadow: ${value};`);
      lines.push('}');
      lines.push('');
    }
  }

  if (styleTypes.includes('grid') && styles.grid.length > 0) {
    lines.push('// Grid Style Mixins');
    for (const style of styles.grid) {
      const mixinName = toStyleClassName(style.name, options.prefix);
      const value = resolveGridValue(style);
      lines.push(`@mixin ${mixinName} {`);
      lines.push(`  display: grid;`);
      lines.push(`  grid-template-columns: ${value};`);
      lines.push('}');
      lines.push('');
    }
  }

  return lines;
}
