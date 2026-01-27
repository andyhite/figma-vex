import { useState, useCallback, useEffect } from 'react';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { StatusMessage } from '../common/StatusMessage';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import type {
  ExportOptions,
  ExportType,
  GitHubDispatchOptions,
  UIMessage,
  StyleType,
  StyleOutputMode,
} from '@figma-vex/shared';

interface GitHubActionTabProps {
  // Export options from global settings
  prefix: string;
  selectedCollections: string[];
  includeCollectionComments: boolean;
  includeModeComments: boolean;
  syncCalculations: boolean;
  includeStyles: boolean;
  styleOutputMode: StyleOutputMode;
  styleTypes: StyleType[];
  numberPrecision: number;
  // GitHub settings from Settings > GitHub
  repository: string;
  token: string;
  workflowFileName: string;
  exportTypes: ExportType[];
  cssSelector: string;
  useModesAsSelectors: boolean;
}

export function GitHubActionTab({
  prefix,
  selectedCollections,
  includeCollectionComments,
  includeModeComments,
  syncCalculations,
  includeStyles,
  styleOutputMode,
  styleTypes,
  numberPrecision,
  repository,
  token,
  workflowFileName,
  exportTypes,
  cssSelector,
  useModesAsSelectors,
}: GitHubActionTabProps) {
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' }>({
    message: '',
    type: 'info',
  });
  const { sendMessage, listenToMessage } = usePluginMessage();

  // Listen for GitHub dispatch results
  const handleMessage = useCallback((message: UIMessage) => {
    if (message.type === 'github-dispatch-success') {
      setStatus({ message: message.message, type: 'success' });
    } else if (message.type === 'error') {
      setStatus({ message: message.message, type: 'error' });
    }
  }, []);

  useEffect(() => {
    const cleanup = listenToMessage(handleMessage);
    return cleanup;
  }, [listenToMessage, handleMessage]);

  const handleDispatch = useCallback(() => {
    // Validate inputs
    if (!repository.trim()) {
      setStatus({
        message: 'Please configure a GitHub repository in Settings > GitHub',
        type: 'error',
      });
      return;
    }

    if (!token.trim()) {
      setStatus({ message: 'Please configure a GitHub token in Settings > GitHub', type: 'error' });
      return;
    }

    // Validate repository format
    const repoParts = repository.trim().split('/').filter(Boolean);
    if (repoParts.length !== 2) {
      setStatus({
        message: 'Repository must be in format: owner/repo. Please fix in Settings > GitHub',
        type: 'error',
      });
      return;
    }

    if (exportTypes.length === 0) {
      setStatus({
        message: 'Please select at least one export type in Settings > GitHub',
        type: 'error',
      });
      return;
    }

    const exportOptions: ExportOptions = {
      selector: cssSelector.trim() || ':root',
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
      repository: repository.trim(),
      token: token.trim(),
      workflowFileName: workflowFileName.trim() || 'update-variables.yml',
      exportTypes,
      exportOptions,
    };

    sendMessage({ type: 'github-dispatch', githubOptions });
    setStatus({ message: 'Sending to GitHub...', type: 'info' });
  }, [
    repository,
    token,
    workflowFileName,
    exportTypes,
    cssSelector,
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
    sendMessage,
  ]);

  const hasConfiguration = repository.trim() && token.trim() && exportTypes.length > 0;

  return (
    <div>
      {!hasConfiguration && (
        <div className="border-figma-border bg-figma-bg-secondary mb-4 rounded border p-3">
          <p className="text-figma-text-secondary text-xs">
            Configure your GitHub repository, token, and export types in{' '}
            <strong className="text-figma-text">Settings &gt; GitHub</strong> before sending.
          </p>
        </div>
      )}

      {hasConfiguration && (
        <div className="border-figma-border bg-figma-bg-secondary mb-4 rounded border p-3">
          <h4 className="text-figma-text-secondary mb-2 text-[10px] font-semibold uppercase tracking-wide">
            Current Configuration
          </h4>
          <div className="space-y-1 text-xs">
            <div>
              <span className="text-figma-text-secondary">Repository: </span>
              <span className="text-figma-text">{repository}</span>
            </div>
            <div>
              <span className="text-figma-text-secondary">Export Types: </span>
              <span className="text-figma-text">{exportTypes.join(', ').toUpperCase()}</span>
            </div>
            {exportTypes.includes('css') && (
              <div>
                <span className="text-figma-text-secondary">CSS Selector: </span>
                <span className="text-figma-text">{cssSelector || ':root'}</span>
              </div>
            )}
          </div>
          <p className="text-figma-text-secondary mt-2 text-[10px]">
            Edit these settings in Settings &gt; GitHub
          </p>
        </div>
      )}

      <ButtonGroup>
        <Button onClick={handleDispatch} disabled={!hasConfiguration}>
          Send to GitHub
        </Button>
      </ButtonGroup>

      {status.message && (
        <StatusMessage
          type={status.type}
          autoDismiss={status.type === 'success' ? 3000 : 5000}
          onDismiss={() => setStatus({ message: '', type: 'info' })}
        >
          {status.message}
        </StatusMessage>
      )}
    </div>
  );
}
