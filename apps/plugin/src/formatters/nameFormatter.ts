import type { NameFormatRule } from '@figma-vex/shared';
import { toCustomCssName } from '../utils/globMatcher';

/**
 * Converts a variable name to a valid CSS custom property name.
 * Handles slashes, spaces, and camelCase conversion.
 */
export function toCssName(name: string): string {
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
 * Adds an optional prefix to a CSS name.
 */
export function toPrefixedName(cssName: string, prefix?: string): string {
  if (!prefix) return cssName;
  return `${prefix}-${cssName}`;
}

/**
 * Gets the CSS variable name for a Figma variable, checking codeSyntax.WEB first,
 * then matching rules, then falling back to default transformation.
 *
 * @param variable - The Figma variable
 * @param prefix - Optional CSS variable prefix
 * @param rules - Optional array of name format rules
 * @returns CSS variable name (without -- prefix)
 */
export function getVariableCssName(
  variable: Variable,
  prefix?: string,
  rules?: NameFormatRule[]
): string {
  // 1. Check for codeSyntax.WEB first (set by our sync or manually by user)
  if (variable.codeSyntax?.WEB) {
    // Already includes -- prefix and user prefix, so just strip the --
    const name = variable.codeSyntax.WEB.replace(/^--/, '');
    return name;
  }

  // 2. Check for matching rule (fallback if not synced yet)
  // Rules already include the prefix in their replacement template
  if (rules?.length) {
    const customName = toCustomCssName(variable.name, rules);
    if (customName) {
      return customName;
    }
  }

  // 3. Fall back to default transformation
  const cssName = toCssName(variable.name);
  return prefix ? `${prefix}-${cssName}` : cssName;
}
