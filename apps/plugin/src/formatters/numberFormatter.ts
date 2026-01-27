import type { TokenConfig } from '@figma-vex/shared';

/**
 * Formats a number, removing trailing zeros from decimal values.
 */
export function cleanNumber(value: number, decimals = 4): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * Formats a number with the appropriate unit based on config.
 */
export function formatNumber(value: number, config: TokenConfig): string {
  const precision = config.precision;
  const formatters: Record<TokenConfig['unit'], () => string> = {
    none: () => cleanNumber(value, precision),
    px: () => `${cleanNumber(value, precision)}px`,
    rem: () => `${cleanNumber(value / config.remBase, precision)}rem`,
    em: () => `${cleanNumber(value, precision)}em`,
    '%': () => `${cleanNumber(value, precision)}%`,
    ms: () => `${cleanNumber(value, precision)}ms`,
    s: () => `${cleanNumber(value, precision)}s`,
  };

  return formatters[config.unit]();
}
