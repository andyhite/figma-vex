import type { TokenConfig } from '@figma-vex/shared';

export const UNIT_REGEX = /unit:\s*(none|px|rem|em|%|ms|s)(?::(\d+))?/i;
export const FORMAT_REGEX = /format:\s*(rgba|rgb|hex|hsl|oklch)/i;

/**
 * Parses a variable's description field to extract token configuration.
 * Supports unit and color format specifications.
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

  return config;
}
