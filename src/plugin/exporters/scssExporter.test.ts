import { describe, it, expect } from 'vitest';
import { exportToScss, generateScssHeader } from './scssExporter';
import type { ExportOptions } from '@shared/types';

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

describe('generateScssHeader', () => {
  it('should generate SCSS-style header', () => {
    const header = generateScssHeader('Test File');
    expect(header).toContain('Auto-generated SCSS Variables');
    expect(header).toContain('Exported from Figma: Test File');
  });
});

describe('exportToScss', () => {
  const defaultOptions: ExportOptions = {
    includeCollectionComments: true,
    includeModeComments: false,
    selector: ':root',
    useModesAsSelectors: false,
  };

  it('should export variables as SCSS format', async () => {
    const result = await exportToScss(mockVariables, mockCollections, 'Test File', defaultOptions);

    expect(result).toContain('$color-primary:');
    expect(result).toContain('$spacing-sm: 8px;');
  });

  it('should include collection comments when enabled', async () => {
    const result = await exportToScss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      includeCollectionComments: true,
    });

    expect(result).toContain('// Collection: Design Tokens');
  });

  it('should add prefix to variable names', async () => {
    const result = await exportToScss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      prefix: 'ds',
    });

    expect(result).toContain('$ds-color-primary:');
    expect(result).toContain('$ds-spacing-sm:');
  });

  it('should convert var() references to SCSS variable references', async () => {
    const varsWithAlias: Variable[] = [
      ...mockVariables,
      {
        id: 'var-3',
        name: 'color/secondary',
        resolvedType: 'COLOR',
        valuesByMode: { 'mode-1': { type: 'VARIABLE_ALIAS', id: 'var-1' } },
        variableCollectionId: 'col-1',
        description: '',
        hiddenFromPublishing: false,
        scopes: [],
        codeSyntax: {},
        remote: false,
        key: 'key-3',
      } as unknown as Variable,
    ];

    const result = await exportToScss(varsWithAlias, mockCollections, 'Test File', defaultOptions);
    expect(result).toContain('$color-secondary: $color-primary;');
  });

  it('should return message when no variables found', async () => {
    const result = await exportToScss([], mockCollections, 'Test File', defaultOptions);
    expect(result).toBe('// No variables found in this file');
  });

  describe('edge cases', () => {
  it('should handle empty collections array', async () => {
    const result = await exportToScss(mockVariables, [], 'Test File', defaultOptions);
    expect(result).toContain('Auto-generated SCSS Variables');
    expect(result).not.toContain('$color-primary:');
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
    const result = await exportToScss(mockVariables, emptyCollection, 'Test File', defaultOptions);
    expect(result).toContain('Auto-generated SCSS Variables');
  });

  it('should handle variables with missing mode values', async () => {
    const varsWithMissingMode: Variable[] = [
      {
        id: 'var-1',
        name: 'color/primary',
        resolvedType: 'COLOR',
        valuesByMode: {},
        variableCollectionId: 'col-1',
        description: '',
        hiddenFromPublishing: false,
        scopes: [],
        codeSyntax: {},
        remote: false,
        key: 'key-1',
      } as unknown as Variable,
    ];
    const result = await exportToScss(
      varsWithMissingMode,
      mockCollections,
      'Test File',
      defaultOptions
    );
    expect(result).not.toContain('$color-primary:');
  });

  it('should handle var() references with prefixes', async () => {
    const varsWithAlias: Variable[] = [
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
        name: 'color/secondary',
        resolvedType: 'COLOR',
        valuesByMode: { 'mode-1': { type: 'VARIABLE_ALIAS', id: 'var-1' } },
        variableCollectionId: 'col-1',
        description: '',
        hiddenFromPublishing: false,
        scopes: [],
        codeSyntax: {},
        remote: false,
        key: 'key-2',
      } as unknown as Variable,
    ];
    const result = await exportToScss(varsWithAlias, mockCollections, 'Test File', {
      ...defaultOptions,
      prefix: 'ds',
    });
    expect(result).toContain('$ds-color-secondary: $ds-color-primary;');
  });

  it('should handle empty prefix', async () => {
    const result = await exportToScss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      prefix: '',
    });
    expect(result).toContain('$color-primary:');
  });

  it('should handle prefix with special characters', async () => {
    const result = await exportToScss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      prefix: 'ds-2024',
    });
    expect(result).toContain('$ds-2024-color-primary:');
  });

  it('should handle fileName with special characters', async () => {
    const result = await exportToScss(
      mockVariables,
      mockCollections,
      'Test File (2024).figma',
      defaultOptions
    );
    expect(result).toContain('Exported from Figma: Test File (2024).figma');
  });

  it('should handle includeCollectionComments false', async () => {
    const result = await exportToScss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      includeCollectionComments: false,
    });
    expect(result).not.toContain('// Collection:');
  });
  });
});
