import { useState, useCallback, useEffect } from 'react';
import { Button } from '../common/Button';
import { Checkbox } from '../common/Checkbox';
import { Input } from '../common/Input';
import { StatusMessage } from '../common/StatusMessage';
import { usePluginMessage } from '../../hooks/usePluginMessage';
import type { ExportOptions, ExportType, GitHubDispatchOptions } from '@shared/types';

interface GitHubTabProps {
  prefix: string;
  selectedCollections: string[];
  includeCollectionComments: boolean;
}

export function GitHubTab({
  prefix,
  selectedCollections,
  includeCollectionComments,
}: GitHubTabProps) {
  const [repository, setRepository] = useState('');
  const [token, setToken] = useState('');
  const [workflowFileName, setWorkflowFileName] = useState('update-variables.yml');
  const [exportTypes, setExportTypes] = useState<Set<ExportType>>(new Set(['css', 'json']));
  const [cssSelector, setCssSelector] = useState(':root');
  const [useModesAsSelectors, setUseModesAsSelectors] = useState(false);
  const [status, setStatus] = useState<{ message: string; type: 'success' | 'error' | 'info' }>({
    message: '',
    type: 'info',
  });
  const { sendMessage, listenToMessage } = usePluginMessage();

  // Listen for GitHub dispatch results
  const handleMessage = useCallback((message: { type: string; message?: string }) => {
    if (message.type === 'github-dispatch-success') {
      setStatus({ message: message.message || 'Successfully sent to GitHub!', type: 'success' });
    } else if (message.type === 'error') {
      setStatus({ message: message.message || 'An error occurred', type: 'error' });
    }
  }, []);

  useEffect(() => {
    const cleanup = listenToMessage(handleMessage as (msg: unknown) => void);
    return cleanup;
  }, [listenToMessage, handleMessage]);

  const toggleExportType = useCallback((type: ExportType) => {
    setExportTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

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
      includeModeComments: true,
      selectedCollections: selectedCollections.length > 0 ? selectedCollections : undefined,
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
    sendMessage,
  ]);

  return (
    <div>
      <Input
        label="GitHub Repository"
        value={repository}
        onChange={(e) => setRepository(e.target.value)}
        placeholder="owner/repo (e.g., octocat/Hello-World)"
      />
      <p className="mt-1 text-[10px] text-figma-text-tertiary">Format: owner/repository-name</p>

      <Input
        label="GitHub Personal Access Token"
        type="password"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="ghp_xxxxxxxxxxxx"
      />
      <p className="mt-1 text-[10px] text-figma-text-tertiary">
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
      </p>

      <Input
        label="Workflow File Name (optional)"
        value={workflowFileName}
        onChange={(e) => setWorkflowFileName(e.target.value)}
        placeholder="update-variables.yml"
      />
      <p className="mt-1 text-[10px] text-figma-text-tertiary">
        Optional metadata included in the payload (does not need to match an actual workflow file)
      </p>

      <div className="form-group mb-3">
        <label className="text-label mb-2 block text-xs font-medium text-figma-text">
          Export Types
        </label>
        <div className="mt-2 space-y-2">
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
        </div>
      </div>

      {exportTypes.has('css') && (
        <div className="form-group mb-3">
          <label className="text-label mb-2 block text-xs font-medium text-figma-text">
            CSS Options
          </label>
          <div className="mt-2 space-y-2">
            <Input
              label="CSS Selector"
              value={cssSelector}
              onChange={(e) => setCssSelector(e.target.value)}
              className="w-[200px]"
            />
            <Checkbox
              label="Export modes as separate selectors"
              checked={useModesAsSelectors}
              onChange={(e) => setUseModesAsSelectors(e.target.checked)}
            />
          </div>
        </div>
      )}

      <div className="button-row mb-4 mt-4 flex gap-2">
        <Button onClick={handleDispatch}>Send to GitHub</Button>
      </div>

      {status.message && <StatusMessage type={status.type}>{status.message}</StatusMessage>}

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
