import { Checkbox } from '../common/Checkbox';
import { FormField } from '../common/FormField';
import { FormGroup } from '../common/FormGroup';
import { Input } from '../common/Input';
import { StyleOptions } from '../common/StyleOptions';
import { useNumericVariables } from '../../hooks/useNumericVariables';
import type { StyleType, StyleOutputMode, StyleSummary } from '@figma-vex/shared';

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
}: SettingsTabProps) {
  const { variables: numericVariables, loading: numericVariablesLoading } = useNumericVariables();

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
        <div className="max-h-[150px] overflow-y-auto rounded border border-figma-border bg-figma-bg-secondary p-2">
          {collectionsLoading ? (
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
        <label className="block text-xs font-medium text-figma-text mb-1">
          Rem Base Variable
        </label>
        <select
          className="w-full px-2 py-1.5 text-xs border border-figma-border rounded bg-figma-bg text-figma-text focus:outline-none focus:ring-1 focus:ring-figma-border-focus"
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
          <div className="text-xs text-figma-text-tertiary mt-1">Loading variables...</div>
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
    </div>
  );
}
