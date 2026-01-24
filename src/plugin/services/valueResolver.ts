import type { TokenConfig } from '@shared/types';
import { RESOLUTION_CONFIG } from '@shared/config';
import { toCssName, toPrefixedName } from '@plugin/formatters/nameFormatter';
import { formatColor } from '@plugin/formatters/colorFormatter';
import { formatNumber } from '@plugin/formatters/numberFormatter';

/**
 * Resolves a variable value to its string representation.
 * Handles variable aliases, colors, numbers, strings, and booleans.
 *
 * Note: modeId is currently unused but reserved for future mode-aware
 * alias resolution (resolving to actual values instead of var() references).
 */
export async function resolveValue(
  value: VariableValue,
  _modeId: string,
  variables: Variable[],
  resolvedType: VariableResolvedDataType,
  config: TokenConfig,
  prefix = '',
  depth = 0,
  visited = new Set<string>()
): Promise<string> {
  // Prevent infinite recursion
  if (depth > RESOLUTION_CONFIG.MAX_ALIAS_DEPTH) return '/* circular reference */';

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
