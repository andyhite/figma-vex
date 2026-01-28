import { describe, it, expect } from 'vitest';
import { exportToCss, generateCssHeader } from './cssExporter';
import type { ExportOptions } from '@figma-vex/shared';

// Mock the Figma API
const mockVariables: Variable[] = [
  {
    id: 'var-1',
    name: 'color/primary',
    resolvedType: 'COLOR',
    valuesByMode: { 'mode-1': { r: 0.09, g: 0.63, b: 0.98, a: 1 } },
    variableCollectionId: 'col-1',
    description: '',
    hiddenFromPublishing: false,
    scopes: [],
    codeSyntax: {},
    remote: false,
    key: 'key-1',
  } as unknown as Variable,
  {
    id: 'var-2',
    name: 'spacing/sm',
    resolvedType: 'FLOAT',
    valuesByMode: { 'mode-1': 8 },
    variableCollectionId: 'col-1',
    description: '',
    hiddenFromPublishing: false,
    scopes: [],
    codeSyntax: {},
    remote: false,
    key: 'key-2',
  } as unknown as Variable,
];

const mockCollections: VariableCollection[] = [
  {
    id: 'col-1',
    name: 'Design Tokens',
    modes: [{ modeId: 'mode-1', name: 'Default' }],
    defaultModeId: 'mode-1',
    remote: false,
    key: 'key-col-1',
    hiddenFromPublishing: false,
    variableIds: ['var-1', 'var-2'],
  } as unknown as VariableCollection,
];

describe('generateCssHeader', () => {
  it('should generate header with file name and timestamp', () => {
    const header = generateCssHeader('Test File');
    expect(header).toContain('Auto-generated CSS Custom Properties');
    expect(header).toContain('Exported from Figma: Test File');
    expect(header).toContain('Generated:');
  });
});

describe('exportToCss', () => {
  const defaultOptions: ExportOptions = {
    includeCollectionComments: true,
    includeModeComments: true,
    selector: ':root',
    useModesAsSelectors: false,
  };

  it('should export variables with default options', async () => {
    const result = await exportToCss(mockVariables, mockCollections, 'Test File', defaultOptions);

    expect(result).toContain(':root {');
    expect(result).toContain('--color-primary:');
    expect(result).toContain('--spacing-sm: 8px;');
    expect(result).toContain('}');
  });

  it('should include collection comments when enabled', async () => {
    const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      includeCollectionComments: true,
    });

    expect(result).toContain('/* Design Tokens */');
  });

  it('should exclude collection comments when disabled', async () => {
    const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      includeCollectionComments: false,
    });

    expect(result).not.toContain('/* Design Tokens */');
  });

  it('should use custom selector', async () => {
    const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      selector: '.theme',
    });

    expect(result).toContain('.theme {');
  });

  it('should add prefix to variable names', async () => {
    const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      prefix: 'ds',
    });

    expect(result).toContain('--ds-color-primary:');
    expect(result).toContain('--ds-spacing-sm:');
  });

  it('should return message when no variables found', async () => {
    const result = await exportToCss([], mockCollections, 'Test File', defaultOptions);
    expect(result).toBe('/* No variables found in this file */');
  });

  it('should filter by selected collections', async () => {
    const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      selectedCollections: ['col-1'],
    });

    expect(result).toContain('--color-primary:');
  });

  describe('edge cases', () => {
    it('should handle empty collections array', async () => {
      const result = await exportToCss(mockVariables, [], 'Test File', defaultOptions);
      expect(result).toContain(':root {');
      expect(result).toContain('}');
    });

    it('should handle collections with no variables', async () => {
      const emptyCollection: VariableCollection[] = [
        {
          id: 'col-empty',
          name: 'Empty Collection',
          modes: [{ modeId: 'mode-1', name: 'Default' }],
          defaultModeId: 'mode-1',
          remote: false,
          key: 'key-empty',
          hiddenFromPublishing: false,
          variableIds: [],
        } as unknown as VariableCollection,
      ];
      const result = await exportToCss(mockVariables, emptyCollection, 'Test File', defaultOptions);
      expect(result).toContain(':root {');
      expect(result).toContain('}');
    });

    it('should handle variables with missing mode values', async () => {
      const varsWithMissingMode: Variable[] = [
        {
          id: 'var-1',
          name: 'color/primary',
          resolvedType: 'COLOR',
          valuesByMode: {}, // No values
          variableCollectionId: 'col-1',
          description: '',
          hiddenFromPublishing: false,
          scopes: [],
          codeSyntax: {},
          remote: false,
          key: 'key-1',
        } as unknown as Variable,
      ];
      const result = await exportToCss(
        varsWithMissingMode,
        mockCollections,
        'Test File',
        defaultOptions
      );
      expect(result).not.toContain('--color-primary:');
    });

    it('should handle selector with special characters', async () => {
      const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
        ...defaultOptions,
        selector: '.theme[data-mode="dark"]',
      });
      expect(result).toContain('.theme[data-mode="dark"] {');
    });

    it('should handle selector with only whitespace', async () => {
      const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
        ...defaultOptions,
        selector: '   ',
      });
      expect(result).toContain(':root {');
    });

    it('should handle useModesAsSelectors with single mode', async () => {
      const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
        ...defaultOptions,
        useModesAsSelectors: true,
      });
      expect(result).toContain(':root {');
      expect(result).not.toContain('[data-theme=');
    });

    it('should handle useModesAsSelectors with multiple modes', async () => {
      // When useModesAsSelectors is true, output starts with header, then mode selectors
      const multiModeCollections: VariableCollection[] = [
        {
          id: 'col-1',
          name: 'Design Tokens',
          modes: [
            { modeId: 'mode-1', name: 'Light' },
            { modeId: 'mode-2', name: 'Dark' },
          ],
          defaultModeId: 'mode-1',
          remote: false,
          key: 'key-col-1',
          hiddenFromPublishing: false,
          variableIds: ['var-1'],
        } as unknown as VariableCollection,
      ];
      const multiModeVars: Variable[] = [
        {
          id: 'var-1',
          name: 'color/primary',
          resolvedType: 'COLOR',
          valuesByMode: {
            'mode-1': { r: 1, g: 1, b: 1, a: 1 },
            'mode-2': { r: 0, g: 0, b: 0, a: 1 },
          },
          variableCollectionId: 'col-1',
          description: '',
          hiddenFromPublishing: false,
          scopes: [],
          codeSyntax: {},
          remote: false,
          key: 'key-1',
        } as unknown as Variable,
      ];
      const result = await exportToCss(multiModeVars, multiModeCollections, 'Test File', {
        ...defaultOptions,
        useModesAsSelectors: true,
      });
      // With useModesAsSelectors, output starts with header, then mode selectors
      expect(result).toContain('Auto-generated CSS Custom Properties');
      // "Light" is not "default" (case-insensitive), so it uses data-theme selector
      expect(result).toContain('[data-theme="light"]');
      expect(result).toContain('.theme-light');
      expect(result).toContain('[data-theme="dark"]');
      expect(result).toContain('.theme-dark');
    });

    it('should handle mode name "default" case-insensitively', async () => {
      const defaultModeCollection: VariableCollection[] = [
        {
          id: 'col-1',
          name: 'Design Tokens',
          modes: [
            { modeId: 'mode-1', name: 'DEFAULT' },
            { modeId: 'mode-2', name: 'Dark' },
          ],
          defaultModeId: 'mode-1',
          remote: false,
          key: 'key-col-1',
          hiddenFromPublishing: false,
          variableIds: ['var-1'],
        } as unknown as VariableCollection,
      ];
      const result = await exportToCss(mockVariables, defaultModeCollection, 'Test File', {
        ...defaultOptions,
        useModesAsSelectors: true,
      });
      expect(result).toContain(':root {');
    });

    it('should handle prefix with special characters', async () => {
      const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
        ...defaultOptions,
        prefix: 'ds-2024',
      });
      expect(result).toContain('--ds-2024-color-primary:');
    });

    it('should handle empty prefix', async () => {
      const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
        ...defaultOptions,
        prefix: '',
      });
      expect(result).toContain('--color-primary:');
    });

    it('should handle includeCollectionComments false', async () => {
      const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
        ...defaultOptions,
        includeCollectionComments: false,
      });
      expect(result).not.toContain('/* Design Tokens */');
    });

    it('should handle includeModeComments false', async () => {
      const multiModeCollections: VariableCollection[] = [
        {
          id: 'col-1',
          name: 'Design Tokens',
          modes: [
            { modeId: 'mode-1', name: 'Light' },
            { modeId: 'mode-2', name: 'Dark' },
          ],
          defaultModeId: 'mode-1',
          remote: false,
          key: 'key-col-1',
          hiddenFromPublishing: false,
          variableIds: ['var-1'],
        } as unknown as VariableCollection,
      ];
      const result = await exportToCss(mockVariables, multiModeCollections, 'Test File', {
        ...defaultOptions,
        useModesAsSelectors: true,
        includeModeComments: false,
      });
      expect(result).not.toContain('/* Mode:');
    });

    it('should handle fileName with special characters', async () => {
      const result = await exportToCss(
        mockVariables,
        mockCollections,
        'Test File (2024).figma',
        defaultOptions
      );
      expect(result).toContain('Exported from Figma: Test File (2024).figma');
    });

    it('should handle empty fileName', async () => {
      const result = await exportToCss(mockVariables, mockCollections, '', defaultOptions);
      expect(result).toContain('Exported from Figma:');
    });
  });
});
