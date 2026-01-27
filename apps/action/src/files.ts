/**
 * File writing utilities for GitHub Action
 */

import * as fs from 'fs';
import * as path from 'path';
import type { FileWrite } from './types.js';

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
 * Writes files to the filesystem
 */
export function writeFiles(files: FileWrite[]): void {
  for (const file of files) {
    ensureDirectoryExists(file.path);
    fs.writeFileSync(file.path, file.content, 'utf8');
  }
}
