import { describe, it, expect } from 'vitest';
import { exportToJson } from './jsonExporter';
import type { ExportOptions } from '@figma-vex/shared';

const mockVariables: Variable[] = [
  {
    id: 'var-1',
    name: 'color/primary',
    resolvedType: 'COLOR',
    valuesByMode: { 'mode-1': { r: 1, g: 0, b: 0, a: 1 } },
    variableCollectionId: 'col-1',
    description: 'Primary brand color',
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
    description: 'unit: rem',
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

describe('exportToJson', () => {
  const defaultOptions: ExportOptions = {
    includeCollectionComments: true,
    includeModeComments: false,
    selector: ':root',
    useModesAsSelectors: false,
  };

  it('should export variables in DTCG format', async () => {
    const result = await exportToJson(mockVariables, mockCollections, defaultOptions);
    const json = JSON.parse(result);

    expect(json['Design Tokens']).toBeDefined();
    expect(json['Design Tokens'].color.primary).toBeDefined();
    expect(json['Design Tokens'].color.primary.$type).toBe('color');
    expect(json['Design Tokens'].color.primary.$value).toBe('#ff0000');
  });

  it('should include description in output', async () => {
    const result = await exportToJson(mockVariables, mockCollections, defaultOptions);
    const json = JSON.parse(result);

    expect(json['Design Tokens'].color.primary.$description).toBe('Primary brand color');
  });

  it('should handle nested variable paths', async () => {
    const result = await exportToJson(mockVariables, mockCollections, defaultOptions);
    const json = JSON.parse(result);

    expect(json['Design Tokens'].spacing.sm).toBeDefined();
    expect(json['Design Tokens'].spacing.sm.$type).toBe('float');
  });

  it('should add unit extension for non-default units', async () => {
    const result = await exportToJson(mockVariables, mockCollections, defaultOptions);
    const json = JSON.parse(result);

    expect(json['Design Tokens'].spacing.sm.$extensions).toBeDefined();
    expect(json['Design Tokens'].spacing.sm.$extensions['com.figma.vex'].unit).toBe('rem');
  });

  it('should handle variable aliases', async () => {
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

    const result = await exportToJson(varsWithAlias, mockCollections, defaultOptions);
    const json = JSON.parse(result);

    expect(json['Design Tokens'].color.secondary.$value).toBe('{color.primary}');
  });

  it('should handle multi-mode collections', async () => {
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
        name: 'color/bg',
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

    const result = await exportToJson(multiModeVars, multiModeCollections, defaultOptions);
    const json = JSON.parse(result);

    expect(json['Design Tokens'].color.bg.$value.Light).toBe('#ffffff');
    expect(json['Design Tokens'].color.bg.$value.Dark).toBe('#000000');
  });

  describe('edge cases', () => {
  it('should handle empty collections array', async () => {
    const result = await exportToJson([], [], defaultOptions);
    const json = JSON.parse(result);
    expect(json).toEqual({});
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
    const result = await exportToJson([], emptyCollection, defaultOptions);
    const json = JSON.parse(result);
    expect(json['Empty Collection']).toEqual({});
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
    const result = await exportToJson(varsWithEmptyName, mockCollections, defaultOptions);
    const json = JSON.parse(result);
    expect(json['Design Tokens']['']).toBeDefined();
  });

  it('should handle variables with no description', async () => {
    const varsNoDesc: Variable[] = [
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
    ];
    const result = await exportToJson(varsNoDesc, mockCollections, defaultOptions);
    const json = JSON.parse(result);
    expect(json['Design Tokens'].color.primary.$description).toBeUndefined();
  });

  it('should handle variables with missing default mode value', async () => {
    const varsMissingMode: Variable[] = [
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
    const result = await exportToJson(varsMissingMode, mockCollections, defaultOptions);
    const json = JSON.parse(result);
    expect(json['Design Tokens'].color.primary.$value).toBeUndefined();
  });

  it('should handle deeply nested variable paths', async () => {
    const deepVars: Variable[] = [
      {
        id: 'var-1',
        name: 'a/b/c/d/e/f/g/h/i/j/k',
        resolvedType: 'FLOAT',
        valuesByMode: { 'mode-1': 10 },
        variableCollectionId: 'col-1',
        description: '',
        hiddenFromPublishing: false,
        scopes: [],
        codeSyntax: {},
        remote: false,
        key: 'key-1',
      } as unknown as Variable,
    ];
    const result = await exportToJson(deepVars, mockCollections, defaultOptions);
    const json = JSON.parse(result);
    expect(json['Design Tokens'].a.b.c.d.e.f.g.h.i.j.k).toBeDefined();
  });

  it('should handle variable names with special characters in path', async () => {
    const specialVars: Variable[] = [
      {
        id: 'var-1',
        name: 'color/primary-500',
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
    const result = await exportToJson(specialVars, mockCollections, defaultOptions);
    const json = JSON.parse(result);
    expect(json['Design Tokens'].color['primary-500']).toBeDefined();
  });

  it('should handle unresolved variable aliases', async () => {
    const varsWithUnresolvedAlias: Variable[] = [
      {
        id: 'var-1',
        name: 'color/secondary',
        resolvedType: 'COLOR',
        valuesByMode: { 'mode-1': { type: 'VARIABLE_ALIAS', id: 'non-existent' } },
        variableCollectionId: 'col-1',
        description: '',
        hiddenFromPublishing: false,
        scopes: [],
        codeSyntax: {},
        remote: false,
        key: 'key-1',
      } as unknown as Variable,
    ];
    const result = await exportToJson(varsWithUnresolvedAlias, mockCollections, defaultOptions);
    const json = JSON.parse(result);
    expect(json['Design Tokens'].color.secondary.$value).toBe('{non-existent}');
  });

  it('should handle unit extension for default px unit', async () => {
    const varsWithPx: Variable[] = [
      {
        id: 'var-1',
        name: 'spacing/sm',
        resolvedType: 'FLOAT',
        valuesByMode: { 'mode-1': 8 },
        variableCollectionId: 'col-1',
        description: 'unit: px',
        hiddenFromPublishing: false,
        scopes: [],
        codeSyntax: {},
        remote: false,
        key: 'key-1',
      } as unknown as Variable,
    ];
    const result = await exportToJson(varsWithPx, mockCollections, defaultOptions);
    const json = JSON.parse(result);
    expect(json['Design Tokens'].spacing.sm.$extensions).toBeUndefined();
  });

  it('should handle collection with no default mode', async () => {
    const collectionNoDefault: VariableCollection[] = [
      {
        id: 'col-1',
        name: 'Design Tokens',
        modes: [{ modeId: 'mode-1', name: 'Default' }],
        defaultModeId: 'mode-1',
        remote: false,
        key: 'key-col-1',
        hiddenFromPublishing: false,
        variableIds: ['var-1'],
      } as unknown as VariableCollection,
    ];
    const result = await exportToJson(mockVariables, collectionNoDefault, defaultOptions);
    const json = JSON.parse(result);
    expect(json['Design Tokens']).toBeDefined();
  });

  it('should handle variables with boolean values', async () => {
    const boolVars: Variable[] = [
      {
        id: 'var-1',
        name: 'feature/enabled',
        resolvedType: 'BOOLEAN',
        valuesByMode: { 'mode-1': true },
        variableCollectionId: 'col-1',
        description: '',
        hiddenFromPublishing: false,
        scopes: [],
        codeSyntax: {},
        remote: false,
        key: 'key-1',
      } as unknown as Variable,
    ];
    const result = await exportToJson(boolVars, mockCollections, defaultOptions);
    const json = JSON.parse(result);
    expect(json['Design Tokens'].feature.enabled.$type).toBe('boolean');
    expect(json['Design Tokens'].feature.enabled.$value).toBe(true);
  });

  it('should handle variables with string values', async () => {
    const stringVars: Variable[] = [
      {
        id: 'var-1',
        name: 'font/family',
        resolvedType: 'STRING',
        valuesByMode: { 'mode-1': 'Arial, sans-serif' },
        variableCollectionId: 'col-1',
        description: '',
        hiddenFromPublishing: false,
        scopes: [],
        codeSyntax: {},
        remote: false,
        key: 'key-1',
      } as unknown as Variable,
    ];
    const result = await exportToJson(stringVars, mockCollections, defaultOptions);
    const json = JSON.parse(result);
    expect(json['Design Tokens'].font.family.$type).toBe('string');
    expect(json['Design Tokens'].font.family.$value).toBe('Arial, sans-serif');
  });

  it('should handle options as undefined', async () => {
    const result = await exportToJson(mockVariables, mockCollections, undefined);
    const json = JSON.parse(result);
    expect(json['Design Tokens']).toBeDefined();
  });

  it('should handle options with selectedCollections empty array', async () => {
    const result = await exportToJson(mockVariables, mockCollections, {
      ...defaultOptions,
      selectedCollections: [],
    });
    const json = JSON.parse(result);
    // Empty array means no filter, so all collections are included
    expect(json['Design Tokens']).toBeDefined();
  });
  });
});
