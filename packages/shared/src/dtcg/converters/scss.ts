/**
 * DTCG to SCSS converter
 */

import type { DTCGDocument, DTCGConversionSettings, DTCGToken, DTCGValue, DTCGReference } from '../types';
import { formatScssName } from '../transforms/names';
import { formatColor } from '../transforms/colors';
import { formatNumberWithUnit, formatCalcExpression } from '../transforms/units';

/**
 * Generates the SCSS file header comment.
 */
function generateScssHeader(fileName: string, customHeader?: string): string {
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
 * Converts CSS var() references to SCSS variable references.
 */
function convertVarToScss(value: string): string {
  let result = '';
  let i = 0;

  while (i < value.length) {
    // Check for var( pattern
    if (value.slice(i, i + 6) === 'var(--') {
      // Extract variable name
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
 * Resolves a DTCG value to an SCSS string.
 */
function resolveValue(
  value: DTCGValue,
  token: DTCGToken,
  options: DTCGConversionSettings,
  document: DTCGDocument
): string {
  // Handle references
  if (typeof value === 'object' && value !== null && '$ref' in value) {
    const ref = value as DTCGReference;
    const pathParts = ref.$ref.split('.');
    const scssName = formatScssName(pathParts, options);
    return scssName;
  }

  // Handle by token type
  const tokenType = token.$type;
  const extensions = token.$extensions?.['com.figma.vex'];

  switch (tokenType) {
    case 'color':
      if (typeof value === 'string') {
        return formatColor(value, options.colorFormat);
      }
      break;

    case 'number':
      if (typeof value === 'number') {
        // Check if there's an expression - if so, format as calc expression (without calc wrapper for SCSS)
        if (extensions?.expression && options.exportAsCalcExpressions) {
          const calcExpr = formatCalcExpression(extensions.expression, options, document);
          // Remove calc() wrapper for SCSS
          return calcExpr.replace(/^calc\((.+)\)$/, '$1');
        }
        const unit = extensions?.unit || options.defaultUnit;
        return formatNumberWithUnit(value, unit, options);
      }
      break;

    case 'string':
      if (typeof value === 'string') {
        const escaped = value.replace(/"/g, '\\"');
        return `"${escaped}"`;
      }
      break;

    case 'boolean':
      if (typeof value === 'boolean') {
        return value ? '1' : '0';
      }
      break;

    case 'typography':
    case 'shadow':
    case 'grid':
      break;
  }

  // Fallback: convert to string
  return String(value != null ? value : '');
}

/**
 * Converts a DTCG token group to SCSS lines.
 */
function convertTokenGroup(
  group: Record<string, DTCGToken | Record<string, unknown>>,
  path: string[],
  options: DTCGConversionSettings,
  document: DTCGDocument
): string[] {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(group)) {
    const currentPath = [...path, key];

    if ('$type' in value && '$value' in value) {
      // It's a token
      const token = value as DTCGToken;
      const tokenValue = token.$value;

      // Handle mode-based values - use default mode (first value)
      let resolvedValue: DTCGValue;
      if (typeof tokenValue === 'object' && tokenValue !== null && !('$ref' in tokenValue)) {
        // Multiple modes - use first value
        const modeValues = tokenValue as Record<string, DTCGValue>;
        const firstMode = Object.keys(modeValues)[0];
        resolvedValue = modeValues[firstMode];
      } else {
        resolvedValue = tokenValue as DTCGValue;
      }

      const scssName = formatScssName(currentPath, options);
      let scssValue = resolveValue(resolvedValue, token, options, document);
      
      // Convert var() references to SCSS variable references
      scssValue = convertVarToScss(scssValue);

      lines.push(`${scssName}: ${scssValue};`);
    } else {
      // It's a nested group - recurse
      const nestedLines = convertTokenGroup(
        value as Record<string, DTCGToken | Record<string, unknown>>,
        currentPath,
        options,
        document
      );
      lines.push(...nestedLines);
    }
  }

  return lines;
}

/**
 * Converts a DTCG document to SCSS format.
 */
export function convertToScss(document: DTCGDocument, options: DTCGConversionSettings): string {
  const fileName = document.$metadata?.figmaFile || 'Figma';
  const lines: string[] = [generateScssHeader(fileName, options.headerBanner)];

  // Filter collections if specified
  const collections = options.selectedCollections
    ? Object.fromEntries(
        Object.entries(document.collections).filter(([name]) =>
          options.selectedCollections!.includes(name)
        )
      )
    : document.collections;

  for (const [collectionName, collectionGroup] of Object.entries(collections)) {
    if (options.includeCollectionComments) {
      lines.push(`// Collection: ${collectionName}`);
    }

    const tokenLines = convertTokenGroup(
      collectionGroup as Record<string, DTCGToken | Record<string, unknown>>,
      [collectionName],
      options,
      document
    );
    lines.push(...tokenLines);

    // Add spacing between collections
    if (Object.keys(collections).indexOf(collectionName) < Object.keys(collections).length - 1) {
      lines.push('');
    }
  }

  // Add styles if included
  if (options.includeStyles && document.$styles) {
    const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];
    
    lines.push('');
    lines.push('// ═══ Figma Style Variables ═══');

    for (const styleType of styleTypes) {
      const styleGroup = document.$styles[styleType as keyof typeof document.$styles];
      if (styleGroup) {
        const styleLines = convertTokenGroup(
          styleGroup as Record<string, DTCGToken | Record<string, unknown>>,
          ['styles', styleType],
          options,
          document
        );
        lines.push(...styleLines);
      }
    }
  }

  return lines.join('\n');
}
