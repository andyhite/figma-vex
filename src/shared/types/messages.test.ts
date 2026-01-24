import { describe, it, expect } from 'vitest';
import type { PluginMessage, UIMessage, ExportOptions, GitHubDispatchOptions } from './messages';

describe('Message Types', () => {
  it('should allow valid ExportOptions', () => {
    const options: ExportOptions = {
      includeCollectionComments: true,
      includeModeComments: false,
      selector: ':root',
      useModesAsSelectors: false,
    };
    expect(options.selector).toBe(':root');
  });

  it('should allow valid PluginMessage for export-css', () => {
    const msg: PluginMessage = {
      type: 'export-css',
      options: {
        includeCollectionComments: true,
        includeModeComments: true,
        selector: ':root',
        useModesAsSelectors: false,
      },
    };
    expect(msg.type).toBe('export-css');
  });

  it('should allow valid UIMessage for css-result', () => {
    const msg: UIMessage = {
      type: 'css-result',
      css: ':root { --color: #fff; }',
    };
    expect(msg.type).toBe('css-result');
  });

  it('should allow valid GitHubDispatchOptions', () => {
    const options: GitHubDispatchOptions = {
      repository: 'owner/repo',
      token: 'ghp_xxxxx',
      exportTypes: ['css', 'json'],
      exportOptions: {
        includeCollectionComments: true,
        includeModeComments: false,
        selector: ':root',
        useModesAsSelectors: false,
      },
    };
    expect(options.exportTypes).toContain('css');
  });
});
