/**
 * Shared message types for plugin <-> UI communication
 */

import type { StyleType, StyleOutputMode, StyleSummary } from './styles';
import type { ColorFormat } from './tokens';

export type ExportType = 'css' | 'json' | 'typescript';

/**
 * Pattern-based rule for transforming Figma variable names to custom CSS variable names.
 */
export interface NameFormatRule {
  id: string; // Unique identifier for reordering/deletion
  pattern: string; // Glob pattern, e.g., "color/*/alpha/*"
  replacement: string; // Template, e.g., "color-$1-a$2"
  enabled: boolean; // Allow toggling rules on/off
}

/**
 * Casing options for variable name formatting
 */
export type CasingOption = 'kebab' | 'snake' | 'camel' | 'pascal' | 'lower' | 'upper';

/**
 * Computes the default rule replacement from prefix and casing.
 * The separator between prefix and content matches the casing convention:
 * - kebab: hyphen (-)
 * - snake/upper: underscore (_)
 * - camel/pascal: no separator
 * - lower: hyphen (CSS convention)
 *
 * @param prefix - Optional prefix to prepend
 * @param casing - Casing option
 * @returns Replacement string for the default ** rule
 */
export function computeDefaultReplacement(prefix: string, casing: CasingOption): string {
  if (!prefix) {
    return `\${1:${casing}}`;
  }

  switch (casing) {
    case 'kebab':
      // kebab-case: prefix-content
      return `${prefix}-\${1:kebab}`;
    case 'snake':
      // snake_case: prefix_content
      return `${prefix}_\${1:snake}`;
    case 'camel':
      // camelCase: prefixContent (use pascal for content so first char is uppercase)
      return `${prefix}\${1:pascal}`;
    case 'pascal': {
      // PascalCase: PrefixContent (capitalize prefix)
      const pascalPrefix = prefix.charAt(0).toUpperCase() + prefix.slice(1).toLowerCase();
      return `${pascalPrefix}\${1:pascal}`;
    }
    case 'lower':
      // lowercase: prefix-content (kebab-style, all lowercase)
      return `${prefix.toLowerCase()}-\${1:kebab}`;
    case 'upper':
      // UPPERCASE: PREFIX_CONTENT (screaming snake_case)
      return `${prefix.toUpperCase()}_\${1:snake}`;
    default:
      return `${prefix}-\${1:${casing}}`;
  }
}

/**
 * Creates the default rule based on prefix and casing settings.
 * The default rule always has pattern ** and is always enabled.
 */
export function createDefaultRule(prefix: string, casing: CasingOption): NameFormatRule {
  return {
    id: '__default__',
    pattern: '**',
    replacement: computeDefaultReplacement(prefix, casing),
    enabled: true,
  };
}

/**
 * Gets all rules including the computed default rule at the end.
 * @param customRules - User-defined custom rules
 * @param prefix - Prefix for default rule
 * @param casing - Casing for default rule
 * @returns All rules with default rule appended
 */
export function getAllRulesWithDefault(
  customRules: NameFormatRule[],
  prefix: string,
  casing: CasingOption
): NameFormatRule[] {
  // Filter out any accidentally stored default rules
  const filteredRules = customRules.filter((r) => r.id !== '__default__');
  return [...filteredRules, createDefaultRule(prefix, casing)];
}

/**
 * Plugin settings that get persisted to the document.
 */
export interface PluginSettings {
  // Global settings
  prefix: string;
  selectedCollections: string[];
  includeCollectionComments: boolean;
  includeModeComments: boolean; // Moved from CSS tab to global settings
  headerBanner?: string; // Custom header banner text for exports

  // Export format selection
  exportFormats: ExportType[];

  // Calculation settings
  syncCalculations: boolean;

  // Style export options
  includeStyles: boolean;
  styleOutputMode: StyleOutputMode;
  styleTypes: StyleType[];

  // CSS tab settings
  cssSelector: string;
  cssUseModesAsSelectors: boolean;
  cssIncludeModeComments: boolean; // Deprecated - kept for migration, use includeModeComments instead

  // GitHub settings
  githubRepository: string;
  githubToken: string;

  // Rem base variable (global setting)
  remBaseVariableId?: string;

  // CSS tab settings
  cssExportAsCalcExpressions: boolean;

  // Name format settings (global)
  nameFormatRules: NameFormatRule[]; // Custom rules only (default rule is computed)
  nameFormatCasing: CasingOption;
  nameFormatAdvanced: boolean; // Whether to show advanced rules UI
  syncCodeSyntax: boolean;

  // Number formatting
  numberPrecision: number;

  // Debug settings
  debugMode: boolean;
}

export interface ExportOptions {
  includeCollectionComments: boolean;
  includeModeComments: boolean;
  selector: string;
  useModesAsSelectors: boolean;
  prefix?: string;
  selectedCollections?: string[];
  // Style export options
  includeStyles?: boolean;
  styleOutputMode?: StyleOutputMode;
  styleTypes?: StyleType[];
  // Calculation settings
  syncCalculations?: boolean;
  // Expression export mode
  exportAsCalcExpressions?: boolean;
  remBaseVariableId?: string;
  // Name format override rules
  nameFormatRules?: NameFormatRule[];
  // Sync code syntax to Figma before export
  syncCodeSyntax?: boolean;
  // Custom header banner (overrides default auto-generated header)
  headerBanner?: string;
  // Color format for output (default: 'hex')
  colorFormat?: ColorFormat;
  // Base value for rem calculations (default: 16)
  remBase?: number;
  // Number of decimal places for float values (default: 4)
  numberPrecision?: number;
}

export interface GitHubDispatchOptions {
  repository: string;
  token: string;
  exportTypes: ExportType[];
  exportOptions: ExportOptions;
}

export interface CollectionInfo {
  id: string;
  name: string;
}

/**
 * Settings that can be exported/imported (excludes UI state and sensitive data).
 * Uses names instead of IDs for portability across documents.
 * Note: githubToken is excluded for security - never export tokens.
 */
export type ExportableSettings = Omit<
  PluginSettings,
  'selectedCollections' | 'remBaseVariableId' | 'githubToken'
> & {
  selectedCollections: string[]; // Collection names instead of IDs
  remBaseVariable?: string; // Variable path instead of ID
};

/**
 * Settings export file format.
 */
export interface SettingsExportFile {
  version: number;
  exportedAt: string; // ISO 8601 timestamp
  settings: ExportableSettings;
}

// Messages from UI to Plugin
export type PluginMessage =
  | { type: 'get-collections' }
  | { type: 'get-styles' }
  | { type: 'get-numeric-variables' }
  | { type: 'get-variable-names' }
  | { type: 'export-css'; options: ExportOptions }
  | { type: 'export-json'; options: ExportOptions }
  | { type: 'export-typescript'; options: ExportOptions }
  | { type: 'github-dispatch'; githubOptions: GitHubDispatchOptions }
  | { type: 'resize-window'; width?: number; height: number }
  | { type: 'cancel' }
  | { type: 'save-settings'; settings: PluginSettings }
  | { type: 'load-settings' }
  | { type: 'sync-calculations'; options: ExportOptions }
  | { type: 'sync-code-syntax'; options: { nameFormatRules: NameFormatRule[]; prefix?: string } }
  | { type: 'reset-code-syntax' }
  | { type: 'resolve-collection-names'; names: string[] }
  | { type: 'resolve-variable-path'; path: string };

export interface NumericVariableInfo {
  id: string;
  name: string;
  path: string; // Collection/Group/Variable format
}

// Messages from Plugin to UI
export type UIMessage =
  | { type: 'collections-list'; collections: CollectionInfo[] }
  | { type: 'styles-list'; styles: StyleSummary }
  | { type: 'numeric-variables-list'; variables: NumericVariableInfo[] }
  | { type: 'variable-names-list'; names: string[] }
  | { type: 'css-result'; css: string }
  | { type: 'json-result'; json: string }
  | { type: 'typescript-result'; typescript: string }
  | { type: 'github-dispatch-success'; message: string }
  | { type: 'error'; message: string }
  | { type: 'settings-loaded'; settings: PluginSettings | null }
  | { type: 'sync-result'; synced: number; failed: number; warnings: string[] }
  | { type: 'sync-code-syntax-result'; synced: number; skipped: number }
  | { type: 'reset-code-syntax-result'; reset: number; skipped: number }
  | { type: 'collection-names-resolved'; results: Array<{ name: string; id: string | null }> }
  | { type: 'variable-path-resolved'; path: string; id: string | null };
