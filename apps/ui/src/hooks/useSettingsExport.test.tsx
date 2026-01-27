import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSettingsExport } from './useSettingsExport';
import * as pluginBridge from '../services/pluginBridge';
import type { PluginSettings, CollectionInfo } from '@figma-vex/shared';

vi.mock('../services/pluginBridge');

const mockCollections: CollectionInfo[] = [
  { id: 'col-1', name: 'Primitives' },
  { id: 'col-2', name: 'Semantic' },
];

const mockSettings: PluginSettings = {
  prefix: 'ds',
  selectedCollections: ['col-1', 'col-2'],
  includeCollectionComments: true,
  includeModeComments: false,
  syncCalculations: false,
  includeStyles: true,
  styleOutputMode: 'variables',
  styleTypes: ['paint', 'text'],
  cssSelector: ':root',
  cssUseModesAsSelectors: false,
  cssIncludeModeComments: true,
  githubRepository: 'org/repo',
  githubWorkflowFileName: 'update.yml',
  githubExportTypes: ['css'],
  githubCssSelector: ':root',
  githubUseModesAsSelectors: false,
  remBaseVariableId: 'var-1',
  cssExportAsCalcExpressions: false,
  scssExportAsCalcExpressions: false,
  nameFormatRules: [],
  nameFormatCasing: 'kebab',
  nameFormatAdvanced: false,
  syncCodeSyntax: false,
  debugMode: false,
  numberPrecision: 4,
};

describe('useSettingsExport', () => {
  let mockCreateObjectURL: ReturnType<typeof vi.fn>;
  let mockRevokeObjectURL: ReturnType<typeof vi.fn>;
  let capturedBlobContent: string | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    capturedBlobContent = null;

    // Mock URL methods
    mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-url');
    mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    // Mock Blob to capture content
    const OriginalBlob = global.Blob;
    vi.spyOn(global, 'Blob').mockImplementation((parts, options) => {
      if (parts && parts.length > 0) {
        capturedBlobContent = parts[0] as string;
      }
      return new OriginalBlob(parts, options);
    });

    // Mock DOM methods for link creation
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);

    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const element = originalCreateElement(tagName);
      if (tagName === 'a') {
        element.click = vi.fn();
      }
      return element;
    });

    // Mock File.prototype.text() for jsdom compatibility
    if (!File.prototype.text) {
      File.prototype.text = function () {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(this);
        });
      };
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('exportSettings', () => {
    it('should export settings to a JSON file', () => {
      const { result } = renderHook(() =>
        useSettingsExport({
          collections: mockCollections,
          remBaseVariablePath: 'Primitives/Base',
        })
      );

      act(() => {
        result.current.exportSettings(mockSettings);
      });

      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:test-url');
    });

    it('should convert collection IDs to names in export', () => {
      const { result } = renderHook(() =>
        useSettingsExport({
          collections: mockCollections,
          remBaseVariablePath: 'Primitives/Base',
        })
      );

      act(() => {
        result.current.exportSettings(mockSettings);
      });

      expect(capturedBlobContent).not.toBeNull();
      const parsed = JSON.parse(capturedBlobContent!);
      expect(parsed.settings.selectedCollections).toEqual(['Primitives', 'Semantic']);
    });

    it('should include version and exportedAt in export', () => {
      const { result } = renderHook(() =>
        useSettingsExport({
          collections: mockCollections,
          remBaseVariablePath: undefined,
        })
      );

      act(() => {
        result.current.exportSettings(mockSettings);
      });

      expect(capturedBlobContent).not.toBeNull();
      const parsed = JSON.parse(capturedBlobContent!);
      expect(parsed.version).toBe(1);
      expect(parsed.exportedAt).toBeDefined();
    });

    it('should use variable path instead of ID in export', () => {
      const { result } = renderHook(() =>
        useSettingsExport({
          collections: mockCollections,
          remBaseVariablePath: 'Primitives/Spacing/Base',
        })
      );

      act(() => {
        result.current.exportSettings(mockSettings);
      });

      expect(capturedBlobContent).not.toBeNull();
      const parsed = JSON.parse(capturedBlobContent!);
      expect(parsed.settings.remBaseVariable).toBe('Primitives/Spacing/Base');
      expect(parsed.settings.remBaseVariableId).toBeUndefined();
    });
  });

  describe('importSettings', () => {
    it('should return error for invalid JSON', async () => {
      const { result } = renderHook(() =>
        useSettingsExport({
          collections: mockCollections,
        })
      );

      const file = new File(['not valid json'], 'settings.json', { type: 'application/json' });

      let importResult;
      await act(async () => {
        importResult = await result.current.importSettings(file);
      });

      expect(importResult!.success).toBe(false);
      expect(importResult!.error).toBe('Invalid file format. Expected JSON.');
    });

    it('should return error for missing version', async () => {
      const { result } = renderHook(() =>
        useSettingsExport({
          collections: mockCollections,
        })
      );

      const file = new File([JSON.stringify({ settings: {} })], 'settings.json', {
        type: 'application/json',
      });

      let importResult;
      await act(async () => {
        importResult = await result.current.importSettings(file);
      });

      expect(importResult!.success).toBe(false);
      expect(importResult!.error).toBe('Invalid file format. Missing required fields.');
    });

    it('should return error for unsupported version', async () => {
      const { result } = renderHook(() =>
        useSettingsExport({
          collections: mockCollections,
        })
      );

      const file = new File([JSON.stringify({ version: 999, settings: {} })], 'settings.json', {
        type: 'application/json',
      });

      let importResult;
      await act(async () => {
        importResult = await result.current.importSettings(file);
      });

      expect(importResult!.success).toBe(false);
      expect(importResult!.error).toBe('Unsupported settings file version. Expected version 1.');
    });

    it('should return error for invalid styleTypes', async () => {
      const { result } = renderHook(() =>
        useSettingsExport({
          collections: mockCollections,
        })
      );

      const invalidSettings = {
        version: 1,
        settings: {
          selectedCollections: [],
          styleTypes: ['invalid'],
        },
      };

      const file = new File([JSON.stringify(invalidSettings)], 'settings.json', {
        type: 'application/json',
      });

      let importResult;
      await act(async () => {
        importResult = await result.current.importSettings(file);
      });

      expect(importResult!.success).toBe(false);
      expect(importResult!.error).toBe(
        'Invalid settings: styleTypes must be an array of valid style types.'
      );
    });

    it('should warn about unresolved collection names', async () => {
      const { result } = renderHook(() =>
        useSettingsExport({
          collections: mockCollections,
        })
      );

      const validSettings = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: {
          prefix: 'ds',
          selectedCollections: ['Primitives', 'NonExistent'],
          includeCollectionComments: true,
          syncCalculations: false,
          includeStyles: false,
          styleOutputMode: 'variables',
          styleTypes: ['paint'],
          cssSelector: ':root',
          cssUseModesAsSelectors: false,
          cssIncludeModeComments: true,
          githubRepository: '',
          githubWorkflowFileName: 'update.yml',
          githubExportTypes: ['css'],
          githubCssSelector: ':root',
          githubUseModesAsSelectors: false,
          cssExportAsCalcExpressions: false,
          scssExportAsCalcExpressions: false,
          nameFormatRules: [],
          syncCodeSyntax: false,
        },
      };

      const file = new File([JSON.stringify(validSettings)], 'settings.json', {
        type: 'application/json',
      });

      let importResult;
      await act(async () => {
        importResult = await result.current.importSettings(file);
      });

      expect(importResult!.success).toBe(true);
      expect(importResult!.warnings).toContain('Collection not found: "NonExistent"');
      expect(importResult!.settings?.selectedCollections).toEqual(['col-1']);
    });

    it('should resolve variable path via plugin message', async () => {
      let messageCallback: ((msg: unknown) => void) | null = null;
      vi.spyOn(pluginBridge, 'onMessage').mockImplementation(
        ((cb: (msg: unknown) => void) => {
          messageCallback = cb;
          return vi.fn();
        }) as typeof pluginBridge.onMessage
      );
      vi.spyOn(pluginBridge, 'postMessage').mockImplementation(() => {
        setTimeout(() => {
          messageCallback?.({
            type: 'variable-path-resolved',
            path: 'Primitives/Base',
            id: 'resolved-var-id',
          });
        }, 10);
      });

      const { result } = renderHook(() =>
        useSettingsExport({
          collections: mockCollections,
        })
      );

      const validSettings = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: {
          prefix: 'ds',
          selectedCollections: ['Primitives'],
          includeCollectionComments: true,
          syncCalculations: false,
          includeStyles: false,
          styleOutputMode: 'variables',
          styleTypes: ['paint'],
          cssSelector: ':root',
          cssUseModesAsSelectors: false,
          cssIncludeModeComments: true,
          githubRepository: '',
          githubWorkflowFileName: 'update.yml',
          githubExportTypes: ['css'],
          githubCssSelector: ':root',
          githubUseModesAsSelectors: false,
          remBaseVariable: 'Primitives/Base',
          cssExportAsCalcExpressions: false,
          scssExportAsCalcExpressions: false,
          nameFormatRules: [],
          syncCodeSyntax: false,
        },
      };

      const file = new File([JSON.stringify(validSettings)], 'settings.json', {
        type: 'application/json',
      });

      let importResult;
      await act(async () => {
        importResult = await result.current.importSettings(file);
      });

      expect(importResult!.success).toBe(true);
      expect(importResult!.settings?.remBaseVariableId).toBe('resolved-var-id');
    });

    it('should import settings without remBaseVariable', async () => {
      const { result } = renderHook(() =>
        useSettingsExport({
          collections: mockCollections,
        })
      );

      const validSettings = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: {
          prefix: 'ds',
          selectedCollections: ['Primitives'],
          includeCollectionComments: true,
          syncCalculations: false,
          includeStyles: false,
          styleOutputMode: 'variables',
          styleTypes: ['paint'],
          cssSelector: ':root',
          cssUseModesAsSelectors: false,
          cssIncludeModeComments: true,
          githubRepository: '',
          githubWorkflowFileName: 'update.yml',
          githubExportTypes: ['css'],
          githubCssSelector: ':root',
          githubUseModesAsSelectors: false,
          cssExportAsCalcExpressions: false,
          scssExportAsCalcExpressions: false,
          nameFormatRules: [],
          syncCodeSyntax: false,
        },
      };

      const file = new File([JSON.stringify(validSettings)], 'settings.json', {
        type: 'application/json',
      });

      let importResult;
      await act(async () => {
        importResult = await result.current.importSettings(file);
      });

      expect(importResult!.success).toBe(true);
      expect(importResult!.settings?.remBaseVariableId).toBeUndefined();
      expect(importResult!.settings?.prefix).toBe('ds');
    });
  });
});
