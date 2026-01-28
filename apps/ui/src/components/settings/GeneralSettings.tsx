import { Checkbox } from '../common/Checkbox';
import { FormGroup } from '../common/FormGroup';
import { FormHelpText } from '../common/FormHelpText';
import type { ColorFormat } from '@figma-vex/shared';

interface Collection {
  id: string;
  name: string;
}

interface GeneralSettingsProps {
  // Collections
  collections: Collection[];
  selectedCollections: string[];
  onToggleCollection: (id: string) => void;
  collectionsLoading: boolean;

  // Comments
  includeCollectionComments: boolean;
  onIncludeCollectionCommentsChange: (value: boolean) => void;
  includeModeComments: boolean;
  onIncludeModeCommentsChange: (value: boolean) => void;

  // Color format
  colorFormat: ColorFormat;
  onColorFormatChange: (value: ColorFormat) => void;

  // Header banner
  headerBanner: string | undefined;
  onHeaderBannerChange: (value: string) => void;
}

const COLOR_FORMAT_OPTIONS: { value: ColorFormat; label: string }[] = [
  { value: 'hex', label: 'Hex (#rrggbb)' },
  { value: 'rgb', label: 'RGB (rgb/rgba)' },
  { value: 'hsl', label: 'HSL (hsl/hsla)' },
  { value: 'oklch', label: 'OKLCH' },
];

export function GeneralSettings({
  collections,
  selectedCollections,
  onToggleCollection,
  collectionsLoading,
  includeCollectionComments,
  onIncludeCollectionCommentsChange,
  includeModeComments,
  onIncludeModeCommentsChange,
  colorFormat,
  onColorFormatChange,
  headerBanner,
  onHeaderBannerChange,
}: GeneralSettingsProps) {
  return (
    <div>
      <FormGroup label="Collections">
        {collectionsLoading ? (
          <div className="text-figma-text-tertiary text-xs">Loading collections...</div>
        ) : collections.length === 0 ? (
          <div className="text-figma-text-tertiary text-xs">No collections found</div>
        ) : (
          collections.map((collection) => (
            <Checkbox
              key={collection.id}
              label={collection.name}
              checked={selectedCollections.includes(collection.id)}
              onChange={() => onToggleCollection(collection.id)}
            />
          ))
        )}
      </FormGroup>

      <FormGroup label="Comments">
        <div className="space-y-2">
          <Checkbox
            label="Include collection comments"
            checked={includeCollectionComments}
            onChange={(e) => onIncludeCollectionCommentsChange(e.target.checked)}
          />
          <Checkbox
            label="Include mode comments"
            checked={includeModeComments}
            onChange={(e) => onIncludeModeCommentsChange(e.target.checked)}
          />
        </div>
      </FormGroup>

      <FormGroup label="Color Format">
        <select
          className="border-figma-border bg-figma-bg text-figma-text focus:ring-figma-border-focus w-full rounded border px-2 py-1.5 text-xs focus:outline-none focus:ring-1"
          value={colorFormat}
          onChange={(e) => onColorFormatChange(e.target.value as ColorFormat)}
        >
          {COLOR_FORMAT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <FormHelpText>Format used for color values in exports</FormHelpText>
      </FormGroup>

      <FormGroup label="Header Banner">
        <textarea
          className="border-figma-border bg-figma-bg text-figma-text focus:ring-figma-border-focus w-full rounded border px-2 py-1.5 text-xs focus:outline-none focus:ring-1"
          value={headerBanner || ''}
          onChange={(e) => onHeaderBannerChange(e.target.value)}
          rows={4}
          placeholder="/* Auto-generated - do not edit */"
        />
        <FormHelpText>Leave empty for default header</FormHelpText>
      </FormGroup>
    </div>
  );
}
