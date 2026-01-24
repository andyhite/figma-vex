import { useState, useCallback, useEffect } from 'react';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { OutputArea } from '../common/OutputArea';
import { StatusMessage } from '../common/StatusMessage';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import { useClipboard } from '../../hooks/useClipboard';
import type { ExportOptions } from '@shared/types';

interface TypeScriptTabProps {
  prefix: string;
  selectedCollections: string[];
}

export function TypeScriptTab({ prefix, selectedCollections }: TypeScriptTabProps) {
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' }>({
    message: '',
    type: 'info',
  });
  const { sendMessage, listenToMessage } = usePluginMessage();
  const { copyToClipboard, copied } = useClipboard();

  // Listen for TypeScript results
  const handleMessage = useCallback(
    (message: { type: string; typescript?: string; message?: string }) => {
      if (message.type === 'typescript-result') {
        setOutput(message.typescript || '');
        setStatus({ message: 'Generated successfully!', type: 'success' });
      } else if (message.type === 'error') {
        setStatus({ message: message.message || 'An error occurred', type: 'error' });
      }
    },
    []
  );

  // Set up message listener
  useEffect(() => {
    const cleanup = listenToMessage(handleMessage as (msg: unknown) => void);
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
    };

    sendMessage({ type: 'export-typescript', options });
    setStatus({ message: 'Generating...', type: 'info' });
  }, [prefix, selectedCollections, sendMessage]);

  const handleCopy = useCallback(async () => {
    if (output) {
      await copyToClipboard(output);
      setStatus({
        message: copied ? 'Copied to clipboard!' : 'Failed to copy',
        type: copied ? 'success' : 'error',
      });
    }
  }, [output, copyToClipboard, copied]);

  const handleDownload = useCallback(() => {
    if (output) {
      const blob = new Blob([output], { type: 'text/typescript' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'variables.d.ts';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({ message: 'Downloaded!', type: 'success' });
    }
  }, [output]);

  return (
    <div>
      <ButtonGroup>
        <Button onClick={handleExport}>Generate TypeScript</Button>
      </ButtonGroup>
      <OutputArea
        label="Output"
        value={output}
        readOnly
        placeholder="Click 'Generate TypeScript' to export types..."
      />
      <ButtonGroup>
        <Button variant="secondary" onClick={handleCopy}>
          Copy to Clipboard
        </Button>
        <Button variant="secondary" onClick={handleDownload}>
          Download
        </Button>
      </ButtonGroup>
      {status.message && <StatusMessage type={status.type}>{status.message}</StatusMessage>}
    </div>
  );
}
