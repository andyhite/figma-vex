import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { Checkbox } from '../common/Checkbox';
import { CopyIcon } from '../common/CopyIcon';
import { DownloadIcon } from '../common/DownloadIcon';
import { IconButton } from '../common/IconButton';
import { ExportOutputNavigation } from './ExportOutputNavigation';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import { useClipboard } from '../../hooks/useClipboard';
import { useStatusMessage } from '../../hooks/useStatusMessage';
import type {
  ExportType,
  ExportOptions,
  StyleType,
  StyleOutputMode,
  NameFormatRule,
  UIMessage,
  GitHubDispatchOptions,
  ColorFormat,
} from '@figma-vex/shared';

interface FormatConfig {
  label: string;
  description: string;
  filename: string;
  mimeType: string;
  resultType: 'css-result' | 'json-result' | 'typescript-result';
  messageType: 'export-css' | 'export-json' | 'export-typescript';
}

const FORMAT_CONFIG: Record<ExportType, FormatConfig> = {
  css: {
    label: 'CSS',
    description: 'Export as CSS custom properties with configurable selectors',
    filename: 'variables.css',
    mimeType: 'text/css',
    resultType: 'css-result',
    messageType: 'export-css',
  },
  json: {
    label: 'JSON',
    description: 'Export as JSON for Style Dictionary or other token tools',
    filename: 'variables.json',
    mimeType: 'application/json',
    resultType: 'json-result',
    messageType: 'export-json',
  },
  typescript: {
    label: 'TypeScript',
    description: 'Generate TypeScript type definitions for CSS variables',
    filename: 'variables.d.ts',
    mimeType: 'text/typescript',
    resultType: 'typescript-result',
    messageType: 'export-typescript',
  },
};

const ALL_FORMATS: ExportType[] = ['css', 'json', 'typescript'];

interface OutputState {
  content: string;
  actionStatus: { message: string; type: 'success' | 'error'; visible: boolean } | null;
}

interface ExportTabProps {
  // Format selection (persisted)
  selectedFormats: ExportType[];
  onSelectedFormatsChange: (formats: ExportType[]) => void;

  // Export options
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
  colorFormat: ColorFormat;

  // Variable name options
  includeCollectionName: boolean;

  // CSS-specific options
  useModesAsSelectors: boolean;
  exportAsCalcExpressions: boolean;
  selector: string;

  // GitHub settings
  githubRepository: string;
  githubToken: string;
}

export function ExportTab({
  selectedFormats,
  onSelectedFormatsChange,
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
  colorFormat,
  includeCollectionName,
  useModesAsSelectors,
  exportAsCalcExpressions,
  selector,
  githubRepository,
  githubToken,
}: ExportTabProps) {
  const { sendMessage, listenToMessage } = usePluginMessage();
  const { copyToClipboard } = useClipboard();

  // Status messages with proper timeout cleanup
  const { status: generateStatus, showStatus: showGenerateStatus } = useStatusMessage();
  const {
    status: githubStatus,
    showStatus: showGithubStatus,
    updateStatus: updateGithubStatus,
  } = useStatusMessage({ duration: 3000 });

  // Refs for per-format action status timeouts (to enable cleanup)
  const actionTimeoutsRef = useRef<Map<ExportType, ReturnType<typeof setTimeout>[]>>(new Map());

  // Active output tab (which format's output is visible)
  const [activeOutputTab, setActiveOutputTab] = useState<ExportType>(() => {
    // Default to first selected format, or 'css' if none selected
    return selectedFormats.length > 0 ? selectedFormats[0] : 'css';
  });

  // Output state per format
  const [outputs, setOutputs] = useState<Record<ExportType, OutputState>>({
    css: { content: '', actionStatus: null },
    json: { content: '', actionStatus: null },
    typescript: { content: '', actionStatus: null },
  });

  // Generating state
  const [isGenerating, setIsGenerating] = useState(false);

  // GitHub integration state
  const [sendToGitHub, setSendToGitHub] = useState(false);

  const isGitHubConfigured = githubRepository.trim() !== '' && githubToken.trim() !== '';

  // Cleanup action timeouts on unmount
  useEffect(() => {
    const timeoutsRef = actionTimeoutsRef.current;
    return () => {
      timeoutsRef.forEach((timeouts) => {
        timeouts.forEach((t) => clearTimeout(t));
      });
      timeoutsRef.clear();
    };
  }, []);

  // Helper to show action status with proper cleanup
  const showActionStatus = useCallback(
    (format: ExportType, message: string, type: 'success' | 'error') => {
      // Clear existing timeouts for this format
      const existing = actionTimeoutsRef.current.get(format);
      if (existing) {
        existing.forEach((t) => clearTimeout(t));
      }

      // Set the status
      setOutputs((prev) => ({
        ...prev,
        [format]: {
          ...prev[format],
          actionStatus: { message, type, visible: true },
        },
      }));

      // Create new timeouts
      const timeouts: ReturnType<typeof setTimeout>[] = [];

      timeouts.push(
        setTimeout(() => {
          setOutputs((prev) => ({
            ...prev,
            [format]: {
              ...prev[format],
              actionStatus: prev[format].actionStatus
                ? { ...prev[format].actionStatus!, visible: false }
                : null,
            },
          }));
        }, 2000)
      );

      timeouts.push(
        setTimeout(() => {
          setOutputs((prev) => ({
            ...prev,
            [format]: { ...prev[format], actionStatus: null },
          }));
        }, 2500)
      );

      actionTimeoutsRef.current.set(format, timeouts);
    },
    []
  );

  // Ensure activeOutputTab is valid when selectedFormats changes
  useEffect(() => {
    if (selectedFormats.length > 0 && !selectedFormats.includes(activeOutputTab)) {
      setActiveOutputTab(selectedFormats[0]);
    }
  }, [selectedFormats, activeOutputTab]);

  // Track received results to show success after all complete
  const [pendingFormats, setPendingFormats] = useState<Set<ExportType>>(new Set());

  // Listen for export results
  useEffect(() => {
    const cleanup = listenToMessage((message: UIMessage) => {
      if (message.type === 'css-result') {
        setOutputs((prev) => ({
          ...prev,
          css: { content: message.css, actionStatus: null },
        }));
        setPendingFormats((prev) => {
          const next = new Set(prev);
          next.delete('css');
          return next;
        });
      } else if (message.type === 'json-result') {
        setOutputs((prev) => ({
          ...prev,
          json: { content: message.json, actionStatus: null },
        }));
        setPendingFormats((prev) => {
          const next = new Set(prev);
          next.delete('json');
          return next;
        });
      } else if (message.type === 'typescript-result') {
        setOutputs((prev) => ({
          ...prev,
          typescript: { content: message.typescript, actionStatus: null },
        }));
        setPendingFormats((prev) => {
          const next = new Set(prev);
          next.delete('typescript');
          return next;
        });
      } else if (message.type === 'github-dispatch-success') {
        updateGithubStatus('Sent to GitHub!', 'success');
      } else if (message.type === 'error') {
        // Handle GitHub errors (if we were sending to GitHub)
        if (githubStatus?.type === 'sending') {
          updateGithubStatus(message.message, 'error');
        }
        // Handle generation errors
        setIsGenerating(false);
        setPendingFormats(new Set());
        showGenerateStatus(message.message, 'error');
      }
    });

    return cleanup;
  }, [listenToMessage, githubStatus?.type, updateGithubStatus, showGenerateStatus]);

  // Show success when all pending formats complete
  useEffect(() => {
    if (isGenerating && pendingFormats.size === 0) {
      setIsGenerating(false);
      showGenerateStatus('Generated!', 'success');
    }
  }, [isGenerating, pendingFormats.size, showGenerateStatus]);

  // Toggle format selection
  const handleFormatToggle = useCallback(
    (format: ExportType) => {
      const newFormats = selectedFormats.includes(format)
        ? selectedFormats.filter((f) => f !== format)
        : [...selectedFormats, format];
      onSelectedFormatsChange(newFormats);
    },
    [selectedFormats, onSelectedFormatsChange]
  );

  // Build export options
  const buildExportOptions = useCallback(
    (format: ExportType): ExportOptions => {
      const baseOptions: ExportOptions = {
        selector: format === 'css' ? selector.trim() || ':root' : ':root',
        prefix: prefix.trim() || undefined,
        useModesAsSelectors: format === 'css' ? useModesAsSelectors : false,
        includeCollectionComments: format !== 'typescript' ? includeCollectionComments : false,
        includeModeComments,
        includeCollectionName,
        selectedCollections: selectedCollections.length > 0 ? selectedCollections : undefined,
        includeStyles,
        styleOutputMode,
        styleTypes,
        syncCalculations,
        numberPrecision,
        colorFormat,
      };

      // CSS-specific options
      if (format === 'css') {
        baseOptions.exportAsCalcExpressions = exportAsCalcExpressions;
        baseOptions.remBaseVariableId = remBaseVariableId || undefined;
        baseOptions.nameFormatRules = nameFormatRules?.length > 0 ? nameFormatRules : undefined;
        baseOptions.syncCodeSyntax = syncCodeSyntax;
        baseOptions.headerBanner = headerBanner;
      }

      return baseOptions;
    },
    [
      selector,
      prefix,
      useModesAsSelectors,
      includeCollectionComments,
      includeModeComments,
      includeCollectionName,
      selectedCollections,
      includeStyles,
      styleOutputMode,
      styleTypes,
      syncCalculations,
      numberPrecision,
      colorFormat,
      exportAsCalcExpressions,
      remBaseVariableId,
      nameFormatRules,
      syncCodeSyntax,
      headerBanner,
    ]
  );

  // Generate all selected formats
  const handleGenerate = useCallback(() => {
    if (selectedFormats.length === 0) return;

    setIsGenerating(true);
    setPendingFormats(new Set(selectedFormats));

    // Send export message for each selected format
    for (const format of selectedFormats) {
      const config = FORMAT_CONFIG[format];
      const options = buildExportOptions(format);
      sendMessage({ type: config.messageType, options });
    }

    // Send to GitHub if enabled
    if (sendToGitHub && isGitHubConfigured) {
      showGithubStatus('Sending to GitHub...', 'sending');

      // Use all export options so GitHub action generates identical output
      const githubExportOptions: ExportOptions = {
        selector: selector.trim() || ':root',
        prefix: prefix.trim() || undefined,
        useModesAsSelectors,
        includeCollectionComments,
        includeModeComments,
        includeCollectionName,
        selectedCollections: selectedCollections.length > 0 ? selectedCollections : undefined,
        includeStyles,
        styleOutputMode,
        styleTypes,
        syncCalculations,
        numberPrecision,
        exportAsCalcExpressions,
        nameFormatRules: nameFormatRules?.length > 0 ? nameFormatRules : undefined,
        headerBanner,
        colorFormat,
        remBase: 16,
      };

      const githubOptions: GitHubDispatchOptions = {
        repository: githubRepository.trim(),
        token: githubToken.trim(),
        exportTypes: selectedFormats,
        exportOptions: githubExportOptions,
      };

      sendMessage({ type: 'github-dispatch', githubOptions });
    }
  }, [
    selectedFormats,
    buildExportOptions,
    sendMessage,
    sendToGitHub,
    isGitHubConfigured,
    githubRepository,
    githubToken,
    selector,
    prefix,
    useModesAsSelectors,
    includeCollectionComments,
    includeModeComments,
    includeCollectionName,
    selectedCollections,
    includeStyles,
    styleOutputMode,
    styleTypes,
    syncCalculations,
    numberPrecision,
    colorFormat,
    exportAsCalcExpressions,
    nameFormatRules,
    headerBanner,
    showGithubStatus,
  ]);

  // Copy handler
  const handleCopy = useCallback(
    async (format: ExportType) => {
      const output = outputs[format].content;
      if (!output) return;

      const success = await copyToClipboard(output);
      showActionStatus(
        format,
        success ? 'Copied!' : 'Failed to copy',
        success ? 'success' : 'error'
      );
    },
    [outputs, copyToClipboard, showActionStatus]
  );

  // Download handler
  const handleDownload = useCallback(
    (format: ExportType) => {
      const output = outputs[format].content;
      if (!output) return;

      const config = FORMAT_CONFIG[format];
      const blob = new Blob([output], { type: config.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = config.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showActionStatus(format, 'Downloaded!', 'success');
    },
    [outputs, showActionStatus]
  );

  const isGenerateDisabled = selectedFormats.length === 0 || isGenerating;
  const activeOutput = outputs[activeOutputTab];
  const activeConfig = FORMAT_CONFIG[activeOutputTab];

  return (
    <div>
      {/* Format Selection */}
      <div className="space-y-3 px-4 pb-4">
        {ALL_FORMATS.map((format) => {
          const config = FORMAT_CONFIG[format];
          const isSelected = selectedFormats.includes(format);
          return (
            <label key={format} className="flex cursor-pointer items-start gap-2">
              <Checkbox
                checked={isSelected}
                onChange={() => handleFormatToggle(format)}
                aria-label={config.label}
              />
              <div>
                <div className="text-figma-text text-xs font-medium">{config.label}</div>
                <div className="text-figma-text-secondary text-xs">{config.description}</div>
              </div>
            </label>
          );
        })}
      </div>

      {/* GitHub Integration */}
      {isGitHubConfigured && (
        <div className="border-figma-border mx-4 mb-3 border-t pt-3">
          <label className="flex cursor-pointer items-center gap-2">
            <Checkbox
              checked={sendToGitHub}
              onChange={() => setSendToGitHub(!sendToGitHub)}
              aria-label="Send to GitHub"
            />
            <span className="text-figma-text text-xs">Send to GitHub</span>
          </label>
        </div>
      )}

      {/* Generate Button */}
      <ButtonGroup>
        <Button onClick={handleGenerate} disabled={isGenerateDisabled}>
          {isGenerating ? 'Generating...' : sendToGitHub ? 'Generate & Send to GitHub' : 'Generate'}
        </Button>
        {generateStatus && (
          <span
            className={`ml-3 text-xs transition-opacity duration-500 ${
              generateStatus.visible ? 'opacity-100' : 'opacity-0'
            } ${generateStatus.type === 'success' ? 'text-figma-success' : 'text-figma-error'}`}
          >
            {generateStatus.message}
          </span>
        )}
        {githubStatus && (
          <span
            className={`ml-3 text-xs transition-opacity duration-500 ${
              githubStatus.visible ? 'opacity-100' : 'opacity-0'
            } ${
              githubStatus.type === 'success'
                ? 'text-figma-success'
                : githubStatus.type === 'error'
                  ? 'text-figma-error'
                  : 'text-figma-text-secondary'
            }`}
          >
            {githubStatus.message}
          </span>
        )}
      </ButtonGroup>

      {/* Output Area */}
      {selectedFormats.length > 0 && (
        <div className="flex">
          <ExportOutputNavigation
            activeTab={activeOutputTab}
            onTabChange={setActiveOutputTab}
            formats={selectedFormats}
          />
          <div className="flex flex-1 flex-col">
            <textarea
              className="border-figma-border bg-figma-bg text-figma-text min-h-[200px] w-full flex-1 resize-y rounded border p-3 font-mono text-xs"
              value={activeOutput.content}
              readOnly
              placeholder={
                activeOutput.content
                  ? undefined
                  : `Click 'Generate' to export ${activeConfig.label}...`
              }
            />
            {activeOutput.content && (
              <div className="mt-2 flex items-center justify-end gap-2">
                {activeOutput.actionStatus && (
                  <span
                    className={`text-xs transition-opacity duration-500 ${
                      activeOutput.actionStatus.visible ? 'opacity-100' : 'opacity-0'
                    } ${
                      activeOutput.actionStatus.type === 'success'
                        ? 'text-figma-success'
                        : 'text-figma-error'
                    }`}
                  >
                    {activeOutput.actionStatus.message}
                  </span>
                )}
                <IconButton
                  icon={<CopyIcon />}
                  aria-label="Copy to clipboard"
                  onClick={() => handleCopy(activeOutputTab)}
                />
                <IconButton
                  icon={<DownloadIcon />}
                  aria-label="Download"
                  onClick={() => handleDownload(activeOutputTab)}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
