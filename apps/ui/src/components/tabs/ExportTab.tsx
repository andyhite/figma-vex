import { useState, useCallback, useEffect } from 'react';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { Checkbox } from '../common/Checkbox';
import { CopyIcon } from '../common/CopyIcon';
import { DownloadIcon } from '../common/DownloadIcon';
import { IconButton } from '../common/IconButton';
import { ExportOutputNavigation } from './ExportOutputNavigation';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import { useClipboard } from '../../hooks/useClipboard';
import type {
  ExportType,
  ExportOptions,
  StyleType,
  StyleOutputMode,
  NameFormatRule,
  UIMessage,
  GitHubDispatchOptions,
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

  // CSS-specific options
  useModesAsSelectors: boolean;
  exportAsCalcExpressions: boolean;
  selector: string;

  // GitHub settings
  githubRepository: string;
  githubToken: string;
  githubWorkflowFileName: string;
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
  useModesAsSelectors,
  exportAsCalcExpressions,
  selector,
  githubRepository,
  githubToken,
  githubWorkflowFileName,
}: ExportTabProps) {
  const { sendMessage, listenToMessage } = usePluginMessage();
  const { copyToClipboard } = useClipboard();

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

  // Generate status message (shown next to button)
  const [generateStatus, setGenerateStatus] = useState<{
    message: string;
    type: 'success' | 'error';
    visible: boolean;
  } | null>(null);

  // GitHub integration state
  const [sendToGitHub, setSendToGitHub] = useState(false);
  const [githubStatus, setGithubStatus] = useState<{
    message: string;
    type: 'sending' | 'success' | 'error';
    visible: boolean;
  } | null>(null);

  const isGitHubConfigured = githubRepository.trim() !== '' && githubToken.trim() !== '';

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
        setGithubStatus({ message: 'Sent to GitHub!', type: 'success', visible: true });
        setTimeout(() => {
          setGithubStatus((prev) => (prev ? { ...prev, visible: false } : null));
        }, 2000);
        setTimeout(() => {
          setGithubStatus(null);
        }, 2500);
      } else if (message.type === 'error') {
        // Handle GitHub errors
        setGithubStatus((prev) => {
          if (prev?.type === 'sending') {
            setTimeout(() => {
              setGithubStatus((p) => (p ? { ...p, visible: false } : null));
            }, 3000);
            setTimeout(() => {
              setGithubStatus(null);
            }, 3500);
            return { message: message.message, type: 'error', visible: true };
          }
          return prev;
        });
        // Handle generation errors
        setIsGenerating(false);
        setPendingFormats(new Set());
        setGenerateStatus({ message: message.message, type: 'error', visible: true });
        // Fade out after 2 seconds
        setTimeout(() => {
          setGenerateStatus((prev) => (prev ? { ...prev, visible: false } : null));
        }, 2000);
        // Remove after fade
        setTimeout(() => {
          setGenerateStatus(null);
        }, 2500);
      }
    });

    return cleanup;
  }, [listenToMessage]);

  // Show success when all pending formats complete
  useEffect(() => {
    if (isGenerating && pendingFormats.size === 0) {
      setIsGenerating(false);
      setGenerateStatus({ message: 'Generated!', type: 'success', visible: true });
      // Fade out after 2 seconds
      setTimeout(() => {
        setGenerateStatus((prev) => (prev ? { ...prev, visible: false } : null));
      }, 2000);
      // Remove after fade
      setTimeout(() => {
        setGenerateStatus(null);
      }, 2500);
    }
  }, [isGenerating, pendingFormats.size]);

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
        selectedCollections: selectedCollections.length > 0 ? selectedCollections : undefined,
        includeStyles,
        styleOutputMode,
        styleTypes,
        syncCalculations,
        numberPrecision,
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
      selectedCollections,
      includeStyles,
      styleOutputMode,
      styleTypes,
      syncCalculations,
      numberPrecision,
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
    setGenerateStatus(null);
    setPendingFormats(new Set(selectedFormats));

    // Send export message for each selected format
    for (const format of selectedFormats) {
      const config = FORMAT_CONFIG[format];
      const options = buildExportOptions(format);
      sendMessage({ type: config.messageType, options });
    }

    // Send to GitHub if enabled
    if (sendToGitHub && isGitHubConfigured) {
      setGithubStatus({ message: 'Sending to GitHub...', type: 'sending', visible: true });

      const githubExportOptions: ExportOptions = {
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
        numberPrecision,
      };

      const githubOptions: GitHubDispatchOptions = {
        repository: githubRepository.trim(),
        token: githubToken.trim(),
        workflowFileName: githubWorkflowFileName.trim() || 'update-variables.yml',
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
    githubWorkflowFileName,
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
    numberPrecision,
  ]);

  // Copy handler
  const handleCopy = useCallback(
    async (format: ExportType) => {
      const output = outputs[format].content;
      if (!output) return;

      const success = await copyToClipboard(output);
      setOutputs((prev) => ({
        ...prev,
        [format]: {
          ...prev[format],
          actionStatus: {
            message: success ? 'Copied!' : 'Failed to copy',
            type: success ? 'success' : 'error',
            visible: true,
          },
        },
      }));

      // Fade out after 2 seconds
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
      }, 2000);

      // Remove after fade
      setTimeout(() => {
        setOutputs((prev) => ({
          ...prev,
          [format]: { ...prev[format], actionStatus: null },
        }));
      }, 2500);
    },
    [outputs, copyToClipboard]
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

      setOutputs((prev) => ({
        ...prev,
        [format]: {
          ...prev[format],
          actionStatus: { message: 'Downloaded!', type: 'success', visible: true },
        },
      }));

      // Fade out after 2 seconds
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
      }, 2000);

      // Remove after fade
      setTimeout(() => {
        setOutputs((prev) => ({
          ...prev,
          [format]: { ...prev[format], actionStatus: null },
        }));
      }, 2500);
    },
    [outputs]
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
