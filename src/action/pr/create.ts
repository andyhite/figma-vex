/**
 * PR creation and update utilities
 */

import * as github from '@actions/github';

/**
 * Creates or updates a PR
 */
export async function createOrUpdatePR(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  branch: string,
  baseBranch: string,
  title: string,
  body: string,
  existingPRNumber?: number
): Promise<{ number: number; url: string }> {
  if (existingPRNumber) {
    // Update existing PR
    const { data: pr } = await octokit.rest.pulls.update({
      owner,
      repo,
      pull_number: existingPRNumber,
      body,
    });
    return {
      number: pr.number,
      url: pr.html_url,
    };
  } else {
    // Create new PR
    const { data: pr } = await octokit.rest.pulls.create({
      owner,
      repo,
      title,
      head: branch,
      base: baseBranch,
      body,
    });
    return {
      number: pr.number,
      url: pr.html_url,
    };
  }
}
