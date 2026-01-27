/**
 * Types for GitHub Action
 */

export interface ActionInputs {
  token: string;
  baseBranch?: string;
  prTitle: string;
  cssPath?: string;
  scssPath?: string;
  jsonPath?: string;
  typescriptPath?: string;
}

export interface RepositoryDispatchPayload {
  client_payload: {
    exports: Record<string, string>;
    generated_at: string;
    figma_file: string;
    workflow_file: string;
  };
}

export interface FileWrite {
  path: string;
  content: string;
}
