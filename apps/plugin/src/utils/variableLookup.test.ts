import { describe, it, expect } from 'vitest';
import {
  buildVariableLookup,
  lookupVariable,
  extractVarReferences,
  extractPathReferences,
  lookupByPath,
} from './variableLookup';

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

describe('extractPathReferences', () => {
  it('should extract single path reference', () => {
    const refs = extractPathReferences("'Spacing/base' * 2");
    expect(refs).toEqual(['Spacing/base']);
  });

  it('should extract multiple path references', () => {
    const refs = extractPathReferences("'Spacing/a' + 'Spacing/b'");
    expect(refs).toEqual(['Spacing/a', 'Spacing/b']);
  });

  it('should extract path references from function calls', () => {
    const refs = extractPathReferences("max('Spacing/min', 'Spacing/max')");
    expect(refs).toEqual(['Spacing/min', 'Spacing/max']);
  });

  it('should return empty array for no references', () => {
    const refs = extractPathReferences('10 * 2');
    expect(refs).toEqual([]);
  });

  it('should handle complex nested expressions', () => {
    const refs = extractPathReferences("round(('Spacing/a' + 'Spacing/b') / 'Spacing/c')");
    expect(refs).toEqual(['Spacing/a', 'Spacing/b', 'Spacing/c']);
  });

  it('should handle empty string', () => {
    expect(extractPathReferences('')).toEqual([]);
  });

  it('should handle collection-prefixed paths', () => {
    const refs = extractPathReferences("'Primitives/Spacing/base' * 2");
    expect(refs).toEqual(['Primitives/Spacing/base']);
  });

  it('should handle escaped quotes in paths', () => {
    const refs = extractPathReferences("'Brand\\'s Colors/primary' * 0.5");
    expect(refs).toEqual(["Brand's Colors/primary"]);
  });

  it('should handle paths with spaces', () => {
    const refs = extractPathReferences("'Brand Colors/Primary 100' * 2");
    expect(refs).toEqual(['Brand Colors/Primary 100']);
  });
});

describe('lookupByPath', () => {
  const mockVariablesForPath = [
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
      id: 'var-3',
      name: 'Spacing/base',
      resolvedType: 'FLOAT',
      variableCollectionId: 'col-2', // Same name in different collection
    },
  ] as unknown as Variable[];

  const mockCollectionsForPath = [
    { id: 'col-1', name: 'Primitives' },
    { id: 'col-2', name: 'Semantic' },
  ] as unknown as VariableCollection[];

  it('should find variable by short path when unique', () => {
    const result = lookupByPath('Spacing/large', mockVariablesForPath, mockCollectionsForPath);
    expect(result?.variable.id).toBe('var-2');
  });

  it('should find variable by full path with collection', () => {
    const result = lookupByPath(
      'Primitives/Spacing/base',
      mockVariablesForPath,
      mockCollectionsForPath
    );
    expect(result?.variable.id).toBe('var-1');
  });

  it('should find variable in other collection by full path', () => {
    const result = lookupByPath(
      'Semantic/Spacing/base',
      mockVariablesForPath,
      mockCollectionsForPath
    );
    expect(result?.variable.id).toBe('var-3');
  });

  it('should return null for non-existent path', () => {
    const result = lookupByPath(
      'Spacing/nonexistent',
      mockVariablesForPath,
      mockCollectionsForPath
    );
    expect(result).toBeNull();
  });

  it('should throw error for ambiguous path', () => {
    expect(() => {
      lookupByPath('Spacing/base', mockVariablesForPath, mockCollectionsForPath);
    }).toThrow(/Ambiguous reference/);
  });

  it('should include collection names in ambiguity error', () => {
    expect(() => {
      lookupByPath('Spacing/base', mockVariablesForPath, mockCollectionsForPath);
    }).toThrow(/Primitives.*Semantic|Semantic.*Primitives/);
  });

  it('should include collection in result', () => {
    const result = lookupByPath('Spacing/large', mockVariablesForPath, mockCollectionsForPath);
    expect(result?.collection.name).toBe('Primitives');
  });
});
