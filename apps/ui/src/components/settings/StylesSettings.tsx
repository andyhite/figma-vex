import { Checkbox } from '../common/Checkbox';
import { FormField } from '../common/FormField';
import { FormGroup } from '../common/FormGroup';
import type { StyleType, StyleOutputMode, StyleSummary } from '@figma-vex/shared';

interface StylesSettingsProps {
  includeStyles: boolean;
  onIncludeStylesChange: (value: boolean) => void;
  styleOutputMode: StyleOutputMode;
  onStyleOutputModeChange: (value: StyleOutputMode) => void;
  styleTypes: StyleType[];
  onStyleTypesChange: (types: StyleType[]) => void;
  styleCounts: StyleSummary | null;
  loading: boolean;
}

const STYLE_TYPE_CONFIG: { type: StyleType; label: string; countKey: keyof StyleSummary }[] = [
  { type: 'paint', label: 'Paint Styles (colors, gradients)', countKey: 'paintCount' },
  { type: 'text', label: 'Text Styles (typography)', countKey: 'textCount' },
  { type: 'effect', label: 'Effect Styles (shadows, blurs)', countKey: 'effectCount' },
  { type: 'grid', label: 'Grid Styles (layouts)', countKey: 'gridCount' },
];

export function StylesSettings({
  includeStyles,
  onIncludeStylesChange,
  styleOutputMode,
  onStyleOutputModeChange,
  styleTypes,
  onStyleTypesChange,
  styleCounts,
  loading,
}: StylesSettingsProps) {
  const toggleStyleType = (type: StyleType) => {
    if (styleTypes.includes(type)) {
      onStyleTypesChange(styleTypes.filter((t) => t !== type));
    } else {
      onStyleTypesChange([...styleTypes, type]);
    }
  };

  const totalStyles = styleCounts
    ? styleCounts.paintCount +
      styleCounts.textCount +
      styleCounts.effectCount +
      styleCounts.gridCount
    : 0;

  return (
    <div>
      <FormField>
        <Checkbox
          label={`Include styles${totalStyles > 0 ? ` (${totalStyles} available)` : ''}`}
          checked={includeStyles}
          onChange={(e) => onIncludeStylesChange(e.target.checked)}
          disabled={loading || totalStyles === 0}
        />
      </FormField>

      {includeStyles && (
        <>
          <FormGroup label="Output Mode">
            <div className="flex gap-4">
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="styleOutputMode"
                  value="variables"
                  checked={styleOutputMode === 'variables'}
                  onChange={() => onStyleOutputModeChange('variables')}
                  className="accent-figma-blue"
                />
                CSS Variables
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="styleOutputMode"
                  value="classes"
                  checked={styleOutputMode === 'classes'}
                  onChange={() => onStyleOutputModeChange('classes')}
                  className="accent-figma-blue"
                />
                CSS Classes
              </label>
            </div>
          </FormGroup>

          <FormGroup label="Style Types">
            <div className="space-y-2">
              {STYLE_TYPE_CONFIG.map(({ type, label, countKey }) => {
                const count = styleCounts?.[countKey] ?? 0;
                return (
                  <Checkbox
                    key={type}
                    label={`${label} (${count})`}
                    checked={styleTypes.includes(type)}
                    onChange={() => toggleStyleType(type)}
                    disabled={count === 0}
                  />
                );
              })}
            </div>
          </FormGroup>
        </>
      )}
    </div>
  );
}
