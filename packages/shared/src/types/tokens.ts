/**
 * Token configuration types for variable export formatting
 */

export type Unit = 'none' | 'px' | 'rem' | 'em' | '%' | 'ms' | 's';
export type ColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl' | 'oklch';

export interface TokenConfig {
  unit: Unit;
  remBase: number;
  colorFormat: ColorFormat;
  /** Optional calculation expression (e.g., "var(--spacing-base) * 2") */
  expression?: string;
}

export const DEFAULT_CONFIG: TokenConfig = {
  unit: 'px',
  remBase: 16,
  colorFormat: 'hex',
};
