import type { TokenConfig } from '@figma-vex/shared';

export const UNIT_REGEX = /unit:\s*(none|px|rem|em|%|ms|s)(?::(\d+))?/i;
export const FORMAT_REGEX = /format:\s*(rgba|rgb|hex|hsl|oklch)/i;
export const CALC_REGEX = /calc:\s*(.+?)(?:;|$)/i;

/**
 * Parses a variable's description field to extract token configuration.
 * Supports unit, color format, and calc expression specifications.
 * Directives can be separated by semicolons on a single line.
 *
 * Examples:
 * - "unit: rem:16"
 * - "format: oklch"
 * - "calc: var(--spacing-base) * 2"
 * - "calc: var(--font-lg) * 1.5; unit: rem"
 */
export function parseDescription(description: string): Partial<TokenConfig> {
  if (!description) return {};

  const config: Partial<TokenConfig> = {};

  const unitMatch = description.match(UNIT_REGEX);
  if (unitMatch) {
    config.unit = unitMatch[1].toLowerCase() as TokenConfig['unit'];
    if (unitMatch[2]) {
      config.remBase = parseInt(unitMatch[2], 10);
    }
  }

  const formatMatch = description.match(FORMAT_REGEX);
  if (formatMatch) {
    config.colorFormat = formatMatch[1].toLowerCase() as TokenConfig['colorFormat'];
  }

  const calcMatch = description.match(CALC_REGEX);
  if (calcMatch) {
    config.expression = calcMatch[1].trim();
    console.log('[calc:parser] Parsed expression from description:', {
      description,
      expression: config.expression,
    });
  }

  return config;
}
