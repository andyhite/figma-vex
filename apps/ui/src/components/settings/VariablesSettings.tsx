import { NameFormatRules } from './NameFormatRules';
import { Button } from '../common/Button';
import { useVariableNames } from '../../hooks/useVariableNames';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import { useCallback, useEffect, useState } from 'react';
import type {
  NameFormatRule,
  CasingOption,
  UIMessage,
} from '@figma-vex/shared';
import { getAllRulesWithDefault } from '@figma-vex/shared';

interface ResetStatus {
  reset: number;
  skipped: number;
}

interface Collection {
  id: string;
  name: string;
}

interface VariablesSettingsProps {
  // Name format settings
  nameFormatRules: NameFormatRule[];
  onNameFormatRulesChange: (rules: NameFormatRule[]) => void;
  nameFormatCasing: CasingOption;
  onNameFormatCasingChange: (casing: CasingOption) => void;
  nameFormatAdvanced: boolean;
  onNameFormatAdvancedChange: (enabled: boolean) => void;
  syncCodeSyntax: boolean;
  onSyncCodeSyntaxChange: (enabled: boolean) => void;
  prefix: string;
  onPrefixChange: (value: string) => void;
  collections: Collection[];
  selectedCollections: string[];
  // Debug mode
  debugMode?: boolean;
}

export function VariablesSettings({
  nameFormatRules,
  onNameFormatRulesChange,
  nameFormatCasing,
  onNameFormatCasingChange,
  nameFormatAdvanced,
  onNameFormatAdvancedChange,
  syncCodeSyntax,
  onSyncCodeSyntaxChange,
  prefix,
  onPrefixChange,
  collections,
  selectedCollections,
  debugMode = false,
}: VariablesSettingsProps) {
  const { variableNames } = useVariableNames();
  const { sendMessage, listenToMessage } = usePluginMessage();
  const [syncStatus, setSyncStatus] = useState<{ synced: number; skipped: number } | null>(null);
  const [resetStatus, setResetStatus] = useState<ResetStatus | null>(null);

  // Handle sync and reset result messages
  useEffect(() => {
    const cleanup = listenToMessage((message: UIMessage) => {
      if (message.type === 'sync-code-syntax-result') {
        setSyncStatus({ synced: message.synced, skipped: message.skipped });
        // Clear status after 3 seconds
        setTimeout(() => setSyncStatus(null), 3000);
      } else if (message.type === 'reset-code-syntax-result') {
        setResetStatus({ reset: message.reset, skipped: message.skipped });
        // Clear status after 3 seconds
        setTimeout(() => setResetStatus(null), 3000);
      }
    });
    return cleanup;
  }, [listenToMessage]);

  const handleSyncNow = useCallback(() => {
    // Get all rules including computed default
    const allRules = getAllRulesWithDefault(nameFormatRules, prefix, nameFormatCasing);
    sendMessage({
      type: 'sync-code-syntax',
      options: {
        nameFormatRules: allRules.filter((r) => r.enabled),
        prefix: prefix || undefined,
      },
    });
    setSyncStatus(null); // Clear previous status
  }, [sendMessage, nameFormatRules, prefix, nameFormatCasing]);

  const handleResetCodeSyntax = useCallback(() => {
    sendMessage({ type: 'reset-code-syntax' });
    setResetStatus(null); // Clear previous status
  }, [sendMessage]);

  return (
    <div>
      <NameFormatRules
        rules={nameFormatRules}
        onRulesChange={onNameFormatRulesChange}
        prefix={prefix}
        onPrefixChange={onPrefixChange}
        casing={nameFormatCasing}
        onCasingChange={onNameFormatCasingChange}
        advancedMode={nameFormatAdvanced}
        onAdvancedModeChange={onNameFormatAdvancedChange}
        syncCodeSyntax={syncCodeSyntax}
        onSyncCodeSyntaxChange={onSyncCodeSyntaxChange}
        onSyncNow={handleSyncNow}
        variableNames={variableNames}
        collections={collections}
        selectedCollections={selectedCollections}
      />

      {syncStatus && (
        <div className="text-figma-text-secondary mt-2 text-xs">
          Synced {syncStatus.synced} variable{syncStatus.synced !== 1 ? 's' : ''}
          {syncStatus.skipped > 0 && `, skipped ${syncStatus.skipped}`}
        </div>
      )}

      {debugMode && (
        <div className="border-figma-border mt-4 border-t pt-4">
          <div className="text-figma-text-secondary mb-2 text-xs font-medium">Debug</div>
          <Button variant="danger" onClick={handleResetCodeSyntax}>
            Reset Code Syntax
          </Button>
          {resetStatus && (
            <div className="text-figma-text-secondary mt-2 text-xs">
              Reset {resetStatus.reset} variable{resetStatus.reset !== 1 ? 's' : ''}
              {resetStatus.skipped > 0 && `, skipped ${resetStatus.skipped}`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
