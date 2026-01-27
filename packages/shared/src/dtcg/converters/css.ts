/**
 * DTCG to CSS converter
 */

import type { DTCGDocument, DTCGConversionSettings, DTCGToken, DTCGValue, DTCGReference } from '../types';
import { formatCssName } from '../transforms/names';
import { formatColor } from '../transforms/colors';
import { formatNumberWithUnit, formatCalcExpression } from '../transforms/units';

/**
 * Generates the CSS file header comment.
 */
function generateCssHeader(fileName: string, customHeader?: string): string {
  if (customHeader) {
    return customHeader + '\n';
  }
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
 * Resolves a DTCG value to a CSS string.
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
    // Extract path from reference (format: "Collection.path.to.token")
    const pathParts = ref.$ref.split('.');
    const cssName = formatCssName(pathParts, options);
    return `var(--${cssName})`;
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
        // Check if there's an expression - if so, format as calc expression
        if (extensions?.expression && options.exportAsCalcExpressions) {
          return formatCalcExpression(extensions.expression, options, document);
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
      // Complex types are handled separately
      break;
  }

  // Fallback: convert to string
  return String(value != null ? value : '');
}

/**
 * Converts a DTCG token group to CSS lines.
 * Returns tokens with their mode information for mode-based selector handling.
 */
function convertTokenGroup(
  group: Record<string, DTCGToken | Record<string, unknown>>,
  path: string[],
  options: DTCGConversionSettings,
  document: DTCGDocument
): Array<{ name: string; value: string; modes?: Record<string, string> }> {
  const tokens: Array<{ name: string; value: string; modes?: Record<string, string> }> = [];

  for (const [key, value] of Object.entries(group)) {
    const currentPath = [...path, key];

    if ('$type' in value && '$value' in value) {
      // It's a token
      const token = value as DTCGToken;
      const tokenValue = token.$value;
      const cssName = formatCssName(currentPath, options);

      // Handle mode-based values
      if (typeof tokenValue === 'object' && tokenValue !== null && !('$ref' in tokenValue)) {
        // Multiple modes - extract mode values
        const modeValues: Record<string, string> = {};
        const modeObj = tokenValue as Record<string, DTCGValue>;
        for (const [modeName, modeValue] of Object.entries(modeObj)) {
          modeValues[modeName] = resolveValue(modeValue, token, options, document);
        }
        tokens.push({ name: cssName, value: '', modes: modeValues });
      } else {
        // Single value
        const cssValue = resolveValue(tokenValue as DTCGValue, token, options, document);
        tokens.push({ name: cssName, value: cssValue });
      }
    } else {
      // It's a nested group - recurse
      const nestedTokens = convertTokenGroup(
        value as Record<string, DTCGToken | Record<string, unknown>>,
        currentPath,
        options,
        document
      );
      tokens.push(...nestedTokens);
    }
  }

  return tokens;
}

/**
 * Converts a DTCG document to CSS custom properties format.
 */
export function convertToCss(document: DTCGDocument, options: DTCGConversionSettings): string {
  const fileName = document.$metadata?.figmaFile || 'Figma';
  const lines: string[] = [generateCssHeader(fileName, options.headerBanner)];

  const selector = (options.selector || ':root').trim();

  // Filter collections if specified
  const collections = options.selectedCollections
    ? Object.fromEntries(
        Object.entries(document.collections).filter(([name]) =>
          options.selectedCollections!.includes(name)
        )
      )
    : document.collections;

  if (options.useModesAsSelectors) {
    // Group tokens by mode - create separate selector blocks for each mode
    for (const [collectionName, collectionGroup] of Object.entries(collections)) {
      if (options.includeCollectionComments) {
        lines.push(`/* Collection: ${collectionName} */`);
      }

      const tokens = convertTokenGroup(
        collectionGroup as Record<string, DTCGToken | Record<string, unknown>>,
        [collectionName],
        options,
        document
      );

      // Collect all unique mode names from tokens
      const modeNames = new Set<string>();
      for (const token of tokens) {
        if (token.modes) {
          Object.keys(token.modes).forEach((mode) => modeNames.add(mode));
        }
      }

      // Track if styles have been added
      let stylesAdded = false;

      // Create a selector block for each mode
      for (const modeName of Array.from(modeNames).sort()) {
        const isDefault = modeName.toLowerCase() === 'default';
        const modeSelector = isDefault
          ? selector
          : `${selector}[data-theme="${modeName.toLowerCase()}"], .theme-${modeName.toLowerCase()}`;

        if (options.includeModeComments) {
          lines.push(`/* Mode: ${modeName} */`);
        }

        lines.push(`${modeSelector} {`);

        // Add tokens for this mode
        for (const token of tokens) {
          if (token.modes) {
            const modeValue = token.modes[modeName];
            if (modeValue !== undefined) {
              lines.push(`  --${token.name}: ${modeValue};`);
            }
          } else {
            // Single value token - add to all modes (or just default)
            if (isDefault) {
              lines.push(`  --${token.name}: ${token.value};`);
            }
          }
        }

        // Add style variables to the default mode selector only (styles don't have modes)
        if (
          isDefault &&
          !stylesAdded &&
          options.includeStyles &&
          document.$styles &&
          options.styleOutputMode !== 'classes'
        ) {
          const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];
          for (const styleType of styleTypes) {
            const styleGroup = document.$styles[styleType as keyof typeof document.$styles];
            if (styleGroup) {
              const styleTokens = convertTokenGroup(
                styleGroup as Record<string, DTCGToken | Record<string, unknown>>,
                ['styles', styleType],
                options,
                document
              );
              for (const token of styleTokens) {
                const value = token.modes ? Object.values(token.modes)[0] : token.value;
                lines.push(`  --${token.name}: ${value};`);
              }
            }
          }
          stylesAdded = true;
        }

        lines.push('}', '');
      }

      // If no default mode was found, add styles to a separate :root block
      if (!stylesAdded && options.includeStyles && document.$styles && options.styleOutputMode !== 'classes') {
        lines.push(`${selector} {`);
        const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];
        for (const styleType of styleTypes) {
          const styleGroup = document.$styles[styleType as keyof typeof document.$styles];
          if (styleGroup) {
            const styleTokens = convertTokenGroup(
              styleGroup as Record<string, DTCGToken | Record<string, unknown>>,
              ['styles', styleType],
              options,
              document
            );
            for (const token of styleTokens) {
              const value = token.modes ? Object.values(token.modes)[0] : token.value;
              lines.push(`  --${token.name}: ${value};`);
            }
          }
        }
        lines.push('}', '');
      }
    }
  } else {
    lines.push(`${selector} {`);

    for (const [collectionName, collectionGroup] of Object.entries(collections)) {
      if (options.includeCollectionComments) {
        lines.push(`  /* ${collectionName} */`);
      }

      const tokens = convertTokenGroup(
        collectionGroup as Record<string, DTCGToken | Record<string, unknown>>,
        [collectionName],
        options,
        document
      );
      
      // Convert tokens to CSS lines (use default mode or first mode value)
      for (const token of tokens) {
        if (token.modes) {
          // Use default mode or first mode
          const defaultMode = token.modes['default'] || Object.values(token.modes)[0];
          lines.push(`  --${token.name}: ${defaultMode};`);
        } else {
          lines.push(`  --${token.name}: ${token.value};`);
        }
      }

      // Add spacing between collections
      if (Object.keys(collections).indexOf(collectionName) < Object.keys(collections).length - 1) {
        lines.push('');
      }
    }

    // Add styles if included
    if (options.includeStyles && document.$styles) {
      const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];
      
      for (const styleType of styleTypes) {
        const styleGroup = document.$styles[styleType as keyof typeof document.$styles];
        if (styleGroup) {
      const styleTokens = convertTokenGroup(
        styleGroup as Record<string, DTCGToken | Record<string, unknown>>,
        ['styles', styleType],
        options,
        document
      );
      
      for (const token of styleTokens) {
        const value = token.modes ? Object.values(token.modes)[0] : token.value;
        lines.push(`  --${token.name}: ${value};`);
      }
        }
      }
    }

    lines.push('}');
  }

  return lines.join('\n');
}
