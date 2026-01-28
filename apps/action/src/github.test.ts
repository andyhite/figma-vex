import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as github from '@actions/github';
import { handleBranchAndPR } from './github.js';
import type { ActionInputs, RepositoryDispatchPayload } from './types.js';

// Mock dependencies
vi.mock('@actions/core');
vi.mock('@actions/exec');
vi.mock('@actions/github');

describe('github', () => {
  const mockOctokit = {
    rest: {
      pulls: {
        list: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
  };

  const mockContext = {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    runId: 12345,
    payload: {
      repository: { default_branch: 'main' },
    },
  };

  const mockInputs: ActionInputs = {
    dryRun: false,
    token: 'test-token',
    baseBranch: 'main',
    prTitle: 'Test PR Title',
  };

  const mockPayload: RepositoryDispatchPayload = {
    client_payload: {
      document: {
        $schema: 'https://design-tokens.github.io/format/',
        collections: {},
        $metadata: { figmaFile: 'test.figma', generatedAt: new Date().toISOString() },
      },
      settings: {
        colorFormat: 'hex',
        defaultUnit: 'px',
        remBase: 16,
      },
      export_types: ['css'],
      figma_file: 'test.figma',
      generated_at: new Date().toISOString(),
      workflow_file: 'workflow.yml',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(github, 'getOctokit').mockReturnValue(
      mockOctokit as unknown as ReturnType<typeof github.getOctokit>
    );
    vi.spyOn(github, 'context', 'get').mockReturnValue(
      mockContext as unknown as typeof github.context
    );
    vi.spyOn(exec, 'exec').mockResolvedValue(0);
    vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
      exitCode: 0,
      stdout: '',
      stderr: '',
    });
  });

  describe('configureGit', () => {
    it('should configure git user name and email', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css', // Has changes
        stderr: '',
      });

      await handleBranchAndPR(mockInputs, mockPayload, ['file.css']);

      expect(exec.exec).toHaveBeenCalledWith('git', [
        'config',
        '--local',
        'user.name',
        'github-actions[bot]',
      ]);
      expect(exec.exec).toHaveBeenCalledWith('git', [
        'config',
        '--local',
        'user.email',
        'github-actions[bot]@users.noreply.github.com',
      ]);
    });
  });

  describe('findExistingPR', () => {
    it('should find existing PR with figma-vex branch', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [
          {
            number: 42,
            head: { ref: 'figma-vex/update-12345' },
            base: { ref: 'main' },
          },
        ],
      });
      mockOctokit.rest.pulls.update.mockResolvedValue({
        data: { number: 42, html_url: 'https://github.com/test/test/pull/42' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      const result = await handleBranchAndPR(mockInputs, mockPayload, ['file.css']);

      expect(mockOctokit.rest.pulls.list).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        state: 'open',
        base: 'main',
      });
      expect(result.updated).toBe(true);
      expect(result.branch).toBe('figma-vex/update-12345');
      expect(result.prNumber).toBe(42);
    });

    it('should return null when no existing PR found', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      const result = await handleBranchAndPR(mockInputs, mockPayload, ['file.css']);

      expect(result.updated).toBe(false);
      expect(result.branch).toBe('figma-vex/update-12345');
    });
  });

  describe('createBranch', () => {
    it('should create and checkout new branch', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      await handleBranchAndPR(mockInputs, mockPayload, ['file.css']);

      expect(exec.exec).toHaveBeenCalledWith('git', ['fetch', 'origin', 'main']);
      expect(exec.exec).toHaveBeenCalledWith('git', [
        'checkout',
        '-b',
        'figma-vex/update-12345',
        'origin/main',
      ]);
    });
  });

  describe('checkoutBranch', () => {
    it('should checkout existing branch', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [
          {
            number: 42,
            head: { ref: 'figma-vex/update-12345' },
            base: { ref: 'main' },
          },
        ],
      });
      mockOctokit.rest.pulls.update.mockResolvedValue({
        data: { number: 42, html_url: 'https://github.com/test/test/pull/42' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      await handleBranchAndPR(mockInputs, mockPayload, ['file.css']);

      expect(exec.exec).toHaveBeenCalledWith('git', ['fetch', 'origin', 'figma-vex/update-12345']);
      expect(exec.exec).toHaveBeenCalledWith('git', ['checkout', 'figma-vex/update-12345'], {
        ignoreReturnCode: true,
      });
    });

    it('should create tracking branch if checkout fails', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [
          {
            number: 42,
            head: { ref: 'figma-vex/update-12345' },
            base: { ref: 'main' },
          },
        ],
      });
      mockOctokit.rest.pulls.update.mockResolvedValue({
        data: { number: 42, html_url: 'https://github.com/test/test/pull/42' },
      });
      vi.spyOn(exec, 'exec').mockImplementation(async (command, args) => {
        if (
          command === 'git' &&
          args?.[0] === 'checkout' &&
          args?.[1] === 'figma-vex/update-12345'
        ) {
          return 1; // Checkout fails
        }
        return 0;
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      await handleBranchAndPR(mockInputs, mockPayload, ['file.css']);

      expect(exec.exec).toHaveBeenCalledWith('git', [
        'checkout',
        '-b',
        'figma-vex/update-12345',
        'origin/figma-vex/update-12345',
      ]);
    });
  });

  describe('commitAndPush', () => {
    it('should commit and push changes', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      await handleBranchAndPR(mockInputs, mockPayload, ['file.css']);

      expect(exec.exec).toHaveBeenCalledWith('git', ['add', '-A']);
      expect(exec.exec).toHaveBeenCalledWith('git', ['commit', '-m', 'Test PR Title']);
      expect(exec.exec).toHaveBeenCalledWith('git', [
        'remote',
        'set-url',
        'origin',
        'https://x-access-token:test-token@github.com/test-owner/test-repo.git',
      ]);
      expect(exec.exec).toHaveBeenCalledWith('git', ['push', 'origin', 'figma-vex/update-12345']);
    });

    it('should not commit when there are no changes', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: '', // No changes
        stderr: '',
      });
      vi.spyOn(core, 'info').mockImplementation(() => undefined);

      await handleBranchAndPR(mockInputs, mockPayload, ['file.css']);

      expect(exec.exec).not.toHaveBeenCalledWith('git', ['commit', '-m', expect.any(String)]);
      expect(core.info).toHaveBeenCalledWith('No changes to commit');
    });

    it('should force push when updating existing PR', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [
          {
            number: 42,
            head: { ref: 'figma-vex/update-12345' },
            base: { ref: 'main' },
          },
        ],
      });
      mockOctokit.rest.pulls.update.mockResolvedValue({
        data: { number: 42, html_url: 'https://github.com/test/test/pull/42' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      await handleBranchAndPR(mockInputs, mockPayload, ['file.css']);

      expect(exec.exec).toHaveBeenCalledWith('git', [
        'push',
        'origin',
        'figma-vex/update-12345',
        '--force',
      ]);
    });
  });

  describe('createPRBody', () => {
    it('should create PR body with file list and metadata', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      await handleBranchAndPR(mockInputs, mockPayload, ['file.css', 'file.json']);

      const createCall = mockOctokit.rest.pulls.create.mock.calls[0][0];
      expect(createCall.body).toContain('Figma Variables Update');
      expect(createCall.body).toContain('test.figma');
      expect(createCall.body).toContain('- `file.css`');
      expect(createCall.body).toContain('- `file.json`');
    });
  });

  describe('createOrUpdatePR', () => {
    it('should create new PR when no existing PR', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      const result = await handleBranchAndPR(mockInputs, mockPayload, ['file.css']);

      expect(mockOctokit.rest.pulls.create).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        title: 'Test PR Title',
        head: 'figma-vex/update-12345',
        base: 'main',
        body: expect.any(String),
      });
      expect(result.prNumber).toBe(1);
      expect(result.updated).toBe(false);
    });

    it('should update existing PR', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [
          {
            number: 42,
            head: { ref: 'figma-vex/update-12345' },
            base: { ref: 'main' },
          },
        ],
      });
      mockOctokit.rest.pulls.update.mockResolvedValue({
        data: { number: 42, html_url: 'https://github.com/test/test/pull/42' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      const result = await handleBranchAndPR(mockInputs, mockPayload, ['file.css']);

      expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        pull_number: 42,
        body: expect.any(String),
      });
      expect(result.prNumber).toBe(42);
      expect(result.updated).toBe(true);
    });
  });

  describe('handleBranchAndPR', () => {
    it('should use default branch when baseBranch is not provided', async () => {
      const inputsWithoutBaseBranch = { ...mockInputs, baseBranch: undefined };
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      await handleBranchAndPR(inputsWithoutBaseBranch, mockPayload, ['file.css']);

      expect(exec.exec).toHaveBeenCalledWith('git', ['fetch', 'origin', 'main']);
    });

    it('should return correct result structure', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      const result = await handleBranchAndPR(mockInputs, mockPayload, ['file.css']);

      expect(result).toHaveProperty('prUrl');
      expect(result).toHaveProperty('prNumber');
      expect(result).toHaveProperty('branch');
      expect(result).toHaveProperty('updated');
      expect(result.prUrl).toBe('https://github.com/test/test/pull/1');
      expect(result.prNumber).toBe(1);
      expect(result.branch).toBe('figma-vex/update-12345');
      expect(result.updated).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle git status check failure', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 1,
        stdout: '',
        stderr: 'git status failed',
      });

      await expect(handleBranchAndPR(mockInputs, mockPayload, ['file.css'])).rejects.toThrow();
    });

    it('should handle PR list API failure', async () => {
      mockOctokit.rest.pulls.list.mockRejectedValue(new Error('API Error'));
      await expect(handleBranchAndPR(mockInputs, mockPayload, ['file.css'])).rejects.toThrow(
        'API Error'
      );
    });

    it('should handle PR create API failure', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockRejectedValue(new Error('Create PR failed'));
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      await expect(handleBranchAndPR(mockInputs, mockPayload, ['file.css'])).rejects.toThrow(
        'Create PR failed'
      );
    });

    it('should handle PR update API failure', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [
          {
            number: 42,
            head: { ref: 'figma-vex/update-12345' },
            base: { ref: 'main' },
          },
        ],
      });
      mockOctokit.rest.pulls.update.mockRejectedValue(new Error('Update PR failed'));
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      await expect(handleBranchAndPR(mockInputs, mockPayload, ['file.css'])).rejects.toThrow(
        'Update PR failed'
      );
    });

    it('should handle git fetch failure', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
      });
      vi.spyOn(exec, 'exec').mockImplementation(async (command, args) => {
        if (command === 'git' && args?.[0] === 'fetch') {
          throw new Error('Fetch failed');
        }
        return 0;
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      await expect(handleBranchAndPR(mockInputs, mockPayload, ['file.css'])).rejects.toThrow(
        'Fetch failed'
      );
    });

    it('should handle empty file paths array', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: '',
        stderr: '',
      });

      const result = await handleBranchAndPR(mockInputs, mockPayload, []);
      expect(result.prNumber).toBe(1);
    });

    it('should handle context without default branch', async () => {
      const contextWithoutBranch = {
        ...mockContext,
        payload: {},
      };
      vi.spyOn(github, 'context', 'get').mockReturnValue(
        contextWithoutBranch as unknown as typeof github.context
      );
      mockOctokit.rest.pulls.list.mockResolvedValue({ data: [] });
      mockOctokit.rest.pulls.create.mockResolvedValue({
        data: { number: 1, html_url: 'https://github.com/test/test/pull/1' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      const inputsWithoutBaseBranch = { ...mockInputs, baseBranch: undefined };
      await handleBranchAndPR(inputsWithoutBaseBranch, mockPayload, ['file.css']);

      expect(exec.exec).toHaveBeenCalledWith('git', ['fetch', 'origin', 'main']);
    });

    it('should handle PR with different base branch', async () => {
      mockOctokit.rest.pulls.list.mockResolvedValue({
        data: [
          {
            number: 42,
            head: { ref: 'figma-vex/update-12345' },
            base: { ref: 'develop' },
          },
        ],
      });
      mockOctokit.rest.pulls.update.mockResolvedValue({
        data: { number: 42, html_url: 'https://github.com/test/test/pull/42' },
      });
      vi.spyOn(exec, 'getExecOutput').mockResolvedValue({
        exitCode: 0,
        stdout: ' M file.css',
        stderr: '',
      });

      const inputsWithDifferentBase = { ...mockInputs, baseBranch: 'develop' };
      const result = await handleBranchAndPR(inputsWithDifferentBase, mockPayload, ['file.css']);

      expect(mockOctokit.rest.pulls.list).toHaveBeenCalledWith({
        owner: 'test-owner',
        repo: 'test-repo',
        state: 'open',
        base: 'develop',
      });
      expect(result.updated).toBe(true);
    });
  });
});
