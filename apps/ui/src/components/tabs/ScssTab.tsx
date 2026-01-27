import { useCallback } from 'react';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { CopyIcon } from '../common/CopyIcon';
import { DownloadIcon } from '../common/DownloadIcon';
import { IconButton } from '../common/IconButton';
import { OutputArea } from '../common/OutputArea';
import { useExportListener } from '../../hooks/useExportListener';
import type { ExportOptions, StyleType, StyleOutputMode, NameFormatRule } from '@figma-vex/shared';

interface ScssTabProps {
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
  exportAsCalcExpressions: boolean;
}

export function ScssTab({
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
  exportAsCalcExpressions,
}: ScssTabProps) {
  const { output, status, setStatus, handleCopy, handleDownload, sendMessage } = useExportListener({
    resultType: 'scss-result',
    filename: 'variables.scss',
    mimeType: 'text/scss',
  });

  const handleExport = useCallback(() => {
    const options: ExportOptions = {
      selector: ':root',
      prefix: prefix.trim() || undefined,
      useModesAsSelectors: false,
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

    sendMessage({ type: 'export-scss', options });
    setStatus({ message: 'Generating...', type: 'info' });
  }, [
    prefix,
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
