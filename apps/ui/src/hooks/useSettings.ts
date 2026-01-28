import { useState, useEffect, useCallback, useRef } from 'react';
import { usePluginMessage } from './usePluginMessage';
import type { PluginSettings } from '@figma-vex/shared';

/**
 * Default settings used when no saved settings exist.
 */
export const DEFAULT_SETTINGS: PluginSettings = {
  prefix: '',
  selectedCollections: [],
  includeCollectionComments: true,
  includeModeComments: true, // Moved from CSS tab to global
  headerBanner: undefined,
  exportFormats: ['css', 'json', 'typescript'], // All formats selected by default
  syncCalculations: false,
  includeStyles: false,
  styleOutputMode: 'variables',
  styleTypes: ['paint', 'text', 'effect', 'grid'],
  cssSelector: ':root',
  cssUseModesAsSelectors: false,
  cssIncludeModeComments: true, // Deprecated, kept for migration
  githubRepository: '',
  githubToken: '',
  githubWorkflowFileName: 'update-variables.yml',
  remBaseVariableId: undefined,
  cssExportAsCalcExpressions: false,
  nameFormatRules: [], // Custom rules only (default is computed from prefix + casing)
  nameFormatCasing: 'kebab',
  nameFormatAdvanced: false,
  syncCodeSyntax: true,
  numberPrecision: 4,
  debugMode: false,
};

interface UseSettingsReturn {
  /** The current settings (null while loading) */
  settings: PluginSettings | null;
  /** Whether settings are still loading */
  loading: boolean;
  /** Update settings (triggers save to document) */
  updateSettings: (updates: Partial<PluginSettings>) => void;
}

/**
 * Hook for loading and saving plugin settings to the Figma document.
 */
export function useSettings(): UseSettingsReturn {
  const [settings, setSettings] = useState<PluginSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { sendMessage, listenToMessage } = usePluginMessage();

  // Track pending saves to debounce
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingSettingsRef = useRef<PluginSettings | null>(null);

  // Load settings on mount
  useEffect(() => {
    sendMessage({ type: 'load-settings' });

    const cleanup = listenToMessage((message) => {
      if (message.type === 'settings-loaded') {
        if (message.settings) {
          // Merge with defaults to handle any new settings fields
          const mergedSettings = { ...DEFAULT_SETTINGS, ...message.settings };
          // Filter out any old default rules that may have been stored
          mergedSettings.nameFormatRules = (mergedSettings.nameFormatRules || []).filter(
            (r) => r.id !== '__default__'
          );
          // Migrate cssIncludeModeComments to includeModeComments if needed
          if (
            mergedSettings.includeModeComments === undefined &&
            'cssIncludeModeComments' in message.settings
          ) {
            mergedSettings.includeModeComments = message.settings.cssIncludeModeComments ?? true;
          }
          setSettings(mergedSettings);
        } else {
          // No saved settings, use defaults
          setSettings(DEFAULT_SETTINGS);
        }
        setLoading(false);
      }
    });

    return cleanup;
  }, [sendMessage, listenToMessage]);

  // Save settings with debounce
  const saveSettings = useCallback(
    (newSettings: PluginSettings) => {
      pendingSettingsRef.current = newSettings;

      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Debounce saves to avoid excessive writes
      saveTimeoutRef.current = setTimeout(() => {
        if (pendingSettingsRef.current) {
          sendMessage({ type: 'save-settings', settings: pendingSettingsRef.current });
          pendingSettingsRef.current = null;
        }
      }, 300);
    },
    [sendMessage]
  );

  // Update settings
  const updateSettings = useCallback(
    (updates: Partial<PluginSettings>) => {
      setSettings((prev) => {
        if (!prev) return prev;
        const newSettings = { ...prev, ...updates };
        // Filter out any default rules from custom rules (default is computed)
        if (updates.nameFormatRules !== undefined) {
          newSettings.nameFormatRules = updates.nameFormatRules.filter(
            (r) => r.id !== '__default__'
          );
        }
        saveSettings(newSettings);
        return newSettings;
      });
    },
    [saveSettings]
  );

  // Cleanup timeout on unmount and flush any pending saves
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      // Flush any pending settings immediately on unmount to prevent data loss
      if (pendingSettingsRef.current) {
        sendMessage({ type: 'save-settings', settings: pendingSettingsRef.current });
        pendingSettingsRef.current = null;
      }
    };
  }, [sendMessage]);

  return {
    settings,
    loading,
    updateSettings,
  };
}
