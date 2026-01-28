import type { ExportOptions, StyleCollection, TokenConfig } from '@figma-vex/shared';
import { DEFAULT_CONFIG } from '@figma-vex/shared';
import { rgbToHex } from '@plugin/formatters/colorFormatter';
import { parseDescription } from '@plugin/utils/descriptionParser';
import { filterCollections, getCollectionVariablesByName } from '@plugin/utils/collectionUtils';
import {
  resolvePaintValue,
  resolveTextProperties,
  resolveEffectValue,
  resolveGridValue,
} from '@plugin/services/styleValueResolver';

/**
 * Builds or navigates to a nested path in an object and sets the leaf value.
 * Path is specified as a forward-slash-separated string (e.g., "Colors/Brand/Primary").
 *
 * @param root - The root object to build the path in
 * @param path - Forward-slash-separated path (e.g., "Colors/Brand/Primary")
 * @param value - The value to set at the leaf
 */
function setNestedValue(root: Record<string, unknown>, path: string, value: unknown): void {
  const pathParts = path.split('/');
  let current = root;

  // Navigate/create intermediate nodes
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (!current[part]) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  // Set the leaf value
  const leafName = pathParts[pathParts.length - 1];
  current[leafName] = value;
}

/**
 * Builds a token config from a style description and optional precision override.
 */
function buildTokenConfig(description: string, numberPrecision?: number): TokenConfig {
  const config = { ...DEFAULT_CONFIG, ...parseDescription(description) };
  if (numberPrecision !== undefined) {
    config.precision = numberPrecision;
  }
  return config;
}

/**
 * Formats a raw value for JSON export (Style Dictionary compatible).
 */
function formatRawValue(
  value: VariableValue,
  type: VariableResolvedDataType,
  variables: Variable[]
): unknown {
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'VARIABLE_ALIAS'
  ) {
    const aliasedVar = variables.find((v) => v.id === value.id);
    if (aliasedVar) {
      const tokenPath = aliasedVar.name.split('/').join('.');
      return `{${tokenPath}}`;
    }
    return `{${value.id}}`;
  }

  if (type === 'COLOR' && typeof value === 'object' && value !== null && 'r' in value) {
    return rgbToHex(value as RGBA);
  }

  return value;
}

/**
 * Exports variables (and optionally styles) to JSON format (DTCG compatible).
 */
export async function exportToJson(
  variables: Variable[],
  collections: VariableCollection[],
  options?: ExportOptions,
  styles?: StyleCollection
): Promise<string> {
  const filteredCollections = filterCollections(
    collections,
    options != null ? options.selectedCollections : undefined
  );

  const result: Record<string, unknown> = {};

  for (const collection of filteredCollections) {
    const collectionData: Record<string, unknown> = {};
    const collectionVars = getCollectionVariablesByName(variables, collection.id);

    for (const variable of collectionVars) {
      const config = parseDescription(variable.description);
      const defaultModeId = collection.defaultModeId;
      const rawValue = variable.valuesByMode[defaultModeId];

      // Build token object (DTCG format)
      const token: Record<string, unknown> = {
        $type: variable.resolvedType.toLowerCase(),
        ...(variable.description && { $description: variable.description }),
      };

      // Add value(s)
      if (collection.modes.length === 1) {
        token.$value = formatRawValue(rawValue, variable.resolvedType, variables);
      } else {
        token.$value = Object.fromEntries(
          collection.modes.map((mode) => [
            mode.name,
            formatRawValue(variable.valuesByMode[mode.modeId], variable.resolvedType, variables),
          ])
        );
      }

      // Add unit extension if non-default
      if (config.unit && config.unit !== 'px') {
        token.$extensions = {
          'com.figma.vex': { unit: config.unit },
        };
      }

      setNestedValue(collectionData, variable.name, token);
    }

    result[collection.name] = collectionData;
  }

  // Add styles if included
  if (options?.includeStyles && styles) {
    const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];
    const stylesData: Record<string, unknown> = {};

    if (styleTypes.includes('paint') && styles.paint.length > 0) {
      stylesData.paint = buildStyleTokens(styles.paint, 'color', options);
    }

    if (styleTypes.includes('text') && styles.text.length > 0) {
      stylesData.text = buildTextStyleTokens(styles.text, options);
    }

    if (styleTypes.includes('effect') && styles.effect.length > 0) {
      stylesData.effect = buildEffectStyleTokens(styles.effect, options);
    }

    if (styleTypes.includes('grid') && styles.grid.length > 0) {
      stylesData.grid = buildGridStyleTokens(styles.grid);
    }

    if (Object.keys(stylesData).length > 0) {
      result.$styles = stylesData;
    }
  }

  return JSON.stringify(result, null, 2);
}

/**
 * Builds DTCG tokens for paint styles
 */
function buildStyleTokens(
  styles: StyleCollection['paint'],
  type: string,
  options?: ExportOptions
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const style of styles) {
    const config = buildTokenConfig(style.description, options?.numberPrecision);
    const value = resolvePaintValue(style, config);

    setNestedValue(result, style.name, {
      $type: type,
      $value: value,
      ...(style.description && { $description: style.description }),
    });
  }

  return result;
}

/**
 * Builds DTCG tokens for text styles
 */
function buildTextStyleTokens(
  styles: StyleCollection['text'],
  options?: ExportOptions
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const style of styles) {
    const config = buildTokenConfig(style.description, options?.numberPrecision);
    const props = resolveTextProperties(style, config);

    setNestedValue(result, style.name, {
      $type: 'typography',
      $value: {
        fontFamily: props['font-family'],
        fontSize: props['font-size'],
        fontWeight: props['font-weight'],
        ...(props['font-style'] && { fontStyle: props['font-style'] }),
        ...(props['line-height'] && { lineHeight: props['line-height'] }),
        ...(props['letter-spacing'] && { letterSpacing: props['letter-spacing'] }),
        ...(props['text-decoration'] && { textDecoration: props['text-decoration'] }),
        ...(props['text-transform'] && { textTransform: props['text-transform'] }),
      },
      ...(style.description && { $description: style.description }),
    });
  }

  return result;
}

/**
 * Builds DTCG tokens for effect styles
 */
function buildEffectStyleTokens(
  styles: StyleCollection['effect'],
  options?: ExportOptions
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const style of styles) {
    const config = buildTokenConfig(style.description, options?.numberPrecision);
    const value = resolveEffectValue(style, config);

    setNestedValue(result, style.name, {
      $type: 'shadow',
      $value: value,
      ...(style.description && { $description: style.description }),
    });
  }

  return result;
}

/**
 * Builds DTCG tokens for grid styles
 */
function buildGridStyleTokens(styles: StyleCollection['grid']): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const style of styles) {
    const value = resolveGridValue(style);

    setNestedValue(result, style.name, {
      $type: 'grid',
      $value: value,
      ...(style.description && { $description: style.description }),
    });
  }

  return result;
}
