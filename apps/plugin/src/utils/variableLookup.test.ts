import { describe, it, expect } from 'vitest';
import { buildVariableLookup, lookupVariable, extractVarReferences } from './variableLookup';

const mockVariables = [
  {
    id: 'var-1',
    name: 'spacing/base',
    resolvedType: 'FLOAT',
    variableCollectionId: 'col-1',
  },
  {
    id: 'var-2',
    name: 'typography/font-size/lg',
    resolvedType: 'FLOAT',
    variableCollectionId: 'col-2',
  },
  {
    id: 'var-3',
    name: 'colors/primary',
    resolvedType: 'COLOR',
    variableCollectionId: 'col-1',
  },
] as unknown as Variable[];

const mockCollections = [
  { id: 'col-1', name: 'primitives' },
  { id: 'col-2', name: 'tokens' },
] as unknown as VariableCollection[];

describe('buildVariableLookup', () => {
  it('should create lookup map with CSS variable names as keys (no collection prefix)', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, '');
    // Keys should match CSS export format: just variable name, no collection
    expect(lookup.has('--spacing-base')).toBe(true);
    expect(lookup.has('--typography-font-size-lg')).toBe(true);
    expect(lookup.has('--colors-primary')).toBe(true);
  });

  it('should include prefix in keys when provided', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, 'ds');
    expect(lookup.has('--ds-spacing-base')).toBe(true);
  });

  it('should skip variables with missing collections', () => {
    const varsWithMissingCollection = [
      ...mockVariables,
      { id: 'var-orphan', name: 'orphan', variableCollectionId: 'nonexistent' },
    ] as unknown as Variable[];
    const lookup = buildVariableLookup(varsWithMissingCollection, mockCollections, '');
    expect(lookup.size).toBe(3); // Only the 3 valid ones
  });
});

describe('lookupVariable', () => {
  it('should find variable by CSS var() reference', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, '');
    const result = lookupVariable('var(--spacing-base)', lookup);
    expect(result?.variable.id).toBe('var-1');
  });

  it('should return undefined for non-existent variable', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, '');
    const result = lookupVariable('var(--nonexistent)', lookup);
    expect(result).toBeUndefined();
  });

  it('should handle var() syntax correctly', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, '');
    const result = lookupVariable('var(--typography-font-size-lg)', lookup);
    expect(result?.variable.id).toBe('var-2');
  });

  it('should return undefined for invalid var() syntax', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, '');
    expect(lookupVariable('--spacing-base', lookup)).toBeUndefined();
    expect(lookupVariable('var(spacing-base)', lookup)).toBeUndefined();
    expect(lookupVariable('', lookup)).toBeUndefined();
  });
});

describe('extractVarReferences', () => {
  it('should extract single var reference', () => {
    const refs = extractVarReferences('var(--spacing-base) * 2');
    expect(refs).toEqual(['var(--spacing-base)']);
  });

  it('should extract multiple var references', () => {
    const refs = extractVarReferences('var(--a) + var(--b)');
    expect(refs).toEqual(['var(--a)', 'var(--b)']);
  });

  it('should extract var references from function calls', () => {
    const refs = extractVarReferences('max(var(--min), var(--max))');
    expect(refs).toEqual(['var(--min)', 'var(--max)']);
  });

  it('should return empty array for no references', () => {
    const refs = extractVarReferences('10 * 2');
    expect(refs).toEqual([]);
  });

  it('should handle complex nested expressions', () => {
    const refs = extractVarReferences('round((var(--a) + var(--b)) / var(--c))');
    expect(refs).toEqual(['var(--a)', 'var(--b)', 'var(--c)']);
  });

  it('should handle empty string', () => {
    expect(extractVarReferences('')).toEqual([]);
  });

  it('should handle duplicate references', () => {
    const refs = extractVarReferences('var(--x) + var(--x)');
    expect(refs).toEqual(['var(--x)', 'var(--x)']);
  });
});
