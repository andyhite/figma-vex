/**
 * Shared message types for plugin <-> UI communication
 */

import type { StyleType, StyleOutputMode, StyleSummary } from './styles';

export type ExportType = 'css' | 'scss' | 'json' | 'typescript';

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
 * Plugin settings that get persisted to the document.
 * Note: GitHub token is intentionally excluded for security.
 */
export interface PluginSettings {
  // Global settings
  activeTab: string;
  prefix: string;
  selectedCollections: string[];
  includeCollectionComments: boolean;

  // Calculation settings
  syncCalculations: boolean;

  // Style export options
  includeStyles: boolean;
  styleOutputMode: StyleOutputMode;
  styleTypes: StyleType[];

  // CSS tab settings
  cssSelector: string;
  cssUseModesAsSelectors: boolean;
  cssIncludeModeComments: boolean;

  // GitHub tab settings (excluding token for security)
  githubRepository: string;
  githubWorkflowFileName: string;
  githubExportTypes: ExportType[];
  githubCssSelector: string;
  githubUseModesAsSelectors: boolean;

  // Rem base variable (global setting)
  remBaseVariableId?: string;

  // CSS tab settings
  cssExportAsCalcExpressions: boolean;

  // SCSS tab settings
  scssExportAsCalcExpressions: boolean;

  // Name format override settings (global)
  nameFormatRules: NameFormatRule[];
  syncCodeSyntax: boolean;
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
}

export interface GitHubDispatchOptions {
  repository: string;
  token: string;
  workflowFileName?: string;
  exportTypes: ExportType[];
  exportOptions: ExportOptions;
}

export interface CollectionInfo {
  id: string;
  name: string;
}

// Messages from UI to Plugin
export type PluginMessage =
  | { type: 'get-collections' }
  | { type: 'get-styles' }
  | { type: 'get-numeric-variables' }
  | { type: 'export-css'; options: ExportOptions }
  | { type: 'export-scss'; options: ExportOptions }
  | { type: 'export-json'; options: ExportOptions }
  | { type: 'export-typescript'; options: ExportOptions }
  | { type: 'github-dispatch'; githubOptions: GitHubDispatchOptions }
  | { type: 'resize-window'; width?: number; height: number }
  | { type: 'cancel' }
  | { type: 'save-settings'; settings: PluginSettings }
  | { type: 'load-settings' }
  | { type: 'sync-calculations'; options: ExportOptions }
  | { type: 'sync-code-syntax'; options: { nameFormatRules: NameFormatRule[]; prefix?: string } };

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
  | { type: 'css-result'; css: string }
  | { type: 'scss-result'; scss: string }
  | { type: 'json-result'; json: string }
  | { type: 'typescript-result'; typescript: string }
  | { type: 'github-dispatch-success'; message: string }
  | { type: 'error'; message: string }
  | { type: 'settings-loaded'; settings: PluginSettings | null }
  | { type: 'sync-result'; synced: number; failed: number; warnings: string[] }
  | { type: 'sync-code-syntax-result'; synced: number; skipped: number };
