import { useState, useEffect, useCallback, useRef } from 'react';
import { usePluginMessage } from './usePluginMessage';
import type { PluginSettings } from '@figma-vex/shared';

/**
 * Default settings used when no saved settings exist.
 */
export const DEFAULT_SETTINGS: PluginSettings = {
  activeTab: 'css',
  prefix: '',
  selectedCollections: [],
  includeCollectionComments: true,
  syncCalculations: false,
  includeStyles: false,
  styleOutputMode: 'variables',
  styleTypes: ['paint', 'text', 'effect', 'grid'],
  cssSelector: ':root',
  cssUseModesAsSelectors: false,
  cssIncludeModeComments: true,
  githubRepository: '',
  githubWorkflowFileName: 'update-variables.yml',
  githubExportTypes: ['css', 'json'],
  githubCssSelector: ':root',
  githubUseModesAsSelectors: false,
  remBaseVariableId: undefined,
  cssExportAsCalcExpressions: false,
  scssExportAsCalcExpressions: false,
  nameFormatRules: [], // Custom rules only (default is computed from prefix + casing)
  nameFormatCasing: 'kebab',
  nameFormatAdvanced: false,
  syncCodeSyntax: true,
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
          newSettings.nameFormatRules = updates.nameFormatRules.filter((r) => r.id !== '__default__');
        }
        saveSettings(newSettings);
        return newSettings;
      });
    },
    [saveSettings]
  );

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    settings,
    loading,
    updateSettings,
  };
}
