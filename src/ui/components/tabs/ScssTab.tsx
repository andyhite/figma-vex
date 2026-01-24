import { useState, useCallback, useEffect } from 'react';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { CopyIcon } from '../common/CopyIcon';
import { DownloadIcon } from '../common/DownloadIcon';
import { IconButton } from '../common/IconButton';
import { OutputArea } from '../common/OutputArea';
import { useOutputActions } from '../../hooks/useOutputActions';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import type { ExportOptions, UIMessage } from '@shared/types';

interface ScssTabProps {
  prefix: string;
  selectedCollections: string[];
  includeCollectionComments: boolean;
}

export function ScssTab({ prefix, selectedCollections, includeCollectionComments }: ScssTabProps) {
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

  const handleExport = useCallback(() => {
    const options: ExportOptions = {
      selector: ':root',
      prefix: prefix.trim() || undefined,
      useModesAsSelectors: false,
      includeCollectionComments,
      includeModeComments: false,
      selectedCollections: selectedCollections.length > 0 ? selectedCollections : undefined,
    };

    sendMessage({ type: 'export-scss', options });
    setStatus({ message: 'Generating...', type: 'info' });
  }, [prefix, includeCollectionComments, selectedCollections, sendMessage, setStatus]);

  return (
    <div>
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
