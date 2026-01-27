import type { ExportOptions } from '@figma-vex/shared';
import { rgbToHex } from '@plugin/formatters/colorFormatter';
import { parseDescription } from '@plugin/utils/descriptionParser';
import { filterCollections, getCollectionVariablesByName } from '@plugin/utils/collectionUtils';

/**
 * Formats a raw value for JSON export (Style Dictionary compatible).
 */
function formatRawValue(
  value: VariableValue,
  type: VariableResolvedDataType,
  variables: Variable[]
): unknown {
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'VARIABLE_ALIAS'
  ) {
    const aliasedVar = variables.find((v) => v.id === value.id);
    if (aliasedVar) {
      const tokenPath = aliasedVar.name.split('/').join('.');
      return `{${tokenPath}}`;
    }
    return `{${value.id}}`;
  }

  if (type === 'COLOR' && typeof value === 'object' && value !== null && 'r' in value) {
    return rgbToHex(value as RGBA);
  }

  return value;
}

/**
 * Exports variables to JSON format (DTCG compatible).
 */
export async function exportToJson(
  variables: Variable[],
  collections: VariableCollection[],
  options?: ExportOptions
): Promise<string> {
  const filteredCollections = filterCollections(
    collections,
    options != null ? options.selectedCollections : undefined
  );

  const result: Record<string, unknown> = {};

  for (const collection of filteredCollections) {
    const collectionData: Record<string, unknown> = {};
    const collectionVars = getCollectionVariablesByName(variables, collection.id);

    for (const variable of collectionVars) {
      const config = parseDescription(variable.description);
      const pathParts = variable.name.split('/');

      // Build nested structure
      let current = collectionData as Record<string, unknown>;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }

      const leafName = pathParts[pathParts.length - 1];
      const defaultModeId = collection.defaultModeId;
      const rawValue = variable.valuesByMode[defaultModeId];

      // Build token object (DTCG format)
      const token: Record<string, unknown> = {
        $type: variable.resolvedType.toLowerCase(),
        ...(variable.description && { $description: variable.description }),
      };

      // Add value(s)
      if (collection.modes.length === 1) {
        token.$value = formatRawValue(rawValue, variable.resolvedType, variables);
      } else {
        token.$value = Object.fromEntries(
          collection.modes.map((mode) => [
            mode.name,
            formatRawValue(variable.valuesByMode[mode.modeId], variable.resolvedType, variables),
          ])
        );
      }

      // Add unit extension if non-default
      if (config.unit && config.unit !== 'px') {
        token.$extensions = {
          'com.figma.vex': { unit: config.unit },
        };
      }

      current[leafName] = token;
    }

    result[collection.name] = collectionData;
  }

  return JSON.stringify(result, null, 2);
}
