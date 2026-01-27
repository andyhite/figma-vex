import { describe, it, expect } from 'vitest';
import { resolveValue } from './valueResolver';
import { DEFAULT_CONFIG } from '@figma-vex/shared';

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

  describe('edge cases', () => {
    it('should handle null values', async () => {
      const result = await resolveValue(
        null as unknown as VariableValue,
        'mode-1',
        mockVariables,
        'STRING',
        DEFAULT_CONFIG
      );
      expect(result).toBe('');
    });

    it('should handle undefined values', async () => {
      const result = await resolveValue(
        undefined as unknown as VariableValue,
        'mode-1',
        mockVariables,
        'STRING',
        DEFAULT_CONFIG
      );
      expect(result).toBe('');
    });

    it('should handle string with newlines', async () => {
      const result = await resolveValue(
        'line1\nline2',
        'mode-1',
        mockVariables,
        'STRING',
        DEFAULT_CONFIG
      );
      expect(result).toBe('"line1\nline2"');
    });

    it('should handle string with backslashes', async () => {
      const result = await resolveValue(
        'path\\to\\file',
        'mode-1',
        mockVariables,
        'STRING',
        DEFAULT_CONFIG
      );
      expect(result).toBe('"path\\to\\file"');
    });

    it('should handle string with both quotes and backslashes', async () => {
      const result = await resolveValue(
        'say "hi" and \\bye',
        'mode-1',
        mockVariables,
        'STRING',
        DEFAULT_CONFIG
      );
      // Only quotes are escaped, backslashes are preserved as-is
      expect(result).toBe('"say \\"hi\\" and \\bye"');
    });

    it('should handle empty string', async () => {
      const result = await resolveValue('', 'mode-1', mockVariables, 'STRING', DEFAULT_CONFIG);
      expect(result).toBe('""');
    });

    it('should handle type mismatch - COLOR type with non-object value', async () => {
      const result = await resolveValue(
        'not-a-color' as unknown as VariableValue,
        'mode-1',
        mockVariables,
        'COLOR',
        DEFAULT_CONFIG
      );
      expect(result).toBe('not-a-color');
    });

    it('should handle type mismatch - COLOR type with invalid object', async () => {
      const result = await resolveValue(
        { x: 1, y: 2 } as unknown as VariableValue,
        'mode-1',
        mockVariables,
        'COLOR',
        DEFAULT_CONFIG
      );
      expect(result).toBe('[object Object]');
    });

    it('should handle FLOAT type with non-finite number', async () => {
      const result = await resolveValue(
        Infinity as unknown as VariableValue,
        'mode-1',
        mockVariables,
        'FLOAT',
        DEFAULT_CONFIG
      );
      // Non-finite numbers don't pass the Number.isFinite check, so fall through to fallback
      expect(result).toBe('Infinity');
    });

    it('should handle FLOAT type with NaN', async () => {
      const result = await resolveValue(
        NaN as unknown as VariableValue,
        'mode-1',
        mockVariables,
        'FLOAT',
        DEFAULT_CONFIG
      );
      // NaN doesn't pass the Number.isFinite check, so fall through to fallback
      expect(result).toBe('NaN');
    });

    it('should handle zero float value', async () => {
      const result = await resolveValue(0, 'mode-1', mockVariables, 'FLOAT', DEFAULT_CONFIG);
      expect(result).toBe('0px');
    });

    it('should handle negative float value', async () => {
      const result = await resolveValue(-10, 'mode-1', mockVariables, 'FLOAT', DEFAULT_CONFIG);
      expect(result).toBe('-10px');
    });

    it('should handle very large float value', async () => {
      const result = await resolveValue(
        999999,
        'mode-1',
        mockVariables,
        'FLOAT',
        DEFAULT_CONFIG
      );
      expect(result).toBe('999999px');
    });

    it('should handle very small float value', async () => {
      const result = await resolveValue(
        0.0001,
        'mode-1',
        mockVariables,
        'FLOAT',
        DEFAULT_CONFIG
      );
      expect(result).toBe('0.0001px');
    });

    it('should handle color with missing alpha', async () => {
      const color = { r: 1, g: 0, b: 0 };
      const result = await resolveValue(
        color as unknown as VariableValue,
        'mode-1',
        mockVariables,
        'COLOR',
        DEFAULT_CONFIG
      );
      expect(result).toBe('#ff0000');
    });

    it('should handle color with alpha 0', async () => {
      const color = { r: 1, g: 0, b: 0, a: 0 };
      const result = await resolveValue(
        color as unknown as VariableValue,
        'mode-1',
        mockVariables,
        'COLOR',
        DEFAULT_CONFIG
      );
      expect(result).toBe('#ff000000');
    });

    it('should handle color with very small alpha', async () => {
      const color = { r: 1, g: 0, b: 0, a: 0.001 };
      const result = await resolveValue(
        color as unknown as VariableValue,
        'mode-1',
        mockVariables,
        'COLOR',
        DEFAULT_CONFIG
      );
      expect(result).toBe('#ff000000');
    });

    it('should handle color with boundary RGB values (0 and 1)', async () => {
      const black = { r: 0, g: 0, b: 0, a: 1 };
      const white = { r: 1, g: 1, b: 1, a: 1 };
      const resultBlack = await resolveValue(
        black,
        'mode-1',
        mockVariables,
        'COLOR',
        DEFAULT_CONFIG
      );
      const resultWhite = await resolveValue(
        white,
        'mode-1',
        mockVariables,
        'COLOR',
        DEFAULT_CONFIG
      );
      expect(resultBlack).toBe('#000000');
      expect(resultWhite).toBe('#ffffff');
    });

    it('should handle variable alias with empty variables array', async () => {
      const alias = { type: 'VARIABLE_ALIAS', id: 'var-1' };
      const result = await resolveValue(
        alias as VariableValue,
        'mode-1',
        [],
        'COLOR',
        DEFAULT_CONFIG
      );
      expect(result).toBe('/* unresolved alias */');
    });

    it('should handle unknown resolved type', async () => {
      const result = await resolveValue(
        42,
        'mode-1',
        mockVariables,
        'UNKNOWN' as VariableResolvedDataType,
        DEFAULT_CONFIG
      );
      expect(result).toBe('42');
    });

    it('should handle object value that is not an alias', async () => {
      const obj = { some: 'value' };
      const result = await resolveValue(
        obj as unknown as VariableValue,
        'mode-1',
        mockVariables,
        'STRING',
        DEFAULT_CONFIG
      );
      expect(result).toBe('[object Object]');
    });
  });

  describe('expression evaluation', () => {
    const mockVariablesWithValues = [
      {
        id: 'var-1',
        name: 'spacing/base',
        resolvedType: 'FLOAT',
        variableCollectionId: 'col-1',
        valuesByMode: { 'mode-1': 8 },
      },
    ] as unknown as Variable[];

    const mockCollectionsForExpr = [
      {
        id: 'col-1',
        name: 'primitives',
        modes: [{ modeId: 'mode-1', name: 'default' }],
      },
    ] as unknown as VariableCollection[];

    it('should evaluate expression when provided in config', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        expression: 'var(--spacing-base) * 2',
      };
      const result = await resolveValue(
        8, // fallback value
        'mode-1',
        mockVariablesWithValues,
        'FLOAT',
        config,
        '',
        0,
        new Set(),
        mockCollectionsForExpr
      );
      expect(result).toBe('16px');
    });

    it('should use fallback value when expression fails', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        expression: 'var(--nonexistent) * 2',
      };
      const result = await resolveValue(
        42,
        'mode-1',
        mockVariablesWithValues,
        'FLOAT',
        config,
        '',
        0,
        new Set(),
        mockCollectionsForExpr
      );
      // Falls back to original value
      expect(result).toBe('42px');
    });

    it('should apply unit from config to expression result', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        unit: 'rem' as const,
        expression: 'var(--spacing-base) * 2',
      };
      const result = await resolveValue(
        8,
        'mode-1',
        mockVariablesWithValues,
        'FLOAT',
        config,
        '',
        0,
        new Set(),
        mockCollectionsForExpr
      );
      expect(result).toBe('1rem'); // 16 / 16 (default remBase)
    });

    it('should not evaluate expression for non-FLOAT types', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        expression: 'var(--spacing-base) * 2',
      };
      const result = await resolveValue(
        'hello',
        'mode-1',
        mockVariablesWithValues,
        'STRING',
        config,
        '',
        0,
        new Set(),
        mockCollectionsForExpr
      );
      expect(result).toBe('"hello"'); // Normal string handling
    });

    it('should not evaluate expression when collections not provided', async () => {
      const config = {
        ...DEFAULT_CONFIG,
        expression: 'var(--spacing-base) * 2',
      };
      const result = await resolveValue(
        8,
        'mode-1',
        mockVariablesWithValues,
        'FLOAT',
        config
        // No collections parameter
      );
      expect(result).toBe('8px'); // Falls back to normal resolution
    });
  });
});
