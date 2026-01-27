import { FormField } from '../common/FormField';
import { useNumericVariables } from '../../hooks/useNumericVariables';

interface CalculationsSettingsProps {
  remBaseVariableId: string | null;
  onRemBaseVariableChange: (id: string | null) => void;
}

export function CalculationsSettings({
  remBaseVariableId,
  onRemBaseVariableChange,
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
    </div>
  );
}
