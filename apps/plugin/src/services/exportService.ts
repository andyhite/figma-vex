/**
 * Export orchestration service
 */

import type {
  ExportOptions,
  ExportType,
  StyleCollection,
  DTCGDocument,
  DTCGConversionSettings,
} from '@figma-vex/shared';
import { convertToCss, convertToTypeScript } from '@figma-vex/shared';
import { serializeToDTCG } from '../serializers/dtcgSerializer';
import { fetchAllStyles } from './styleResolver';
import { mergeWithDefaults } from '../utils/optionDefaults';

/**
 * Maps ExportOptions to DTCGConversionSettings
 */
function mapOptionsToSettings(options: ExportOptions): DTCGConversionSettings {
  return {
    prefix: options.prefix,
    nameFormatRules: options.nameFormatRules,
    includeCollectionName: options.includeCollectionName ?? true,
    colorFormat: options.colorFormat ?? 'hex',
    defaultUnit: 'px',
    remBase: options.remBase ?? 16,
    selector: options.selector,
    useModesAsSelectors: options.useModesAsSelectors,
    includeCollectionComments: options.includeCollectionComments,
    includeModeComments: options.includeModeComments,
    exportAsCalcExpressions: options.exportAsCalcExpressions,
    includeStyles: options.includeStyles,
    styleOutputMode: options.styleOutputMode,
    styleTypes: options.styleTypes,
    selectedCollections: options.selectedCollections,
    headerBanner: options.headerBanner,
  };
}

/**
 * Converts DTCG document to a specific output format
 */
function convertToFormat(
  document: DTCGDocument,
  type: ExportType,
  settings: DTCGConversionSettings
): string {
  switch (type) {
    case 'css':
      return convertToCss(document, settings);
    case 'typescript':
      return convertToTypeScript(document, settings);
    case 'json':
      return JSON.stringify(document, null, 2);
    default:
      throw new Error(`Unsupported export type: ${type}`);
  }
}

/**
 * Generates exports for the specified formats using DTCG intermediate format
 */
export async function generateExports(
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  exportTypes: ExportType[],
  baseOptions: Partial<ExportOptions>
): Promise<Record<ExportType, string>> {
  // Fetch styles once if any export might need them
  let styles: StyleCollection | undefined;
  if (baseOptions.includeStyles) {
    styles = await fetchAllStyles();
  }

  // Step 1: Serialize to DTCG
  const document = await serializeToDTCG(
    variables,
    collections,
    fileName,
    {
      selectedCollections: baseOptions.selectedCollections,
      includeStyles: baseOptions.includeStyles,
      styleTypes: baseOptions.styleTypes,
    },
    styles
  );

  // Step 2: Convert to output formats
  const exports: Partial<Record<ExportType, string>> = {};

  for (const type of exportTypes) {
    const options = mergeWithDefaults(type, baseOptions);
    const settings = mapOptionsToSettings(options);
    exports[type] = convertToFormat(document, type, settings);
  }

  return exports as Record<ExportType, string>;
}

/**
 * Recursively strips $description fields from a DTCG token group to reduce payload size.
 * Also removes empty $extensions objects.
 */
function minimizeTokenGroup(group: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(group)) {
    if (value && typeof value === 'object') {
      if ('$type' in value && '$value' in value) {
        // It's a token - keep only essential fields
        const token = value as Record<string, unknown>;
        const minimized: Record<string, unknown> = {
          $type: token.$type,
          $value: token.$value,
        };

        // Keep extensions only if they have meaningful data (unit or expression)
        const ext = token.$extensions as Record<string, Record<string, unknown>> | undefined;
        if (ext?.['com.figma.vex']) {
          const vexExt = ext['com.figma.vex'];
          if (vexExt.unit || vexExt.expression) {
            const vexExtData: Record<string, unknown> = {};
            if (vexExt.unit) vexExtData.unit = vexExt.unit;
            if (vexExt.expression) vexExtData.expression = vexExt.expression;
            minimized.$extensions = {
              'com.figma.vex': vexExtData,
            };
          }
        }

        result[key] = minimized;
      } else {
        // It's a nested group - recurse
        result[key] = minimizeTokenGroup(value as Record<string, unknown>);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Minimizes a DTCG document for transmission by removing non-essential data.
 */
function minimizeDocument(document: DTCGDocument): DTCGDocument {
  const minimized: DTCGDocument = {
    collections: {},
    $metadata: document.$metadata,
  };

  // Minimize collections
  for (const [name, group] of Object.entries(document.collections)) {
    minimized.collections[name] = minimizeTokenGroup(
      group as Record<string, unknown>
    ) as DTCGDocument['collections'][string];
  }

  // Minimize styles if present
  if (document.$styles) {
    minimized.$styles = {};
    for (const [type, group] of Object.entries(document.$styles)) {
      if (group) {
        (minimized.$styles as Record<string, unknown>)[type] = minimizeTokenGroup(
          group as Record<string, unknown>
        );
      }
    }
  }

  return minimized;
}

/**
 * Prepares a GitHub dispatch payload with DTCG document and settings
 */
export async function prepareGitHubPayload(
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  options: {
    exportTypes: ExportType[];
    exportOptions: ExportOptions;
  }
): Promise<{
  document: DTCGDocument;
  settings: DTCGConversionSettings;
  export_types: ExportType[];
}> {
  console.log('[prepareGitHubPayload] Starting...');
  console.log('[prepareGitHubPayload] includeStyles:', options.exportOptions.includeStyles);
  console.log('[prepareGitHubPayload] styleTypes:', options.exportOptions.styleTypes);
  console.log(
    '[prepareGitHubPayload] selectedCollections:',
    options.exportOptions.selectedCollections
  );

  const styles = options.exportOptions.includeStyles ? await fetchAllStyles() : undefined;

  if (styles) {
    console.log('[prepareGitHubPayload] Fetched styles:');
    console.log('  - Paint styles:', styles.paint?.length ?? 0);
    console.log('  - Text styles:', styles.text?.length ?? 0);
    console.log('  - Effect styles:', styles.effect?.length ?? 0);
    console.log('  - Grid styles:', styles.grid?.length ?? 0);
  } else {
    console.log('[prepareGitHubPayload] No styles fetched (includeStyles is false)');
  }

  const document = await serializeToDTCG(
    variables,
    collections,
    fileName,
    {
      selectedCollections: options.exportOptions.selectedCollections,
      includeStyles: options.exportOptions.includeStyles,
      styleTypes: options.exportOptions.styleTypes,
    },
    styles
  );

  console.log('[prepareGitHubPayload] Document serialized:');
  console.log('  - Collections:', Object.keys(document.collections));
  console.log('  - $styles:', document.$styles ? Object.keys(document.$styles) : 'none');

  // Map options to settings
  const settings = mapOptionsToSettings(options.exportOptions);

  console.log(
    '[prepareGitHubPayload] Settings before ID->name conversion:',
    JSON.stringify(settings.selectedCollections)
  );

  // Convert collection IDs to names for the settings, since the document uses
  // collection names as keys and the converters filter by name
  if (settings.selectedCollections && settings.selectedCollections.length > 0) {
    const originalIds = settings.selectedCollections;
    settings.selectedCollections = settings.selectedCollections
      .map((id) => collections.find((c) => c.id === id)?.name)
      .filter((name): name is string => name !== undefined);
    console.log('[prepareGitHubPayload] Converted IDs to names:');
    console.log('  - Original IDs:', originalIds);
    console.log('  - Converted names:', settings.selectedCollections);
  }

  console.log('[prepareGitHubPayload] Final settings:', JSON.stringify(settings, null, 2));

  // Minimize document for transmission (removes descriptions, empty extensions, etc.)
  const minimizedDocument = minimizeDocument(document);

  // Log size comparison
  const originalSize = JSON.stringify(document).length;
  const minimizedSize = JSON.stringify(minimizedDocument).length;
  console.log(
    `[prepareGitHubPayload] Document size: ${originalSize} -> ${minimizedSize} bytes (${Math.round((1 - minimizedSize / originalSize) * 100)}% reduction)`
  );

  return {
    document: minimizedDocument,
    settings,
    export_types: options.exportTypes,
  };
}
