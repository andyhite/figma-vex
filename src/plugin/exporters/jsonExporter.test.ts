import { describe, it, expect } from 'vitest';
import { exportToJson } from './jsonExporter';
import type { ExportOptions } from '@shared/types';

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
});
