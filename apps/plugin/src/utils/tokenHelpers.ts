/**
 * Utility functions for working with DTCG tokens.
 */

/**
 * Counts the number of DTCG tokens in a nested object structure.
 * A token is identified by having a $type property.
 *
 * @param obj - The object to count tokens in
 * @returns The total number of tokens found
 */
export function countTokens(obj: Record<string, unknown>): number {
  let count = 0;
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object' && '$type' in value) {
      count++;
    } else if (value && typeof value === 'object') {
      count += countTokens(value as Record<string, unknown>);
    }
  }
  return count;
}
