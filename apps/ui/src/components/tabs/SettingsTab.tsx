import { SettingsNavigation } from '../settings/SettingsNavigation';
import { GeneralSettings } from '../settings/GeneralSettings';
import { VariablesSettings } from '../settings/VariablesSettings';
import { CalculationsSettings } from '../settings/CalculationsSettings';
import { StylesSettings } from '../settings/StylesSettings';
import { GitHubSettings } from '../settings/GitHubSettings';
import { BackupSettings } from '../settings/BackupSettings';
import type {
  StyleType,
  StyleOutputMode,
  StyleSummary,
  NameFormatRule,
  CasingOption,
} from '@figma-vex/shared';

interface Collection {
  id: string;
  name: string;
}

interface SettingsTabProps {
  // Prefix
  prefix: string;
  onPrefixChange: (value: string) => void;

  // Collections
  collections: Collection[];
  selectedCollections: string[];
  onToggleCollection: (id: string) => void;
  collectionsLoading: boolean;

  // Collection comments
  includeCollectionComments: boolean;
  onIncludeCollectionCommentsChange: (value: boolean) => void;

  // Mode comments (moved from CSS tab to global)
  includeModeComments: boolean;
  onIncludeModeCommentsChange: (value: boolean) => void;

  // Header banner
  headerBanner: string | undefined;
  onHeaderBannerChange: (value: string) => void;

  // Rem base variable
  remBaseVariableId: string | null;
  onRemBaseVariableChange: (id: string | null) => void;

  // Number precision
  numberPrecision: number;
  onNumberPrecisionChange: (precision: number) => void;

  // CSS export options
  cssSelector: string;
  onCssSelectorChange: (selector: string) => void;
  cssExportAsCalcExpressions: boolean;
  onCssExportAsCalcExpressionsChange: (value: boolean) => void;
  cssUseModesAsSelectors: boolean;
  onCssUseModesAsSelectorsChange: (value: boolean) => void;

  // Style options
  includeStyles: boolean;
  onIncludeStylesChange: (value: boolean) => void;
  styleOutputMode: StyleOutputMode;
  onStyleOutputModeChange: (value: StyleOutputMode) => void;
  styleTypes: StyleType[];
  onStyleTypesChange: (types: StyleType[]) => void;
  styleCounts: StyleSummary | null;
  stylesLoading: boolean;

  // Name format settings
  nameFormatRules: NameFormatRule[];
  onNameFormatRulesChange: (rules: NameFormatRule[]) => void;
  nameFormatCasing: CasingOption;
  onNameFormatCasingChange: (casing: CasingOption) => void;
  nameFormatAdvanced: boolean;
  onNameFormatAdvancedChange: (enabled: boolean) => void;
  syncCodeSyntax: boolean;
  onSyncCodeSyntaxChange: (enabled: boolean) => void;

  // Debug mode
  debugMode: boolean;
  onDebugModeChange: (enabled: boolean) => void;

  // GitHub settings
  initialGithubRepository?: string;
  initialGithubToken?: string;
  onGithubSettingsChange?: (settings: { githubRepository: string; githubToken: string }) => void;

  // Import/Export/Reset
  onExportSettings: () => void;
  onImportSettings: () => void;
  onResetSettings: () => void;

  // Active settings tab
  activeSettingsTab: string;
  onActiveSettingsTabChange: (tab: string) => void;
}

export function SettingsTab({
  prefix,
  onPrefixChange,
  collections,
  selectedCollections,
  onToggleCollection,
  collectionsLoading,
  includeCollectionComments,
  onIncludeCollectionCommentsChange,
  includeModeComments,
  onIncludeModeCommentsChange,
  headerBanner,
  onHeaderBannerChange,
  remBaseVariableId,
  onRemBaseVariableChange,
  numberPrecision,
  onNumberPrecisionChange,
  cssSelector,
  onCssSelectorChange,
  cssExportAsCalcExpressions,
  onCssExportAsCalcExpressionsChange,
  cssUseModesAsSelectors,
  onCssUseModesAsSelectorsChange,
  includeStyles,
  onIncludeStylesChange,
  styleOutputMode,
  onStyleOutputModeChange,
  styleTypes,
  onStyleTypesChange,
  styleCounts,
  stylesLoading,
  nameFormatRules,
  onNameFormatRulesChange,
  nameFormatCasing,
  onNameFormatCasingChange,
  nameFormatAdvanced,
  onNameFormatAdvancedChange,
  syncCodeSyntax,
  onSyncCodeSyntaxChange,
  debugMode,
  onDebugModeChange,
  initialGithubRepository,
  initialGithubToken,
  onGithubSettingsChange,
  onExportSettings,
  onImportSettings,
  onResetSettings,
  activeSettingsTab,
  onActiveSettingsTabChange,
}: SettingsTabProps) {
  return (
    <div className="flex">
      <SettingsNavigation activeTab={activeSettingsTab} onTabChange={onActiveSettingsTabChange} />
      <div className="flex-1">
        {activeSettingsTab === 'general' && (
          <GeneralSettings
            collections={collections}
            selectedCollections={selectedCollections}
            onToggleCollection={onToggleCollection}
            collectionsLoading={collectionsLoading}
            includeCollectionComments={includeCollectionComments}
            onIncludeCollectionCommentsChange={onIncludeCollectionCommentsChange}
            includeModeComments={includeModeComments}
            onIncludeModeCommentsChange={onIncludeModeCommentsChange}
            headerBanner={headerBanner}
            onHeaderBannerChange={onHeaderBannerChange}
          />
        )}
        {activeSettingsTab === 'variables' && (
          <VariablesSettings
            nameFormatRules={nameFormatRules}
            onNameFormatRulesChange={onNameFormatRulesChange}
            nameFormatCasing={nameFormatCasing}
            onNameFormatCasingChange={onNameFormatCasingChange}
            nameFormatAdvanced={nameFormatAdvanced}
            onNameFormatAdvancedChange={onNameFormatAdvancedChange}
            syncCodeSyntax={syncCodeSyntax}
            onSyncCodeSyntaxChange={onSyncCodeSyntaxChange}
            prefix={prefix}
            onPrefixChange={onPrefixChange}
            collections={collections}
            selectedCollections={selectedCollections}
            debugMode={debugMode}
          />
        )}
        {activeSettingsTab === 'calc' && (
          <CalculationsSettings
            remBaseVariableId={remBaseVariableId}
            onRemBaseVariableChange={onRemBaseVariableChange}
            numberPrecision={numberPrecision}
            onNumberPrecisionChange={onNumberPrecisionChange}
            cssSelector={cssSelector}
            onCssSelectorChange={onCssSelectorChange}
            cssExportAsCalcExpressions={cssExportAsCalcExpressions}
            onCssExportAsCalcExpressionsChange={onCssExportAsCalcExpressionsChange}
            cssUseModesAsSelectors={cssUseModesAsSelectors}
            onCssUseModesAsSelectorsChange={onCssUseModesAsSelectorsChange}
          />
        )}
        {activeSettingsTab === 'styles' && (
          <StylesSettings
            includeStyles={includeStyles}
            onIncludeStylesChange={onIncludeStylesChange}
            styleOutputMode={styleOutputMode}
            onStyleOutputModeChange={onStyleOutputModeChange}
            styleTypes={styleTypes}
            onStyleTypesChange={onStyleTypesChange}
            styleCounts={styleCounts}
            loading={stylesLoading}
          />
        )}
        {activeSettingsTab === 'github' && (
          <GitHubSettings
            initialRepository={initialGithubRepository}
            initialToken={initialGithubToken}
            onSettingsChange={onGithubSettingsChange}
          />
        )}
        {activeSettingsTab === 'backup' && (
          <BackupSettings
            onExportSettings={onExportSettings}
            onImportSettings={onImportSettings}
            onResetSettings={onResetSettings}
            debugMode={debugMode}
            onDebugModeChange={onDebugModeChange}
          />
        )}
      </div>
    </div>
  );
}
