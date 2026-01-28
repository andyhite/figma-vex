/**
 * Unit conversion transforms for DTCG tokens
 */

import type { DTCGConversionSettings, DTCGDocument, Unit } from '../types';

/**
 * Formats a number, removing trailing zeros from decimal values.
 */
function cleanNumber(value: number, decimals = 4): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * Formats a number value with the appropriate unit based on conversion settings.
 *
 * @param value - Numeric value
 * @param unit - Unit to apply
 * @param options - Conversion settings
 * @returns Formatted string with unit
 */
export function formatNumberWithUnit(
  value: number,
  unit: Unit,
  options: DTCGConversionSettings
): string {
  const formatters: Record<Unit, () => string> = {
    none: () => cleanNumber(value),
    px: () => `${value}px`,
    rem: () => `${cleanNumber(value / options.remBase)}rem`,
    em: () => `${cleanNumber(value)}em`,
    '%': () => `${value}%`,
    ms: () => `${value}ms`,
    s: () => `${value}s`,
  };

  return formatters[unit]();
}

/**
 * Finds a token in the DTCG document by its path reference.
 * Path format: "Collection.path.to.token" or "Collection/path/to/token"
 */
function findTokenByPath(
  pathRef: string,
  document: DTCGDocument
): { path: string[]; found: boolean } {
  // Normalize path separator (support both . and /)
  const normalizedPath = pathRef.replace(/\//g, '.');
  const pathParts = normalizedPath.split('.').filter(Boolean);

  if (pathParts.length === 0) {
    return { path: [], found: false };
  }

  // First part should be collection name
  const collectionName = pathParts[0];
  const collection = document.collections[collectionName];

  if (!collection) {
    return { path: [], found: false };
  }

  // Traverse the collection structure
  let current: unknown = collection;
  const resolvedPath: string[] = [collectionName];

  for (let i = 1; i < pathParts.length; i++) {
    const part = pathParts[i];

    if (current && typeof current === 'object' && part in current) {
      const next = (current as Record<string, unknown>)[part];

      // Check if it's a token (has $type)
      if (next && typeof next === 'object' && '$type' in next) {
        resolvedPath.push(part);
        return { path: resolvedPath, found: true };
      }

      // Continue traversing
      current = next;
      resolvedPath.push(part);
    } else {
      return { path: [], found: false };
    }
  }

  // If we've traversed all parts, check if current is a token
  if (current && typeof current === 'object' && '$type' in current) {
    return { path: resolvedPath, found: true };
  }

  return { path: [], found: false };
}

/**
 * Formats a calc expression for CSS output.
 * Resolves path references from the DTCG document and formats them as CSS var() references.
 *
 * @param expression - Expression string (e.g., "'Collection.path' * 2")
 * @param options - Conversion settings
 * @param document - DTCG document for reference resolution
 * @returns Formatted CSS calc() expression
 */
export function formatCalcExpression(
  expression: string,
  options: DTCGConversionSettings,
  document: DTCGDocument
): string {
  // Extract path references from expression (format: 'Collection/path/to/token' or 'Collection.path.to.token')
  // Handle escaped quotes: 'Brand\'s Color/primary'
  const pathRefRegex = /'((?:[^'\\]|\\.)+)'/g;
  let formatted = expression;
  const matches = [...expression.matchAll(pathRefRegex)];

  // Replace path references with CSS var() references
  for (const match of matches) {
    const pathRef = match[1].replace(/\\(.)/g, '$1'); // Unescape
    const { path, found } = findTokenByPath(pathRef, document);

    if (found) {
      // Format the path as CSS variable name
      const cssName = path.join('-').toLowerCase();
      const varRef = options.prefix ? `var(--${options.prefix}-${cssName})` : `var(--${cssName})`;
      formatted = formatted.replace(match[0], varRef);
    }
    // If not found, leave the original reference (will be handled elsewhere or cause error)
  }

  // Apply unit conversion if needed
  // Note: Unit conversion would need token extension info, which is not available here
  // This is handled at the token level during conversion
  const hasOperations =
    formatted.includes('*') ||
    formatted.includes('/') ||
    formatted.includes('+') ||
    formatted.includes('-');
  const hasVarRefs = formatted.includes('var(');

  // Wrap in calc() if needed
  if (hasOperations || hasVarRefs) {
    return `calc(${formatted})`;
  }

  return formatted;
}
