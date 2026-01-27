/**
 * GitHub Action entry point for Figma VEX
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import { convertToCss, convertToScss, convertToTypeScript } from '@figma-vex/shared';
import { writeFiles } from './files.js';
import { handleBranchAndPR } from './github.js';
import { createPRBody } from './pr/body.js';
import type { ActionInputs, FileWrite, RepositoryDispatchPayload } from './types.js';

/**
 * Validates that at least one path input is provided
 */
export function validateInputs(inputs: ActionInputs): void {
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
export function validatePayload(payload: unknown): payload is RepositoryDispatchPayload {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid event payload: payload is not an object');
  }

  const p = payload as Record<string, unknown>;

  if (!p.client_payload || typeof p.client_payload !== 'object') {
    throw new Error('Invalid event payload: client_payload is missing or invalid');
  }

  const cp = p.client_payload as Record<string, unknown>;

  if (!cp.document || typeof cp.document !== 'object') {
    throw new Error('Invalid event payload: client_payload.document is missing or invalid');
  }

  if (!cp.settings || typeof cp.settings !== 'object') {
    throw new Error('Invalid event payload: client_payload.settings is missing or invalid');
  }

  if (!Array.isArray(cp.export_types)) {
    throw new Error('Invalid event payload: client_payload.export_types is missing or invalid');
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
export function collectFilesToWrite(
  inputs: ActionInputs,
  payload: RepositoryDispatchPayload
): FileWrite[] {
  const files: FileWrite[] = [];
  const { document, settings, export_types } = payload.client_payload;

  if (inputs.cssPath && export_types.includes('css')) {
    files.push({
      path: inputs.cssPath,
      content: convertToCss(document, settings),
    });
  }

  if (inputs.scssPath && export_types.includes('scss')) {
    files.push({
      path: inputs.scssPath,
      content: convertToScss(document, settings),
    });
  }

  if (inputs.jsonPath && export_types.includes('json')) {
    files.push({
      path: inputs.jsonPath,
      content: JSON.stringify(document, null, 2),
    });
  }

  if (inputs.typescriptPath && export_types.includes('typescript')) {
    files.push({
      path: inputs.typescriptPath,
      content: convertToTypeScript(document, settings),
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
      dryRun: core.getInput('dry-run') === 'true',
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
      throw new Error('No files to write: export types do not match provided paths');
    }

    // Get file paths for PR body
    const filePaths = filesToWrite.map((f) => f.path);

    // Handle dry-run mode
    if (inputs.dryRun) {
      core.info('🔍 Dry-run mode enabled - previewing changes without writing files or creating PR');
      core.info('');

      // Output PR title
      core.info(`📝 PR Title: ${inputs.prTitle}`);
      core.info('');

      // Output PR body
      const prBody = createPRBody(typedPayload, filePaths);
      core.info('📄 PR Description:');
      core.info('---');
      core.info(prBody);
      core.info('---');
      core.info('');

      // Output file contents
      core.info(`📁 Files to be written (${filesToWrite.length}):`);
      for (const file of filesToWrite) {
        core.info('');
        core.info(`=== ${file.path} ===`);
        core.info(file.content);
      }

      // Set dry-run outputs
      core.setOutput('pr-url', '');
      core.setOutput('pr-number', '0');
      core.setOutput('branch', '');
      core.setOutput('updated', 'false');
      core.setOutput('dry-run', 'true');

      core.info('');
      core.info('✅ Dry-run complete - no changes were made');
      return;
    }

    core.info(`Writing ${filesToWrite.length} file(s)...`);
    writeFiles(filesToWrite);

    // Handle branch and PR
    core.info('Handling branch and PR...');
    const result = await handleBranchAndPR(inputs, typedPayload, filePaths);

    // Set outputs
    core.setOutput('pr-url', result.prUrl);
    core.setOutput('pr-number', result.prNumber.toString());
    core.setOutput('branch', result.branch);
    core.setOutput('updated', result.updated.toString());
    core.setOutput('dry-run', 'false');

    core.info(`✅ Success! PR ${result.updated ? 'updated' : 'created'}: ${result.prUrl}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(message);
    throw error;
  }
}

// Run the action only when executed directly (not imported for testing)
// In GitHub Actions, NODE_ENV is typically not set to 'test'
if (process.env.NODE_ENV !== 'test') {
  run();
}
