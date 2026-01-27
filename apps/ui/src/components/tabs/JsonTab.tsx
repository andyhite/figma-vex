import { useCallback } from 'react';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { CopyIcon } from '../common/CopyIcon';
import { DownloadIcon } from '../common/DownloadIcon';
import { IconButton } from '../common/IconButton';
import { OutputArea } from '../common/OutputArea';
import { useExportListener } from '../../hooks/useExportListener';
import type { ExportOptions, StyleType, StyleOutputMode } from '@figma-vex/shared';

interface JsonTabProps {
  selectedCollections: string[];
  includeCollectionComments: boolean;
  includeModeComments: boolean; // Global setting from Settings tab
  syncCalculations: boolean;
  includeStyles: boolean;
  styleOutputMode: StyleOutputMode;
  styleTypes: StyleType[];
  numberPrecision: number;
}

export function JsonTab({
  selectedCollections,
  includeCollectionComments,
  includeModeComments,
  syncCalculations,
  includeStyles,
  styleOutputMode,
  styleTypes,
  numberPrecision,
}: JsonTabProps) {
  const { output, status, setStatus, handleCopy, handleDownload, sendMessage } = useExportListener({
    resultType: 'json-result',
    filename: 'variables.json',
    mimeType: 'application/json',
  });

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
      numberPrecision,
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
    numberPrecision,
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
