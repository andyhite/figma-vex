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
      const pathParts = variable.name.split('/');

      // Build nested structure
      let current = collectionData as Record<string, unknown>;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }

      const leafName = pathParts[pathParts.length - 1];
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

      current[leafName] = token;
    }

    result[collection.name] = collectionData;
  }

  // Add styles if included
  if (options?.includeStyles && styles) {
    const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];
    const stylesData: Record<string, unknown> = {};

    if (styleTypes.includes('paint') && styles.paint.length > 0) {
      stylesData.paint = buildStyleTokens(styles.paint, 'color');
    }

    if (styleTypes.includes('text') && styles.text.length > 0) {
      stylesData.text = buildTextStyleTokens(styles.text);
    }

    if (styleTypes.includes('effect') && styles.effect.length > 0) {
      stylesData.effect = buildEffectStyleTokens(styles.effect);
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
  type: string
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const style of styles) {
    const config: TokenConfig = { ...DEFAULT_CONFIG, ...parseDescription(style.description) };
    const pathParts = style.name.split('/');
    const value = resolvePaintValue(style, config);

    let current = result;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const leafName = pathParts[pathParts.length - 1];
    current[leafName] = {
      $type: type,
      $value: value,
      ...(style.description && { $description: style.description }),
    };
  }

  return result;
}

/**
 * Builds DTCG tokens for text styles
 */
function buildTextStyleTokens(styles: StyleCollection['text']): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const style of styles) {
    const config: TokenConfig = { ...DEFAULT_CONFIG, ...parseDescription(style.description) };
    const pathParts = style.name.split('/');
    const props = resolveTextProperties(style, config);

    let current = result;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const leafName = pathParts[pathParts.length - 1];
    current[leafName] = {
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
    };
  }

  return result;
}

/**
 * Builds DTCG tokens for effect styles
 */
function buildEffectStyleTokens(styles: StyleCollection['effect']): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const style of styles) {
    const config: TokenConfig = { ...DEFAULT_CONFIG, ...parseDescription(style.description) };
    const pathParts = style.name.split('/');
    const value = resolveEffectValue(style, config);

    let current = result;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const leafName = pathParts[pathParts.length - 1];
    current[leafName] = {
      $type: 'shadow',
      $value: value,
      ...(style.description && { $description: style.description }),
    };
  }

  return result;
}

/**
 * Builds DTCG tokens for grid styles
 */
function buildGridStyleTokens(styles: StyleCollection['grid']): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const style of styles) {
    const pathParts = style.name.split('/');
    const value = resolveGridValue(style);

    let current = result;
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }

    const leafName = pathParts[pathParts.length - 1];
    current[leafName] = {
      $type: 'grid',
      $value: value,
      ...(style.description && { $description: style.description }),
    };
  }

  return result;
}
