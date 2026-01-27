import type { ExportOptions, StyleCollection } from '@figma-vex/shared';
import { toCssName, toPrefixedName } from '@plugin/formatters/nameFormatter';
import { filterCollections, getCollectionVariables } from '@plugin/utils/collectionUtils';
import { toStyleVarName, toStyleClassName } from '@plugin/formatters/styleFormatter';

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
 * Exports variables (and optionally styles) to TypeScript type definitions.
 */
export async function exportToTypeScript(
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

  // Add style variable names if in variables mode
  if (options.includeStyles && styles && options.styleOutputMode !== 'classes') {
    const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];

    if (styleTypes.includes('paint')) {
      for (const style of styles.paint) {
        const varName = toStyleVarName(style.name, options.prefix);
        variableNames.push(`  | "${varName}"`);
      }
    }

    if (styleTypes.includes('text')) {
      for (const style of styles.text) {
        const baseName = toStyleVarName(style.name, options.prefix);
        // Add all the text style property variations
        variableNames.push(`  | "${baseName}-font-family"`);
        variableNames.push(`  | "${baseName}-font-size"`);
        variableNames.push(`  | "${baseName}-font-weight"`);
        variableNames.push(`  | "${baseName}-line-height"`);
        variableNames.push(`  | "${baseName}-letter-spacing"`);
      }
    }

    if (styleTypes.includes('effect')) {
      for (const style of styles.effect) {
        const varName = toStyleVarName(style.name, options.prefix);
        variableNames.push(`  | "${varName}"`);
      }
    }

    if (styleTypes.includes('grid')) {
      for (const style of styles.grid) {
        const varName = toStyleVarName(style.name, options.prefix);
        variableNames.push(`  | "${varName}"`);
      }
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

  // Add style class name types if in classes mode
  if (options.includeStyles && styles && options.styleOutputMode === 'classes') {
    const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];
    const classNames: string[] = [];

    if (styleTypes.includes('paint')) {
      for (const style of styles.paint) {
        const className = toStyleClassName(style.name, options.prefix);
        classNames.push(`  | "${className}"`);
        classNames.push(`  | "bg-${className}"`);
        classNames.push(`  | "border-${className}"`);
      }
    }

    if (styleTypes.includes('text')) {
      for (const style of styles.text) {
        const className = toStyleClassName(style.name, options.prefix);
        classNames.push(`  | "${className}"`);
      }
    }

    if (styleTypes.includes('effect')) {
      for (const style of styles.effect) {
        const className = toStyleClassName(style.name, options.prefix);
        classNames.push(`  | "${className}"`);
      }
    }

    if (styleTypes.includes('grid')) {
      for (const style of styles.grid) {
        const className = toStyleClassName(style.name, options.prefix);
        classNames.push(`  | "${className}"`);
      }
    }

    if (classNames.length > 0) {
      lines.push('');
      lines.push('export type StyleClassName =');
      lines.push(...classNames);
      lines.push(';');
    }
  }

  return lines.join('\n');
}
