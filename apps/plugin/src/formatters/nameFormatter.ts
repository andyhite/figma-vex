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
