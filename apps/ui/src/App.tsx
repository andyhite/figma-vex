import { TabBar } from './components/tabs/TabBar';
import { TabPanel } from './components/tabs/TabPanel';
import { CssTab } from './components/tabs/CssTab';
import { ScssTab } from './components/tabs/ScssTab';
import { JsonTab } from './components/tabs/JsonTab';
import { TypeScriptTab } from './components/tabs/TypeScriptTab';
import { GitHubTab } from './components/tabs/GitHubTab';
import { HelpTab } from './components/tabs/HelpTab';
import { Checkbox } from './components/common/Checkbox';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { FormField } from './components/common/FormField';
import { FormGroup } from './components/common/FormGroup';
import { Input } from './components/common/Input';
import { StyleOptions } from './components/common/StyleOptions';
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
  { id: 'help', label: 'Help' },
];

const TAB_DESCRIPTIONS: Record<string, string> = {
  css: 'Export variables as CSS custom properties with customizable selectors and formatting options.',
  scss: 'Export variables as SCSS variables for use in Sass/SCSS stylesheets.',
  json: 'Export as JSON for use with Style Dictionary or other token tools.',
  typescript: 'Generate TypeScript type definitions for CSS custom properties.',
  github: 'Send generated exports to GitHub via repository_dispatch event.',
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
  const includeStyles = settings?.includeStyles ?? DEFAULT_SETTINGS.includeStyles;
  const styleOutputMode = settings?.styleOutputMode ?? DEFAULT_SETTINGS.styleOutputMode;
  const styleTypes = settings?.styleTypes ?? DEFAULT_SETTINGS.styleTypes;

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
  const handleIncludeStylesChange = (value: boolean) => updateSettings({ includeStyles: value });
  const handleStyleOutputModeChange = (value: StyleOutputMode) =>
    updateSettings({ styleOutputMode: value });
  const handleStyleTypesChange = (value: StyleType[]) => updateSettings({ styleTypes: value });

  // Handle collection toggle and persist
  const handleToggleCollection = (collectionId: string) => {
    toggleCollection(collectionId);
    // Update settings with new selection
    const newSelected = selectedCollections.includes(collectionId)
      ? selectedCollections.filter((id) => id !== collectionId)
      : [...selectedCollections, collectionId];
    updateSettings({ selectedCollections: newSelected });
  };

  const showCommonOptions = activeTab !== 'help';
  const loading = settingsLoading || collectionsLoading;

  return (
    <div ref={containerRef} className="bg-figma-bg text-figma-text">
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />

      {showCommonOptions && (
        <>
          <div className="px-4 pb-4 text-xs text-figma-text-secondary">
            {TAB_DESCRIPTIONS[activeTab]}
          </div>

          <div className="px-4">
            <Input
              label="Variable Prefix (optional)"
              value={prefix}
              onChange={(e) => handlePrefixChange(e.target.value)}
              placeholder="e.g., ds, theme"
            />

            <FormGroup label="Collections">
              <div className="max-h-[150px] overflow-y-auto rounded border border-figma-border bg-figma-bg-secondary p-2">
                {loading ? (
                  <div className="text-xs text-figma-text-tertiary">Loading collections...</div>
                ) : collections.length === 0 ? (
                  <div className="text-xs text-figma-text-tertiary">No collections found</div>
                ) : (
                  <div className="space-y-2">
                    {collections.map((collection) => (
                      <Checkbox
                        key={collection.id}
                        label={collection.name}
                        checked={selectedCollections.includes(collection.id)}
                        onChange={() => handleToggleCollection(collection.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </FormGroup>

            <FormField>
              <Checkbox
                label="Include collection comments"
                checked={includeCollectionComments}
                onChange={(e) => handleIncludeCollectionCommentsChange(e.target.checked)}
              />
            </FormField>

            <StyleOptions
              includeStyles={includeStyles}
              onIncludeStylesChange={handleIncludeStylesChange}
              styleOutputMode={styleOutputMode}
              onStyleOutputModeChange={handleStyleOutputModeChange}
              styleTypes={styleTypes}
              onStyleTypesChange={handleStyleTypesChange}
              styleCounts={styleCounts}
              loading={stylesLoading}
            />
          </div>
        </>
      )}

      <TabPanel id="css" activeTab={activeTab}>
        <ErrorBoundary>
          <CssTab
            prefix={prefix}
            selectedCollections={selectedCollections}
            includeCollectionComments={includeCollectionComments}
            includeStyles={includeStyles}
            styleOutputMode={styleOutputMode}
            styleTypes={styleTypes}
            initialSelector={settings?.cssSelector}
            initialUseModesAsSelectors={settings?.cssUseModesAsSelectors}
            initialIncludeModeComments={settings?.cssIncludeModeComments}
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
            includeStyles={includeStyles}
            styleOutputMode={styleOutputMode}
            styleTypes={styleTypes}
          />
        </ErrorBoundary>
      </TabPanel>

      <TabPanel id="json" activeTab={activeTab}>
        <ErrorBoundary>
          <JsonTab
            selectedCollections={selectedCollections}
            includeCollectionComments={includeCollectionComments}
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

      <TabPanel id="help" activeTab={activeTab}>
        <ErrorBoundary>
          <HelpTab />
        </ErrorBoundary>
      </TabPanel>
    </div>
  );
}
