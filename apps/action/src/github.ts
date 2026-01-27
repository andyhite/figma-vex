/**
 * GitHub API operations for PR and branch management
 *
 * This module orchestrates the git and PR operations defined in the
 * git/ and pr/ submodules.
 */

import * as core from '@actions/core';
import * as github from '@actions/github';
import type { ActionInputs, RepositoryDispatchPayload } from './types.js';
import { BRANCH_PREFIX } from './constants.js';
import { configureGit, createBranch, checkoutBranch, commitAndPush } from './git/index.js';
import { findExistingPR, createPRBody, createOrUpdatePR } from './pr/index.js';

/**
 * Main function to handle branch and PR operations
 */
export async function handleBranchAndPR(
  inputs: ActionInputs,
  payload: RepositoryDispatchPayload,
  filePaths: string[]
): Promise<{
  prUrl: string;
  prNumber: number;
  branch: string;
  updated: boolean;
}> {
  // Configure git
  await configureGit();

  const octokit = github.getOctokit(inputs.token);
  const { owner, repo } = github.context.repo;
  const baseBranch =
    inputs.baseBranch || github.context.payload.repository?.default_branch || 'main';
  const branchName = `${BRANCH_PREFIX}update-${github.context.runId}`;

  // Find existing PR
  const existingPR = await findExistingPR(octokit, owner, repo, baseBranch);
  let branch = branchName;
  let updated = false;

  if (existingPR) {
    // Use existing branch
    branch = existingPR.head;
    updated = true;
    core.info(`Found existing PR #${existingPR.number}, updating branch: ${branch}`);
    await checkoutBranch(branch);
  } else {
    // Create new branch
    core.info(`Creating new branch: ${branch}`);
    await createBranch(branch, baseBranch);
  }

  // Commit and push changes
  core.info(`Committing and pushing changes to ${branch}`);
  await commitAndPush(branch, inputs.prTitle, inputs.token, updated);

  // Create or update PR
  const prBody = createPRBody(payload, filePaths);
  const pr = await createOrUpdatePR(
    octokit,
    owner,
    repo,
    branch,
    baseBranch,
    inputs.prTitle,
    prBody,
    existingPR?.number
  );

  return {
    prUrl: pr.url,
    prNumber: pr.number,
    branch,
    updated,
  };
}
