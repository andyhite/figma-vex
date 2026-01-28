import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateGitHubOptions,
  buildDispatchPayload,
  parseGitHubError,
  sendGitHubDispatch,
} from './githubService';
import type { GitHubDispatchOptions } from '@figma-vex/shared';

describe('githubService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('validateGitHubOptions', () => {
    it('should pass for valid options', () => {
      const options: GitHubDispatchOptions = {
        repository: 'owner/repo',
        token: 'test-token',
        exportTypes: ['css', 'json'],
        exportOptions: {
          selector: ':root',
          includeCollectionComments: true,
          includeModeComments: false,
          useModesAsSelectors: false,
        },
      };

      expect(() => validateGitHubOptions(options)).not.toThrow();
    });

    it('should throw for invalid repository format', () => {
      const options: GitHubDispatchOptions = {
        repository: 'invalid',
        token: 'test-token',
        exportTypes: ['css'],
        exportOptions: {
          selector: ':root',
          includeCollectionComments: true,
          includeModeComments: false,
          useModesAsSelectors: false,
        },
      };

      expect(() => validateGitHubOptions(options)).toThrow(
        "Invalid repository format. Expected 'owner/repo'"
      );
    });

    it('should throw for empty repository', () => {
      const options: GitHubDispatchOptions = {
        repository: '',
        token: 'test-token',
        exportTypes: ['css'],
        exportOptions: {
          selector: ':root',
          includeCollectionComments: true,
          includeModeComments: false,
          useModesAsSelectors: false,
        },
      };

      expect(() => validateGitHubOptions(options)).toThrow('Invalid repository format');
    });

    it('should throw for empty token', () => {
      const options: GitHubDispatchOptions = {
        repository: 'owner/repo',
        token: '',
        exportTypes: ['css'],
        exportOptions: {
          selector: ':root',
          includeCollectionComments: true,
          includeModeComments: false,
          useModesAsSelectors: false,
        },
      };

      expect(() => validateGitHubOptions(options)).toThrow('GitHub token is required');
    });

    it('should throw for empty export types', () => {
      const options: GitHubDispatchOptions = {
        repository: 'owner/repo',
        token: 'test-token',
        exportTypes: [],
        exportOptions: {
          selector: ':root',
          includeCollectionComments: true,
          includeModeComments: false,
          useModesAsSelectors: false,
        },
      };

      expect(() => validateGitHubOptions(options)).toThrow(
        'At least one export type must be selected'
      );
    });

    it('should handle repository with extra slashes', () => {
      const options: GitHubDispatchOptions = {
        repository: 'owner/repo/extra',
        token: 'test-token',
        exportTypes: ['css'],
        exportOptions: {
          selector: ':root',
          includeCollectionComments: true,
          includeModeComments: false,
          useModesAsSelectors: false,
        },
      };

      expect(() => validateGitHubOptions(options)).toThrow('Invalid repository format');
    });

    it('should trim whitespace in repository', () => {
      const options: GitHubDispatchOptions = {
        repository: '  owner/repo  ',
        token: 'test-token',
        exportTypes: ['css'],
        exportOptions: {
          selector: ':root',
          includeCollectionComments: true,
          includeModeComments: false,
          useModesAsSelectors: false,
        },
      };

      expect(() => validateGitHubOptions(options)).not.toThrow();
    });
  });

  describe('buildDispatchPayload', () => {
    it('should build correct payload structure', () => {
      const dtcgPayload = {
        document: {
          $schema: 'https://design-tokens.github.io/format/',
          collections: {},
          $metadata: { figmaFile: 'test.figma', generatedAt: '2024-01-01T00:00:00.000Z' },
        },
        settings: {
          colorFormat: 'hex' as const,
          defaultUnit: 'px' as const,
          remBase: 16,
        },
        export_types: ['css', 'json'],
      };
      const figmaFile = 'test.figma';

      const payload = buildDispatchPayload(dtcgPayload, figmaFile);

      expect(payload.event_type).toBe('figma-variables-update');
      expect(payload.client_payload.document).toEqual(dtcgPayload.document);
      expect(payload.client_payload.settings).toEqual(dtcgPayload.settings);
      expect(payload.client_payload.export_types).toEqual(dtcgPayload.export_types);
      expect(payload.client_payload.figma_file).toBe(figmaFile);
      expect(payload.client_payload.generated_at).toBeDefined();
      expect(new Date(payload.client_payload.generated_at).toISOString()).toBe(
        payload.client_payload.generated_at
      );
    });
  });

  describe('parseGitHubError', () => {
    it('should parse JSON error response', () => {
      const errorJson = JSON.stringify({
        message: 'Validation failed',
        errors: [{ message: 'Invalid field' }],
      });

      const result = parseGitHubError(400, errorJson);

      expect(result).toBe('Validation failed');
    });

    it('should use first error message if main message not available', () => {
      const errorJson = JSON.stringify({
        errors: [{ message: 'First error' }, { message: 'Second error' }],
      });

      const result = parseGitHubError(400, errorJson);

      expect(result).toBe('First error');
    });

    it('should use error text if JSON parsing fails and text is short', () => {
      const errorText = 'Simple error message';

      const result = parseGitHubError(400, errorText);

      expect(result).toBe('Simple error message');
    });

    it('should use default message if error text is too long', () => {
      const errorText = 'a'.repeat(300); // Longer than 200 chars

      const result = parseGitHubError(400, errorText);

      expect(result).toBe('GitHub API error (400)');
    });

    it('should handle 401 status', () => {
      const result = parseGitHubError(401, 'Unauthorized');

      expect(result).toBe('Authentication failed. Please check your GitHub token.');
    });

    it('should handle 403 status', () => {
      const result = parseGitHubError(403, 'Forbidden');

      expect(result).toBe(
        "Access forbidden. Ensure your token has 'repo' scope and repository access."
      );
    });

    it('should handle 404 status', () => {
      const result = parseGitHubError(404, 'Not Found');

      expect(result).toBe(
        'Repository not found. Check the repository name and your access permissions.'
      );
    });

    it('should handle invalid JSON gracefully', () => {
      const result = parseGitHubError(500, 'Invalid JSON {');

      expect(result).toBe('Invalid JSON {');
    });

    it('should use error text for unknown status codes when text is short', () => {
      const result = parseGitHubError(500, 'Internal Server Error');

      // When error text is short (< 200 chars), it's used directly
      expect(result).toBe('Internal Server Error');
    });

    it('should use default message for unknown status codes when text is long', () => {
      const longError = 'a'.repeat(300);
      const result = parseGitHubError(500, longError);

      expect(result).toContain('GitHub API error (500)');
    });
  });

  describe('sendGitHubDispatch', () => {
    const mockOptions: GitHubDispatchOptions = {
      repository: 'owner/repo',
      token: 'test-token',
      exportTypes: ['css', 'json'],
      exportOptions: {
        selector: ':root',
        includeCollectionComments: true,
        includeModeComments: false,
        useModesAsSelectors: false,
      },
    };

    const mockDtcgPayload = {
      document: {
        $schema: 'https://design-tokens.github.io/format/',
        collections: {},
        $metadata: { figmaFile: 'test.figma', generatedAt: '2024-01-01T00:00:00.000Z' },
      },
      settings: {
        colorFormat: 'hex' as const,
        defaultUnit: 'px' as const,
        remBase: 16,
      },
      export_types: ['css', 'json'],
    };

    it('should send dispatch request successfully', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      global.fetch = mockFetch;

      await sendGitHubDispatch(mockOptions, mockDtcgPayload, 'test.figma');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner/repo/dispatches',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Accept: 'application/vnd.github+json',
            Authorization: 'Bearer test-token',
            'X-GitHub-Api-Version': '2022-11-28',
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('figma-variables-update'),
        })
      );
    });

    it('should handle network errors', async () => {
      const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));

      global.fetch = mockFetch;

      await expect(sendGitHubDispatch(mockOptions, mockDtcgPayload, 'test.figma')).rejects.toThrow(
        'Network error: Network error'
      );
    });

    it('should handle API errors', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => JSON.stringify({ message: 'Bad credentials' }),
      });

      global.fetch = mockFetch;

      await expect(sendGitHubDispatch(mockOptions, mockDtcgPayload, 'test.figma')).rejects.toThrow(
        'Authentication failed. Please check your GitHub token.'
      );
    });

    it('should encode repository name and owner in URL', async () => {
      const optionsWithSpecialChars: GitHubDispatchOptions = {
        repository: 'owner-name/repo.name',
        token: 'test-token',
        exportTypes: ['css'],
        exportOptions: {
          selector: ':root',
          includeCollectionComments: true,
          includeModeComments: false,
          useModesAsSelectors: false,
        },
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });

      global.fetch = mockFetch;

      await sendGitHubDispatch(optionsWithSpecialChars, mockDtcgPayload, 'test.figma');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.github.com/repos/owner-name/repo.name/dispatches',
        expect.any(Object)
      );
    });

    it('should validate options before sending', async () => {
      const invalidOptions: GitHubDispatchOptions = {
        repository: 'invalid',
        token: 'test-token',
        exportTypes: ['css'],
        exportOptions: {
          selector: ':root',
          includeCollectionComments: true,
          includeModeComments: false,
          useModesAsSelectors: false,
        },
      };

      await expect(
        sendGitHubDispatch(invalidOptions, mockDtcgPayload, 'test.figma')
      ).rejects.toThrow('Invalid repository format');
    });
  });
});
