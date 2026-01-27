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
import { useAutoResize } from './hooks/useAutoResize';
import { useCollections } from './hooks/useCollections';
import { useStyles } from './hooks/useStyles';
import { useSettings, DEFAULT_SETTINGS } from './hooks/useSettings';
import type { StyleType, StyleOutputMode, PluginSettings } from '@figma-vex/shared';

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
  const remBaseVariableId = settings?.remBaseVariableId ?? DEFAULT_SETTINGS.remBaseVariableId ?? null;
  const cssExportAsCalcExpressions = settings?.cssExportAsCalcExpressions ?? DEFAULT_SETTINGS.cssExportAsCalcExpressions;
  const scssExportAsCalcExpressions = settings?.scssExportAsCalcExpressions ?? DEFAULT_SETTINGS.scssExportAsCalcExpressions;

  // Collections with restored selections
  const { collections, selectedCollections, toggleCollection, loading: collectionsLoading } =
    useCollections({
      initialSelectedCollections: settings?.selectedCollections,
    });

  const containerRef = useAutoResize([activeTab]);
  const { styleCounts, loading: stylesLoading } = useStyles();

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
  const handleRemBaseVariableChange = (id: string | null) => updateSettings({ remBaseVariableId: id || undefined });

  // Handle collection toggle and persist
  const handleToggleCollection = (collectionId: string) => {
    toggleCollection(collectionId);
    // Update settings with new selection
    const newSelected = selectedCollections.includes(collectionId)
      ? selectedCollections.filter((id) => id !== collectionId)
      : [...selectedCollections, collectionId];
    updateSettings({ selectedCollections: newSelected });
  };


  return (
    <div ref={containerRef} className="bg-figma-bg text-figma-text">
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      {activeTab !== 'help' && (
        <div className="px-4 pb-4 text-xs text-figma-text-secondary">
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
