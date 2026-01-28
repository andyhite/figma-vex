import { useState, useCallback } from 'react';
import { FormHelpText } from '../common/FormHelpText';
import { Input } from '../common/Input';

interface GitHubSettingsProps {
  // Persisted settings
  initialRepository?: string;
  initialToken?: string;
  initialWorkflowFileName?: string;
  onSettingsChange?: (settings: {
    githubRepository: string;
    githubToken: string;
    githubWorkflowFileName: string;
  }) => void;
}

export function GitHubSettings({
  initialRepository = '',
  initialToken = '',
  initialWorkflowFileName = 'update-variables.yml',
  onSettingsChange,
}: GitHubSettingsProps) {
  const [repository, setRepository] = useState(initialRepository);
  const [token, setToken] = useState(initialToken);
  const [workflowFileName, setWorkflowFileName] = useState(initialWorkflowFileName);

  // Helper to persist current settings
  const persistSettings = useCallback(
    (
      updates: Partial<{
        repository: string;
        token: string;
        workflowFileName: string;
      }>
    ) => {
      const currentRepository = updates.repository ?? repository;
      const currentToken = updates.token ?? token;
      const currentWorkflowFileName = updates.workflowFileName ?? workflowFileName;

      onSettingsChange?.({
        githubRepository: currentRepository,
        githubToken: currentToken,
        githubWorkflowFileName: currentWorkflowFileName,
      });
    },
    [repository, token, workflowFileName, onSettingsChange]
  );

  const handleRepositoryChange = (value: string) => {
    setRepository(value);
    persistSettings({ repository: value });
  };

  const handleTokenChange = (value: string) => {
    setToken(value);
    persistSettings({ token: value });
  };

  const handleWorkflowFileNameChange = (value: string) => {
    setWorkflowFileName(value);
    persistSettings({ workflowFileName: value });
  };

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
        onChange={(e) => handleTokenChange(e.target.value)}
        placeholder="ghp_xxxxxxxxxxxx"
        autoComplete="new-password"
      />
      <FormHelpText>
        Token needs{' '}
        <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">repo</code>{' '}
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

      <div className="help-section border-figma-border bg-figma-bg-secondary mt-5 rounded border p-3">
        <h4 className="text-figma-text-secondary mb-2 text-[10px] font-semibold uppercase tracking-wide">
          How it works
        </h4>
        <p className="text-figma-text-secondary mb-3 text-xs">
          The GitHub tab will trigger a{' '}
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            repository_dispatch
          </code>{' '}
          event in your GitHub repository with event type{' '}
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            figma-variables-update
          </code>
          . The payload includes all selected exports in the{' '}
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            client_payload.exports
          </code>{' '}
          object.
        </p>
        <h4 className="text-figma-text-secondary mb-2 mt-3 text-[10px] font-semibold uppercase tracking-wide">
          Payload Structure
        </h4>
        <pre className="border-figma-border bg-figma-bg text-figma-text mt-2 overflow-x-auto whitespace-pre-wrap break-words rounded border p-3 text-[10px]">
          {`{
  "event_type": "figma-variables-update",
  "client_payload": {
    "exports": {
      "css": "...",
      "json": "...",
      "typescript": "..."
    },
    "generated_at": "2024-01-01T00:00:00.000Z",
    "figma_file": "Design File",
    "workflow_file": "update-variables.yml"
  }
}`}
        </pre>
        <p className="text-figma-text-secondary mb-3 mt-3 text-xs">
          Access the exports in your workflow via{' '}
          <code className="border-figma-border bg-figma-bg rounded border px-1 py-0.5">
            $&#123;&#123; github.event.client_payload.exports.* &#125;&#125;
          </code>
        </p>
      </div>
    </div>
  );
}
