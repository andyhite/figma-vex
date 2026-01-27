/**
 * File writing utilities for GitHub Action
 */

import * as fs from 'fs';
import * as path from 'path';
import type { FileWrite } from './types.js';

/**
 * Validates and resolves a file path to prevent path traversal attacks.
 * Ensures the path is relative and resolves within the workspace.
 *
 * @param filePath - The file path to validate
 * @returns The resolved absolute path within the workspace
 * @throws Error if path is absolute or attempts to escape workspace
 */
export function validateFilePath(filePath: string): string {
  // Ensure path is relative (not absolute)
  if (path.isAbsolute(filePath)) {
    throw new Error(`Absolute paths are not allowed: ${filePath}`);
  }

  // Get workspace directory
  const workspace = process.env.GITHUB_WORKSPACE || process.cwd();

  // Resolve the full path
  const resolved = path.resolve(workspace, filePath);

  // Ensure resolved path is within workspace (prevents ../ traversal)
  if (!resolved.startsWith(workspace + path.sep) && resolved !== workspace) {
    throw new Error(`Path traversal detected: ${filePath} resolves outside workspace`);
  }

  return resolved;
}

/**
 * Ensures parent directories exist for a file path
 */
function ensureDirectoryExists(filePath: string): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/**
 * Writes files to the filesystem with path validation and error context.
 * Validates all paths before writing to prevent partial writes on validation failure.
 *
 * @param files - Array of files to write
 * @throws Error with context about which file failed
 */
export function writeFiles(files: FileWrite[]): void {
  // Validate all paths first to fail fast before any writes
  const validatedFiles = files.map((file) => ({
    ...file,
    resolvedPath: validateFilePath(file.path),
  }));

  // Write files with error context
  for (const file of validatedFiles) {
    try {
      ensureDirectoryExists(file.resolvedPath);
      fs.writeFileSync(file.resolvedPath, file.content, 'utf8');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to write file ${file.path}: ${message}`);
    }
  }
}
