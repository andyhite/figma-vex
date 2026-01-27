import { useState } from 'react';
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
import type { StyleType, StyleOutputMode } from '@figma-vex/shared';

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
  const [activeTab, setActiveTab] = useState('css');
  const [prefix, setPrefix] = useState('');
  const [includeCollectionComments, setIncludeCollectionComments] = useState(true);
  const { collections, selectedCollections, toggleCollection, loading } = useCollections();
  const containerRef = useAutoResize([activeTab]);

  // Style export options
  const [includeStyles, setIncludeStyles] = useState(false);
  const [styleOutputMode, setStyleOutputMode] = useState<StyleOutputMode>('variables');
  const [styleTypes, setStyleTypes] = useState<StyleType[]>(['paint', 'text', 'effect', 'grid']);
  const { styleCounts, loading: stylesLoading } = useStyles();

  const showCommonOptions = activeTab !== 'help';

  return (
    <div ref={containerRef} className="bg-figma-bg text-figma-text">
      <TabBar tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab} />

      {showCommonOptions && (
        <>
          <div className="px-4 pb-4 text-xs text-figma-text-secondary">
            {TAB_DESCRIPTIONS[activeTab]}
          </div>

          <div className="px-4">
            <Input
              label="Variable Prefix (optional)"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
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
                        onChange={() => toggleCollection(collection.id)}
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
                onChange={(e) => setIncludeCollectionComments(e.target.checked)}
              />
            </FormField>

            <StyleOptions
              includeStyles={includeStyles}
              onIncludeStylesChange={setIncludeStyles}
              styleOutputMode={styleOutputMode}
              onStyleOutputModeChange={setStyleOutputMode}
              styleTypes={styleTypes}
              onStyleTypesChange={setStyleTypes}
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
