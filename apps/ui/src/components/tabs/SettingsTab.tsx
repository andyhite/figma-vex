import { Checkbox } from '../common/Checkbox';
import { FormField } from '../common/FormField';
import { FormGroup } from '../common/FormGroup';
import { Input } from '../common/Input';
import { StyleOptions } from '../common/StyleOptions';
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
  includeStyles,
  onIncludeStylesChange,
  styleOutputMode,
  onStyleOutputModeChange,
  styleTypes,
  onStyleTypesChange,
  styleCounts,
  stylesLoading,
}: SettingsTabProps) {
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
