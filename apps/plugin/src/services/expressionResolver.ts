import type { TokenConfig, Unit } from '@figma-vex/shared';
import { RESOLUTION_CONFIG } from '@figma-vex/shared';
import { extractPathReferences, lookupByPath } from '@plugin/utils/variableLookup';
import {
  evaluateExpression,
  type EvaluationContext,
  type EvaluationResult,
} from './expressionEvaluator';

/**
 * Finds the best matching mode ID for a variable based on the current mode context.
 * Matches by mode name first, then falls back to the first mode of the variable's collection.
 */
function findMatchingModeId(
  variable: Variable,
  currentModeId: string,
  currentModeName: string | undefined,
  collections: VariableCollection[]
): string | null {
  const variableCollection = collections.find((c) => c.id === variable.variableCollectionId);
  if (!variableCollection) return null;

  // First try: exact mode ID match (same collection)
  if (variable.valuesByMode[currentModeId] !== undefined) {
    return currentModeId;
  }

  // Second try: match by mode name
  if (currentModeName) {
    const matchingMode = variableCollection.modes.find((m) => m.name === currentModeName);
    if (matchingMode && variable.valuesByMode[matchingMode.modeId] !== undefined) {
      return matchingMode.modeId;
    }
  }

  // Fallback: use the first mode of the variable's collection
  if (variableCollection.modes.length > 0) {
    const firstMode = variableCollection.modes[0];
    if (variable.valuesByMode[firstMode.modeId] !== undefined) {
      return firstMode.modeId;
    }
  }

  return null;
}

/**
 * Resolves a variable value to a number, following aliases if needed.
 */
async function resolveToNumber(
  variable: Variable,
  modeId: string,
  modeName: string | undefined,
  variables: Variable[],
  collections: VariableCollection[],
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

  // Find the correct mode ID for this variable
  const effectiveModeId = findMatchingModeId(variable, modeId, modeName, collections);

  if (!effectiveModeId) {
    return { value: null, unit: 'px' };
  }

  const value = variable.valuesByMode[effectiveModeId];

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
    return resolveToNumber(
      aliasedVar,
      modeId,
      modeName,
      variables,
      collections,
      depth + 1,
      visited
    );
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
  _prefix: string
): Promise<EvaluationResult> {
  const expression = config.expression;
  if (!expression) {
    return { value: null, unit: config.unit, warnings: ['No expression provided'] };
  }

  // Find the current mode name for cross-collection matching
  let currentModeName: string | undefined;
  for (const collection of collections) {
    const mode = collection.modes.find((m) => m.modeId === modeId);
    if (mode) {
      currentModeName = mode.name;
      break;
    }
  }

  const pathRefs = extractPathReferences(expression);
  const context: EvaluationContext = {};
  const warnings: string[] = [];

  // Resolve each path reference
  for (const pathRef of pathRefs) {
    let entry;
    try {
      entry = lookupByPath(pathRef, variables, collections);
    } catch (error) {
      // Ambiguous path error
      const message = error instanceof Error ? error.message : String(error);
      warnings.push(message);
      continue;
    }

    if (!entry) {
      // Don't warn here - expressionEvaluator will report missing variables
      continue;
    }

    const { variable } = entry;

    // Check if variable is numeric
    if (variable.resolvedType !== 'FLOAT') {
      warnings.push(`Variable '${pathRef}' is not numeric (type: ${variable.resolvedType})`);
      continue;
    }

    const resolved = await resolveToNumber(
      variable,
      modeId,
      currentModeName,
      variables,
      collections
    );

    if (resolved.value === null) {
      warnings.push(`Could not resolve value for '${pathRef}'`);
      continue;
    }

    // Use path reference as key in context (evaluator will match against this)
    context[`'${pathRef}'`] = { value: resolved.value, unit: resolved.unit };
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
