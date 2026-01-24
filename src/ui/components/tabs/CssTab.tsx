import { useState, useCallback, useEffect } from 'react';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { Checkbox } from '../common/Checkbox';
import { CopyIcon } from '../common/CopyIcon';
import { DownloadIcon } from '../common/DownloadIcon';
import { FormField } from '../common/FormField';
import { IconButton } from '../common/IconButton';
import { Input } from '../common/Input';
import { OutputArea } from '../common/OutputArea';
import { useClipboard } from '../../hooks/useClipboard';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import type { ExportOptions } from '@shared/types';

interface CssTabProps {
  prefix: string;
  selectedCollections: string[];
  includeCollectionComments: boolean;
}

export function CssTab({ prefix, selectedCollections, includeCollectionComments }: CssTabProps) {
  const [selector, setSelector] = useState(':root');
  const [useModesAsSelectors, setUseModesAsSelectors] = useState(false);
  const [includeModeComments, setIncludeModeComments] = useState(true);
  const [output, setOutput] = useState('');
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' }>({
    message: '',
    type: 'info',
  });
  const { sendMessage, listenToMessage } = usePluginMessage();
  const { copyToClipboard, copied } = useClipboard();

  // Listen for CSS results
  const handleMessage = useCallback((message: { type: string; css?: string; message?: string }) => {
    if (message.type === 'css-result') {
      setOutput(message.css || '');
      setStatus({ message: 'Generated successfully!', type: 'success' });
    } else if (message.type === 'error') {
      setStatus({ message: message.message || 'An error occurred', type: 'error' });
    }
  }, []);

  // Set up message listener
  useEffect(() => {
    const cleanup = listenToMessage(handleMessage as (msg: unknown) => void);
    return cleanup;
  }, [listenToMessage, handleMessage]);

  const handleExport = useCallback(() => {
    const options: ExportOptions = {
      selector: selector.trim() || ':root',
      prefix: prefix.trim() || undefined,
      useModesAsSelectors,
      includeCollectionComments,
      includeModeComments,
      selectedCollections: selectedCollections.length > 0 ? selectedCollections : undefined,
    };

    sendMessage({ type: 'export-css', options });
    setStatus({ message: 'Generating...', type: 'info' });
  }, [
    selector,
    prefix,
    useModesAsSelectors,
    includeCollectionComments,
    includeModeComments,
    selectedCollections,
    sendMessage,
  ]);

  const handleCopy = useCallback(async () => {
    if (output) {
      await copyToClipboard(output);
      setStatus({
        message: copied ? 'Copied to clipboard!' : 'Failed to copy',
        type: copied ? 'success' : 'error',
      });
      // Clear status after showing in label
      setTimeout(() => setStatus({ message: '', type: 'info' }), 3000);
    }
  }, [output, copyToClipboard, copied]);

  const handleDownload = useCallback(() => {
    if (output) {
      const blob = new Blob([output], { type: 'text/css' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'variables.css';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setStatus({ message: 'Downloaded!', type: 'success' });
      // Clear status after showing in label
      setTimeout(() => setStatus({ message: '', type: 'info' }), 3000);
    }
  }, [output]);

  return (
    <div>
      <Input label="CSS Selector" value={selector} onChange={(e) => setSelector(e.target.value)} />
      <FormField>
        <Checkbox
          label="Export modes as separate selectors"
          checked={useModesAsSelectors}
          onChange={(e) => setUseModesAsSelectors(e.target.checked)}
        />
      </FormField>
      <FormField>
        <Checkbox
          label="Include mode comments"
          checked={includeModeComments}
          onChange={(e) => setIncludeModeComments(e.target.checked)}
        />
      </FormField>
      <ButtonGroup>
        <Button onClick={handleExport}>Generate CSS</Button>
      </ButtonGroup>
      {output && (
        <OutputArea
          label="Output"
          value={output}
          readOnly
          placeholder="Click 'Generate CSS' to export variables..."
          statusMessage={status.message}
          statusType={status.type}
          actions={
            <>
              <IconButton icon={<CopyIcon />} aria-label="Copy to clipboard" onClick={handleCopy} />
              <IconButton icon={<DownloadIcon />} aria-label="Download" onClick={handleDownload} />
            </>
          }
        />
      )}
    </div>
  );
}
