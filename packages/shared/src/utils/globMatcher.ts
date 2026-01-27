/**
 * Glob pattern matching utilities for transforming Figma variable names.
 */

import type { NameFormatRule } from '../types';

/**
 * Converts a glob pattern to a regular expression.
 * - `*` matches any single path segment (captured)
 * - `**` matches zero or more path segments (captured)
 * - Literal segments must match exactly (case-insensitive)
 *
 * @param pattern - Glob pattern (e.g., "color/wildcard/alpha/wildcard" where wildcard is *)
 * @returns Regular expression for matching
 */
export function globToRegex(pattern: string): RegExp {
  // Use placeholders to avoid regex patterns being modified by later replacements
  const GLOBSTAR_MID = '{{GLOBSTAR_MID}}'; // for /**/
  const GLOBSTAR_START = '{{GLOBSTAR_START}}'; // for **/
  const GLOBSTAR_END = '{{GLOBSTAR_END}}'; // for /**
  const GLOBSTAR = '{{GLOBSTAR}}'; // for standalone **
  const SINGLE = '{{SINGLE}}'; // for *

  const regexStr = pattern
    // First, replace all glob patterns with placeholders
    .replace(/\/\*\*\//g, GLOBSTAR_MID)
    .replace(/^\*\*\//, GLOBSTAR_START)
    .replace(/\/\*\*$/, GLOBSTAR_END)
    .replace(/\*\*/g, GLOBSTAR)
    .replace(/\*/g, SINGLE)
    // Escape special regex chars in literals
    .replace(/\//g, '\\/')
    .replace(/\./g, '\\.')
    // Now replace placeholders with actual regex patterns
    .replace(new RegExp(GLOBSTAR_MID.replace(/[{}]/g, '\\$&'), 'g'), '(?:\\/(.*))?\\/')
    .replace(new RegExp(GLOBSTAR_START.replace(/[{}]/g, '\\$&'), 'g'), '(?:(.*)\\/)?')
    .replace(new RegExp(GLOBSTAR_END.replace(/[{}]/g, '\\$&'), 'g'), '(?:\\/(.*))?')
    .replace(new RegExp(GLOBSTAR.replace(/[{}]/g, '\\$&'), 'g'), '(.*)')
    .replace(new RegExp(SINGLE.replace(/[{}]/g, '\\$&'), 'g'), '([^/]+)');

  return new RegExp(`^${regexStr}$`, 'i');
}

/**
 * Capitalizes the first character of a string, lowercases the rest.
 */
function capitalize(str: string): string {
  if (!str) return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Splits a value by path separators (/, -, _, spaces) into segments.
 */
function splitIntoSegments(value: string): string[] {
  return value.split(/[/\-_\s]+/).filter(Boolean);
}

/**
 * Applies a casing convention transformation to a captured value.
 * The modifier handles both casing and separator conversion.
 *
 * @param value - The captured value (may contain path separators like /)
 * @param modifier - The casing convention modifier
 * @returns Transformed string
 */
function applyModifier(value: string, modifier: string | undefined): string {
  if (!value || !modifier) return value;

  const segments = splitIntoSegments(value);

  switch (modifier.toLowerCase()) {
    case 'kebab':
      // kebab-case: lowercase with hyphens
      return segments.map((s) => s.toLowerCase()).join('-');

    case 'snake':
      // snake_case: lowercase with underscores
      return segments.map((s) => s.toLowerCase()).join('_');

    case 'camel':
      // camelCase: first segment lowercase, rest capitalized, no separator
      return segments
        .map((s, i) => (i === 0 ? s.toLowerCase() : capitalize(s)))
        .join('');

    case 'pascal':
      // PascalCase: all segments capitalized, no separator
      return segments.map((s) => capitalize(s)).join('');

    case 'lower':
      // Just lowercase, preserve original structure
      return value.toLowerCase();

    case 'upper':
      // Just uppercase, preserve original structure
      return value.toUpperCase();

    default:
      return value;
  }
}

/**
 * Applies a replacement template to captured groups.
 * - `$1`, `$2`, etc. are replaced with the corresponding capture group
 * - Curly braces are optional: `$1` and `${1}` are equivalent
 * - Modifiers apply casing conventions (including separator conversion):
 *   - `:kebab` - kebab-case (lowercase, hyphens): Color/Teal → color-teal
 *   - `:snake` - snake_case (lowercase, underscores): Color/Teal → color_teal
 *   - `:camel` - camelCase (no separator): Color/Teal → colorTeal
 *   - `:pascal` - PascalCase (no separator): color/teal → ColorTeal
 *   - `:lower` - just lowercase (preserve separators): Color/Teal → color/teal
 *   - `:upper` - just uppercase (preserve separators): Color/Teal → COLOR/TEAL
 * - Missing captures are replaced with empty string
 *
 * @param template - Replacement template, e.g., "${1:kebab}-a$2"
 * @param captures - Array of captured groups from regex match
 * @returns Transformed string
 */
export function applyReplacement(template: string, captures: string[]): string {
  // Matches both ${1:modifier} and $1:modifier formats
  // Group 1,2: curly brace format {index, modifier}
  // Group 3,4: plain format (index, modifier)
  return template.replace(/\$(?:\{(\d+)(?::(\w+))?\}|(\d+)(?::(\w+))?)/g, (_, braceIndex, braceMod, plainIndex, plainMod) => {
    const index = braceIndex ?? plainIndex;
    const modifier = braceMod ?? plainMod;
    const i = parseInt(index, 10) - 1; // $1 → captures[0]
    const value = captures[i] ?? '';
    return applyModifier(value, modifier);
  });
}

/**
 * Transforms a Figma variable name using matching rules.
 * Returns null if no matching rule is found.
 *
 * @param figmaName - The Figma variable name (e.g., "color/teal/alpha/2")
 * @param rules - Array of name format rules to check
 * @returns Transformed CSS name or null if no match
 */
export function toCustomCssName(figmaName: string, rules: NameFormatRule[]): string | null {
  for (const rule of rules) {
    if (!rule.enabled) continue;

    try {
      const regex = globToRegex(rule.pattern);
      const match = figmaName.match(regex);

      if (match) {
        const captures = match.slice(1); // Remove full match, keep captures
        return applyReplacement(rule.replacement, captures);
      }
    } catch {
      // Skip rules with invalid patterns
      continue;
    }
  }

  return null; // No match, use default toCssName()
}
