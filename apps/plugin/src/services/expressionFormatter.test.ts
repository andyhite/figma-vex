import { describe, it, expect } from 'vitest';
import { formatForCss, formatForScss } from './expressionFormatter';
import type { NameFormatRule } from '@figma-vex/shared';

const mockVariables = [
  {
    id: 'var-1',
    name: 'Spacing/base',
    resolvedType: 'FLOAT',
    variableCollectionId: 'col-1',
  },
  {
    id: 'var-2',
    name: 'Spacing/large',
    resolvedType: 'FLOAT',
    variableCollectionId: 'col-1',
  },
  {
    id: 'rem-base',
    name: 'Typography/rem-base',
    resolvedType: 'FLOAT',
    variableCollectionId: 'col-1',
  },
] as unknown as Variable[];

const mockCollections = [
  { id: 'col-1', name: 'Primitives' },
] as unknown as VariableCollection[];

// Helper to create rules with optional prefix
function createRules(prefix?: string): NameFormatRule[] {
  const replacement = prefix ? `${prefix}-\${1:kebab}` : '${1:kebab}';
  return [
    {
      id: '__default__',
      pattern: '**',
      replacement,
      enabled: true,
    },
  ];
}

describe('formatForCss', () => {
  it('should transform path reference to CSS var()', () => {
    const result = formatForCss("'Spacing/base' * 2", mockVariables, mockCollections, createRules(), null, 'px');
    expect(result).toBe('calc(var(--spacing-base) * 2)');
  });

  it('should apply prefix to CSS var names', () => {
    const result = formatForCss("'Spacing/base' * 2", mockVariables, mockCollections, createRules('ds'), null, 'px');
    expect(result).toBe('calc(var(--ds-spacing-base) * 2)');
  });

  it('should handle multiple path references', () => {
    const result = formatForCss("'Spacing/base' + 'Spacing/large'", mockVariables, mockCollections, createRules(), null, 'px');
    expect(result).toBe('calc(var(--spacing-base) + var(--spacing-large))');
  });

  it('should apply rem conversion with rem base variable', () => {
    const result = formatForCss("'Spacing/base' * 2", mockVariables, mockCollections, createRules(), 'rem-base', 'rem');
    expect(result).toBe('calc(var(--spacing-base) * 2 / var(--typography-rem-base) * 1rem)');
  });

  it('should apply rem conversion without rem base variable', () => {
    const result = formatForCss("'Spacing/base' * 2", mockVariables, mockCollections, createRules(), null, 'rem');
    expect(result).toBe('calc(var(--spacing-base) * 2 * 1rem)');
  });

  it('should apply em conversion', () => {
    const result = formatForCss("'Spacing/base' * 2", mockVariables, mockCollections, createRules(), null, 'em');
    expect(result).toBe('calc(var(--spacing-base) * 2 * 1em)');
  });

  it('should apply percent conversion', () => {
    const result = formatForCss("'Spacing/base' / 100", mockVariables, mockCollections, createRules(), null, '%');
    expect(result).toBe('calc(var(--spacing-base) / 100 * 100%)');
  });

  it('should not wrap simple literals', () => {
    const result = formatForCss('42', mockVariables, mockCollections, createRules(), null, 'px');
    expect(result).toBe('42');
  });

  it('should handle collection-prefixed paths', () => {
    const result = formatForCss("'Primitives/Spacing/base' * 2", mockVariables, mockCollections, createRules(), null, 'px');
    expect(result).toBe('calc(var(--spacing-base) * 2)');
  });
});

describe('formatForScss', () => {
  it('should transform path reference to SCSS variable', () => {
    const result = formatForScss("'Spacing/base' * 2", mockVariables, mockCollections, createRules(), null, 'px');
    expect(result).toBe('$spacing-base * 2');
  });

  it('should apply prefix to SCSS variable names', () => {
    const result = formatForScss("'Spacing/base' * 2", mockVariables, mockCollections, createRules('ds'), null, 'px');
    expect(result).toBe('$ds-spacing-base * 2');
  });

  it('should handle multiple path references', () => {
    const result = formatForScss("'Spacing/base' + 'Spacing/large'", mockVariables, mockCollections, createRules(), null, 'px');
    expect(result).toBe('$spacing-base + $spacing-large');
  });

  it('should apply rem conversion with rem base variable', () => {
    const result = formatForScss("'Spacing/base' * 2", mockVariables, mockCollections, createRules(), 'rem-base', 'rem');
    expect(result).toBe('$spacing-base * 2 / $typography-rem-base * 1rem');
  });

  it('should apply rem conversion without rem base variable', () => {
    const result = formatForScss("'Spacing/base' * 2", mockVariables, mockCollections, createRules(), null, 'rem');
    expect(result).toBe('$spacing-base * 2 * 1rem');
  });

  it('should apply percent conversion', () => {
    const result = formatForScss("'Spacing/base' / 100", mockVariables, mockCollections, createRules(), null, '%');
    expect(result).toBe('$spacing-base / 100 * 100%');
  });

  it('should not add calc wrapper (SCSS native math)', () => {
    const result = formatForScss("'Spacing/base' * 2", mockVariables, mockCollections, createRules(), null, 'px');
    expect(result).not.toContain('calc');
  });
});
