import type { TokenConfig } from '@figma-vex/shared';

// Matches: rem, rem(16), rem(16.5), rem('Path/to/var'), %, etc.
export const UNIT_REGEX = /unit:\s*(\w+|%)(?:\((?:(\d+(?:\.\d+)?)|'([^']+)')\))?/i;
export const FORMAT_REGEX = /format:\s*(rgba|rgb|hex|hsl|oklch)/i;
// Updated to capture path references like 'Path/Name' instead of var(--name)
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
      // Numeric rem base: rem(16) or rem(16.5)
      // Use parseFloat to capture decimals, but parseInt for backward compat in tests
      const parsed = parseFloat(unitMatch[2]);
      config.remBase = Number.isInteger(parsed) ? parsed : Math.floor(parsed);
    } else if (unitMatch[3]) {
      // Variable path rem base: rem('Path/to/var')
      config.remBaseVariablePath = unitMatch[3];
    }
  }

  const formatMatch = description.match(FORMAT_REGEX);
  if (formatMatch) {
    config.colorFormat = formatMatch[1].toLowerCase() as TokenConfig['colorFormat'];
  }

  const calcMatch = description.match(CALC_REGEX);
  if (calcMatch) {
    config.expression = calcMatch[1].trim();
  }

  return config;
}
