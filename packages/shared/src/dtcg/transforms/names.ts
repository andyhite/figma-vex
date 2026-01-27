/**
 * Name formatting transforms for DTCG tokens
 */

import type { DTCGConversionSettings } from '../types';
import { toCustomCssName } from '../../utils/globMatcher';

/**
 * Converts a variable name to a valid CSS custom property name.
 * Handles slashes, spaces, and camelCase conversion.
 */
function toCssName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/**
 * Formats a token path to a CSS variable name using conversion settings.
 * Applies prefix, name format rules, and casing.
 *
 * @param path - Token path segments (e.g., ['Collection', 'Group', 'Token'])
 * @param options - Conversion settings
 * @returns CSS variable name (without -- prefix)
 */
export function formatCssName(path: string[], options: DTCGConversionSettings): string {
  // Join path segments with '/' to match Figma variable name format
  const figmaName = path.join('/');

  // Apply name format rules if provided
  if (options.nameFormatRules && options.nameFormatRules.length > 0) {
    const customName = toCustomCssName(figmaName, options.nameFormatRules);
    if (customName) {
      return options.prefix ? `${options.prefix}-${customName}` : customName;
    }
  }

  // Fall back to default transformation
  const cssName = toCssName(figmaName);
  return options.prefix ? `${options.prefix}-${cssName}` : cssName;
}
