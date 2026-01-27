import type { GitHubDispatchOptions, GitHubDispatchPayload } from '@figma-vex/shared';
import { GITHUB_API_CONFIG } from '@figma-vex/shared';

export interface DispatchPayload {
  event_type: string;
  client_payload: GitHubDispatchPayload & {
    generated_at: string;
    figma_file: string;
    workflow_file: string;
  };
}

/**
 * Validates GitHub dispatch options.
 */
export function validateGitHubOptions(options: GitHubDispatchOptions): void {
  const repoParts = options.repository.trim().split('/').filter(Boolean);

  if (repoParts.length !== 2) {
    throw new Error(
      "Invalid repository format. Expected 'owner/repo' (e.g., 'octocat/Hello-World')"
    );
  }

  const [owner, repo] = repoParts;
  if (!owner || !repo) {
    throw new Error('Repository owner and name are required');
  }

  const token = options.token.trim();
  if (!token) {
    throw new Error('GitHub token is required');
  }

  if (!options.exportTypes || options.exportTypes.length === 0) {
    throw new Error('At least one export type must be selected');
  }
}

/**
 * Builds the dispatch payload for GitHub API.
 */
export function buildDispatchPayload(
  dtcgPayload: GitHubDispatchPayload,
  figmaFile: string,
  workflowFile: string
): DispatchPayload {
  return {
    event_type: 'figma-variables-update',
    client_payload: {
      ...dtcgPayload,
      generated_at: new Date().toISOString(),
      figma_file: figmaFile,
      workflow_file: workflowFile,
    },
  };
}

/**
 * Parses GitHub API error response.
 */
export function parseGitHubError(status: number, errorText: string): string {
  let errorMessage = `GitHub API error (${status})`;

  try {
    const errorJson = JSON.parse(errorText);
    const firstError = errorJson.errors && errorJson.errors[0] ? errorJson.errors[0].message : null;
    errorMessage = errorJson.message || firstError || errorMessage;
  } catch {
    if (errorText && errorText.length < 200) {
      errorMessage = errorText;
    }
  }

  if (status === 401) {
    errorMessage = 'Authentication failed. Please check your GitHub token.';
  } else if (status === 403) {
    errorMessage = "Access forbidden. Ensure your token has 'repo' scope and repository access.";
  } else if (status === 404) {
    errorMessage = 'Repository not found. Check the repository name and your access permissions.';
  }

  return errorMessage;
}

/**
 * Sends a repository_dispatch event to GitHub.
 */
export async function sendGitHubDispatch(
  options: GitHubDispatchOptions,
  dtcgPayload: GitHubDispatchPayload,
  figmaFileName: string
): Promise<void> {
  validateGitHubOptions(options);

  const [owner, repo] = options.repository.trim().split('/');
  const token = options.token.trim();

  const payload = buildDispatchPayload(
    dtcgPayload,
    figmaFileName,
    options.workflowFileName || 'update-variables.yml'
  );

  const url = `${GITHUB_API_CONFIG.BASE_URL}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/dispatches`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': GITHUB_API_CONFIG.API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (fetchError) {
    throw new Error(
      `Network error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(parseGitHubError(response.status, errorText));
  }
}
