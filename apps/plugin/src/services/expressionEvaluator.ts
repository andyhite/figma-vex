import { Parser } from 'expr-eval';
import type { Unit } from '@figma-vex/shared';
import { extractPathReferences } from '@plugin/utils/variableLookup';

/**
 * Context for expression evaluation containing resolved variable values
 */
export interface EvaluationContext {
  [varRef: string]: {
    value: number;
    unit: Unit;
  };
}

/**
 * Result of expression evaluation
 */
export interface EvaluationResult {
  value: number | null;
  unit: Unit;
  warnings: string[];
}

// Create a parser instance with standard math functions
const parser = new Parser();

/**
 * Evaluates a calculation expression with the given variable context.
 *
 * Supported operations:
 * - Arithmetic: +, -, *, /
 * - Parentheses: ()
 * - Functions: round(), floor(), ceil(), min(), max(), abs()
 *
 * @param expression - The expression to evaluate (e.g., "'Spacing/base' * 2")
 * @param context - Map of path references (as 'Path/Name') to their resolved values
 * @returns Evaluation result with value, inferred unit, and any warnings
 */
export function evaluateExpression(
  expression: string,
  context: EvaluationContext
): EvaluationResult {
  const warnings: string[] = [];
  let inferredUnit: Unit = 'px';

  // Extract all path references (single-quoted strings)
  const pathRefs = extractPathReferences(expression);

  // Build evaluation variables and check for missing refs
  const evalVars: Record<string, number> = {};
  let processedExpression = expression;
  let hasAllVariables = true;

  for (const pathRef of pathRefs) {
    // Context keys are stored as quoted paths: 'Spacing/base'
    const contextKey = `'${pathRef}'`;
    const contextEntry = context[contextKey];

    if (!contextEntry) {
      warnings.push(`Variable '${pathRef}' not found`);
      hasAllVariables = false;
      continue;
    }

    // Use first non-px unit as the inferred unit
    if (inferredUnit === 'px' && contextEntry.unit !== 'px') {
      inferredUnit = contextEntry.unit;
    }

    // Create a safe variable name for expr-eval (replace special chars)
    const safeVarName = pathRef.replace(/[^a-zA-Z0-9]/g, '_');
    evalVars[safeVarName] = contextEntry.value;
    // Replace the quoted path reference in the expression
    const quotedPath = `'${pathRef}'`;
    processedExpression = processedExpression.split(quotedPath).join(safeVarName);
  }

  // If any required variables were missing, return null value
  if (!hasAllVariables && pathRefs.length > 0) {
    return { value: null, unit: inferredUnit, warnings };
  }

  // Parse and evaluate the expression
  try {
    const expr = parser.parse(processedExpression);
    const value = expr.evaluate(evalVars);

    // Ensure result is a number
    if (typeof value !== 'number') {
      warnings.push(`Expression did not evaluate to a number: ${typeof value}`);
      return { value: null, unit: inferredUnit, warnings };
    }

    // Check for division by zero (results in Infinity)
    if (!Number.isFinite(value)) {
      if (value === Infinity || value === -Infinity) {
        warnings.push('Division by zero');
      }
      return { value, unit: inferredUnit, warnings };
    }

    return { value, unit: inferredUnit, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Expression syntax error: ${message}`);
    return { value: null, unit: inferredUnit, warnings };
  }
}
