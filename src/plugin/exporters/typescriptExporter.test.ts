import { describe, it, expect } from 'vitest';
import { exportToTypeScript, generateTypeScriptHeader } from './typescriptExporter';
import type { ExportOptions } from '@shared/types';

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
});
