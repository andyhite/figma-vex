/**
 * DTCG (Design Tokens Community Group) Intermediate Format Types
 *
 * These types define the canonical intermediate format used for serialization
 * and conversion between Figma variables/styles and output formats (CSS, SCSS, TypeScript).
 */

import type { Unit, ColorFormat } from '../types/tokens';
import type { NameFormatRule } from '../types/messages';
import type { StyleType, StyleOutputMode } from '../types/styles';

// Re-export types used in DTCGConversionSettings for convenience
export type { Unit, ColorFormat, NameFormatRule, StyleType, StyleOutputMode };

export type DTCGTokenType =
  | 'color'
  | 'number'
  | 'string'
  | 'boolean'
  | 'typography'
  | 'shadow'
  | 'grid';

export interface DTCGToken {
  $type: DTCGTokenType;
  $value: DTCGValue | Record<string, DTCGValue>; // Single or per-mode
  $description?: string;
  $extensions?: {
    'com.figma.vex'?: {
      unit?: Unit;
      expression?: string;
      resolvedType?: string;
    };
  };
}

export type DTCGValue =
  | string
  | number
  | boolean
  | DTCGColorValue
  | DTCGTypographyValue
  | DTCGShadowValue
  | DTCGGridValue
  | DTCGReference;

export interface DTCGReference {
  $ref: string; // "Collection.path.to.token"
}

export type DTCGColorValue = string; // "#RRGGBB" or "#RRGGBBAA"

export interface DTCGTypographyValue {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle?: string;
  lineHeight?: number | string;
  letterSpacing?: number | string;
  textDecoration?: string;
  textTransform?: string;
}

export interface DTCGShadowValue {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  type?: 'dropShadow' | 'innerShadow';
}

export interface DTCGGridValue {
  pattern: 'columns' | 'rows' | 'grid';
  count?: number;
  gutterSize?: number;
  offset?: number;
}

export interface DTCGDocument {
  $schema?: string;
  collections: Record<string, DTCGTokenGroup>;
  $styles?: {
    paint?: DTCGTokenGroup;
    text?: DTCGTokenGroup;
    effect?: DTCGTokenGroup;
    grid?: DTCGTokenGroup;
  };
  $metadata?: {
    figmaFile: string;
    generatedAt: string;
  };
}

export type DTCGTokenGroup = {
  [key: string]: DTCGToken | DTCGTokenGroup;
};

/**
 * Conversion settings for transforming DTCG documents to output formats
 */
export interface DTCGConversionSettings {
  // Name formatting
  prefix?: string;
  nameFormatRules?: NameFormatRule[];

  // Value formatting
  colorFormat: ColorFormat;
  defaultUnit: Unit;
  remBase: number;

  // CSS/SCSS specific
  selector?: string;
  useModesAsSelectors?: boolean;
  includeCollectionComments?: boolean;
  includeModeComments?: boolean;
  exportAsCalcExpressions?: boolean;

  // Style handling
  includeStyles?: boolean;
  styleOutputMode?: StyleOutputMode;
  styleTypes?: StyleType[];

  // Collection filtering
  selectedCollections?: string[];

  // Custom header banner
  headerBanner?: string;
}

/**
 * GitHub dispatch payload containing DTCG document and conversion settings
 */
export interface GitHubDispatchPayload {
  document: DTCGDocument;
  settings: DTCGConversionSettings;
  export_types: string[]; // ExportType[]
}
