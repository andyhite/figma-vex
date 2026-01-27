import { useState, useCallback, useEffect } from 'react';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { CopyIcon } from '../common/CopyIcon';
import { DownloadIcon } from '../common/DownloadIcon';
import { IconButton } from '../common/IconButton';
import { OutputArea } from '../common/OutputArea';
import { useOutputActions } from '../../hooks/useOutputActions';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import type { ExportOptions, UIMessage, StyleType, StyleOutputMode } from '@figma-vex/shared';

interface JsonTabProps {
  selectedCollections: string[];
  includeCollectionComments: boolean;
  includeModeComments: boolean; // Global setting from Settings tab
  syncCalculations: boolean;
  includeStyles: boolean;
  styleOutputMode: StyleOutputMode;
  styleTypes: StyleType[];
}

export function JsonTab({
  selectedCollections,
  includeCollectionComments,
  includeModeComments,
  syncCalculations,
  includeStyles,
  styleOutputMode,
  styleTypes,
}: JsonTabProps) {
  const [output, setOutput] = useState('');
  const { sendMessage, listenToMessage } = usePluginMessage();
  const { handleCopy, handleDownload, status, setStatus } = useOutputActions({
    filename: 'variables.json',
    mimeType: 'application/json',
  });

  // Listen for JSON results
  const handleMessage = useCallback(
    (message: UIMessage) => {
      if (message.type === 'json-result') {
        setOutput(message.json);
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

  const handleExport = useCallback(() => {
    const options: ExportOptions = {
      selector: ':root',
      useModesAsSelectors: false,
      includeCollectionComments,
      includeModeComments,
      selectedCollections: selectedCollections.length > 0 ? selectedCollections : undefined,
      includeStyles,
      styleOutputMode,
      styleTypes,
      syncCalculations,
    };

    sendMessage({ type: 'export-json', options });
    setStatus({ message: 'Generating...', type: 'info' });
  }, [
    includeCollectionComments,
    includeModeComments,
    selectedCollections,
    includeStyles,
    styleOutputMode,
    styleTypes,
    syncCalculations,
    sendMessage,
    setStatus,
  ]);

  return (
    <div>
      <ButtonGroup>
        <Button onClick={handleExport}>Generate JSON</Button>
      </ButtonGroup>
      {output && (
        <OutputArea
          label="Output"
          value={output}
          readOnly
          placeholder="Click 'Generate JSON' to export variables..."
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
