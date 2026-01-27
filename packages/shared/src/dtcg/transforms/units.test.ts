import { describe, it, expect } from 'vitest';
import { formatNumberWithUnit, formatCalcExpression } from './units';
import type { DTCGConversionSettings, DTCGDocument } from '../types';

describe('DTCG Unit Transforms', () => {
  const baseOptions: DTCGConversionSettings = {
    colorFormat: 'hex',
    defaultUnit: 'px',
    remBase: 16,
  };

  describe('formatNumberWithUnit', () => {
    it('should format px values', () => {
      const result = formatNumberWithUnit(16, 'px', baseOptions);
      expect(result).toBe('16px');
    });

    it('should format rem values with conversion', () => {
      const result = formatNumberWithUnit(16, 'rem', baseOptions);
      expect(result).toBe('1rem');
    });

    it('should format fractional rem values', () => {
      const result = formatNumberWithUnit(8, 'rem', baseOptions);
      expect(result).toBe('0.5rem');
    });

    it('should format em values', () => {
      const result = formatNumberWithUnit(20, 'em', baseOptions);
      expect(result).toBe('20em');
    });

    it('should format percentage values', () => {
      const result = formatNumberWithUnit(50, '%', baseOptions);
      expect(result).toBe('50%');
    });

    it('should format ms values', () => {
      const result = formatNumberWithUnit(300, 'ms', baseOptions);
      expect(result).toBe('300ms');
    });

    it('should format s values', () => {
      const result = formatNumberWithUnit(1, 's', baseOptions);
      expect(result).toBe('1s');
    });

    it('should format unitless values', () => {
      const result = formatNumberWithUnit(1.5, 'none', baseOptions);
      expect(result).toBe('1.5');
    });

    it('should handle zero values', () => {
      const result = formatNumberWithUnit(0, 'px', baseOptions);
      expect(result).toBe('0px');
    });

    it('should handle custom remBase', () => {
      const options = { ...baseOptions, remBase: 10 };
      const result = formatNumberWithUnit(20, 'rem', options);
      expect(result).toBe('2rem');
    });

    it('should clean trailing zeros', () => {
      const result = formatNumberWithUnit(16.0, 'px', baseOptions);
      expect(result).toBe('16px');
    });
  });

  describe('formatCalcExpression', () => {
    const mockDocument: DTCGDocument = {
      collections: {},
      $metadata: {
        figmaFile: 'test.figma',
        generatedAt: new Date().toISOString(),
      },
    };

    it('should wrap simple expressions in calc()', () => {
      const result = formatCalcExpression('2 * 4', baseOptions, mockDocument);
      expect(result).toContain('calc');
    });

    it('should handle path references', () => {
      const documentWithToken: DTCGDocument = {
        collections: {
          Collection: {
            Token: {
              $type: 'number',
              $value: 16,
            },
          },
        },
        $metadata: {
          figmaFile: 'test.figma',
          generatedAt: new Date().toISOString(),
        },
      };
      const result = formatCalcExpression("'Collection/Token' * 2", baseOptions, documentWithToken);
      expect(result).toContain('var(--');
      expect(result).toContain('collection-token');
    });

    it('should handle expressions with operations', () => {
      const result = formatCalcExpression('10 + 5', baseOptions, mockDocument);
      expect(result).toContain('calc');
    });

    it('should handle expressions without operations', () => {
      const result = formatCalcExpression('10', baseOptions, mockDocument);
      expect(result).toBe('10');
    });

    it('should handle var() references', () => {
      const result = formatCalcExpression('var(--test) * 2', baseOptions, mockDocument);
      expect(result).toContain('calc');
    });
  });
});
