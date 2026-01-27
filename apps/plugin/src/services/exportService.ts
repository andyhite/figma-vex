/**
 * Export orchestration service
 */

import type { ExportOptions, ExportType, StyleCollection } from '@figma-vex/shared';
import { exportToCss } from '../exporters/cssExporter';
import { exportToScss } from '../exporters/scssExporter';
import { exportToJson } from '../exporters/jsonExporter';
import { exportToTypeScript } from '../exporters/typescriptExporter';
import { mergeWithDefaults } from '../utils/optionDefaults';
import { fetchAllStyles } from './styleResolver';

type ExporterFn = (
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  options: ExportOptions,
  styles?: StyleCollection
) => Promise<string>;

const exporters: Record<ExportType, ExporterFn> = {
  css: exportToCss,
  scss: exportToScss,
  json: (variables, collections, _fileName, options, styles) =>
    exportToJson(variables, collections, options, styles),
  typescript: exportToTypeScript,
};

/**
 * Generates exports for the specified formats
 */
export async function generateExports(
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  exportTypes: ExportType[],
  baseOptions: Partial<ExportOptions>
): Promise<Record<ExportType, string>> {
  const exports: Partial<Record<ExportType, string>> = {};

  // Fetch styles once if any export might need them
  let styles: StyleCollection | undefined;
  if (baseOptions.includeStyles) {
    styles = await fetchAllStyles();
  }

  for (const type of exportTypes) {
    const options = mergeWithDefaults(type, baseOptions);
    exports[type] = await exporters[type](variables, collections, fileName, options, styles);
  }

  return exports as Record<ExportType, string>;
}
