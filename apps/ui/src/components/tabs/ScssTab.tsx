import { useState, useCallback, useEffect } from 'react';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { Checkbox } from '../common/Checkbox';
import { CopyIcon } from '../common/CopyIcon';
import { DownloadIcon } from '../common/DownloadIcon';
import { FormField } from '../common/FormField';
import { IconButton } from '../common/IconButton';
import { OutputArea } from '../common/OutputArea';
import { useOutputActions } from '../../hooks/useOutputActions';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import type {
  ExportOptions,
  UIMessage,
  StyleType,
  StyleOutputMode,
  NameFormatRule,
} from '@figma-vex/shared';

interface ScssTabProps {
  prefix: string;
  selectedCollections: string[];
  includeCollectionComments: boolean;
  syncCalculations: boolean;
  includeStyles: boolean;
  styleOutputMode: StyleOutputMode;
  styleTypes: StyleType[];
  remBaseVariableId: string | null;
  nameFormatRules: NameFormatRule[];
  syncCodeSyntax: boolean;
  // Persisted settings
  initialExportAsCalcExpressions?: boolean;
  onSettingsChange?: (settings: { scssExportAsCalcExpressions: boolean }) => void;
}

export function ScssTab({
  prefix,
  selectedCollections,
  includeCollectionComments,
  syncCalculations,
  includeStyles,
  styleOutputMode,
  styleTypes,
  remBaseVariableId,
  nameFormatRules,
  syncCodeSyntax,
  initialExportAsCalcExpressions = false,
  onSettingsChange,
}: ScssTabProps) {
  const [exportAsCalcExpressions, setExportAsCalcExpressions] = useState(
    initialExportAsCalcExpressions
  );
  const [output, setOutput] = useState('');
  const { sendMessage, listenToMessage } = usePluginMessage();
  const { handleCopy, handleDownload, status, setStatus } = useOutputActions({
    filename: 'variables.scss',
    mimeType: 'text/scss',
  });

  // Listen for SCSS results
  const handleMessage = useCallback(
    (message: UIMessage) => {
      if (message.type === 'scss-result') {
        setOutput(message.scss);
        setStatus({ message: 'Generated successfully!', type: 'success' });
      } else if (message.type === 'error') {
        setStatus({ message: message.message, type: 'error' });
      }
    },
    [setStatus]
  );

  // Set up message listener
  useEffect(() => {
    const cleanup = listenToMessage(handleMessage);
    return cleanup;
  }, [listenToMessage, handleMessage]);

  const handleExportAsCalcExpressionsChange = (value: boolean) => {
    setExportAsCalcExpressions(value);
    onSettingsChange?.({
      scssExportAsCalcExpressions: value,
    });
  };

  const handleExport = useCallback(() => {
    const options: ExportOptions = {
      selector: ':root',
      prefix: prefix.trim() || undefined,
      useModesAsSelectors: false,
      includeCollectionComments,
      includeModeComments: false,
      selectedCollections: selectedCollections.length > 0 ? selectedCollections : undefined,
      includeStyles,
      styleOutputMode,
      styleTypes,
      syncCalculations,
      exportAsCalcExpressions,
      remBaseVariableId: remBaseVariableId || undefined,
      nameFormatRules: nameFormatRules.length > 0 ? nameFormatRules : undefined,
      syncCodeSyntax,
    };

    sendMessage({ type: 'export-scss', options });
    setStatus({ message: 'Generating...', type: 'info' });
  }, [
    prefix,
    includeCollectionComments,
    selectedCollections,
    includeStyles,
    styleOutputMode,
    styleTypes,
    syncCalculations,
    exportAsCalcExpressions,
    remBaseVariableId,
    nameFormatRules,
    syncCodeSyntax,
    sendMessage,
    setStatus,
  ]);

  return (
    <div>
      <FormField>
        <Checkbox
          label="Export as calc() expressions"
          checked={exportAsCalcExpressions}
          onChange={(e) => handleExportAsCalcExpressionsChange(e.target.checked)}
        />
      </FormField>
      <ButtonGroup>
        <Button onClick={handleExport}>Generate SCSS</Button>
      </ButtonGroup>
      {output && (
        <OutputArea
          label="Output"
          value={output}
          readOnly
          placeholder="Click 'Generate SCSS' to export variables..."
          statusMessage={status.message}
          statusType={status.type}
          actions={
            <>
              <IconButton
                icon={<CopyIcon />}
                aria-label="Copy to clipboard"
                onClick={() => handleCopy(output)}
              />
              <IconButton
                icon={<DownloadIcon />}
                aria-label="Download"
                onClick={() => handleDownload(output)}
              />
            </>
          }
        />
      )}
    </div>
  );
}
