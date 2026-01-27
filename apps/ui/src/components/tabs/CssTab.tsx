import { useState, useCallback, useEffect } from 'react';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { CopyIcon } from '../common/CopyIcon';
import { DownloadIcon } from '../common/DownloadIcon';
import { IconButton } from '../common/IconButton';
import { Input } from '../common/Input';
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

interface CssTabProps {
  prefix: string;
  selectedCollections: string[];
  includeCollectionComments: boolean;
  includeModeComments: boolean;
  headerBanner?: string;
  syncCalculations: boolean;
  includeStyles: boolean;
  styleOutputMode: StyleOutputMode;
  styleTypes: StyleType[];
  remBaseVariableId: string | null;
  nameFormatRules: NameFormatRule[];
  syncCodeSyntax: boolean;
  numberPrecision: number;
  useModesAsSelectors: boolean;
  exportAsCalcExpressions: boolean;
  initialSelector?: string;
  onSelectorChange?: (selector: string) => void;
}

export function CssTab({
  prefix,
  selectedCollections,
  includeCollectionComments,
  includeModeComments,
  headerBanner,
  syncCalculations,
  includeStyles,
  styleOutputMode,
  styleTypes,
  remBaseVariableId,
  nameFormatRules,
  syncCodeSyntax,
  numberPrecision,
  useModesAsSelectors,
  exportAsCalcExpressions,
  initialSelector = ':root',
  onSelectorChange,
}: CssTabProps) {
  const [selector, setSelector] = useState(initialSelector);
  const [output, setOutput] = useState('');

  const handleSelectorChange = (value: string) => {
    setSelector(value);
    onSelectorChange?.(value);
  };
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
      includeStyles,
      styleOutputMode,
      styleTypes,
      syncCalculations,
      exportAsCalcExpressions,
      remBaseVariableId: remBaseVariableId || undefined,
      nameFormatRules: nameFormatRules && nameFormatRules.length > 0 ? nameFormatRules : undefined,
      syncCodeSyntax,
      headerBanner: headerBanner,
      numberPrecision,
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
    includeStyles,
    styleOutputMode,
    styleTypes,
    syncCalculations,
    exportAsCalcExpressions,
    remBaseVariableId,
    nameFormatRules,
    syncCodeSyntax,
    headerBanner,
    numberPrecision,
    sendMessage,
    setStatus,
  ]);

  return (
    <div>
      <Input
        label="CSS Selector"
        value={selector}
        onChange={(e) => handleSelectorChange(e.target.value)}
      />
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
