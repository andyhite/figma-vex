import { describe, it, expect } from 'vitest';
import { cleanNumber, formatNumber } from './numberFormatter';
import { DEFAULT_CONFIG } from '@figma-vex/shared';

describe('cleanNumber', () => {
  it('should return integer as string', () => {
    expect(cleanNumber(42)).toBe('42');
    expect(cleanNumber(0)).toBe('0');
    expect(cleanNumber(-10)).toBe('-10');
  });

  it('should remove trailing zeros from decimals', () => {
    expect(cleanNumber(1.5)).toBe('1.5');
    expect(cleanNumber(1.5)).toBe('1.5');
    expect(cleanNumber(1.1234)).toBe('1.1234');
  });

  it('should respect decimal precision', () => {
    expect(cleanNumber(1.123456789, 4)).toBe('1.1235');
    expect(cleanNumber(1.123456789, 2)).toBe('1.12');
  });

  it('should handle special values', () => {
    expect(cleanNumber(Infinity)).toBe('Infinity');
    expect(cleanNumber(-Infinity)).toBe('-Infinity');
    expect(cleanNumber(NaN)).toBe('NaN');
  });
});

describe('formatNumber', () => {
  it('should format with px unit', () => {
    expect(formatNumber(16, { ...DEFAULT_CONFIG, unit: 'px' })).toBe('16px');
    expect(formatNumber(0, { ...DEFAULT_CONFIG, unit: 'px' })).toBe('0px');
  });

  it('should format with no unit', () => {
    expect(formatNumber(1.5, { ...DEFAULT_CONFIG, unit: 'none' })).toBe('1.5');
    expect(formatNumber(700, { ...DEFAULT_CONFIG, unit: 'none' })).toBe('700');
  });

  it('should convert to rem with default base', () => {
    expect(formatNumber(16, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('1rem');
    expect(formatNumber(24, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('1.5rem');
    expect(formatNumber(8, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('0.5rem');
  });

  it('should convert to rem with custom base', () => {
    expect(formatNumber(20, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 20 })).toBe('1rem');
    expect(formatNumber(10, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 20 })).toBe('0.5rem');
  });

  it('should format with em unit', () => {
    expect(formatNumber(1.5, { ...DEFAULT_CONFIG, unit: 'em' })).toBe('1.5em');
  });

  it('should format with percentage', () => {
    expect(formatNumber(100, { ...DEFAULT_CONFIG, unit: '%' })).toBe('100%');
    expect(formatNumber(50, { ...DEFAULT_CONFIG, unit: '%' })).toBe('50%');
  });

  it('should format with ms unit', () => {
    expect(formatNumber(200, { ...DEFAULT_CONFIG, unit: 'ms' })).toBe('200ms');
  });

  it('should format with s unit', () => {
    expect(formatNumber(0.2, { ...DEFAULT_CONFIG, unit: 's' })).toBe('0.2s');
  });
});

describe('edge cases', () => {
  describe('cleanNumber', () => {
    it('should handle zero', () => {
      expect(cleanNumber(0)).toBe('0');
    });

    it('should handle negative zero', () => {
      expect(cleanNumber(-0)).toBe('0');
    });

    it('should handle very large numbers', () => {
      expect(cleanNumber(999999999)).toBe('999999999');
      expect(cleanNumber(1e10)).toBe('10000000000');
    });

    it('should handle very small numbers', () => {
      // toFixed(4) rounds 0.00001 to 0.0000, which becomes "0" after removing trailing zeros
      expect(cleanNumber(0.00001)).toBe('0');
      // 0.000001 rounds to 0.0000
      expect(cleanNumber(0.000001)).toBe('0');
      // But 0.0001 works
      expect(cleanNumber(0.0001)).toBe('0.0001');
    });

    it('should handle numbers with many trailing zeros', () => {
      expect(cleanNumber(1.5000)).toBe('1.5');
      expect(cleanNumber(10.0000)).toBe('10');
    });

    it('should handle numbers that round to integers', () => {
      expect(cleanNumber(1.0)).toBe('1');
      expect(cleanNumber(42.0)).toBe('42');
    });

    it('should respect decimal precision for very precise numbers', () => {
      expect(cleanNumber(1.123456789, 2)).toBe('1.12');
      expect(cleanNumber(1.123456789, 6)).toBe('1.123457');
    });

    it('should handle negative numbers', () => {
      expect(cleanNumber(-42)).toBe('-42');
      expect(cleanNumber(-1.5)).toBe('-1.5');
      expect(cleanNumber(-0.1234)).toBe('-0.1234');
    });
  });

  describe('formatNumber', () => {
    it('should handle zero with all units', () => {
      expect(formatNumber(0, { ...DEFAULT_CONFIG, unit: 'none' })).toBe('0');
      expect(formatNumber(0, { ...DEFAULT_CONFIG, unit: 'px' })).toBe('0px');
      expect(formatNumber(0, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('0rem');
      expect(formatNumber(0, { ...DEFAULT_CONFIG, unit: 'em' })).toBe('0em');
      expect(formatNumber(0, { ...DEFAULT_CONFIG, unit: '%' })).toBe('0%');
      expect(formatNumber(0, { ...DEFAULT_CONFIG, unit: 'ms' })).toBe('0ms');
      expect(formatNumber(0, { ...DEFAULT_CONFIG, unit: 's' })).toBe('0s');
    });

    it('should handle negative numbers with all units', () => {
      expect(formatNumber(-10, { ...DEFAULT_CONFIG, unit: 'px' })).toBe('-10px');
      expect(formatNumber(-10, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('-0.625rem');
      expect(formatNumber(-50, { ...DEFAULT_CONFIG, unit: '%' })).toBe('-50%');
    });

    it('should handle rem conversion with very small remBase', () => {
      expect(formatNumber(1, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 1 })).toBe('1rem');
      expect(formatNumber(0.5, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 1 })).toBe('0.5rem');
    });

    it('should handle rem conversion with very large remBase', () => {
      expect(formatNumber(100, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 100 })).toBe('1rem');
      expect(formatNumber(50, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 100 })).toBe('0.5rem');
    });

    it('should handle rem conversion with non-standard remBase', () => {
      expect(formatNumber(20, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 20 })).toBe('1rem');
      expect(formatNumber(10, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 20 })).toBe('0.5rem');
      expect(formatNumber(5, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 20 })).toBe('0.25rem');
    });

    it('should handle very large numbers', () => {
      expect(formatNumber(999999, { ...DEFAULT_CONFIG, unit: 'px' })).toBe('999999px');
      expect(formatNumber(999999, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('62499.9375rem');
    });

    it('should handle very small numbers', () => {
      expect(formatNumber(0.0001, { ...DEFAULT_CONFIG, unit: 'px' })).toBe('0.0001px');
      // 0.0001 / 16 = 0.00000625, but cleanNumber with default 4 decimals rounds to 0.0000
      expect(formatNumber(0.0001, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('0rem');
      // But larger values work
      expect(formatNumber(0.001, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('0.0001rem');
    });

    it('should handle decimal numbers that result in clean rem values', () => {
      expect(formatNumber(8, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('0.5rem');
      expect(formatNumber(4, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('0.25rem');
      expect(formatNumber(2, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('0.125rem');
    });

    it('should handle percentage values', () => {
      expect(formatNumber(100, { ...DEFAULT_CONFIG, unit: '%' })).toBe('100%');
      expect(formatNumber(50.5, { ...DEFAULT_CONFIG, unit: '%' })).toBe('50.5%');
      expect(formatNumber(0.1, { ...DEFAULT_CONFIG, unit: '%' })).toBe('0.1%');
    });

    it('should handle time units with decimals', () => {
      expect(formatNumber(0.5, { ...DEFAULT_CONFIG, unit: 's' })).toBe('0.5s');
      expect(formatNumber(1.5, { ...DEFAULT_CONFIG, unit: 's' })).toBe('1.5s');
      expect(formatNumber(500.5, { ...DEFAULT_CONFIG, unit: 'ms' })).toBe('500.5ms');
    });

    it('should handle numbers that are exactly divisible by remBase', () => {
      expect(formatNumber(16, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('1rem');
      expect(formatNumber(32, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('2rem');
      expect(formatNumber(48, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('3rem');
    });

    it('should handle numbers that result in repeating decimals', () => {
      const result = formatNumber(10, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 3 });
      expect(result).toMatch(/^3\.3+rem$/);
    });
  });
});
