import { describe, it, expect } from 'vitest';
import { cleanNumber, formatNumber } from './numberFormatter';
import { DEFAULT_CONFIG } from '@shared/types';

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
