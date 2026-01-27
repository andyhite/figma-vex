import { toCssName, toPrefixedName } from './nameFormatter';

/**
 * Converts a style name (e.g., "Colors/Primary/500") to a CSS-safe name.
 * Figma styles use "/" for grouping, similar to variables.
 */
export function toStyleCssName(name: string): string {
  return toCssName(name);
}

/**
 * Generates a CSS class name from a style name.
 * e.g., "Typography/Heading/Large" -> "typography-heading-large"
 * or with prefix: "ds-typography-heading-large"
 */
export function toStyleClassName(name: string, prefix?: string): string {
  const cssName = toStyleCssName(name);
  return prefix ? `${prefix}-${cssName}` : cssName;
}

/**
 * Generates a CSS variable name from a style name.
 * e.g., "Colors/Primary" -> "--colors-primary"
 * or with prefix: "--ds-colors-primary"
 */
export function toStyleVarName(name: string, prefix?: string): string {
  const cssName = toStyleCssName(name);
  const prefixedName = toPrefixedName(cssName, prefix);
  return `--${prefixedName}`;
}

/**
 * Groups styles by their first path segment (category).
 * e.g., "Colors/Primary", "Colors/Secondary" -> { "Colors": [...] }
 */
export function groupStylesByCategory<T extends { name: string }>(
  styles: T[]
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};

  for (const style of styles) {
    const parts = style.name.split('/');
    const category = parts[0] || 'Uncategorized';

    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(style);
  }

  return groups;
}

/**
 * Extracts the style name without its category prefix.
 * e.g., "Colors/Primary/500" -> "Primary/500"
 */
export function getStyleNameWithoutCategory(name: string): string {
  const parts = name.split('/');
  return parts.slice(1).join('/') || parts[0];
}
