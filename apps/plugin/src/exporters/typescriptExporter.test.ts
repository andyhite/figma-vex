import { describe, it, expect } from 'vitest';
import { exportToTypeScript, generateTypeScriptHeader } from './typescriptExporter';
import type { ExportOptions } from '@figma-vex/shared';

const mockVariables: Variable[] = [
  {
    id: 'var-1',
    name: 'color/primary',
    resolvedType: 'COLOR',
    valuesByMode: { 'mode-1': { r: 1, g: 0, b: 0, a: 1 } },
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

describe('generateTypeScriptHeader', () => {
  it('should generate TypeScript-style header', () => {
    const header = generateTypeScriptHeader('Test File');
    expect(header).toContain('Auto-generated TypeScript types');
    expect(header).toContain('Exported from Figma: Test File');
  });
});

describe('exportToTypeScript', () => {
  const defaultOptions: ExportOptions = {
    includeCollectionComments: false,
    includeModeComments: false,
    selector: ':root',
    useModesAsSelectors: false,
  };

  it('should export as TypeScript type definition', async () => {
    const result = await exportToTypeScript(
      mockVariables,
      mockCollections,
      'Test File',
      defaultOptions
    );

    expect(result).toContain('export type CSSVariableName =');
    expect(result).toContain('| "--color-primary"');
    expect(result).toContain('| "--spacing-sm"');
  });

  it('should include csstype module declaration', async () => {
    const result = await exportToTypeScript(
      mockVariables,
      mockCollections,
      'Test File',
      defaultOptions
    );

    expect(result).toContain("declare module 'csstype'");
    expect(result).toContain('interface Properties');
    expect(result).toContain('[key: CSSVariableName]: string | number;');
  });

  it('should add prefix to variable names', async () => {
    const result = await exportToTypeScript(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      prefix: 'ds',
    });

    expect(result).toContain('| "--ds-color-primary"');
    expect(result).toContain('| "--ds-spacing-sm"');
  });

  it('should return message when no variables found', async () => {
    const result = await exportToTypeScript([], mockCollections, 'Test File', defaultOptions);
    expect(result).toBe('// No variables found in this file');
  });

  describe('edge cases', () => {
    it('should handle empty collections array', async () => {
      const result = await exportToTypeScript(mockVariables, [], 'Test File', defaultOptions);
      expect(result).toBe('// No variables found in this file');
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
      const result = await exportToTypeScript(
        mockVariables,
        emptyCollection,
        'Test File',
        defaultOptions
      );
      expect(result).toBe('// No variables found in this file');
    });

    it('should handle variables with empty names', async () => {
      const varsWithEmptyName: Variable[] = [
        {
          id: 'var-1',
          name: '',
          resolvedType: 'COLOR',
          valuesByMode: { 'mode-1': { r: 1, g: 0, b: 0, a: 1 } },
          variableCollectionId: 'col-1',
          description: '',
          hiddenFromPublishing: false,
          scopes: [],
          codeSyntax: {},
          remote: false,
          key: 'key-1',
        } as unknown as Variable,
      ];
      const result = await exportToTypeScript(
        varsWithEmptyName,
        mockCollections,
        'Test File',
        defaultOptions
      );
      expect(result).toContain('export type CSSVariableName =');
      expect(result).toContain('| "--"');
    });

    it('should handle empty prefix', async () => {
      const result = await exportToTypeScript(mockVariables, mockCollections, 'Test File', {
        ...defaultOptions,
        prefix: '',
      });
      expect(result).toContain('| "--color-primary"');
    });

    it('should handle prefix with special characters', async () => {
      const result = await exportToTypeScript(mockVariables, mockCollections, 'Test File', {
        ...defaultOptions,
        prefix: 'ds-2024',
      });
      expect(result).toContain('| "--ds-2024-color-primary"');
    });

    it('should handle fileName with special characters', async () => {
      const result = await exportToTypeScript(
        mockVariables,
        mockCollections,
        'Test File (2024).figma',
        defaultOptions
      );
      expect(result).toContain('Exported from Figma: Test File (2024).figma');
    });

    it('should handle variables with very long names', async () => {
      const longName = 'a'.repeat(100);
      const varsWithLongName: Variable[] = [
        {
          id: 'var-1',
          name: longName,
          resolvedType: 'COLOR',
          valuesByMode: { 'mode-1': { r: 1, g: 0, b: 0, a: 1 } },
          variableCollectionId: 'col-1',
          description: '',
          hiddenFromPublishing: false,
          scopes: [],
          codeSyntax: {},
          remote: false,
          key: 'key-1',
        } as unknown as Variable,
      ];
      const result = await exportToTypeScript(
        varsWithLongName,
        mockCollections,
        'Test File',
        defaultOptions
      );
      expect(result).toContain('export type CSSVariableName =');
    });

    it('should handle selectedCollections filtering', async () => {
      const result = await exportToTypeScript(mockVariables, mockCollections, 'Test File', {
        ...defaultOptions,
        selectedCollections: ['col-1'],
      });
      expect(result).toContain('| "--color-primary"');
    });

    it('should handle selectedCollections with non-existent IDs', async () => {
      const result = await exportToTypeScript(mockVariables, mockCollections, 'Test File', {
        ...defaultOptions,
        selectedCollections: ['non-existent'],
      });
      expect(result).toBe('// No variables found in this file');
    });
  });
});
