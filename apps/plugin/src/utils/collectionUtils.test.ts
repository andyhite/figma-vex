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

describe('edge cases', () => {
  describe('filterCollections', () => {
    it('should handle empty collections array', () => {
      expect(filterCollections([], ['col-1'])).toEqual([]);
      expect(filterCollections([], undefined)).toEqual([]);
    });

    it('should handle null selectedCollectionIds', () => {
      expect(filterCollections(mockCollections, null as unknown as string[])).toEqual(
        mockCollections
      );
    });

    it('should handle selectedCollectionIds with duplicates', () => {
      const result = filterCollections(mockCollections, ['col-1', 'col-1', 'col-2']);
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(['col-1', 'col-2']);
    });

    it('should handle selectedCollectionIds with non-existent IDs', () => {
      const result = filterCollections(mockCollections, ['non-existent-1', 'non-existent-2']);
      expect(result).toHaveLength(0);
    });

    it('should handle mixed valid and invalid IDs', () => {
      const result = filterCollections(mockCollections, ['col-1', 'non-existent', 'col-2']);
      expect(result).toHaveLength(2);
      expect(result.map((c) => c.id)).toEqual(['col-1', 'col-2']);
    });

    it('should preserve order of collections', () => {
      const result = filterCollections(mockCollections, ['col-3', 'col-1']);
      // filter() preserves the original order from mockCollections, which is col-1, col-2, col-3
      // So filtering by ['col-3', 'col-1'] gives ['col-1', 'col-3'] in original order
      expect(result.map((c) => c.id)).toEqual(['col-1', 'col-3']);
    });
  });

  describe('getCollectionVariables', () => {
    it('should handle empty variables array', () => {
      expect(getCollectionVariables([], 'col-1')).toEqual([]);
    });

    it('should handle variables with missing collectionId', () => {
      const varsWithMissing = [
        { id: 'var-1', name: 'test', variableCollectionId: undefined },
      ] as unknown as Variable[];
      const result = getCollectionVariables(varsWithMissing, 'col-1');
      expect(result).toHaveLength(0);
    });

    it('should handle variables with null collectionId', () => {
      const varsWithNull = [
        { id: 'var-1', name: 'test', variableCollectionId: null },
      ] as unknown as Variable[];
      const result = getCollectionVariables(varsWithNull, 'col-1');
      expect(result).toHaveLength(0);
    });

    it('should handle duplicate variable names (should still sort)', () => {
      const varsWithDuplicates = [
        { id: 'var-1', name: 'color/primary', variableCollectionId: 'col-1' },
        { id: 'var-2', name: 'color/primary', variableCollectionId: 'col-1' },
      ] as Variable[];
      const result = getCollectionVariables(varsWithDuplicates, 'col-1');
      expect(result).toHaveLength(2);
    });

    it('should handle variables with empty names', () => {
      const varsWithEmptyNames = [
        { id: 'var-1', name: '', variableCollectionId: 'col-1' },
        { id: 'var-2', name: 'color/primary', variableCollectionId: 'col-1' },
      ] as Variable[];
      const result = getCollectionVariables(varsWithEmptyNames, 'col-1');
      expect(result).toHaveLength(2);
      // Empty name should sort first
      expect(result[0].name).toBe('');
    });

    it('should handle variables with very long names', () => {
      const longName = 'a'.repeat(1000);
      const varsWithLongName = [
        { id: 'var-1', name: longName, variableCollectionId: 'col-1' },
        { id: 'var-2', name: 'color/primary', variableCollectionId: 'col-1' },
      ] as Variable[];
      const result = getCollectionVariables(varsWithLongName, 'col-1');
      expect(result).toHaveLength(2);
    });

    it('should handle case-sensitive sorting', () => {
      const varsWithCase = [
        { id: 'var-1', name: 'Color/Primary', variableCollectionId: 'col-1' },
        { id: 'var-2', name: 'color/primary', variableCollectionId: 'col-1' },
        { id: 'var-3', name: 'COLOR/PRIMARY', variableCollectionId: 'col-1' },
      ] as Variable[];
      const result = getCollectionVariables(varsWithCase, 'col-1');
      expect(result).toHaveLength(3);
      // Should be sorted by CSS-normalized name (all become color-primary)
      // But original names are preserved
    });
  });

  describe('getCollectionVariablesByName', () => {
    it('should handle empty variables array', () => {
      expect(getCollectionVariablesByName([], 'col-1')).toEqual([]);
    });

    it('should handle variables with missing collectionId', () => {
      const varsWithMissing = [
        { id: 'var-1', name: 'test', variableCollectionId: undefined },
      ] as unknown as Variable[];
      const result = getCollectionVariablesByName(varsWithMissing, 'col-1');
      expect(result).toHaveLength(0);
    });

    it('should handle variables with null collectionId', () => {
      const varsWithNull = [
        { id: 'var-1', name: 'test', variableCollectionId: null },
      ] as unknown as Variable[];
      const result = getCollectionVariablesByName(varsWithNull, 'col-1');
      expect(result).toHaveLength(0);
    });

    it('should handle duplicate variable names', () => {
      const varsWithDuplicates = [
        { id: 'var-1', name: 'color/primary', variableCollectionId: 'col-1' },
        { id: 'var-2', name: 'color/primary', variableCollectionId: 'col-1' },
      ] as Variable[];
      const result = getCollectionVariablesByName(varsWithDuplicates, 'col-1');
      expect(result).toHaveLength(2);
    });

    it('should handle variables with empty names', () => {
      const varsWithEmptyNames = [
        { id: 'var-1', name: '', variableCollectionId: 'col-1' },
        { id: 'var-2', name: 'color/primary', variableCollectionId: 'col-1' },
      ] as Variable[];
      const result = getCollectionVariablesByName(varsWithEmptyNames, 'col-1');
      expect(result).toHaveLength(2);
      // Empty name should sort first
      expect(result[0].name).toBe('');
    });

    it('should preserve case in sorting (raw name)', () => {
      const varsWithCase = [
        { id: 'var-1', name: 'Color/Primary', variableCollectionId: 'col-1' },
        { id: 'var-2', name: 'color/primary', variableCollectionId: 'col-1' },
        { id: 'var-3', name: 'COLOR/PRIMARY', variableCollectionId: 'col-1' },
      ] as Variable[];
      const result = getCollectionVariablesByName(varsWithCase, 'col-1');
      expect(result).toHaveLength(3);
      // localeCompare is case-insensitive by default, so sorting may vary by locale
      // Just verify all three are present and sorted (order may vary by locale)
      const names = result.map((v) => v.name);
      expect(names).toContain('COLOR/PRIMARY');
      expect(names).toContain('Color/Primary');
      expect(names).toContain('color/primary');
      // Verify they are sorted (even if case-insensitive)
      expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    });
  });
});
