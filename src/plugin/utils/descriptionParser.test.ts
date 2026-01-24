import { describe, it, expect } from 'vitest';
import { parseDescription, UNIT_REGEX, FORMAT_REGEX } from './descriptionParser';

describe('parseDescription', () => {
  it('should return empty object for empty description', () => {
    expect(parseDescription('')).toEqual({});
    expect(parseDescription(undefined as unknown as string)).toEqual({});
  });

  it('should parse unit: px', () => {
    expect(parseDescription('unit: px')).toEqual({ unit: 'px' });
  });

  it('should parse unit: rem', () => {
    expect(parseDescription('unit: rem')).toEqual({ unit: 'rem' });
  });

  it('should parse unit: rem with custom base', () => {
    expect(parseDescription('unit: rem:20')).toEqual({ unit: 'rem', remBase: 20 });
  });

  it('should parse unit: none', () => {
    expect(parseDescription('unit: none')).toEqual({ unit: 'none' });
  });

  it('should parse all valid units', () => {
    const units = ['none', 'px', 'rem', 'em', '%', 'ms', 's'];
    units.forEach((unit) => {
      expect(parseDescription(`unit: ${unit}`)).toEqual({ unit });
    });
  });

  it('should parse format: hex', () => {
    expect(parseDescription('format: hex')).toEqual({ colorFormat: 'hex' });
  });

  it('should parse all valid color formats', () => {
    const formats = ['hex', 'rgb', 'rgba', 'hsl', 'oklch'];
    formats.forEach((format) => {
      expect(parseDescription(`format: ${format}`)).toEqual({ colorFormat: format });
    });
  });

  it('should parse both unit and format', () => {
    expect(parseDescription('unit: rem\nformat: oklch')).toEqual({
      unit: 'rem',
      colorFormat: 'oklch',
    });
  });

  it('should be case insensitive', () => {
    expect(parseDescription('UNIT: REM')).toEqual({ unit: 'rem' });
    expect(parseDescription('FORMAT: HSL')).toEqual({ colorFormat: 'hsl' });
  });

  it('should handle extra whitespace', () => {
    expect(parseDescription('unit:   rem')).toEqual({ unit: 'rem' });
    expect(parseDescription('  format:  hsl  ')).toEqual({ colorFormat: 'hsl' });
  });
});

describe('Regex patterns', () => {
  it('UNIT_REGEX should match valid units', () => {
    expect(UNIT_REGEX.test('unit: px')).toBe(true);
    expect(UNIT_REGEX.test('unit: rem:16')).toBe(true);
    expect(UNIT_REGEX.test('unit: invalid')).toBe(false);
  });

  it('FORMAT_REGEX should match valid formats', () => {
    expect(FORMAT_REGEX.test('format: hex')).toBe(true);
    expect(FORMAT_REGEX.test('format: oklch')).toBe(true);
    expect(FORMAT_REGEX.test('format: invalid')).toBe(false);
  });
});
