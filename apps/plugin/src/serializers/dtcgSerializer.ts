/**
 * DTCG Serializer - Converts Figma variables and styles to DTCG format
 */

import type {
  DTCGDocument,
  DTCGToken,
  DTCGTokenGroup,
  DTCGValue,
  DTCGColorValue,
  DTCGTypographyValue,
  DTCGShadowValue,
  DTCGGridValue,
  StyleCollection,
  StyleType,
} from '@figma-vex/shared';
import { parseDescription } from '../utils/descriptionParser';
import { filterCollections, getCollectionVariablesByName } from '../utils/collectionUtils';
import { rgbToHex } from '../formatters/colorFormatter';
import { resolvePaintValue, resolveTextProperties } from '../services/styleValueResolver';
import { DEFAULT_CONFIG } from '@figma-vex/shared';

/**
 * Maps Figma variable types to DTCG token types.
 */
function mapFigmaTypeToDTCG(figmaType: VariableResolvedDataType): DTCGToken['$type'] {
  switch (figmaType) {
    case 'COLOR':
      return 'color';
    case 'FLOAT':
      return 'number';
    case 'STRING':
      return 'string';
    case 'BOOLEAN':
      return 'boolean';
    default:
      return 'string';
  }
}

export interface SerializationOptions {
  selectedCollections?: string[];
  includeStyles?: boolean;
  styleTypes?: StyleType[];
}

/**
 * Converts a Figma variable value to DTCG value format.
 */
function convertVariableValue(
  value: VariableValue,
  resolvedType: VariableResolvedDataType,
  variables: Variable[],
  collections: VariableCollection[]
): DTCGValue {
  // Handle variable alias
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'VARIABLE_ALIAS'
  ) {
    const aliasedVar = variables.find((v) => v.id === value.id);
    if (aliasedVar) {
      // Build reference path: Collection.name.variable.name
      const collection = collections.find((c) => c.id === aliasedVar.variableCollectionId);
      const collectionName = collection?.name || 'Unknown';
      const refPath = `${collectionName}.${aliasedVar.name.replace(/\//g, '.')}`;
      return { $ref: refPath };
    }
    return { $ref: value.id };
  }

  // Handle by type
  switch (resolvedType) {
    case 'COLOR':
      if (typeof value === 'object' && value !== null && 'r' in value) {
        return rgbToHex(value as RGBA) as DTCGColorValue;
      }
      break;

    case 'FLOAT':
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      break;

    case 'STRING':
      if (typeof value === 'string') {
        return value;
      }
      break;

    case 'BOOLEAN':
      if (typeof value === 'boolean') {
        return value;
      }
      break;
  }

  // Fallback
  return String(value != null ? value : '');
}

/**
 * Serializes a Figma variable to a DTCG token.
 */
function serializeVariable(
  variable: Variable,
  collection: VariableCollection,
  variables: Variable[],
  collections: VariableCollection[]
): DTCGToken {
  const config = parseDescription(variable.description);
  const tokenType = mapFigmaTypeToDTCG(variable.resolvedType);

  // Build token value(s) - handle modes
  let tokenValue: DTCGValue | Record<string, DTCGValue>;
  if (collection.modes.length === 1) {
    // Single mode - use default mode value
    const defaultModeId = collection.defaultModeId;
    const value = variable.valuesByMode[defaultModeId];
    tokenValue = convertVariableValue(value, variable.resolvedType, variables, collections);
  } else {
    // Multiple modes - create object with mode names as keys
    const modeValues: Record<string, DTCGValue> = {};
    for (const mode of collection.modes) {
      const value = variable.valuesByMode[mode.modeId];
      modeValues[mode.name] = convertVariableValue(value, variable.resolvedType, variables, collections);
    }
    tokenValue = modeValues;
  }

  // Build token
  const token: DTCGToken = {
    $type: tokenType,
    $value: tokenValue,
  };

  // Add description if present
  if (variable.description) {
    token.$description = variable.description;
  }

  // Add extensions for non-default config
  const extensions: DTCGToken['$extensions'] = {};
  if (config.unit && config.unit !== 'px') {
    extensions['com.figma.vex'] = {
      unit: config.unit,
      resolvedType: variable.resolvedType,
    };
  } else {
    extensions['com.figma.vex'] = {
      resolvedType: variable.resolvedType,
    };
  }

  if (config.expression) {
    extensions['com.figma.vex']!.expression = config.expression;
  }

  if (Object.keys(extensions['com.figma.vex'] || {}).length > 0) {
    token.$extensions = extensions;
  }

  return token;
}

/**
 * Builds a nested token group structure from a flat variable name path.
 */
function buildTokenGroup(
  pathParts: string[],
  token: DTCGToken,
  group: DTCGTokenGroup
): void {
  let current = group;

  // Navigate/create nested structure
  for (let i = 0; i < pathParts.length - 1; i++) {
    const part = pathParts[i];
    if (!current[part] || typeof current[part] === 'object' && !('$type' in current[part])) {
      current[part] = {};
    }
    current = current[part] as DTCGTokenGroup;
  }

  // Set the token at the leaf
  const leafName = pathParts[pathParts.length - 1];
  current[leafName] = token;
}

/**
 * Serializes paint styles to DTCG tokens.
 */
function serializePaintStyles(
  styles: StyleCollection['paint']
): DTCGTokenGroup {
  const group: DTCGTokenGroup = {};

  for (const style of styles) {
    const config = { ...DEFAULT_CONFIG, ...parseDescription(style.description) };
    const pathParts = style.name.split('/');
    
    // For DTCG, we want hex format for colors
    const hexConfig = { ...config, colorFormat: 'hex' as const };
    const value = resolvePaintValue(style, hexConfig);

    const token: DTCGToken = {
      $type: 'color',
      $value: value as DTCGColorValue,
    };

    if (style.description) {
      token.$description = style.description;
    }

    buildTokenGroup(pathParts, token, group);
  }

  return group;
}

/**
 * Serializes text styles to DTCG tokens.
 */
function serializeTextStyles(styles: StyleCollection['text']): DTCGTokenGroup {
  const group: DTCGTokenGroup = {};

  for (const style of styles) {
    const config = { ...DEFAULT_CONFIG, ...parseDescription(style.description) };
    const pathParts = style.name.split('/');
    const props = resolveTextProperties(style, config);

    // Extract raw font family name (resolveTextProperties returns CSS-formatted value)
    // For DTCG format, we store the raw font name; the converter handles CSS formatting
    const fontFamily = style.fontFamily;

    const typographyValue: DTCGTypographyValue = {
      fontFamily,
      fontSize: parseFloat(props['font-size']) || 16,
      fontWeight: props['font-weight'] ? parseFloat(props['font-weight']) : 400,
      ...(props['font-style'] && { fontStyle: props['font-style'] }),
      ...(props['line-height'] && { lineHeight: props['line-height'] }),
      ...(props['letter-spacing'] && { letterSpacing: props['letter-spacing'] }),
      ...(props['text-decoration'] && { textDecoration: props['text-decoration'] }),
      ...(props['text-transform'] && { textTransform: props['text-transform'] }),
    };

    const token: DTCGToken = {
      $type: 'typography',
      $value: typographyValue,
    };

    if (style.description) {
      token.$description = style.description;
    }

    buildTokenGroup(pathParts, token, group);
  }

  return group;
}

/**
 * Converts a Figma shadow effect to DTCG shadow value.
 */
function convertShadowEffect(effect: DropShadowEffect | InnerShadowEffect): DTCGShadowValue {
  const color = effect.color;
  const alpha = color.a ?? 1;
  const hexColor = rgbToHex({ r: color.r, g: color.g, b: color.b, a: alpha });

  return {
    offsetX: effect.offset?.x ?? 0,
    offsetY: effect.offset?.y ?? 0,
    blur: effect.radius ?? 0,
    spread: effect.spread ?? 0,
    color: hexColor,
    type: effect.type === 'INNER_SHADOW' ? 'innerShadow' : 'dropShadow',
  };
}

/**
 * Serializes effect styles to DTCG tokens.
 */
function serializeEffectStyles(styles: StyleCollection['effect']): DTCGTokenGroup {
  const group: DTCGTokenGroup = {};

  for (const style of styles) {
    const pathParts = style.name.split('/');
    const effects = style.effects as Effect[];

    // Find the first visible shadow effect
    const shadowEffect = effects.find(
      (e): e is DropShadowEffect | InnerShadowEffect =>
        e.visible !== false && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW')
    );

    if (shadowEffect) {
      const shadowValue = convertShadowEffect(shadowEffect);

      const token: DTCGToken = {
        $type: 'shadow',
        $value: shadowValue,
      };

      if (style.description) {
        token.$description = style.description;
      }

      buildTokenGroup(pathParts, token, group);
    }
  }

  return group;
}

/**
 * Converts a Figma layout grid pattern to DTCG grid pattern.
 */
function mapGridPattern(figmaPattern: string): DTCGGridValue['pattern'] {
  switch (figmaPattern) {
    case 'COLUMNS':
      return 'columns';
    case 'ROWS':
      return 'rows';
    case 'GRID':
      return 'grid';
    default:
      return 'grid';
  }
}

/**
 * Converts a Figma layout grid to DTCG grid value.
 */
function convertLayoutGrid(grid: LayoutGrid): DTCGGridValue {
  const pattern = mapGridPattern(grid.pattern);
  const result: DTCGGridValue = { pattern };

  // RowsColsLayoutGrid has count and sectionSize
  if ('count' in grid) {
    const rowsColsGrid = grid as RowsColsLayoutGrid;
    if (rowsColsGrid.count !== Infinity && rowsColsGrid.count > 0) {
      result.count = rowsColsGrid.count;
    }
    if (rowsColsGrid.gutterSize !== undefined) {
      result.gutterSize = rowsColsGrid.gutterSize;
    }
    if (rowsColsGrid.offset !== undefined) {
      result.offset = rowsColsGrid.offset;
    }
  }

  return result;
}

/**
 * Serializes grid styles to DTCG tokens.
 */
function serializeGridStyles(styles: StyleCollection['grid']): DTCGTokenGroup {
  const group: DTCGTokenGroup = {};

  for (const style of styles) {
    const pathParts = style.name.split('/');
    const layoutGrids = style.layoutGrids as LayoutGrid[];

    // Find the first visible grid
    const visibleGrid = layoutGrids.find((g) => g.visible !== false);

    if (visibleGrid) {
      const gridValue = convertLayoutGrid(visibleGrid);

      const token: DTCGToken = {
        $type: 'grid',
        $value: gridValue,
      };

      if (style.description) {
        token.$description = style.description;
      }

      buildTokenGroup(pathParts, token, group);
    }
  }

  return group;
}

/**
 * Serializes Figma variables and styles to a DTCG document.
 */
export async function serializeToDTCG(
  variables: Variable[],
  collections: VariableCollection[],
  figmaFileName: string,
  options: SerializationOptions,
  styles?: StyleCollection
): Promise<DTCGDocument> {
  const filteredCollections = filterCollections(collections, options.selectedCollections);
  const document: DTCGDocument = {
    $schema: 'https://design-tokens.github.io/format/',
    collections: {},
    $metadata: {
      figmaFile: figmaFileName,
      generatedAt: new Date().toISOString(),
    },
  };

  // Serialize variables
  for (const collection of filteredCollections) {
    const collectionGroup: DTCGTokenGroup = {};
    const collectionVars = getCollectionVariablesByName(variables, collection.id);

    for (const variable of collectionVars) {
      const token = serializeVariable(variable, collection, variables, collections);
      const pathParts = variable.name.split('/');
      buildTokenGroup(pathParts, token, collectionGroup);
    }

    document.collections[collection.name] = collectionGroup;
  }

  // Serialize styles if included
  if (options.includeStyles && styles) {
    const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];
    document.$styles = {};

    if (styleTypes.includes('paint') && styles.paint.length > 0) {
      document.$styles.paint = serializePaintStyles(styles.paint);
    }

    if (styleTypes.includes('text') && styles.text.length > 0) {
      document.$styles.text = serializeTextStyles(styles.text);
    }

    if (styleTypes.includes('effect') && styles.effect.length > 0) {
      document.$styles.effect = serializeEffectStyles(styles.effect);
    }

    if (styleTypes.includes('grid') && styles.grid.length > 0) {
      document.$styles.grid = serializeGridStyles(styles.grid);
    }
  }

  return document;
}
