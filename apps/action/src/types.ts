/**
 * Types for GitHub Action
 */

import type { GitHubDispatchPayload } from '@figma-vex/shared';

export interface ActionInputs {
  dryRun: boolean;
  token: string;
  baseBranch?: string;
  prTitle: string;
  cssPath?: string;
  scssPath?: string;
  jsonPath?: string;
  typescriptPath?: string;
}

export interface RepositoryDispatchPayload {
  client_payload: GitHubDispatchPayload & {
    generated_at: string;
    figma_file: string;
    workflow_file: string;
  };
}

export interface FileWrite {
  path: string;
  content: string;
}
