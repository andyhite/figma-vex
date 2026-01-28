import type { Unit, NameFormatRule } from '@figma-vex/shared';
import { extractPathReferences } from '@plugin/utils/variableLookup';
import { lookupByPath } from '@plugin/utils/variableLookup';
import { getVariableCssName } from '@plugin/formatters/nameFormatter';

/**
 * Formats an expression for CSS calc() output.
 * Transforms path references to var(--css-name) and applies unit conversion.
 *
 * @param expression - The expression string (e.g., "'Spacing/base' * 2")
 * @param variables - All available variables
 * @param collections - All available collections
 * @param rules - Name format rules (including default rule with prefix)
 * @param remBaseVarId - Optional rem base variable ID for unit conversion
 * @param unit - Target unit (rem, em, etc.)
 * @returns Formatted CSS calc() expression
 */
export function formatForCss(
  expression: string,
  variables: Variable[],
  collections: VariableCollection[],
  rules: NameFormatRule[],
  remBaseVarId: string | null | undefined,
  unit: Unit
): string {
  const pathRefs = extractPathReferences(expression);
  let formatted = expression;

  // Replace path references with CSS var() references
  for (const pathRef of pathRefs) {
    try {
      const entry = lookupByPath(pathRef, variables, collections);
      if (entry) {
        // Use codeSyntax.WEB if available, otherwise apply rules
        const cssName = getVariableCssName(entry.variable, undefined, rules);
        const quotedPath = `'${pathRef}'`;
        formatted = formatted.split(quotedPath).join(`var(--${cssName})`);
      }
    } catch {
      // Ambiguous path - keep original path reference
      // Error will be handled elsewhere
    }
  }

  // Apply unit conversion if needed
  if (unit === 'rem' || unit === 'em') {
    if (remBaseVarId) {
      // Find the rem base variable
      const remBaseVar = variables.find((v) => v.id === remBaseVarId);
      if (remBaseVar) {
        const remBaseCssName = getVariableCssName(remBaseVar, undefined, rules);
        formatted = `${formatted} / var(--${remBaseCssName}) * 1${unit}`;
      } else {
        // Rem base variable not found - output without conversion
        formatted = `${formatted} * 1${unit}`;
      }
    } else {
      // No rem base configured - output without conversion
      formatted = `${formatted} * 1${unit}`;
    }
  } else if (unit === '%') {
    // Percent conversion (multiply by 100%)
    formatted = `${formatted} * 100%`;
  } else if (unit !== 'none' && unit !== 'px') {
    // Other units (ms, s) - just append unit
    formatted = `${formatted}${unit}`;
  }

  // Wrap in calc() if the expression contains operations or var() references
  // Only wrap if we actually modified the expression or it contains operations
  const hasOperations =
    formatted.includes('*') ||
    formatted.includes('/') ||
    formatted.includes('+') ||
    formatted.includes('-');
  const hasVarRefs = formatted.includes('var(');

  if (hasOperations || hasVarRefs) {
    return `calc(${formatted})`;
  }

  return formatted;
}
