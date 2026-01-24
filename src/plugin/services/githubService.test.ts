import { describe, it, expect } from 'vitest';
import { validateGitHubOptions, buildDispatchPayload } from './githubService';
import type { GitHubDispatchOptions } from '@shared/types';

describe('validateGitHubOptions', () => {
  const validOptions: GitHubDispatchOptions = {
    repository: 'owner/repo',
    token: 'ghp_xxxxx',
    exportTypes: ['css'],
    exportOptions: {
      includeCollectionComments: true,
      includeModeComments: false,
      selector: ':root',
      useModesAsSelectors: false,
    },
  };

  it('should pass for valid options', () => {
    expect(() => validateGitHubOptions(validOptions)).not.toThrow();
  });

  it('should throw for invalid repository format', () => {
    expect(() => validateGitHubOptions({ ...validOptions, repository: 'invalid' })).toThrow(
      'Invalid repository format'
    );
  });

  it('should throw for empty repository', () => {
    expect(() => validateGitHubOptions({ ...validOptions, repository: '' })).toThrow(
      'Invalid repository format'
    );
  });

  it('should throw for empty token', () => {
    expect(() => validateGitHubOptions({ ...validOptions, token: '' })).toThrow(
      'GitHub token is required'
    );
  });

  it('should throw for empty export types', () => {
    expect(() => validateGitHubOptions({ ...validOptions, exportTypes: [] })).toThrow(
      'At least one export type must be selected'
    );
  });
});

describe('buildDispatchPayload', () => {
  it('should build correct payload structure', () => {
    const exports = { css: ':root { --color: red; }' };
    const payload = buildDispatchPayload(exports, 'Test File', 'update-variables.yml');

    expect(payload.event_type).toBe('figma-variables-update');
    expect(payload.client_payload.exports).toEqual(exports);
    expect(payload.client_payload.figma_file).toBe('Test File');
    expect(payload.client_payload.workflow_file).toBe('update-variables.yml');
    expect(payload.client_payload.generated_at).toBeDefined();
  });
});
