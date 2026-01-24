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
import { useOutputActions } from '../../hooks/useOutputActions';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import type { ExportOptions, UIMessage } from '@shared/types';

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
  const { sendMessage, listenToMessage } = usePluginMessage();
  const { handleCopy, handleDownload, status, setStatus } = useOutputActions({
    filename: 'variables.css',
    mimeType: 'text/css',
  });

  // Listen for CSS results
  const handleMessage = useCallback(
    (message: UIMessage) => {
      if (message.type === 'css-result') {
        setOutput(message.css);
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
    setStatus,
  ]);

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
