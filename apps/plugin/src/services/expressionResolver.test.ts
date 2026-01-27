import { describe, it, expect } from 'vitest';
import { resolveExpression } from './expressionResolver';
import type { TokenConfig } from '@figma-vex/shared';
import { DEFAULT_CONFIG } from '@figma-vex/shared';

const mockVariables = [
  {
    id: 'var-1',
    name: 'spacing/base',
    resolvedType: 'FLOAT',
    variableCollectionId: 'col-1',
    valuesByMode: { 'mode-1': 8, 'mode-2': 6 },
  },
  {
    id: 'var-2',
    name: 'typography/font-lg',
    resolvedType: 'FLOAT',
    variableCollectionId: 'col-2',
    valuesByMode: { 'mode-1': 24 },
  },
  {
    id: 'var-3',
    name: 'alias/spacing',
    resolvedType: 'FLOAT',
    variableCollectionId: 'col-1',
    valuesByMode: { 'mode-1': { type: 'VARIABLE_ALIAS', id: 'var-1' } },
  },
  {
    id: 'var-4',
    name: 'colors/primary',
    resolvedType: 'COLOR',
    variableCollectionId: 'col-1',
    valuesByMode: { 'mode-1': { r: 1, g: 0, b: 0, a: 1 } },
  },
] as unknown as Variable[];

const mockCollections = [
  {
    id: 'col-1',
    name: 'primitives',
    modes: [
      { modeId: 'mode-1', name: 'default' },
      { modeId: 'mode-2', name: 'compact' },
    ],
  },
  {
    id: 'col-2',
    name: 'tokens',
    modes: [{ modeId: 'mode-1', name: 'default' }],
  },
] as unknown as VariableCollection[];

describe('resolveExpression', () => {
  it('should resolve simple expression', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--spacing-base) * 2',
    };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result.value).toBe(16);
    expect(result.unit).toBe('px');
    expect(result.warnings).toEqual([]);
  });

  it('should resolve expression with different mode values', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--spacing-base) * 2',
    };

    const result1 = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );
    const result2 = await resolveExpression(
      config,
      'mode-2',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result1.value).toBe(16); // 8 * 2
    expect(result2.value).toBe(12); // 6 * 2
  });

  it('should resolve aliases fully', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--alias-spacing) * 2',
    };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result.value).toBe(16); // alias resolves to 8, 8 * 2 = 16
  });

  it('should respect unit override in config', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      unit: 'rem',
      expression: 'var(--spacing-base) * 2',
    };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result.value).toBe(16);
    expect(result.unit).toBe('rem');
  });

  it('should return warning for non-existent variable', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--nonexistent) * 2',
    };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('not found');
  });

  it('should return warning for non-numeric variable', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--colors-primary) * 2',
    };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('not numeric');
  });

  it('should handle prefix', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--ds-spacing-base) * 2',
    };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      'ds'
    );

    expect(result.value).toBe(16);
  });

  it('should return warning when no expression provided', async () => {
    const config: TokenConfig = { ...DEFAULT_CONFIG };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result.value).toBeNull();
    expect(result.warnings).toContain('No expression provided');
  });

  it('should resolve cross-collection variable references', async () => {
    // Variables from different collections can be combined in expressions
    // spacing/base is in primitives (col-1), typography/font-lg is in tokens (col-2)
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--spacing-base) + var(--typography-font-lg)',
    };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result.value).toBe(32); // 8 + 24
    expect(result.unit).toBe('px');
    expect(result.warnings).toEqual([]);
  });
});
