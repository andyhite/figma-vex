/**
 * Export orchestration service
 */

import type { ExportOptions, ExportType } from '@shared/types';
import { exportToCss } from '../exporters/cssExporter';
import { exportToScss } from '../exporters/scssExporter';
import { exportToJson } from '../exporters/jsonExporter';
import { exportToTypeScript } from '../exporters/typescriptExporter';
import { mergeWithDefaults } from '../utils/optionDefaults';

type ExporterFn = (
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  options: ExportOptions
) => Promise<string>;

const exporters: Record<ExportType, ExporterFn> = {
  css: exportToCss,
  scss: exportToScss,
  json: (variables, collections, _fileName, options) => exportToJson(variables, collections, options),
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

  for (const type of exportTypes) {
    const options = mergeWithDefaults(type, baseOptions);
    exports[type] = await exporters[type](variables, collections, fileName, options);
  }

  return exports as Record<ExportType, string>;
}
