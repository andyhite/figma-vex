import type { TokenConfig } from '@shared/types';

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
  const formatters: Record<TokenConfig['unit'], () => string> = {
    none: () => cleanNumber(value),
    px: () => `${value}px`,
    rem: () => `${cleanNumber(value / config.remBase)}rem`,
    em: () => `${cleanNumber(value)}em`,
    '%': () => `${value}%`,
    ms: () => `${value}ms`,
    s: () => `${value}s`,
  };

  return formatters[config.unit]();
}
