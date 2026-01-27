import { Button } from '../common/Button';
import { FormHelpText } from '../common/FormHelpText';
import { FormGroup } from '../common/FormGroup';
import { Checkbox } from '../common/Checkbox';

interface BackupSettingsProps {
  onExportSettings: () => void;
  onImportSettings: () => void;
  onResetSettings: () => void;
  debugMode: boolean;
  onDebugModeChange: (enabled: boolean) => void;
}

export function BackupSettings({
  onExportSettings,
  onImportSettings,
  onResetSettings,
  debugMode,
  onDebugModeChange,
}: BackupSettingsProps) {
  return (
    <div>
      <FormGroup label="Backup & Restore">
        <FormHelpText>
          Export and import your settings to share across files or team members.
        </FormHelpText>

        <div className="mt-2 flex gap-2">
          <Button variant="secondary" onClick={onExportSettings} className="flex-1">
            Export Settings
          </Button>
          <Button variant="secondary" onClick={onImportSettings} className="flex-1">
            Import Settings
          </Button>
        </div>

        <FormHelpText className="mt-3">
          Exports include: collections, comment preferences, naming rules, style settings, and
          calculation options.
        </FormHelpText>
      </FormGroup>

      <FormGroup label="Reset" className="mt-6">
        <FormHelpText>
          Reset all settings to their default values.
        </FormHelpText>

        <div className="mt-2">
          <Button variant="danger" onClick={onResetSettings}>
            Reset Settings
          </Button>
        </div>
      </FormGroup>

      <FormGroup label="Debug Mode" className="mt-6">
        <Checkbox
          label="Enable debug mode"
          checked={debugMode}
          onChange={(e) => onDebugModeChange(e.target.checked)}
        />
        <FormHelpText className="mt-1">
          Shows additional options for debugging and resetting plugin data.
        </FormHelpText>
      </FormGroup>
    </div>
  );
}
