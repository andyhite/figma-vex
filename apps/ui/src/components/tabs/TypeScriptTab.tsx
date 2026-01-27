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

interface TypeScriptTabProps {
  prefix: string;
  selectedCollections: string[];
  syncCalculations: boolean;
  includeStyles: boolean;
  styleOutputMode: StyleOutputMode;
  styleTypes: StyleType[];
}

export function TypeScriptTab({
  prefix,
  selectedCollections,
  syncCalculations,
  includeStyles,
  styleOutputMode,
  styleTypes,
}: TypeScriptTabProps) {
  const [output, setOutput] = useState('');
  const { sendMessage, listenToMessage } = usePluginMessage();
  const { handleCopy, handleDownload, status, setStatus } = useOutputActions({
    filename: 'variables.d.ts',
    mimeType: 'text/typescript',
  });

  // Listen for TypeScript results
  const handleMessage = useCallback(
    (message: UIMessage) => {
      if (message.type === 'typescript-result') {
        setOutput(message.typescript);
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
      prefix: prefix.trim() || undefined,
      useModesAsSelectors: false,
      includeCollectionComments: false,
      includeModeComments: false,
      selectedCollections: selectedCollections.length > 0 ? selectedCollections : undefined,
      includeStyles,
      styleOutputMode,
      styleTypes,
      syncCalculations,
    };

    sendMessage({ type: 'export-typescript', options });
    setStatus({ message: 'Generating...', type: 'info' });
  }, [prefix, selectedCollections, includeStyles, styleOutputMode, styleTypes, syncCalculations, sendMessage, setStatus]);

  return (
    <div>
      <ButtonGroup>
        <Button onClick={handleExport}>Generate TypeScript</Button>
      </ButtonGroup>
      {output && (
        <OutputArea
          label="Output"
          value={output}
          readOnly
          placeholder="Click 'Generate TypeScript' to export types..."
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
