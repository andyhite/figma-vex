/**
 * Style types for Figma style export functionality
 *
 * Note: These types use primitive/serializable types instead of Figma API types
 * because this package is shared between the plugin and UI environments.
 * The plugin resolves Figma types to these serializable versions.
 */

export type StyleType = 'paint' | 'text' | 'effect' | 'grid';
export type StyleOutputMode = 'variables' | 'classes';

/**
 * Summary of available styles in the document
 */
export interface StyleSummary {
  paintCount: number;
  textCount: number;
  effectCount: number;
  gridCount: number;
}

/**
 * Represents a variable binding - stores the variable ID so we can resolve to var() reference
 */
export interface BoundVariableInfo {
  /** The Figma variable ID */
  variableId: string;
}

/**
 * Bound variables for a paint (solid color)
 */
export interface PaintBoundVariables {
  color?: BoundVariableInfo;
}

/**
 * Bound variables for an effect (shadow, blur)
 */
export interface EffectBoundVariables {
  color?: BoundVariableInfo;
  radius?: BoundVariableInfo;
  spread?: BoundVariableInfo;
  offsetX?: BoundVariableInfo;
  offsetY?: BoundVariableInfo;
}

/**
 * Resolved paint style data - paints stored as serializable format
 */
export interface ResolvedPaintStyle {
  id: string;
  name: string;
  description: string;
  /** Paints stored as unknown[] since Figma Paint type isn't available in shared package */
  paints: unknown[];
  /** Bound variables for each paint in the array */
  paintBoundVariables?: PaintBoundVariables[];
}

/**
 * Line height value
 */
export interface SerializedLineHeight {
  unit: 'AUTO' | 'PIXELS' | 'PERCENT';
  value: number;
}

/**
 * Letter spacing value
 */
export interface SerializedLetterSpacing {
  unit: 'PIXELS' | 'PERCENT';
  value: number;
}

/**
 * Resolved text style data with computed properties
 */
export interface ResolvedTextStyle {
  id: string;
  name: string;
  description: string;
  fontFamily: string;
  fontStyle: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: SerializedLineHeight;
  letterSpacing: SerializedLetterSpacing;
  textDecoration: string;
  textCase: string;
}

/**
 * Resolved effect style data - effects stored as serializable format
 */
export interface ResolvedEffectStyle {
  id: string;
  name: string;
  description: string;
  /** Effects stored as unknown[] since Figma Effect type isn't available in shared package */
  effects: unknown[];
  /** Bound variables for each effect in the array */
  effectBoundVariables?: EffectBoundVariables[];
}

/**
 * Resolved grid style data - grids stored as serializable format
 */
export interface ResolvedGridStyle {
  id: string;
  name: string;
  description: string;
  /** Layout grids stored as unknown[] since Figma LayoutGrid type isn't available in shared package */
  layoutGrids: unknown[];
}

/**
 * Collection of all resolved styles
 */
export interface StyleCollection {
  paint: ResolvedPaintStyle[];
  text: ResolvedTextStyle[];
  effect: ResolvedEffectStyle[];
  grid: ResolvedGridStyle[];
}
