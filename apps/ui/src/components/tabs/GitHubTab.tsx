import { useState, useCallback, useEffect } from 'react';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { Checkbox } from '../common/Checkbox';
import { FormGroup } from '../common/FormGroup';
import { FormHelpText } from '../common/FormHelpText';
import { Input } from '../common/Input';
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

interface GitHubTabProps {
  prefix: string;
  selectedCollections: string[];
  includeCollectionComments: boolean;
  includeModeComments: boolean; // Global setting from Settings tab
  syncCalculations: boolean;
  includeStyles: boolean;
  styleOutputMode: StyleOutputMode;
  styleTypes: StyleType[];
  // Persisted settings (token excluded for security)
  initialRepository?: string;
  initialWorkflowFileName?: string;
  initialExportTypes?: ExportType[];
  initialCssSelector?: string;
  initialUseModesAsSelectors?: boolean;
  onSettingsChange?: (settings: {
    githubRepository: string;
    githubWorkflowFileName: string;
    githubExportTypes: ExportType[];
    githubCssSelector: string;
    githubUseModesAsSelectors: boolean;
  }) => void;
}

export function GitHubTab({
  prefix,
  selectedCollections,
  includeCollectionComments,
  includeModeComments,
  syncCalculations,
  includeStyles,
  styleOutputMode,
  styleTypes,
  initialRepository = '',
  initialWorkflowFileName = 'update-variables.yml',
  initialExportTypes = ['css', 'json'],
  initialCssSelector = ':root',
  initialUseModesAsSelectors = false,
  onSettingsChange,
}: GitHubTabProps) {
  const [repository, setRepository] = useState(initialRepository);
  const [token, setToken] = useState(''); // Never persisted for security
  const [workflowFileName, setWorkflowFileName] = useState(initialWorkflowFileName);
  const [exportTypes, setExportTypes] = useState<Set<ExportType>>(new Set(initialExportTypes));
  const [cssSelector, setCssSelector] = useState(initialCssSelector);
  const [useModesAsSelectors, setUseModesAsSelectors] = useState(initialUseModesAsSelectors);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' }>({
    message: '',
    type: 'info',
  });
  const { sendMessage, listenToMessage } = usePluginMessage();

  // Helper to persist current settings
  const persistSettings = (updates: Partial<{
    repository: string;
    workflowFileName: string;
    exportTypes: Set<ExportType>;
    cssSelector: string;
    useModesAsSelectors: boolean;
  }>) => {
    const currentRepository = updates.repository ?? repository;
    const currentWorkflowFileName = updates.workflowFileName ?? workflowFileName;
    const currentExportTypes = updates.exportTypes ?? exportTypes;
    const currentCssSelector = updates.cssSelector ?? cssSelector;
    const currentUseModesAsSelectors = updates.useModesAsSelectors ?? useModesAsSelectors;

    onSettingsChange?.({
      githubRepository: currentRepository,
      githubWorkflowFileName: currentWorkflowFileName,
      githubExportTypes: Array.from(currentExportTypes),
      githubCssSelector: currentCssSelector,
      githubUseModesAsSelectors: currentUseModesAsSelectors,
    });
  };

  const handleRepositoryChange = (value: string) => {
    setRepository(value);
    persistSettings({ repository: value });
  };

  const handleWorkflowFileNameChange = (value: string) => {
    setWorkflowFileName(value);
    persistSettings({ workflowFileName: value });
  };

  const handleCssSelectorChange = (value: string) => {
    setCssSelector(value);
    persistSettings({ cssSelector: value });
  };

  const handleUseModesAsSelectorChange = (value: boolean) => {
    setUseModesAsSelectors(value);
    persistSettings({ useModesAsSelectors: value });
  };

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

  const toggleExportType = useCallback(
    (type: ExportType) => {
      setExportTypes((prev) => {
        const next = new Set(prev);
        if (next.has(type)) {
          next.delete(type);
        } else {
          next.add(type);
        }
        // Persist with updated export types
        onSettingsChange?.({
          githubRepository: repository,
          githubWorkflowFileName: workflowFileName,
          githubExportTypes: Array.from(next),
          githubCssSelector: cssSelector,
          githubUseModesAsSelectors: useModesAsSelectors,
        });
        return next;
      });
    },
    [repository, workflowFileName, cssSelector, useModesAsSelectors, onSettingsChange]
  );

  const handleDispatch = useCallback(() => {
    // Validate inputs
    if (!repository.trim()) {
      setStatus({ message: 'Please enter a GitHub repository', type: 'error' });
      return;
    }

    if (!token.trim()) {
      setStatus({ message: 'Please enter a GitHub token', type: 'error' });
      return;
    }

    // Validate repository format
    const repoParts = repository.trim().split('/').filter(Boolean);
    if (repoParts.length !== 2) {
      setStatus({
        message: 'Repository must be in format: owner/repo (e.g., octocat/Hello-World)',
        type: 'error',
      });
      return;
    }

    if (exportTypes.size === 0) {
      setStatus({ message: 'Please select at least one export type', type: 'error' });
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
    };

    const githubOptions: GitHubDispatchOptions = {
      repository: repository.trim(),
      token: token.trim(),
      workflowFileName: workflowFileName.trim() || 'update-variables.yml',
      exportTypes: Array.from(exportTypes),
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
    selectedCollections,
    includeStyles,
    styleOutputMode,
    styleTypes,
    syncCalculations,
    sendMessage,
  ]);

  return (
    <div>
      <Input
        label="GitHub Repository"
        value={repository}
        onChange={(e) => handleRepositoryChange(e.target.value)}
        placeholder="owner/repo (e.g., octocat/Hello-World)"
      />
      <FormHelpText>Format: owner/repository-name</FormHelpText>

      <Input
        label="GitHub Personal Access Token"
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="ghp_xxxxxxxxxxxx"
        autoComplete="new-password"
      />
      <FormHelpText>
        Token needs{' '}
        <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">repo</code>{' '}
        scope. Create one at:{' '}
        <a
          href="https://github.com/settings/tokens"
          target="_blank"
          rel="noopener noreferrer"
          className="text-figma-primary hover:underline"
        >
          github.com/settings/tokens
        </a>
      </FormHelpText>

      <Input
        label="Workflow File Name (optional)"
        value={workflowFileName}
        onChange={(e) => handleWorkflowFileNameChange(e.target.value)}
        placeholder="update-variables.yml"
      />
      <FormHelpText>
        Optional metadata included in the payload (does not need to match an actual workflow file)
      </FormHelpText>

      <FormGroup label="Export Types">
        <Checkbox
          label="CSS"
          checked={exportTypes.has('css')}
          onChange={() => toggleExportType('css')}
        />
        <Checkbox
          label="SCSS"
          checked={exportTypes.has('scss')}
          onChange={() => toggleExportType('scss')}
        />
        <Checkbox
          label="JSON"
          checked={exportTypes.has('json')}
          onChange={() => toggleExportType('json')}
        />
        <Checkbox
          label="TypeScript"
          checked={exportTypes.has('typescript')}
          onChange={() => toggleExportType('typescript')}
        />
      </FormGroup>

      {exportTypes.has('css') && (
        <FormGroup label="CSS Options">
          <Input
            label="CSS Selector"
            value={cssSelector}
            onChange={(e) => handleCssSelectorChange(e.target.value)}
            className="w-[200px]"
          />
          <Checkbox
            label="Export modes as separate selectors"
            checked={useModesAsSelectors}
            onChange={(e) => handleUseModesAsSelectorChange(e.target.checked)}
          />
        </FormGroup>
      )}

      <ButtonGroup>
        <Button onClick={handleDispatch}>Send to GitHub</Button>
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

      <div className="help-section mt-5 rounded border border-figma-border bg-figma-bg-secondary p-3">
        <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-figma-text-secondary">
          How it works
        </h4>
        <p className="mb-3 text-xs text-figma-text-secondary">
          This will trigger a{' '}
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            repository_dispatch
          </code>{' '}
          event in your GitHub repository with event type{' '}
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            figma-variables-update
          </code>
          . The payload includes all selected exports in the{' '}
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            client_payload.exports
          </code>{' '}
          object.
        </p>
        <h4 className="mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide text-figma-text-secondary">
          Payload Structure
        </h4>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded border border-figma-border bg-figma-bg p-3 text-[10px] text-figma-text">
          {`{
  "event_type": "figma-variables-update",
  "client_payload": {
    "exports": {
      "css": "...",
      "scss": "...",
      "json": "...",
      "typescript": "..."
    },
    "generated_at": "2024-01-01T00:00:00.000Z",
    "figma_file": "Design File",
    "workflow_file": "update-variables.yml"
  }
}`}
        </pre>
        <p className="mb-3 mt-3 text-xs text-figma-text-secondary">
          Access the exports in your workflow via{' '}
          <code className="rounded border border-figma-border bg-figma-bg px-1 py-0.5">
            $&#123;&#123; github.event.client_payload.exports.* &#125;&#125;
          </code>
        </p>
      </div>
    </div>
  );
}
