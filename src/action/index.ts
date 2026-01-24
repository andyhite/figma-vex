/**
 * GitHub Action entry point for Figma VEX
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { writeFiles } from './files.js';
import { handleBranchAndPR } from './github.js';
import type { ActionInputs, FileWrite, RepositoryDispatchPayload } from './types.js';

/**
 * Validates that at least one path input is provided
 */
function validateInputs(inputs: ActionInputs): void {
  const hasPath = inputs.cssPath || inputs.scssPath || inputs.jsonPath || inputs.typescriptPath;

  if (!hasPath) {
    throw new Error(
      'At least one path input must be provided (css-path, scss-path, json-path, or typescript-path)'
    );
  }
}

/**
 * Validates the repository dispatch event payload
 */
function validatePayload(payload: unknown): payload is RepositoryDispatchPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid event payload: payload is not an object');
  }

  const p = payload as Record<string, unknown>;

  if (!p.client_payload || typeof p.client_payload !== 'object') {
    throw new Error('Invalid event payload: client_payload is missing or invalid');
  }

  const cp = p.client_payload as Record<string, unknown>;

  if (!cp.exports || typeof cp.exports !== 'object') {
    throw new Error('Invalid event payload: client_payload.exports is missing or invalid');
  }

  if (!cp.figma_file || typeof cp.figma_file !== 'string') {
    throw new Error('Invalid event payload: client_payload.figma_file is missing or invalid');
  }

  if (!cp.generated_at || typeof cp.generated_at !== 'string') {
    throw new Error('Invalid event payload: client_payload.generated_at is missing or invalid');
  }

  return true;
}

/**
 * Collects files to write based on inputs and payload
 */
function collectFilesToWrite(
  inputs: ActionInputs,
  payload: RepositoryDispatchPayload
): FileWrite[] {
  const files: FileWrite[] = [];

  if (inputs.cssPath && payload.client_payload.exports.css) {
    files.push({
      path: inputs.cssPath,
      content: payload.client_payload.exports.css,
    });
  }

  if (inputs.scssPath && payload.client_payload.exports.scss) {
    files.push({
      path: inputs.scssPath,
      content: payload.client_payload.exports.scss,
    });
  }

  if (inputs.jsonPath && payload.client_payload.exports.json) {
    files.push({
      path: inputs.jsonPath,
      content: payload.client_payload.exports.json,
    });
  }

  if (inputs.typescriptPath && payload.client_payload.exports.typescript) {
    files.push({
      path: inputs.typescriptPath,
      content: payload.client_payload.exports.typescript,
    });
  }

  return files;
}

/**
 * Main action function
 */
async function run(): Promise<void> {
  try {
    // Read inputs
    const inputs: ActionInputs = {
      token: core.getInput('token') || process.env.GITHUB_TOKEN || '',
      baseBranch: core.getInput('base-branch') || undefined,
      prTitle: core.getInput('pr-title') || 'chore: update design tokens from figma',
      cssPath: core.getInput('css-path') || undefined,
      scssPath: core.getInput('scss-path') || undefined,
      jsonPath: core.getInput('json-path') || undefined,
      typescriptPath: core.getInput('typescript-path') || undefined,
    };

    // Validate inputs
    validateInputs(inputs);

    if (!inputs.token) {
      throw new Error('GitHub token is required');
    }

    // Validate event type
    if (github.context.eventName !== 'repository_dispatch') {
      throw new Error(
        `This action can only be triggered by repository_dispatch events, got: ${github.context.eventName}`
      );
    }

    // Validate payload
    const payload = github.context.payload as unknown;
    validatePayload(payload);
    const typedPayload = payload as RepositoryDispatchPayload;

    // Collect files to write
    const filesToWrite = collectFilesToWrite(inputs, typedPayload);
    if (filesToWrite.length === 0) {
      throw new Error('No files to write: exports do not match provided paths');
    }

    core.info(`Writing ${filesToWrite.length} file(s)...`);
    writeFiles(filesToWrite);

    // Get file paths for PR body
    const filePaths = filesToWrite.map((f) => f.path);

    // Handle branch and PR
    core.info('Handling branch and PR...');
    const result = await handleBranchAndPR(inputs, typedPayload, filePaths);

    // Set outputs
    core.setOutput('pr-url', result.prUrl);
    core.setOutput('pr-number', result.prNumber.toString());
    core.setOutput('branch', result.branch);
    core.setOutput('updated', result.updated.toString());

    core.info(`✅ Success! PR ${result.updated ? 'updated' : 'created'}: ${result.prUrl}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(message);
    throw error;
  }
}

// Run the action
run();
