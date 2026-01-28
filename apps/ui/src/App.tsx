import { useState, useRef, useCallback } from 'react';
import { TabBar } from './components/tabs/TabBar';
import { TabPanel } from './components/tabs/TabPanel';
import { ExportTab } from './components/tabs/ExportTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { HelpTab } from './components/tabs/HelpTab';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ImportSettingsModal } from './components/common/ImportSettingsModal';
import { ConfirmModal } from './components/common/ConfirmModal';
import { useAutoResize } from './hooks/useAutoResize';
import { useCollections } from './hooks/useCollections';
import { useStyles } from './hooks/useStyles';
import { useSettings, DEFAULT_SETTINGS } from './hooks/useSettings';
import { useNumericVariables } from './hooks/useNumericVariables';
import { useSettingsExport } from './hooks/useSettingsExport';
import type { StyleType, StyleOutputMode, PluginSettings } from '@figma-vex/shared';
import { getAllRulesWithDefault } from '@figma-vex/shared';

const TABS = [
  { id: 'export', label: 'Generate' },
  { id: 'settings', label: 'Settings' },
  { id: 'help', label: 'Help' },
];

const TAB_DESCRIPTIONS: Record<string, string> = {
  export: 'Generate CSS, JSON, or TypeScript exports from your Figma variables.',
  settings: 'Configure global export settings that apply to all export formats.',
  help: 'Learn how to configure variable exports using description fields.',
};

export default function App() {
  // Load persisted settings
  const { settings, updateSettings } = useSettings();

  // Local UI state (not persisted)
  const [activeTab, setActiveTab] = useState('export');
  const prefix = settings?.prefix ?? DEFAULT_SETTINGS.prefix;
  const includeCollectionComments =
    settings?.includeCollectionComments ?? DEFAULT_SETTINGS.includeCollectionComments;
  const includeModeComments = settings?.includeModeComments ?? DEFAULT_SETTINGS.includeModeComments;
  const headerBanner = settings?.headerBanner ?? DEFAULT_SETTINGS.headerBanner;
  const syncCalculations = settings?.syncCalculations ?? DEFAULT_SETTINGS.syncCalculations;
  const includeStyles = settings?.includeStyles ?? DEFAULT_SETTINGS.includeStyles;
  const styleOutputMode = settings?.styleOutputMode ?? DEFAULT_SETTINGS.styleOutputMode;
  const styleTypes = settings?.styleTypes ?? DEFAULT_SETTINGS.styleTypes;
  const remBaseVariableId =
    settings?.remBaseVariableId ?? DEFAULT_SETTINGS.remBaseVariableId ?? null;
  const cssExportAsCalcExpressions =
    settings?.cssExportAsCalcExpressions ?? DEFAULT_SETTINGS.cssExportAsCalcExpressions;
  const nameFormatRules = settings?.nameFormatRules ?? DEFAULT_SETTINGS.nameFormatRules;
  const nameFormatCasing = settings?.nameFormatCasing ?? DEFAULT_SETTINGS.nameFormatCasing;
  const nameFormatAdvanced = settings?.nameFormatAdvanced ?? DEFAULT_SETTINGS.nameFormatAdvanced;
  const syncCodeSyntax = settings?.syncCodeSyntax ?? DEFAULT_SETTINGS.syncCodeSyntax;
  const numberPrecision = settings?.numberPrecision ?? DEFAULT_SETTINGS.numberPrecision;
  const debugMode = settings?.debugMode ?? DEFAULT_SETTINGS.debugMode;
  const exportFormats = settings?.exportFormats ?? DEFAULT_SETTINGS.exportFormats;

  // Local UI state for settings sub-tab (not persisted)
  const [activeSettingsTab, setActiveSettingsTab] = useState('general');

  // Compute full rules including the default rule (for exports)
  const allNameFormatRules = getAllRulesWithDefault(nameFormatRules, prefix, nameFormatCasing);

  // Collections with restored selections
  const {
    collections,
    selectedCollections,
    toggleCollection,
    loading: collectionsLoading,
  } = useCollections({
    initialSelectedCollections: settings?.selectedCollections,
  });

  const containerRef = useAutoResize([activeTab]);
  const { styleCounts, loading: stylesLoading } = useStyles();
  const { variables: numericVariables } = useNumericVariables();

  // Import modal state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [importError, setImportError] = useState<string | undefined>();
  const [importLoading, setImportLoading] = useState(false);
  const [pendingImportSettings, setPendingImportSettings] = useState<PluginSettings | null>(null);
  const [importFilename, setImportFilename] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset confirmation state
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);

  // Get remBaseVariablePath for export
  const remBaseVariablePath =
    remBaseVariableId && numericVariables.length > 0
      ? numericVariables.find((v) => v.id === remBaseVariableId)?.path
      : undefined;

  // Settings export/import hook
  const { exportSettings, importSettings } = useSettingsExport({
    collections,
    remBaseVariablePath,
  });

  // Update handlers that persist to settings
  const handleTabChange = (tab: string) => setActiveTab(tab);
  const handlePrefixChange = (value: string) => updateSettings({ prefix: value });
  const handleIncludeCollectionCommentsChange = (value: boolean) =>
    updateSettings({ includeCollectionComments: value });
  const handleIncludeModeCommentsChange = (value: boolean) =>
    updateSettings({ includeModeComments: value });
  const handleHeaderBannerChange = (value: string) =>
    updateSettings({ headerBanner: value || undefined });
  const handleIncludeStylesChange = (value: boolean) => updateSettings({ includeStyles: value });
  const handleStyleOutputModeChange = (value: StyleOutputMode) =>
    updateSettings({ styleOutputMode: value });
  const handleStyleTypesChange = (value: StyleType[]) => updateSettings({ styleTypes: value });
  const handleRemBaseVariableChange = (id: string | null) =>
    updateSettings({ remBaseVariableId: id || undefined });
  const handleNameFormatRulesChange = (rules: import('@figma-vex/shared').NameFormatRule[]) =>
    updateSettings({ nameFormatRules: rules });
  const handleNameFormatCasingChange = (casing: import('@figma-vex/shared').CasingOption) =>
    updateSettings({ nameFormatCasing: casing });
  const handleNameFormatAdvancedChange = (enabled: boolean) =>
    updateSettings({ nameFormatAdvanced: enabled });
  const handleSyncCodeSyntaxChange = (enabled: boolean) =>
    updateSettings({ syncCodeSyntax: enabled });
  const handleNumberPrecisionChange = (precision: number) =>
    updateSettings({ numberPrecision: precision });
  const handleCssExportAsCalcExpressionsChange = (value: boolean) =>
    updateSettings({ cssExportAsCalcExpressions: value });
  const handleCssUseModesAsSelectorsChange = (value: boolean) =>
    updateSettings({ cssUseModesAsSelectors: value });
  const handleDebugModeChange = (enabled: boolean) => updateSettings({ debugMode: enabled });
  const handleActiveSettingsTabChange = (tab: string) => setActiveSettingsTab(tab);
  const handleExportFormatsChange = (formats: import('@figma-vex/shared').ExportType[]) =>
    updateSettings({ exportFormats: formats });

  // Handle collection toggle and persist
  const handleToggleCollection = (collectionId: string) => {
    toggleCollection(collectionId);
    // Update settings with new selection
    const newSelected = selectedCollections.includes(collectionId)
      ? selectedCollections.filter((id) => id !== collectionId)
      : [...selectedCollections, collectionId];
    updateSettings({ selectedCollections: newSelected });
  };

  // Export settings handler
  const handleExportSettings = useCallback(() => {
    if (!settings) return;
    exportSettings(settings);
  }, [settings, exportSettings]);

  // Import settings handler - opens file picker
  const handleImportSettings = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // Handle file selection for import
  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setImportFilename(file.name);
      setImportError(undefined);
      setImportLoading(true);
      setImportModalOpen(true);

      // Import and validate settings
      const result = await importSettings(file);

      setImportLoading(false);

      if (!result.success) {
        setImportError(result.error || 'Failed to import settings');
        return;
      }

      // Store pending settings and warnings
      if (result.settings) {
        setPendingImportSettings(result.settings);
        setImportWarnings(result.warnings || []);
      }
    },
    [importSettings]
  );

  // Confirm import - apply settings
  const handleConfirmImport = useCallback(() => {
    if (pendingImportSettings) {
      // Apply all settings at once
      updateSettings(pendingImportSettings);
      setImportModalOpen(false);
      setPendingImportSettings(null);
      setImportWarnings([]);
      setImportFilename('');
    }
  }, [pendingImportSettings, updateSettings]);

  // Cancel import
  const handleCancelImport = useCallback(() => {
    setImportModalOpen(false);
    setPendingImportSettings(null);
    setImportWarnings([]);
    setImportError(undefined);
    setImportFilename('');
  }, []);

  // Reset settings - show confirmation
  const handleResetSettings = useCallback(() => {
    setResetConfirmOpen(true);
  }, []);

  // Confirm reset - apply defaults
  const handleConfirmReset = useCallback(() => {
    updateSettings(DEFAULT_SETTINGS);
    setResetConfirmOpen(false);
  }, [updateSettings]);

  // Cancel reset
  const handleCancelReset = useCallback(() => {
    setResetConfirmOpen(false);
  }, []);

  return (
    <div ref={containerRef} className="bg-figma-bg text-figma-text">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <ImportSettingsModal
        isOpen={importModalOpen}
        onClose={handleCancelImport}
        onConfirm={handleConfirmImport}
        filename={importFilename}
        warnings={importWarnings}
        error={importError}
        loading={importLoading}
      />
      <ConfirmModal
        isOpen={resetConfirmOpen}
        onClose={handleCancelReset}
        onConfirm={handleConfirmReset}
        title="Reset Settings"
        message="This will reset all settings to their default values. This action cannot be undone."
        confirmLabel="Reset"
        variant="danger"
      />
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab !== 'help' && (
        <div className="text-figma-text-secondary px-4 pb-4 text-xs">
          {TAB_DESCRIPTIONS[activeTab]}
        </div>
      )}

      <TabPanel id="export" activeTab={activeTab}>
        <ErrorBoundary>
          <ExportTab
            selectedFormats={exportFormats}
            onSelectedFormatsChange={handleExportFormatsChange}
            prefix={prefix}
            selectedCollections={selectedCollections}
            includeCollectionComments={includeCollectionComments}
            includeModeComments={includeModeComments}
            headerBanner={headerBanner}
            syncCalculations={syncCalculations}
            includeStyles={includeStyles}
            styleOutputMode={styleOutputMode}
            styleTypes={styleTypes}
            remBaseVariableId={remBaseVariableId}
            nameFormatRules={allNameFormatRules}
            syncCodeSyntax={syncCodeSyntax}
            numberPrecision={numberPrecision}
            useModesAsSelectors={settings?.cssUseModesAsSelectors ?? false}
            exportAsCalcExpressions={cssExportAsCalcExpressions}
            selector={settings?.cssSelector ?? ':root'}
            githubRepository={settings?.githubRepository ?? ''}
            githubToken={settings?.githubToken ?? ''}
          />
        </ErrorBoundary>
      </TabPanel>

      <TabPanel id="settings" activeTab={activeTab}>
        <ErrorBoundary>
          <SettingsTab
            prefix={prefix}
            onPrefixChange={handlePrefixChange}
            collections={collections}
            selectedCollections={selectedCollections}
            onToggleCollection={handleToggleCollection}
            collectionsLoading={collectionsLoading}
            includeCollectionComments={includeCollectionComments}
            onIncludeCollectionCommentsChange={handleIncludeCollectionCommentsChange}
            includeModeComments={includeModeComments}
            onIncludeModeCommentsChange={handleIncludeModeCommentsChange}
            headerBanner={headerBanner}
            onHeaderBannerChange={handleHeaderBannerChange}
            remBaseVariableId={remBaseVariableId}
            onRemBaseVariableChange={handleRemBaseVariableChange}
            numberPrecision={numberPrecision}
            onNumberPrecisionChange={handleNumberPrecisionChange}
            cssSelector={settings?.cssSelector ?? ':root'}
            onCssSelectorChange={(selector) => updateSettings({ cssSelector: selector })}
            cssExportAsCalcExpressions={cssExportAsCalcExpressions}
            onCssExportAsCalcExpressionsChange={handleCssExportAsCalcExpressionsChange}
            cssUseModesAsSelectors={settings?.cssUseModesAsSelectors ?? false}
            onCssUseModesAsSelectorsChange={handleCssUseModesAsSelectorsChange}
            includeStyles={includeStyles}
            onIncludeStylesChange={handleIncludeStylesChange}
            styleOutputMode={styleOutputMode}
            onStyleOutputModeChange={handleStyleOutputModeChange}
            styleTypes={styleTypes}
            onStyleTypesChange={handleStyleTypesChange}
            styleCounts={styleCounts}
            stylesLoading={stylesLoading}
            nameFormatRules={nameFormatRules}
            onNameFormatRulesChange={handleNameFormatRulesChange}
            nameFormatCasing={nameFormatCasing}
            onNameFormatCasingChange={handleNameFormatCasingChange}
            nameFormatAdvanced={nameFormatAdvanced}
            onNameFormatAdvancedChange={handleNameFormatAdvancedChange}
            syncCodeSyntax={syncCodeSyntax}
            onSyncCodeSyntaxChange={handleSyncCodeSyntaxChange}
            debugMode={debugMode}
            onDebugModeChange={handleDebugModeChange}
            initialGithubRepository={settings?.githubRepository}
            initialGithubToken={settings?.githubToken}
            onGithubSettingsChange={(githubSettings) => updateSettings(githubSettings)}
            onExportSettings={handleExportSettings}
            onImportSettings={handleImportSettings}
            onResetSettings={handleResetSettings}
            activeSettingsTab={activeSettingsTab}
            onActiveSettingsTabChange={handleActiveSettingsTabChange}
          />
        </ErrorBoundary>
      </TabPanel>

      <TabPanel id="help" activeTab={activeTab}>
        <ErrorBoundary>
          <HelpTab />
        </ErrorBoundary>
      </TabPanel>
    </div>
  );
}
