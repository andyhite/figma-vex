import { useCallback } from 'react';
import { usePluginMessage } from './usePluginMessage';
import type {
  PluginSettings,
  ExportableSettings,
  SettingsExportFile,
  CollectionInfo,
} from '@figma-vex/shared';

const SETTINGS_EXPORT_VERSION = 1;
const DEFAULT_FILENAME = 'figma-vex-settings.json';
const VARIABLE_RESOLUTION_TIMEOUT_MS = 5000;

/**
 * Converts ExportableSettings back to PluginSettings format.
 */
function convertToPluginSettings(
  settings: ExportableSettings,
  resolvedCollectionIds: string[],
  resolvedRemBaseVariableId?: string
): PluginSettings {
  return {
    activeTab: 'settings', // Default to settings tab
    prefix: settings.prefix,
    selectedCollections: resolvedCollectionIds,
    includeCollectionComments: settings.includeCollectionComments,
    syncCalculations: settings.syncCalculations,
    includeStyles: settings.includeStyles,
    styleOutputMode: settings.styleOutputMode,
    styleTypes: settings.styleTypes,
    cssSelector: settings.cssSelector,
    cssUseModesAsSelectors: settings.cssUseModesAsSelectors,
    cssIncludeModeComments: settings.cssIncludeModeComments,
    githubRepository: settings.githubRepository,
    githubWorkflowFileName: settings.githubWorkflowFileName,
    githubExportTypes: settings.githubExportTypes,
    githubCssSelector: settings.githubCssSelector,
    githubUseModesAsSelectors: settings.githubUseModesAsSelectors,
    remBaseVariableId: resolvedRemBaseVariableId,
    cssExportAsCalcExpressions: settings.cssExportAsCalcExpressions,
    scssExportAsCalcExpressions: settings.scssExportAsCalcExpressions,
    nameFormatRules: settings.nameFormatRules,
    syncCodeSyntax: settings.syncCodeSyntax,
  };
}

interface ImportResult {
  success: boolean;
  settings?: PluginSettings;
  warnings?: string[];
  error?: string;
}

interface UseSettingsExportOptions {
  collections: CollectionInfo[];
  remBaseVariablePath?: string; // Path for remBaseVariableId (Collection/Variable format)
}

/**
 * Hook for exporting and importing plugin settings.
 */
export function useSettingsExport({ collections, remBaseVariablePath }: UseSettingsExportOptions) {
  const { sendMessage, listenToMessage } = usePluginMessage();

  /**
   * Exports current settings to a JSON file.
   */
  const exportSettings = useCallback(
    (settings: PluginSettings) => {
      // Convert collection IDs to names
      const collectionMap = new Map(collections.map((c) => [c.id, c.name]));
      const selectedCollectionNames = settings.selectedCollections
        .map((id) => collectionMap.get(id))
        .filter((name): name is string => name !== undefined);

      // Create exportable settings (omit activeTab, convert IDs to names, convert variable ID to path)
      const exportableSettings: ExportableSettings = {
        prefix: settings.prefix,
        selectedCollections: selectedCollectionNames,
        includeCollectionComments: settings.includeCollectionComments,
        syncCalculations: settings.syncCalculations,
        includeStyles: settings.includeStyles,
        styleOutputMode: settings.styleOutputMode,
        styleTypes: settings.styleTypes,
        cssSelector: settings.cssSelector,
        cssUseModesAsSelectors: settings.cssUseModesAsSelectors,
        cssIncludeModeComments: settings.cssIncludeModeComments,
        githubRepository: settings.githubRepository,
        githubWorkflowFileName: settings.githubWorkflowFileName,
        githubExportTypes: settings.githubExportTypes,
        githubCssSelector: settings.githubCssSelector,
        githubUseModesAsSelectors: settings.githubUseModesAsSelectors,
        remBaseVariable: remBaseVariablePath,
        cssExportAsCalcExpressions: settings.cssExportAsCalcExpressions,
        scssExportAsCalcExpressions: settings.scssExportAsCalcExpressions,
        nameFormatRules: settings.nameFormatRules,
        syncCodeSyntax: settings.syncCodeSyntax,
      };

      const exportFile: SettingsExportFile = {
        version: SETTINGS_EXPORT_VERSION,
        exportedAt: new Date().toISOString(),
        settings: exportableSettings,
      };

      // Create blob and trigger download
      const blob = new Blob([JSON.stringify(exportFile, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = DEFAULT_FILENAME;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    [collections, remBaseVariablePath]
  );

  /**
   * Imports settings from a JSON file.
   * Returns a promise that resolves with the import result.
   */
  const importSettings = useCallback(
    async (file: File): Promise<ImportResult> => {
      try {
        // Read file content
        const text = await file.text();
        let parsed: unknown;

        try {
          parsed = JSON.parse(text);
        } catch {
          return {
            success: false,
            error: 'Invalid file format. Expected JSON.',
          };
        }

        // Validate structure
        if (
          !parsed ||
          typeof parsed !== 'object' ||
          !('version' in parsed) ||
          !('settings' in parsed)
        ) {
          return {
            success: false,
            error: 'Invalid file format. Missing required fields.',
          };
        }

        const exportFile = parsed as SettingsExportFile;

        // Check version
        if (exportFile.version !== SETTINGS_EXPORT_VERSION) {
          return {
            success: false,
            error: `Unsupported settings file version. Expected version ${SETTINGS_EXPORT_VERSION}.`,
          };
        }

        // Validate settings structure
        const settings = exportFile.settings;
        if (!settings || typeof settings !== 'object') {
          return {
            success: false,
            error: 'No valid settings found in file.',
          };
        }

        // Validate field types
        const warnings: string[] = [];

        // Validate selectedCollections is an array of strings
        if (!Array.isArray(settings.selectedCollections)) {
          return {
            success: false,
            error: 'Invalid settings: selectedCollections must be an array.',
          };
        }

        // Validate styleTypes is an array of valid types
        if (
          !Array.isArray(settings.styleTypes) ||
          !settings.styleTypes.every((t) => ['paint', 'text', 'effect', 'grid'].includes(t))
        ) {
          return {
            success: false,
            error: 'Invalid settings: styleTypes must be an array of valid style types.',
          };
        }

        // Resolve collection names to IDs
        const collectionNameMap = new Map(collections.map((c) => [c.name, c.id]));
        const resolvedCollectionIds: string[] = [];
        const unresolvedCollectionNames: string[] = [];

        for (const name of settings.selectedCollections) {
          const id = collectionNameMap.get(name);
          if (id) {
            resolvedCollectionIds.push(id);
          } else {
            unresolvedCollectionNames.push(name);
          }
        }

        if (unresolvedCollectionNames.length > 0) {
          warnings.push(
            `Collection${unresolvedCollectionNames.length > 1 ? 's' : ''} not found: ${unresolvedCollectionNames.map((n) => `"${n}"`).join(', ')}`
          );
        }

        // Resolve variable path to ID (if set)
        if (settings.remBaseVariable) {
          // Send message to resolve variable path with timeout
          return new Promise((resolve) => {
            let resolved = false;
            let cleanup: (() => void) | null = null;

            const timeoutId = setTimeout(() => {
              if (!resolved) {
                resolved = true;
                cleanup?.();
                warnings.push(
                  `Variable path "${settings.remBaseVariable}" resolution timed out - skipping`
                );
                const resolvedSettings = convertToPluginSettings(
                  settings,
                  resolvedCollectionIds,
                  undefined
                );
                resolve({
                  success: true,
                  settings: resolvedSettings,
                  warnings: warnings.length > 0 ? warnings : undefined,
                });
              }
            }, VARIABLE_RESOLUTION_TIMEOUT_MS);

            cleanup = listenToMessage((message) => {
              if (
                message.type === 'variable-path-resolved' &&
                message.path === settings.remBaseVariable
              ) {
                if (!resolved) {
                  resolved = true;
                  clearTimeout(timeoutId);
                  cleanup?.();

                  let resolvedRemBaseVariableId: string | undefined = undefined;
                  if (message.id) {
                    resolvedRemBaseVariableId = message.id;
                  } else {
                    warnings.push(`Variable path "${settings.remBaseVariable}" not found`);
                  }

                  const resolvedSettings = convertToPluginSettings(
                    settings,
                    resolvedCollectionIds,
                    resolvedRemBaseVariableId
                  );

                  resolve({
                    success: true,
                    settings: resolvedSettings,
                    warnings: warnings.length > 0 ? warnings : undefined,
                  });
                }
              }
            });

            sendMessage({ type: 'resolve-variable-path', path: settings.remBaseVariable });
          });
        } else {
          // No variable to resolve, return immediately
          const resolvedSettings = convertToPluginSettings(settings, resolvedCollectionIds, undefined);

          return {
            success: true,
            settings: resolvedSettings,
            warnings: warnings.length > 0 ? warnings : undefined,
          };
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to import settings',
        };
      }
    },
    [collections, sendMessage, listenToMessage]
  );

  return {
    exportSettings,
    importSettings,
  };
}
