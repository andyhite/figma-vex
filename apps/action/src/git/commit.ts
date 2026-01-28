/**
 * Git commit and push operations
 *
 * Note: Uses @actions/exec which safely passes arguments as arrays,
 * avoiding shell interpolation vulnerabilities.
 */

import * as core from '@actions/core';
import * as actionsExec from '@actions/exec';
import * as github from '@actions/github';

/**
 * Commits and pushes changes to a branch using git
 */
export async function commitAndPush(
  branch: string,
  commitMessage: string,
  token: string,
  force: boolean
): Promise<void> {
  // Stage all changes
  await actionsExec.exec('git', ['add', '-A']);

  // Check if there are any changes to commit
  const { exitCode, stdout: statusOutput } = await actionsExec.getExecOutput('git', [
    'status',
    '--porcelain',
  ]);
  if (exitCode !== 0) {
    throw new Error('Failed to check git status');
  }
  if (!statusOutput.trim()) {
    core.info('No changes to commit');
    return;
  }

  // Commit changes
  await actionsExec.exec('git', ['commit', '-m', commitMessage]);

  // Configure remote URL with token using x-access-token format for proper log redaction
  const remoteUrl = `https://x-access-token:${token}@github.com/${github.context.repo.owner}/${github.context.repo.repo}.git`;
  await actionsExec.exec('git', ['remote', 'set-url', 'origin', remoteUrl]);

  // Push changes
  const pushArgs = ['push', 'origin', branch];
  if (force) {
    pushArgs.push('--force');
  }
  await actionsExec.exec('git', pushArgs);
}
