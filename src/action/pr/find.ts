/**
 * PR discovery utilities
 */

import * as github from '@actions/github';
import { BRANCH_PREFIX } from '../constants.js';

/**
 * Finds an existing open PR with a figma-vex branch
 */
export async function findExistingPR(
  octokit: ReturnType<typeof github.getOctokit>,
  owner: string,
  repo: string,
  baseBranch: string
): Promise<{ number: number; head: string } | null> {
  const { data: prs } = await octokit.rest.pulls.list({
    owner,
    repo,
    state: 'open',
    base: baseBranch,
  });

  const existingPR = prs.find((pr) => pr.head.ref.startsWith(BRANCH_PREFIX));
  if (existingPR) {
    return {
      number: existingPR.number,
      head: existingPR.head.ref,
    };
  }

  return null;
}
