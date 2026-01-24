import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { writeFiles } from './files.js';
import type { FileWrite } from './types.js';

// Mock fs module
vi.mock('fs');
vi.mock('path');

describe('files', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('writeFiles', () => {
    it('should create directories and write files', () => {
      const mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mockMkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const mockWriteFileSync = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      const mockDirname = vi.spyOn(path, 'dirname').mockReturnValue('/path/to');

      const files: FileWrite[] = [
        { path: '/path/to/file1.css', content: 'content1' },
        { path: '/path/to/file2.scss', content: 'content2' },
      ];

      writeFiles(files);

      expect(mockDirname).toHaveBeenCalledTimes(2);
      expect(mockExistsSync).toHaveBeenCalledTimes(2);
      expect(mockMkdirSync).toHaveBeenCalledTimes(2);
      expect(mockMkdirSync).toHaveBeenCalledWith('/path/to', { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
      expect(mockWriteFileSync).toHaveBeenCalledWith('/path/to/file1.css', 'content1', 'utf8');
      expect(mockWriteFileSync).toHaveBeenCalledWith('/path/to/file2.scss', 'content2', 'utf8');
    });

    it('should not create directories if they already exist', () => {
      const mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      const mockMkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const mockWriteFileSync = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      const mockDirname = vi.spyOn(path, 'dirname').mockReturnValue('/path/to');

      const files: FileWrite[] = [{ path: '/path/to/file.css', content: 'content' }];

      writeFiles(files);

      expect(mockExistsSync).toHaveBeenCalledOnce();
      expect(mockMkdirSync).not.toHaveBeenCalled();
      expect(mockWriteFileSync).toHaveBeenCalledOnce();
    });

    it('should handle empty file array', () => {
      const mockWriteFileSync = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

      writeFiles([]);

      expect(mockWriteFileSync).not.toHaveBeenCalled();
    });

    it('should handle nested directory paths', () => {
      const mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mockMkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const mockWriteFileSync = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      const mockDirname = vi.spyOn(path, 'dirname').mockReturnValue('/deeply/nested/path');

      const files: FileWrite[] = [
        { path: '/deeply/nested/path/file.json', content: 'json content' },
      ];

      writeFiles(files);

      expect(mockDirname).toHaveBeenCalledWith('/deeply/nested/path/file.json');
      expect(mockMkdirSync).toHaveBeenCalledWith('/deeply/nested/path', { recursive: true });
      expect(mockWriteFileSync).toHaveBeenCalledWith(
        '/deeply/nested/path/file.json',
        'json content',
        'utf8'
      );
    });

    it('should handle file path with special characters', () => {
      const mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mockMkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const mockWriteFileSync = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      const mockDirname = vi.spyOn(path, 'dirname').mockReturnValue('/path/to');

      const files: FileWrite[] = [
        { path: '/path/to/file (1).css', content: 'content' },
        { path: '/path/to/file[test].scss', content: 'content' },
      ];

      writeFiles(files);

      expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
    });

    it('should handle file path with unicode characters', () => {
      const mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mockMkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const mockWriteFileSync = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      const mockDirname = vi.spyOn(path, 'dirname').mockReturnValue('/path/to');

      const files: FileWrite[] = [
        { path: '/path/to/café.css', content: 'content' },
      ];

      writeFiles(files);

      expect(mockWriteFileSync).toHaveBeenCalledWith('/path/to/café.css', 'content', 'utf8');
    });

    it('should handle very long file paths', () => {
      const longPath = '/very/' + 'long/'.repeat(100) + 'file.css';
      const mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mockMkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const mockWriteFileSync = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      const mockDirname = vi.spyOn(path, 'dirname').mockReturnValue('/very/long/path');

      const files: FileWrite[] = [{ path: longPath, content: 'content' }];

      writeFiles(files);

      expect(mockDirname).toHaveBeenCalledWith(longPath);
      expect(mockMkdirSync).toHaveBeenCalled();
    });

    it('should handle file with empty content', () => {
      const mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mockMkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const mockWriteFileSync = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      const mockDirname = vi.spyOn(path, 'dirname').mockReturnValue('/path/to');

      const files: FileWrite[] = [{ path: '/path/to/empty.css', content: '' }];

      writeFiles(files);

      expect(mockWriteFileSync).toHaveBeenCalledWith('/path/to/empty.css', '', 'utf8');
    });

    it('should handle file with very large content', () => {
      const largeContent = 'a'.repeat(1000000);
      const mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mockMkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const mockWriteFileSync = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      const mockDirname = vi.spyOn(path, 'dirname').mockReturnValue('/path/to');

      const files: FileWrite[] = [{ path: '/path/to/large.css', content: largeContent }];

      writeFiles(files);

      expect(mockWriteFileSync).toHaveBeenCalledWith('/path/to/large.css', largeContent, 'utf8');
    });

    it('should handle file path at root', () => {
      const mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mockMkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const mockWriteFileSync = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      const mockDirname = vi.spyOn(path, 'dirname').mockReturnValue('/');

      const files: FileWrite[] = [{ path: '/file.css', content: 'content' }];

      writeFiles(files);

      expect(mockDirname).toHaveBeenCalledWith('/file.css');
      expect(mockMkdirSync).toHaveBeenCalledWith('/', { recursive: true });
    });

    it('should handle multiple files with same directory', () => {
      const mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mockMkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const mockWriteFileSync = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      const mockDirname = vi.spyOn(path, 'dirname').mockReturnValue('/path/to');

      const files: FileWrite[] = [
        { path: '/path/to/file1.css', content: 'content1' },
        { path: '/path/to/file2.css', content: 'content2' },
        { path: '/path/to/file3.css', content: 'content3' },
      ];

      writeFiles(files);

      // Should only create directory once (or check once per file)
      expect(mockWriteFileSync).toHaveBeenCalledTimes(3);
    });

    it('should handle file path with trailing slash in directory', () => {
      const mockExistsSync = vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      const mockMkdirSync = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => undefined);
      const mockWriteFileSync = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);
      const mockDirname = vi.spyOn(path, 'dirname').mockReturnValue('/path/to/');

      const files: FileWrite[] = [{ path: '/path/to/file.css', content: 'content' }];

      writeFiles(files);

      expect(mockMkdirSync).toHaveBeenCalled();
    });
  });
});
