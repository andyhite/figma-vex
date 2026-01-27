import { useCallback } from 'react';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { CopyIcon } from '../common/CopyIcon';
import { DownloadIcon } from '../common/DownloadIcon';
import { IconButton } from '../common/IconButton';
import { OutputArea } from '../common/OutputArea';
import { useExportListener } from '../../hooks/useExportListener';
import type { ExportOptions, StyleType, StyleOutputMode } from '@figma-vex/shared';

interface TypeScriptTabProps {
  prefix: string;
  selectedCollections: string[];
  includeModeComments: boolean; // Global setting from Settings tab
  syncCalculations: boolean;
  includeStyles: boolean;
  styleOutputMode: StyleOutputMode;
  styleTypes: StyleType[];
  numberPrecision: number;
}

export function TypeScriptTab({
  prefix,
  selectedCollections,
  includeModeComments,
  syncCalculations,
  includeStyles,
  styleOutputMode,
  styleTypes,
  numberPrecision,
}: TypeScriptTabProps) {
  const { output, status, setStatus, handleCopy, handleDownload, sendMessage } = useExportListener({
    resultType: 'typescript-result',
    filename: 'variables.d.ts',
    mimeType: 'text/typescript',
  });

  const handleExport = useCallback(() => {
    const options: ExportOptions = {
      selector: ':root',
      prefix: prefix.trim() || undefined,
      useModesAsSelectors: false,
      includeCollectionComments: false,
      includeModeComments,
      selectedCollections: selectedCollections.length > 0 ? selectedCollections : undefined,
      includeStyles,
      styleOutputMode,
      styleTypes,
      syncCalculations,
      numberPrecision,
    };

    sendMessage({ type: 'export-typescript', options });
    setStatus({ message: 'Generating...', type: 'info' });
  }, [
    prefix,
    selectedCollections,
    includeModeComments,
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
