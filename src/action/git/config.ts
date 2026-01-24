/**
 * Git configuration utilities
 *
 * Note: Uses @actions/exec which safely passes arguments as arrays,
 * avoiding shell interpolation vulnerabilities.
 */

import * as actionsExec from '@actions/exec';

/**
 * Configures git with user name and email for GitHub Actions bot
 */
export async function configureGit(): Promise<void> {
  await actionsExec.exec('git', ['config', '--local', 'user.name', 'github-actions[bot]']);
  await actionsExec.exec('git', [
    'config',
    '--local',
    'user.email',
    'github-actions[bot]@users.noreply.github.com',
  ]);
}
