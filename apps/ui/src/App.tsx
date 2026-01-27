import { useState, useRef, useCallback } from 'react';
import { TabBar } from './components/tabs/TabBar';
import { TabPanel } from './components/tabs/TabPanel';
import { CssTab } from './components/tabs/CssTab';
import { ScssTab } from './components/tabs/ScssTab';
import { JsonTab } from './components/tabs/JsonTab';
import { TypeScriptTab } from './components/tabs/TypeScriptTab';
import { GitHubTab } from './components/tabs/GitHubTab';
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
  { id: 'css', label: 'CSS' },
  { id: 'scss', label: 'SCSS' },
  { id: 'json', label: 'JSON' },
  { id: 'typescript', label: 'TypeScript' },
  { id: 'github', label: 'GitHub' },
  { id: 'settings', label: 'Settings' },
  { id: 'help', label: 'Help' },
];

const TAB_DESCRIPTIONS: Record<string, string> = {
  css: 'Export variables as CSS custom properties with customizable selectors and formatting options.',
  scss: 'Export variables as SCSS variables for use in Sass/SCSS stylesheets.',
  json: 'Export as JSON for use with Style Dictionary or other token tools.',
  typescript: 'Generate TypeScript type definitions for CSS custom properties.',
  github: 'Send generated exports to GitHub via repository_dispatch event.',
  settings: 'Configure global export settings that apply to all export formats.',
  help: 'Learn how to configure variable exports using description fields.',
};

export default function App() {
  // Load persisted settings
  const { settings, loading: settingsLoading, updateSettings } = useSettings();

  // Use settings values with defaults for initial render
  const activeTab = settings?.activeTab ?? DEFAULT_SETTINGS.activeTab;
  const prefix = settings?.prefix ?? DEFAULT_SETTINGS.prefix;
  const includeCollectionComments =
    settings?.includeCollectionComments ?? DEFAULT_SETTINGS.includeCollectionComments;
  const syncCalculations = settings?.syncCalculations ?? DEFAULT_SETTINGS.syncCalculations;
  const includeStyles = settings?.includeStyles ?? DEFAULT_SETTINGS.includeStyles;
  const styleOutputMode = settings?.styleOutputMode ?? DEFAULT_SETTINGS.styleOutputMode;
  const styleTypes = settings?.styleTypes ?? DEFAULT_SETTINGS.styleTypes;
  const remBaseVariableId =
    settings?.remBaseVariableId ?? DEFAULT_SETTINGS.remBaseVariableId ?? null;
  const cssExportAsCalcExpressions =
    settings?.cssExportAsCalcExpressions ?? DEFAULT_SETTINGS.cssExportAsCalcExpressions;
  const scssExportAsCalcExpressions =
    settings?.scssExportAsCalcExpressions ?? DEFAULT_SETTINGS.scssExportAsCalcExpressions;
  const nameFormatRules = settings?.nameFormatRules ?? DEFAULT_SETTINGS.nameFormatRules;
  const nameFormatCasing = settings?.nameFormatCasing ?? DEFAULT_SETTINGS.nameFormatCasing;
  const nameFormatAdvanced = settings?.nameFormatAdvanced ?? DEFAULT_SETTINGS.nameFormatAdvanced;
  const syncCodeSyntax = settings?.syncCodeSyntax ?? DEFAULT_SETTINGS.syncCodeSyntax;

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
  const handleTabChange = (tab: string) => updateSettings({ activeTab: tab });
  const handlePrefixChange = (value: string) => updateSettings({ prefix: value });
  const handleIncludeCollectionCommentsChange = (value: boolean) =>
    updateSettings({ includeCollectionComments: value });
  const handleSyncCalculationsChange = (value: boolean) =>
    updateSettings({ syncCalculations: value });
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

      <TabPanel id="css" activeTab={activeTab}>
        <ErrorBoundary>
          <CssTab
            prefix={prefix}
            selectedCollections={selectedCollections}
            includeCollectionComments={includeCollectionComments}
            syncCalculations={syncCalculations}
            includeStyles={includeStyles}
            styleOutputMode={styleOutputMode}
            styleTypes={styleTypes}
            remBaseVariableId={remBaseVariableId}
            nameFormatRules={allNameFormatRules}
            syncCodeSyntax={syncCodeSyntax}
            initialSelector={settings?.cssSelector}
            initialUseModesAsSelectors={settings?.cssUseModesAsSelectors}
            initialIncludeModeComments={settings?.cssIncludeModeComments}
            initialExportAsCalcExpressions={cssExportAsCalcExpressions}
            onSettingsChange={(cssSettings) => updateSettings(cssSettings)}
          />
        </ErrorBoundary>
      </TabPanel>

      <TabPanel id="scss" activeTab={activeTab}>
        <ErrorBoundary>
          <ScssTab
            prefix={prefix}
            selectedCollections={selectedCollections}
            includeCollectionComments={includeCollectionComments}
            syncCalculations={syncCalculations}
            includeStyles={includeStyles}
            styleOutputMode={styleOutputMode}
            styleTypes={styleTypes}
            remBaseVariableId={remBaseVariableId}
            nameFormatRules={allNameFormatRules}
            syncCodeSyntax={syncCodeSyntax}
            initialExportAsCalcExpressions={scssExportAsCalcExpressions}
            onSettingsChange={(scssSettings) => updateSettings(scssSettings)}
          />
        </ErrorBoundary>
      </TabPanel>

      <TabPanel id="json" activeTab={activeTab}>
        <ErrorBoundary>
          <JsonTab
            selectedCollections={selectedCollections}
            includeCollectionComments={includeCollectionComments}
            syncCalculations={syncCalculations}
            includeStyles={includeStyles}
            styleOutputMode={styleOutputMode}
            styleTypes={styleTypes}
          />
        </ErrorBoundary>
      </TabPanel>

      <TabPanel id="typescript" activeTab={activeTab}>
        <ErrorBoundary>
          <TypeScriptTab
            prefix={prefix}
            selectedCollections={selectedCollections}
            syncCalculations={syncCalculations}
            includeStyles={includeStyles}
            styleOutputMode={styleOutputMode}
            styleTypes={styleTypes}
          />
        </ErrorBoundary>
      </TabPanel>

      <TabPanel id="github" activeTab={activeTab}>
        <ErrorBoundary>
          <GitHubTab
            prefix={prefix}
            selectedCollections={selectedCollections}
            includeCollectionComments={includeCollectionComments}
            syncCalculations={syncCalculations}
            includeStyles={includeStyles}
            styleOutputMode={styleOutputMode}
            styleTypes={styleTypes}
            initialRepository={settings?.githubRepository}
            initialWorkflowFileName={settings?.githubWorkflowFileName}
            initialExportTypes={settings?.githubExportTypes}
            initialCssSelector={settings?.githubCssSelector}
            initialUseModesAsSelectors={settings?.githubUseModesAsSelectors}
            onSettingsChange={(githubSettings) => updateSettings(githubSettings)}
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
            remBaseVariableId={remBaseVariableId}
            onRemBaseVariableChange={handleRemBaseVariableChange}
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
            onExportSettings={handleExportSettings}
            onImportSettings={handleImportSettings}
            onResetSettings={handleResetSettings}
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
