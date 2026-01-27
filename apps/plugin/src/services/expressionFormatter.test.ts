import { describe, it, expect } from 'vitest';
import { formatForCss, formatForScss } from './expressionFormatter';

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

describe('formatForCss', () => {
  it('should transform path reference to CSS var()', () => {
    const result = formatForCss("'Spacing/base' * 2", mockVariables, mockCollections, '', null, 'px');
    expect(result).toBe('calc(var(--spacing-base) * 2)');
  });

  it('should apply prefix to CSS var names', () => {
    const result = formatForCss("'Spacing/base' * 2", mockVariables, mockCollections, 'ds', null, 'px');
    expect(result).toBe('calc(var(--ds-spacing-base) * 2)');
  });

  it('should handle multiple path references', () => {
    const result = formatForCss("'Spacing/base' + 'Spacing/large'", mockVariables, mockCollections, '', null, 'px');
    expect(result).toBe('calc(var(--spacing-base) + var(--spacing-large))');
  });

  it('should apply rem conversion with rem base variable', () => {
    const result = formatForCss("'Spacing/base' * 2", mockVariables, mockCollections, '', 'rem-base', 'rem');
    expect(result).toBe('calc(var(--spacing-base) * 2 / var(--typography-rem-base) * 1rem)');
  });

  it('should apply rem conversion without rem base variable', () => {
    const result = formatForCss("'Spacing/base' * 2", mockVariables, mockCollections, '', null, 'rem');
    expect(result).toBe('calc(var(--spacing-base) * 2 * 1rem)');
  });

  it('should apply em conversion', () => {
    const result = formatForCss("'Spacing/base' * 2", mockVariables, mockCollections, '', null, 'em');
    expect(result).toBe('calc(var(--spacing-base) * 2 * 1em)');
  });

  it('should apply percent conversion', () => {
    const result = formatForCss("'Spacing/base' / 100", mockVariables, mockCollections, '', null, '%');
    expect(result).toBe('calc(var(--spacing-base) / 100 * 100%)');
  });

  it('should not wrap simple literals', () => {
    const result = formatForCss('42', mockVariables, mockCollections, '', null, 'px');
    expect(result).toBe('42');
  });

  it('should handle collection-prefixed paths', () => {
    const result = formatForCss("'Primitives/Spacing/base' * 2", mockVariables, mockCollections, '', null, 'px');
    expect(result).toBe('calc(var(--spacing-base) * 2)');
  });
});

describe('formatForScss', () => {
  it('should transform path reference to SCSS variable', () => {
    const result = formatForScss("'Spacing/base' * 2", mockVariables, mockCollections, '', null, 'px');
    expect(result).toBe('$spacing-base * 2');
  });

  it('should apply prefix to SCSS variable names', () => {
    const result = formatForScss("'Spacing/base' * 2", mockVariables, mockCollections, 'ds', null, 'px');
    expect(result).toBe('$ds-spacing-base * 2');
  });

  it('should handle multiple path references', () => {
    const result = formatForScss("'Spacing/base' + 'Spacing/large'", mockVariables, mockCollections, '', null, 'px');
    expect(result).toBe('$spacing-base + $spacing-large');
  });

  it('should apply rem conversion with rem base variable', () => {
    const result = formatForScss("'Spacing/base' * 2", mockVariables, mockCollections, '', 'rem-base', 'rem');
    expect(result).toBe('$spacing-base * 2 / $typography-rem-base * 1rem');
  });

  it('should apply rem conversion without rem base variable', () => {
    const result = formatForScss("'Spacing/base' * 2", mockVariables, mockCollections, '', null, 'rem');
    expect(result).toBe('$spacing-base * 2 * 1rem');
  });

  it('should apply percent conversion', () => {
    const result = formatForScss("'Spacing/base' / 100", mockVariables, mockCollections, '', null, '%');
    expect(result).toBe('$spacing-base / 100 * 100%');
  });

  it('should not add calc wrapper (SCSS native math)', () => {
    const result = formatForScss("'Spacing/base' * 2", mockVariables, mockCollections, '', null, 'px');
    expect(result).not.toContain('calc');
  });
});
