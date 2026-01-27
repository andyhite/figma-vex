import { Button } from '../common/Button';
import { FormHelpText } from '../common/FormHelpText';
import { FormGroup } from '../common/FormGroup';

interface BackupSettingsProps {
  onExportSettings: () => void;
  onImportSettings: () => void;
  onResetSettings: () => void;
}

export function BackupSettings({ onExportSettings, onImportSettings, onResetSettings }: BackupSettingsProps) {
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
    </div>
  );
}
