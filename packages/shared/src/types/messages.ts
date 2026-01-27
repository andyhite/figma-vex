/**
 * Shared message types for plugin <-> UI communication
 */

import type { StyleType, StyleOutputMode, StyleSummary } from './styles';

export type ExportType = 'css' | 'scss' | 'json' | 'typescript';

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
  | { type: 'export-css'; options: ExportOptions }
  | { type: 'export-scss'; options: ExportOptions }
  | { type: 'export-json'; options: ExportOptions }
  | { type: 'export-typescript'; options: ExportOptions }
  | { type: 'github-dispatch'; githubOptions: GitHubDispatchOptions }
  | { type: 'resize-window'; width?: number; height: number }
  | { type: 'cancel' }
  | { type: 'save-settings'; settings: PluginSettings }
  | { type: 'load-settings' };

// Messages from Plugin to UI
export type UIMessage =
  | { type: 'collections-list'; collections: CollectionInfo[] }
  | { type: 'styles-list'; styles: StyleSummary }
  | { type: 'css-result'; css: string }
  | { type: 'scss-result'; scss: string }
  | { type: 'json-result'; json: string }
  | { type: 'typescript-result'; typescript: string }
  | { type: 'github-dispatch-success'; message: string }
  | { type: 'error'; message: string }
  | { type: 'settings-loaded'; settings: PluginSettings | null };
