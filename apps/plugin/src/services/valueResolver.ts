import type { TokenConfig } from '@figma-vex/shared';
import { RESOLUTION_CONFIG } from '@figma-vex/shared';
import { toCssName, toPrefixedName } from '@plugin/formatters/nameFormatter';
import { formatColor } from '@plugin/formatters/colorFormatter';
import { formatNumber } from '@plugin/formatters/numberFormatter';
import { resolveExpression } from './expressionResolver';

/**
 * Resolves a variable value to its string representation.
 * Handles variable aliases, colors, numbers, strings, booleans, and expressions.
 *
 * @param value - The raw value from Figma
 * @param modeId - Current mode ID
 * @param variables - All available variables
 * @param resolvedType - The variable's resolved data type
 * @param config - Token configuration including optional expression
 * @param prefix - CSS variable prefix
 * @param depth - Current resolution depth (for circular reference detection)
 * @param visited - Set of visited variable IDs
 * @param collections - All available collections (required for expression evaluation)
 */
export async function resolveValue(
  value: VariableValue,
  _modeId: string,
  variables: Variable[],
  resolvedType: VariableResolvedDataType,
  config: TokenConfig,
  prefix = '',
  depth = 0,
  visited = new Set<string>(),
  collections?: VariableCollection[]
): Promise<string> {
  // Prevent infinite recursion
  if (depth > RESOLUTION_CONFIG.MAX_ALIAS_DEPTH) return '/* circular reference */';

  // Handle expression evaluation if present
  if (config.expression && collections && resolvedType === 'FLOAT') {
    const result = await resolveExpression(config, _modeId, variables, collections, prefix);

    if (result.value !== null && result.warnings.length === 0) {
      // Apply the configured unit/remBase to the evaluated result
      const effectiveConfig = { ...config, unit: result.unit };
      return formatNumber(result.value, effectiveConfig);
    }
    // Fall through to normal resolution if expression failed
    // Warnings are logged but we use the fallback value
    if (result.warnings.length > 0) {
      console.warn(
        `Expression evaluation warnings for "${config.expression}":`,
        result.warnings
      );
    }
  }

  // Handle variable alias - output as CSS var() reference
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'VARIABLE_ALIAS'
  ) {
    const aliasId = value.id;

    // Check for circular references
    if (visited.has(aliasId)) {
      return '/* circular reference */';
    }

    const aliasedVar = variables.find((v) => v.id === aliasId);

    if (aliasedVar) {
      const aliasedCssName = toCssName(aliasedVar.name);
      const prefixedName = toPrefixedName(aliasedCssName, prefix);
      return `var(--${prefixedName})`;
    }

    return '/* unresolved alias */';
  }

  // Handle by type
  switch (resolvedType) {
    case 'COLOR':
      if (typeof value === 'object' && value !== null && 'r' in value) {
        return formatColor(value as RGBA, config.colorFormat);
      }
      break;

    case 'FLOAT':
      if (typeof value === 'number' && Number.isFinite(value)) {
        return formatNumber(value, config);
      }
      break;

    case 'STRING':
      if (typeof value === 'string') {
        const escaped = value.replace(/"/g, '\\"');
        return `"${escaped}"`;
      }
      break;

    case 'BOOLEAN':
      if (typeof value === 'boolean') {
        return value ? '1' : '0';
      }
      break;
  }

  // Fallback: convert to string
  return String(value != null ? value : '');
}
