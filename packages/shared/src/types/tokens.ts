/**
 * Token configuration types for variable export formatting
 */

export type Unit = 'none' | 'px' | 'rem' | 'em' | '%' | 'ms' | 's';
export type ColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl' | 'oklch';

export interface TokenConfig {
  unit: Unit;
  remBase: number;
  /** Optional variable path for rem base (e.g., "Typography/base") */
  remBaseVariablePath?: string;
  colorFormat: ColorFormat;
  /** Optional calculation expression (e.g., "'Spacing/base' * 2") */
  expression?: string;
  /** Number of decimal places for float values (default: 4) */
  precision: number;
}

export const DEFAULT_CONFIG: TokenConfig = {
  unit: 'px',
  remBase: 16,
  colorFormat: 'hex',
  precision: 4,
};
