/**
 * Export option defaults for each format
 */

import type { ExportOptions, ExportType } from '@figma-vex/shared';
import { DEFAULT_CSS_SELECTOR } from '@figma-vex/shared';

/**
 * Base default options shared across formats
 */
const baseDefaults: ExportOptions = {
  includeCollectionComments: true,
  includeModeComments: true,
  selector: DEFAULT_CSS_SELECTOR,
  useModesAsSelectors: false,
};

/**
 * Format-specific default overrides
 */
const formatOverrides: Record<ExportType, Partial<ExportOptions>> = {
  css: {},
  json: {},
  typescript: {
    includeCollectionComments: false,
    includeModeComments: false,
  },
};

/**
 * Gets the default options for a specific export format
 */
export function getDefaultOptionsForFormat(format: ExportType): ExportOptions {
  return {
    ...baseDefaults,
    ...formatOverrides[format],
  };
}

/**
 * Merges provided options with format-specific defaults
 */
export function mergeWithDefaults(
  format: ExportType,
  provided?: Partial<ExportOptions>
): ExportOptions {
  const defaults = getDefaultOptionsForFormat(format);
  if (!provided) {
    return defaults;
  }
  return {
    ...defaults,
    ...provided,
  };
}

/**
 * Gets base default options (for backwards compatibility)
 */
export function getDefaultOptions(): ExportOptions {
  return { ...baseDefaults };
}
