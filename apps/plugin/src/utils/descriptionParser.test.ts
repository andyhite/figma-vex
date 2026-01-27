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
    expect(parseDescription('unit: rem(20)')).toEqual({ unit: 'rem', remBase: 20 });
  });

  it('should parse unit: rem with variable path base', () => {
    expect(parseDescription("unit: rem('Typography/base')")).toEqual({
      unit: 'rem',
      remBaseVariablePath: 'Typography/base',
    });
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
    expect(UNIT_REGEX.test('unit: rem(16)')).toBe(true);
    expect(UNIT_REGEX.test("unit: rem('Path/base')")).toBe(true);
    // Note: UNIT_REGEX matches any word, validation happens elsewhere
    expect(UNIT_REGEX.test('unit: anyword')).toBe(true);
  });

  it('FORMAT_REGEX should match valid formats', () => {
    expect(FORMAT_REGEX.test('format: hex')).toBe(true);
    expect(FORMAT_REGEX.test('format: oklch')).toBe(true);
    expect(FORMAT_REGEX.test('format: invalid')).toBe(false);
  });
});

describe('edge cases', () => {
  it('should handle description with multiple unit declarations (first wins)', () => {
    const result = parseDescription('unit: px\nunit: rem');
    expect(result.unit).toBe('px');
  });

  it('should handle description with multiple format declarations (first wins)', () => {
    const result = parseDescription('format: hex\nformat: rgb');
    expect(result.colorFormat).toBe('hex');
  });

  it('should handle description with unit and format in different order', () => {
    const result1 = parseDescription('unit: rem\nformat: hex');
    const result2 = parseDescription('format: hex\nunit: rem');
    expect(result1.unit).toBe('rem');
    expect(result1.colorFormat).toBe('hex');
    expect(result2.unit).toBe('rem');
    expect(result2.colorFormat).toBe('hex');
  });

  it('should handle remBase with zero (edge case)', () => {
    const result = parseDescription('unit: rem(0)');
    expect(result.unit).toBe('rem');
    expect(result.remBase).toBe(0);
  });

  it('should handle remBase with very large number', () => {
    const result = parseDescription('unit: rem(999999)');
    expect(result.unit).toBe('rem');
    expect(result.remBase).toBe(999999);
  });

  it('should handle remBase with negative number (regex only matches digits)', () => {
    const result = parseDescription('unit: rem(-16)');
    expect(result.unit).toBe('rem');
    // The regex (\d+) only matches digits in parentheses, so -16 doesn't match
    // and remBase won't be set
    expect(result.remBase).toBeUndefined();
  });

  it('should handle remBase with decimal (should parse as integer)', () => {
    const result = parseDescription('unit: rem(16.5)');
    expect(result.unit).toBe('rem');
    expect(result.remBase).toBe(16); // parseInt truncates
  });

  it('should handle description with unit in middle of text', () => {
    const result = parseDescription('This is a unit: px description');
    expect(result.unit).toBe('px');
  });

  it('should handle description with format in middle of text', () => {
    const result = parseDescription('Use format: hex for colors');
    expect(result.colorFormat).toBe('hex');
  });

  it('should handle description with partial matches', () => {
    const result = parseDescription('unit: px format: hex');
    expect(result.unit).toBe('px');
    expect(result.colorFormat).toBe('hex');
  });

  it('should handle description with unit and format on same line', () => {
    const result = parseDescription('unit: rem format: rgb');
    expect(result.unit).toBe('rem');
    expect(result.colorFormat).toBe('rgb');
  });

  it('should handle description with extra text before and after', () => {
    const result = parseDescription('Some text before unit: rem(20) and format: hsl more text');
    expect(result.unit).toBe('rem');
    expect(result.remBase).toBe(20);
    expect(result.colorFormat).toBe('hsl');
  });

  it('should handle description with newlines and tabs', () => {
    const result = parseDescription('unit:\trem(16)\nformat:\thex');
    expect(result.unit).toBe('rem');
    expect(result.remBase).toBe(16);
    expect(result.colorFormat).toBe('hex');
  });

  it('should handle description with case variations in unit value', () => {
    expect(parseDescription('unit: PX')).toEqual({ unit: 'px' });
    expect(parseDescription('unit: REM')).toEqual({ unit: 'rem' });
    expect(parseDescription('unit: Em')).toEqual({ unit: 'em' });
  });

  it('should handle description with case variations in format value', () => {
    expect(parseDescription('format: HEX')).toEqual({ colorFormat: 'hex' });
    expect(parseDescription('format: RGB')).toEqual({ colorFormat: 'rgb' });
    expect(parseDescription('format: Hsl')).toEqual({ colorFormat: 'hsl' });
  });

  it('should handle description with remBase as string of digits', () => {
    const result = parseDescription('unit: rem(0016)');
    expect(result.unit).toBe('rem');
    expect(result.remBase).toBe(16); // parseInt handles leading zeros
  });

  it('should handle description with invalid remBase (non-numeric)', () => {
    const result = parseDescription('unit: rem(abc)');
    expect(result.unit).toBe('rem');
    // When remBase is non-numeric, the regex won't match the digits group
    // So remBase won't be set
    expect(result.remBase).toBeUndefined();
  });

  it('should handle very long description', () => {
    const longDesc = 'unit: rem(16)\n' + 'format: hex\n' + 'a'.repeat(1000);
    const result = parseDescription(longDesc);
    expect(result.unit).toBe('rem');
    expect(result.remBase).toBe(16);
    expect(result.colorFormat).toBe('hex');
  });

  it('should handle description with special characters', () => {
    const result = parseDescription('unit: px!@#$%^&*()');
    expect(result.unit).toBe('px');
  });

  it('should handle description with only whitespace', () => {
    expect(parseDescription('   \n\t   ')).toEqual({});
  });

  it('should handle description with unit: but no value', () => {
    const result = parseDescription('unit:');
    expect(result).toEqual({});
  });

  it('should handle description with format: but no value', () => {
    const result = parseDescription('format:');
    expect(result).toEqual({});
  });
});

describe('semicolon-separated directives', () => {
  it('should parse unit and format separated by semicolon', () => {
    const result = parseDescription('unit: rem; format: hex');
    expect(result.unit).toBe('rem');
    expect(result.colorFormat).toBe('hex');
  });

  it('should parse unit with remBase separated by semicolon', () => {
    const result = parseDescription('unit: rem(20); format: oklch');
    expect(result.unit).toBe('rem');
    expect(result.remBase).toBe(20);
    expect(result.colorFormat).toBe('oklch');
  });

  it('should handle whitespace around semicolons', () => {
    const result = parseDescription('unit: px ; format: rgb');
    expect(result.unit).toBe('px');
    expect(result.colorFormat).toBe('rgb');
  });

  it('should handle multiple semicolons', () => {
    const result = parseDescription('unit: em; ; format: hsl');
    expect(result.unit).toBe('em');
    expect(result.colorFormat).toBe('hsl');
  });
});

describe('calc expression parsing', () => {
  it('should parse simple calc expression with path reference', () => {
    const result = parseDescription("calc: 'Spacing/base' * 2");
    expect(result.expression).toBe("'Spacing/base' * 2");
  });

  it('should parse calc with unit directive', () => {
    const result = parseDescription("calc: 'Text/Size/lg' * 1.5; unit: rem");
    expect(result.expression).toBe("'Text/Size/lg' * 1.5");
    expect(result.unit).toBe('rem');
  });

  it('should parse calc with function calls', () => {
    const result = parseDescription("calc: round('Spacing/base' * 1.5)");
    expect(result.expression).toBe("round('Spacing/base' * 1.5)");
  });

  it('should parse calc with min/max functions', () => {
    const result = parseDescription("calc: max('Spacing/min', 'Spacing/preferred')");
    expect(result.expression).toBe("max('Spacing/min', 'Spacing/preferred')");
  });

  it('should parse calc with complex arithmetic', () => {
    const result = parseDescription("calc: ('Spacing/a' + 'Spacing/b') / 2");
    expect(result.expression).toBe("('Spacing/a' + 'Spacing/b') / 2");
  });

  it('should be case insensitive for calc keyword', () => {
    const result = parseDescription("CALC: 'Spacing/x' * 2");
    expect(result.expression).toBe("'Spacing/x' * 2");
  });

  it('should handle calc at different positions', () => {
    const result = parseDescription("unit: px; calc: 'Spacing/x' * 2; format: hex");
    expect(result.expression).toBe("'Spacing/x' * 2");
    expect(result.unit).toBe('px');
    expect(result.colorFormat).toBe('hex');
  });

  it('should return undefined expression for non-calc descriptions', () => {
    const result = parseDescription('unit: px; format: hex');
    expect(result.expression).toBeUndefined();
  });

  it('should handle calc with negative numbers', () => {
    const result = parseDescription("calc: 'Spacing/x' * -1");
    expect(result.expression).toBe("'Spacing/x' * -1");
  });

  it('should handle calc with decimal numbers', () => {
    const result = parseDescription("calc: 'Spacing/x' * 1.618");
    expect(result.expression).toBe("'Spacing/x' * 1.618");
  });

  it('should handle calc with collection-prefixed path', () => {
    const result = parseDescription("calc: 'Primitives/Spacing/base' * 2");
    expect(result.expression).toBe("'Primitives/Spacing/base' * 2");
  });

  it('should handle calc with escaped quotes in path', () => {
    const result = parseDescription("calc: 'Brand\\'s Colors/primary' * 0.5");
    expect(result.expression).toBe("'Brand\\'s Colors/primary' * 0.5");
  });
});
