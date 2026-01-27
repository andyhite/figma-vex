import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { writeFiles, validateFilePath } from './files.js';
import type { FileWrite } from './types.js';

// Mock fs module only, not path (we need real path behavior for validation)
vi.mock('fs');

describe('files', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    // Set a consistent workspace for tests
    process.env = { ...originalEnv, GITHUB_WORKSPACE: '/workspace' };
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('validateFilePath', () => {
    it('should accept relative paths within workspace', () => {
      const result = validateFilePath('tokens/variables.css');
      expect(result).toBe('/workspace/tokens/variables.css');
    });

    it('should accept nested relative paths', () => {
      const result = validateFilePath('deeply/nested/path/file.json');
      expect(result).toBe('/workspace/deeply/nested/path/file.json');
    });

    it('should reject absolute paths', () => {
      expect(() => validateFilePath('/etc/passwd')).toThrow('Absolute paths are not allowed');
      expect(() => validateFilePath('/root/.bashrc')).toThrow('Absolute paths are not allowed');
    });

    it('should reject path traversal attempts', () => {
      expect(() => validateFilePath('../../../etc/passwd')).toThrow('Path traversal detected');
      expect(() => validateFilePath('tokens/../../etc/passwd')).toThrow('Path traversal detected');
      expect(() => validateFilePath('tokens/../../../outside')).toThrow('Path traversal detected');
    });

    it('should allow paths with .. that stay within workspace', () => {
      // tokens/../variables.css resolves to /workspace/variables.css (within workspace)
      const result = validateFilePath('tokens/../variables.css');
      expect(result).toBe('/workspace/variables.css');
    });

    it('should handle paths with special characters', () => {
      const result = validateFilePath('path/to/file (1).css');
      expect(result).toBe('/workspace/path/to/file (1).css');
    });

    it('should handle paths with unicode characters', () => {
      const result = validateFilePath('path/to/café.css');
      expect(result).toBe('/workspace/path/to/café.css');
    });

    it('should use cwd when GITHUB_WORKSPACE is not set', () => {
      delete process.env.GITHUB_WORKSPACE;
      const cwd = process.cwd();
      const result = validateFilePath('file.css');
      expect(result).toBe(path.join(cwd, 'file.css'));
    });
  });

  describe('writeFiles', () => {
    beforeEach(() => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
    });

    it('should create directories and write files with validated paths', () => {
      const files: FileWrite[] = [
        { path: 'path/to/file1.css', content: 'content1' },
        { path: 'path/to/file2.json', content: 'content2' },
      ];

      writeFiles(files);

      expect(fs.mkdirSync).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).toHaveBeenCalledTimes(2);
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/workspace/path/to/file1.css',
        'content1',
        'utf8'
      );
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/workspace/path/to/file2.json',
        'content2',
        'utf8'
      );
    });

    it('should not create directories if they already exist', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);

      const files: FileWrite[] = [{ path: 'path/to/file.css', content: 'content' }];

      writeFiles(files);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledOnce();
    });

    it('should handle empty file array', () => {
      writeFiles([]);

      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should handle nested directory paths', () => {
      const files: FileWrite[] = [
        { path: 'deeply/nested/path/file.json', content: 'json content' },
      ];

      writeFiles(files);

      expect(fs.mkdirSync).toHaveBeenCalledWith('/workspace/deeply/nested/path', {
        recursive: true,
      });
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/workspace/deeply/nested/path/file.json',
        'json content',
        'utf8'
      );
    });

    it('should handle file with empty content', () => {
      const files: FileWrite[] = [{ path: 'path/to/empty.css', content: '' }];

      writeFiles(files);

      expect(fs.writeFileSync).toHaveBeenCalledWith('/workspace/path/to/empty.css', '', 'utf8');
    });

    it('should handle file with very large content', () => {
      const largeContent = 'a'.repeat(1000000);

      const files: FileWrite[] = [{ path: 'path/to/large.css', content: largeContent }];

      writeFiles(files);

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/workspace/path/to/large.css',
        largeContent,
        'utf8'
      );
    });

    it('should handle multiple files with same directory', () => {
      const files: FileWrite[] = [
        { path: 'path/to/file1.css', content: 'content1' },
        { path: 'path/to/file2.css', content: 'content2' },
        { path: 'path/to/file3.css', content: 'content3' },
      ];

      writeFiles(files);

      expect(fs.writeFileSync).toHaveBeenCalledTimes(3);
    });

    it('should reject files with absolute paths', () => {
      const files: FileWrite[] = [{ path: '/etc/passwd', content: 'malicious' }];

      expect(() => writeFiles(files)).toThrow('Absolute paths are not allowed');
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should reject files with path traversal', () => {
      const files: FileWrite[] = [{ path: '../../../etc/passwd', content: 'malicious' }];

      expect(() => writeFiles(files)).toThrow('Path traversal detected');
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should validate all paths before writing any files', () => {
      const files: FileWrite[] = [
        { path: 'valid/file.css', content: 'content' },
        { path: '../../../etc/passwd', content: 'malicious' }, // Invalid
      ];

      expect(() => writeFiles(files)).toThrow('Path traversal detected');
      // First file should NOT have been written due to fail-fast validation
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should provide error context when write fails', () => {
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const files: FileWrite[] = [{ path: 'path/to/file.css', content: 'content' }];

      expect(() => writeFiles(files)).toThrow('Failed to write file path/to/file.css: EACCES');
    });

    it('should provide error context when mkdir fails', () => {
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
        throw new Error('EACCES: permission denied');
      });

      const files: FileWrite[] = [{ path: 'path/to/file.css', content: 'content' }];

      expect(() => writeFiles(files)).toThrow('Failed to write file path/to/file.css: EACCES');
    });
  });
});
