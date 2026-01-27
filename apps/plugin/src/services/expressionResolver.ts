import type { TokenConfig, Unit } from '@figma-vex/shared';
import { RESOLUTION_CONFIG } from '@figma-vex/shared';
import {
  buildVariableLookup,
  extractVarReferences,
  lookupVariable,
} from '@plugin/utils/variableLookup';
import {
  evaluateExpression,
  type EvaluationContext,
  type EvaluationResult,
} from './expressionEvaluator';

/**
 * Resolves a variable value to a number, following aliases if needed.
 */
async function resolveToNumber(
  variable: Variable,
  modeId: string,
  variables: Variable[],
  depth = 0,
  visited = new Set<string>()
): Promise<{ value: number | null; unit: Unit }> {
  if (depth > RESOLUTION_CONFIG.MAX_ALIAS_DEPTH) {
    return { value: null, unit: 'px' };
  }

  if (visited.has(variable.id)) {
    return { value: null, unit: 'px' };
  }
  visited.add(variable.id);

  const value = variable.valuesByMode[modeId];

  // Handle alias - resolve to actual value
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'VARIABLE_ALIAS'
  ) {
    const aliasedVar = variables.find((v) => v.id === value.id);
    if (!aliasedVar) {
      return { value: null, unit: 'px' };
    }
    return resolveToNumber(aliasedVar, modeId, variables, depth + 1, visited);
  }

  // Handle direct number value
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { value, unit: 'px' };
  }

  return { value: null, unit: 'px' };
}

/**
 * Resolves a calculation expression by looking up variable values and evaluating.
 *
 * @param config - Token config containing the expression
 * @param modeId - Current mode ID for variable value lookup
 * @param variables - All available variables
 * @param collections - All available collections
 * @param prefix - CSS variable prefix
 * @returns Evaluation result with resolved value
 */
export async function resolveExpression(
  config: TokenConfig,
  modeId: string,
  variables: Variable[],
  collections: VariableCollection[],
  prefix: string
): Promise<EvaluationResult> {
  const expression = config.expression;
  if (!expression) {
    return { value: null, unit: config.unit, warnings: ['No expression provided'] };
  }

  const lookup = buildVariableLookup(variables, collections, prefix);
  const varRefs = extractVarReferences(expression);
  const context: EvaluationContext = {};
  const warnings: string[] = [];

  // Resolve each variable reference
  for (const varRef of varRefs) {
    const entry = lookupVariable(varRef, lookup);

    if (!entry) {
      // Don't warn here - expressionEvaluator will report missing variables
      continue;
    }

    const { variable } = entry;

    // Check if variable is numeric
    if (variable.resolvedType !== 'FLOAT') {
      warnings.push(
        `Variable '${varRef}' is not numeric (type: ${variable.resolvedType})`
      );
      continue;
    }

    const resolved = await resolveToNumber(variable, modeId, variables);

    if (resolved.value === null) {
      warnings.push(`Could not resolve value for '${varRef}'`);
      continue;
    }

    context[varRef] = { value: resolved.value, unit: resolved.unit };
  }

  // Evaluate the expression
  const result = evaluateExpression(expression, context);

  // Merge warnings
  result.warnings = [...warnings, ...result.warnings];

  // Override unit if specified in config (and not default)
  if (config.unit !== 'px') {
    result.unit = config.unit;
  }

  return result;
}
