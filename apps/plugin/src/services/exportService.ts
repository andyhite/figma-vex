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
import { convertToCss, convertToScss, convertToTypeScript } from '@figma-vex/shared';
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
    case 'scss':
      return convertToScss(document, settings);
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
): Promise<{ document: DTCGDocument; settings: DTCGConversionSettings; export_types: ExportType[] }> {
  const styles = options.exportOptions.includeStyles ? await fetchAllStyles() : undefined;

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

  const settings = mapOptionsToSettings(options.exportOptions);

  return {
    document,
    settings,
    export_types: options.exportTypes,
  };
}
