import { Checkbox } from '../common/Checkbox';
import { FormField } from '../common/FormField';
import { FormGroup } from '../common/FormGroup';
import { Input } from '../common/Input';
import { StyleOptions } from '../common/StyleOptions';
import { NameFormatRules } from '../settings/NameFormatRules';
import { useNumericVariables } from '../../hooks/useNumericVariables';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import { useCallback, useEffect, useState } from 'react';
import type {
  StyleType,
  StyleOutputMode,
  StyleSummary,
  NameFormatRule,
  UIMessage,
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

  // Rem base variable
  remBaseVariableId: string | null;
  onRemBaseVariableChange: (id: string | null) => void;

  // Style options
  includeStyles: boolean;
  onIncludeStylesChange: (value: boolean) => void;
  styleOutputMode: StyleOutputMode;
  onStyleOutputModeChange: (value: StyleOutputMode) => void;
  styleTypes: StyleType[];
  onStyleTypesChange: (types: StyleType[]) => void;
  styleCounts: StyleSummary | null;
  stylesLoading: boolean;

  // Name format rules
  nameFormatRules: NameFormatRule[];
  onNameFormatRulesChange: (rules: NameFormatRule[]) => void;
  syncCodeSyntax: boolean;
  onSyncCodeSyntaxChange: (enabled: boolean) => void;
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
  remBaseVariableId,
  onRemBaseVariableChange,
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
  syncCodeSyntax,
  onSyncCodeSyntaxChange,
}: SettingsTabProps) {
  const { variables: numericVariables, loading: numericVariablesLoading } = useNumericVariables();
  const { sendMessage, listenToMessage } = usePluginMessage();
  const [syncStatus, setSyncStatus] = useState<{ synced: number; skipped: number } | null>(null);

  // Handle sync result messages
  useEffect(() => {
    const cleanup = listenToMessage((message: UIMessage) => {
      if (message.type === 'sync-code-syntax-result') {
        setSyncStatus({ synced: message.synced, skipped: message.skipped });
        // Clear status after 3 seconds
        setTimeout(() => setSyncStatus(null), 3000);
      }
    });
    return cleanup;
  }, [listenToMessage]);

  const handleSyncNow = useCallback(() => {
    sendMessage({
      type: 'sync-code-syntax',
      options: {
        nameFormatRules: nameFormatRules.filter((r) => r.enabled),
        prefix: prefix || undefined,
      },
    });
    setSyncStatus(null); // Clear previous status
  }, [sendMessage, nameFormatRules, prefix]);

  // Group numeric variables by collection name for the dropdown
  const groupedVariables = numericVariables.reduce(
    (groups, variable) => {
      const parts = variable.path.split('/');
      const collectionName = parts[0] || 'Other';
      if (!groups[collectionName]) {
        groups[collectionName] = [];
      }
      groups[collectionName].push(variable);
      return groups;
    },
    {} as Record<string, typeof numericVariables>
  );
  return (
    <div>
      <Input
        label="Variable Prefix (optional)"
        value={prefix}
        onChange={(e) => onPrefixChange(e.target.value)}
        placeholder="e.g., ds, theme"
      />

      <FormGroup label="Collections">
        <div className="border-figma-border bg-figma-bg-secondary max-h-[150px] overflow-y-auto rounded border p-2">
          {collectionsLoading ? (
            <div className="text-figma-text-tertiary text-xs">Loading collections...</div>
          ) : collections.length === 0 ? (
            <div className="text-figma-text-tertiary text-xs">No collections found</div>
          ) : (
            <div className="space-y-2">
              {collections.map((collection) => (
                <Checkbox
                  key={collection.id}
                  label={collection.name}
                  checked={selectedCollections.includes(collection.id)}
                  onChange={() => onToggleCollection(collection.id)}
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
          onChange={(e) => onIncludeCollectionCommentsChange(e.target.checked)}
        />
      </FormField>

      <FormField>
        <label className="text-figma-text mb-1 block text-xs font-medium">Rem Base Variable</label>
        <select
          className="border-figma-border bg-figma-bg text-figma-text focus:ring-figma-border-focus w-full rounded border px-2 py-1.5 text-xs focus:outline-none focus:ring-1"
          value={remBaseVariableId || ''}
          onChange={(e) => onRemBaseVariableChange(e.target.value || null)}
          disabled={numericVariablesLoading}
        >
          <option value="">None (use default)</option>
          {Object.entries(groupedVariables).map(([collectionName, variables]) => (
            <optgroup key={collectionName} label={collectionName}>
              {variables.map((variable) => (
                <option key={variable.id} value={variable.id}>
                  {variable.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {numericVariablesLoading && (
          <div className="text-figma-text-tertiary mt-1 text-xs">Loading variables...</div>
        )}
      </FormField>

      <StyleOptions
        includeStyles={includeStyles}
        onIncludeStylesChange={onIncludeStylesChange}
        styleOutputMode={styleOutputMode}
        onStyleOutputModeChange={onStyleOutputModeChange}
        styleTypes={styleTypes}
        onStyleTypesChange={onStyleTypesChange}
        styleCounts={styleCounts}
        loading={stylesLoading}
      />

      <NameFormatRules
        rules={nameFormatRules}
        syncCodeSyntax={syncCodeSyntax}
        onRulesChange={onNameFormatRulesChange}
        onSyncCodeSyntaxChange={onSyncCodeSyntaxChange}
        onSyncNow={handleSyncNow}
        prefix={prefix}
      />

      {syncStatus && (
        <div className="text-figma-text-secondary mt-2 text-xs">
          Synced {syncStatus.synced} variable{syncStatus.synced !== 1 ? 's' : ''}
          {syncStatus.skipped > 0 && `, skipped ${syncStatus.skipped}`}
        </div>
      )}
    </div>
  );
}
