import { FormField } from '../common/FormField';
import { Checkbox } from '../common/Checkbox';
import { useNumericVariables } from '../../hooks/useNumericVariables';

interface CalculationsSettingsProps {
  remBaseVariableId: string | null;
  onRemBaseVariableChange: (id: string | null) => void;
  numberPrecision: number;
  onNumberPrecisionChange: (precision: number) => void;
  cssExportAsCalcExpressions: boolean;
  onCssExportAsCalcExpressionsChange: (value: boolean) => void;
  scssExportAsCalcExpressions: boolean;
  onScssExportAsCalcExpressionsChange: (value: boolean) => void;
  cssUseModesAsSelectors: boolean;
  onCssUseModesAsSelectorsChange: (value: boolean) => void;
}

export function CalculationsSettings({
  remBaseVariableId,
  onRemBaseVariableChange,
  numberPrecision,
  onNumberPrecisionChange,
  cssExportAsCalcExpressions,
  onCssExportAsCalcExpressionsChange,
  scssExportAsCalcExpressions,
  onScssExportAsCalcExpressionsChange,
  cssUseModesAsSelectors,
  onCssUseModesAsSelectorsChange,
}: CalculationsSettingsProps) {
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
        <p className="text-figma-text-tertiary mt-2 text-xs">
          Select a numeric variable to use as the base for rem calculations.
        </p>
      </FormField>

      <FormField className="mt-4">
        <label className="text-figma-text mb-1 block text-xs font-medium">Number Precision</label>
        <input
          type="number"
          min="0"
          max="10"
          className="border-figma-border bg-figma-bg text-figma-text focus:ring-figma-border-focus w-24 rounded border px-2 py-1.5 text-xs focus:outline-none focus:ring-1"
          value={numberPrecision}
          onChange={(e) => {
            const value = parseInt(e.target.value, 10);
            if (!isNaN(value) && value >= 0 && value <= 10) {
              onNumberPrecisionChange(value);
            }
          }}
        />
        <p className="text-figma-text-tertiary mt-2 text-xs">
          Maximum number of decimal places for float values (0-10).
        </p>
      </FormField>

      <div className="border-figma-border mt-4 border-t pt-4">
        <label className="text-figma-text mb-3 block text-xs font-medium">CSS Output Options</label>
        <FormField>
          <Checkbox
            label="Export as calc() expressions"
            checked={cssExportAsCalcExpressions}
            onChange={(e) => onCssExportAsCalcExpressionsChange(e.target.checked)}
          />
          <p className="text-figma-text-tertiary mt-1 ml-5 text-xs">
            Output calculated values as calc() expressions instead of resolved values.
          </p>
        </FormField>
        <FormField className="mt-2">
          <Checkbox
            label="Export modes as separate selectors"
            checked={cssUseModesAsSelectors}
            onChange={(e) => onCssUseModesAsSelectorsChange(e.target.checked)}
          />
          <p className="text-figma-text-tertiary mt-1 ml-5 text-xs">
            Create separate CSS selectors for each mode instead of using the default mode.
          </p>
        </FormField>
      </div>

      <div className="border-figma-border mt-4 border-t pt-4">
        <label className="text-figma-text mb-3 block text-xs font-medium">SCSS Output Options</label>
        <FormField>
          <Checkbox
            label="Export as calc() expressions"
            checked={scssExportAsCalcExpressions}
            onChange={(e) => onScssExportAsCalcExpressionsChange(e.target.checked)}
          />
          <p className="text-figma-text-tertiary mt-1 ml-5 text-xs">
            Output calculated values as calc() expressions instead of resolved values.
          </p>
        </FormField>
      </div>
    </div>
  );
}
