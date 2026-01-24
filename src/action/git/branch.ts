/**
 * Git branch operations
 *
 * Note: Uses @actions/exec which safely passes arguments as arrays,
 * avoiding shell interpolation vulnerabilities.
 */

import * as actionsExec from '@actions/exec';

/**
 * Creates a new branch from the base branch using git
 */
export async function createBranch(branchName: string, baseBranch: string): Promise<void> {
  // Fetch the latest from origin
  await actionsExec.exec('git', ['fetch', 'origin', baseBranch]);
  // Create and checkout the new branch
  await actionsExec.exec('git', ['checkout', '-b', branchName, `origin/${baseBranch}`]);
}

/**
 * Checks out an existing branch
 */
export async function checkoutBranch(branchName: string): Promise<void> {
  // Fetch the branch from origin
  await actionsExec.exec('git', ['fetch', 'origin', branchName]);

  // Try to checkout the branch (might exist locally)
  const exitCode = await actionsExec.exec('git', ['checkout', branchName], {
    ignoreReturnCode: true,
  });

  // If checkout failed, create a tracking branch
  if (exitCode !== 0) {
    await actionsExec.exec('git', ['checkout', '-b', branchName, `origin/${branchName}`]);
  }
}
