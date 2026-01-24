import { describe, it, expect } from 'vitest';
import {
  filterCollections,
  getCollectionVariables,
  getCollectionVariablesByName,
} from './collectionUtils';

const mockCollections = [
  { id: 'col-1', name: 'Colors' },
  { id: 'col-2', name: 'Spacing' },
  { id: 'col-3', name: 'Typography' },
] as VariableCollection[];

const mockVariables = [
  { id: 'var-1', name: 'color/Primary', variableCollectionId: 'col-1' },
  { id: 'var-2', name: 'color/secondary', variableCollectionId: 'col-1' },
  { id: 'var-3', name: 'colorBackground', variableCollectionId: 'col-1' },
  { id: 'var-4', name: 'spacing/sm', variableCollectionId: 'col-2' },
] as Variable[];

describe('filterCollections', () => {
  it('should return all collections when no filter specified', () => {
    expect(filterCollections(mockCollections)).toEqual(mockCollections);
    expect(filterCollections(mockCollections, undefined)).toEqual(mockCollections);
    expect(filterCollections(mockCollections, [])).toEqual(mockCollections);
  });

  it('should filter collections by ID', () => {
    const result = filterCollections(mockCollections, ['col-1', 'col-3']);
    expect(result).toHaveLength(2);
    expect(result.map((c) => c.name)).toEqual(['Colors', 'Typography']);
  });

  it('should return empty array when no matches', () => {
    const result = filterCollections(mockCollections, ['non-existent']);
    expect(result).toHaveLength(0);
  });
});

describe('getCollectionVariables', () => {
  it('should return variables for a collection', () => {
    const result = getCollectionVariables(mockVariables, 'col-1');
    expect(result).toHaveLength(3);
  });

  it('should sort by CSS-normalized name', () => {
    const result = getCollectionVariables(mockVariables, 'col-1');
    // After toCssName: color-primary, color-secondary, color-background
    // Sorted: color-background, color-primary, color-secondary
    expect(result.map((v) => v.name)).toEqual([
      'colorBackground',
      'color/Primary',
      'color/secondary',
    ]);
  });

  it('should return empty array for non-existent collection', () => {
    const result = getCollectionVariables(mockVariables, 'non-existent');
    expect(result).toHaveLength(0);
  });
});

describe('getCollectionVariablesByName', () => {
  it('should return variables for a collection', () => {
    const result = getCollectionVariablesByName(mockVariables, 'col-1');
    expect(result).toHaveLength(3);
  });

  it('should sort by raw name', () => {
    const result = getCollectionVariablesByName(mockVariables, 'col-1');
    // Sorted by raw name: color/Primary, color/secondary, colorBackground
    expect(result.map((v) => v.name)).toEqual([
      'color/Primary',
      'color/secondary',
      'colorBackground',
    ]);
  });
});
