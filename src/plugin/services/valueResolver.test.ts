import { describe, it, expect } from 'vitest';
import { resolveValue } from './valueResolver';
import { DEFAULT_CONFIG } from '@shared/types';

// Mock variable for testing
const mockVariables: Variable[] = [
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

describe('resolveValue', () => {
  it('should resolve color values', async () => {
    const color = { r: 1, g: 0, b: 0, a: 1 };
    const result = await resolveValue(color, 'mode-1', mockVariables, 'COLOR', DEFAULT_CONFIG);
    expect(result).toBe('#ff0000');
  });

  it('should resolve float values with px unit', async () => {
    const result = await resolveValue(16, 'mode-1', mockVariables, 'FLOAT', DEFAULT_CONFIG);
    expect(result).toBe('16px');
  });

  it('should resolve float values with rem unit', async () => {
    const config = { ...DEFAULT_CONFIG, unit: 'rem' as const };
    const result = await resolveValue(16, 'mode-1', mockVariables, 'FLOAT', config);
    expect(result).toBe('1rem');
  });

  it('should resolve string values with quotes', async () => {
    const result = await resolveValue('hello', 'mode-1', mockVariables, 'STRING', DEFAULT_CONFIG);
    expect(result).toBe('"hello"');
  });

  it('should escape quotes in strings', async () => {
    const result = await resolveValue(
      'say "hi"',
      'mode-1',
      mockVariables,
      'STRING',
      DEFAULT_CONFIG
    );
    expect(result).toBe('"say \\"hi\\""');
  });

  it('should resolve boolean values as 1 or 0', async () => {
    const resultTrue = await resolveValue(true, 'mode-1', mockVariables, 'BOOLEAN', DEFAULT_CONFIG);
    expect(resultTrue).toBe('1');

    const resultFalse = await resolveValue(
      false,
      'mode-1',
      mockVariables,
      'BOOLEAN',
      DEFAULT_CONFIG
    );
    expect(resultFalse).toBe('0');
  });

  it('should resolve variable aliases as var() references', async () => {
    const alias = { type: 'VARIABLE_ALIAS', id: 'var-1' };
    const result = await resolveValue(
      alias as VariableValue,
      'mode-1',
      mockVariables,
      'COLOR',
      DEFAULT_CONFIG
    );
    expect(result).toBe('var(--color-primary)');
  });

  it('should handle prefixed variable aliases', async () => {
    const alias = { type: 'VARIABLE_ALIAS', id: 'var-1' };
    const result = await resolveValue(
      alias as VariableValue,
      'mode-1',
      mockVariables,
      'COLOR',
      DEFAULT_CONFIG,
      'ds'
    );
    expect(result).toBe('var(--ds-color-primary)');
  });

  it('should handle unresolved aliases', async () => {
    const alias = { type: 'VARIABLE_ALIAS', id: 'non-existent' };
    const result = await resolveValue(
      alias as VariableValue,
      'mode-1',
      mockVariables,
      'COLOR',
      DEFAULT_CONFIG
    );
    expect(result).toBe('/* unresolved alias */');
  });

  it('should detect circular references via visited set', async () => {
    const alias = { type: 'VARIABLE_ALIAS', id: 'var-1' };
    const visited = new Set(['var-1']);
    const result = await resolveValue(
      alias as VariableValue,
      'mode-1',
      mockVariables,
      'COLOR',
      DEFAULT_CONFIG,
      '',
      0,
      visited
    );
    expect(result).toBe('/* circular reference */');
  });

  it('should detect depth-based circular references', async () => {
    const color = { r: 1, g: 0, b: 0, a: 1 };
    const result = await resolveValue(
      color,
      'mode-1',
      mockVariables,
      'COLOR',
      DEFAULT_CONFIG,
      '',
      11
    );
    expect(result).toBe('/* circular reference */');
  });
});
