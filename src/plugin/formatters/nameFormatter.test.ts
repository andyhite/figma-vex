import { describe, it, expect } from 'vitest';
import { toCssName, toPrefixedName } from './nameFormatter';

describe('toCssName', () => {
  it('should return empty string for invalid input', () => {
    expect(toCssName('')).toBe('');
    expect(toCssName(null as unknown as string)).toBe('');
    expect(toCssName(undefined as unknown as string)).toBe('');
  });

  it('should convert slashes to hyphens', () => {
    expect(toCssName('color/primary')).toBe('color-primary');
    expect(toCssName('spacing/sm/x')).toBe('spacing-sm-x');
  });

  it('should convert spaces to hyphens', () => {
    expect(toCssName('color primary')).toBe('color-primary');
    expect(toCssName('spacing sm x')).toBe('spacing-sm-x');
  });

  it('should convert camelCase to kebab-case', () => {
    expect(toCssName('colorPrimary')).toBe('color-primary');
    expect(toCssName('spacingSmX')).toBe('spacing-sm-x');
  });

  it('should remove invalid characters', () => {
    expect(toCssName('color@primary!')).toBe('color-primary');
    expect(toCssName('spacing$sm#x')).toBe('spacing-sm-x');
  });

  it('should collapse multiple hyphens', () => {
    expect(toCssName('color--primary')).toBe('color-primary');
    expect(toCssName('spacing---sm')).toBe('spacing-sm');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(toCssName('-color-primary-')).toBe('color-primary');
    expect(toCssName('--spacing--')).toBe('spacing');
  });

  it('should lowercase the result', () => {
    expect(toCssName('Color/PRIMARY')).toBe('color-primary');
    expect(toCssName('SPACING')).toBe('spacing');
  });

  it('should handle complex real-world names', () => {
    expect(toCssName('Color/Brand/Primary 500')).toBe('color-brand-primary-500');
    expect(toCssName('Spacing/Component/buttonPadding')).toBe('spacing-component-button-padding');
  });
});

describe('toPrefixedName', () => {
  it('should return name without prefix when prefix is empty', () => {
    expect(toPrefixedName('color-primary', '')).toBe('color-primary');
    expect(toPrefixedName('color-primary', undefined)).toBe('color-primary');
  });

  it('should add prefix when provided', () => {
    expect(toPrefixedName('color-primary', 'ds')).toBe('ds-color-primary');
    expect(toPrefixedName('spacing-sm', 'theme')).toBe('theme-spacing-sm');
  });
});

describe('edge cases', () => {
  describe('toCssName', () => {
    it('should handle names with only special characters', () => {
      expect(toCssName('!!!')).toBe('');
      expect(toCssName('@@@')).toBe('');
      expect(toCssName('###')).toBe('');
    });

    it('should handle names with only numbers', () => {
      expect(toCssName('123')).toBe('123');
      expect(toCssName('456789')).toBe('456789');
    });

    it('should handle names starting with numbers', () => {
      expect(toCssName('123color')).toBe('123color');
      expect(toCssName('9primary')).toBe('9primary');
    });

    it('should handle names ending with numbers', () => {
      expect(toCssName('color123')).toBe('color123');
      expect(toCssName('primary500')).toBe('primary500');
    });

    it('should handle names with consecutive uppercase letters', () => {
      // The regex only matches lowercase followed by uppercase, not uppercase followed by uppercase
      expect(toCssName('CSSColor')).toBe('csscolor');
      expect(toCssName('HTMLTag')).toBe('htmltag');
      // But lowercase followed by uppercase works
      expect(toCssName('cssColor')).toBe('css-color');
    });

    it('should handle names with mixed separators', () => {
      expect(toCssName('color/primary 500')).toBe('color-primary-500');
      expect(toCssName('spacing-sm_x')).toBe('spacing-sm-x');
    });

    it('should handle very long names', () => {
      const longName = 'very/long/path/to/deeply/nested/variable/name/with/many/segments';
      const result = toCssName(longName);
      expect(result).toBe('very-long-path-to-deeply-nested-variable-name-with-many-segments');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should handle names with unicode characters', () => {
      // Unicode characters are removed by [^a-z0-9-], then trailing hyphens are removed
      expect(toCssName('café')).toBe('caf');
      expect(toCssName('naïve')).toBe('na-ve');
      expect(toCssName('résumé')).toBe('r-sum');
    });

    it('should handle names with emojis', () => {
      const result = toCssName('color🎨primary');
      expect(result).toMatch(/^color.*primary$/);
    });

    it('should handle names with multiple consecutive separators', () => {
      expect(toCssName('color///primary')).toBe('color-primary');
      expect(toCssName('spacing   sm')).toBe('spacing-sm');
      expect(toCssName('color---primary')).toBe('color-primary');
    });

    it('should handle names that are all uppercase', () => {
      expect(toCssName('COLOR')).toBe('color');
      expect(toCssName('PRIMARY_COLOR')).toBe('primary-color');
    });

    it('should handle names that are all lowercase', () => {
      expect(toCssName('color')).toBe('color');
      expect(toCssName('primary_color')).toBe('primary-color');
    });

    it('should handle names with underscores', () => {
      expect(toCssName('color_primary')).toBe('color-primary');
      expect(toCssName('spacing_sm_x')).toBe('spacing-sm-x');
    });

    it('should handle names with dots', () => {
      expect(toCssName('color.primary')).toBe('color-primary');
      expect(toCssName('spacing.sm.x')).toBe('spacing-sm-x');
    });

    it('should handle single character names', () => {
      expect(toCssName('a')).toBe('a');
      expect(toCssName('A')).toBe('a');
      expect(toCssName('1')).toBe('1');
    });

    it('should handle names with parentheses', () => {
      expect(toCssName('color(primary)')).toBe('color-primary');
      expect(toCssName('spacing(sm)')).toBe('spacing-sm');
    });

    it('should handle names with brackets', () => {
      expect(toCssName('color[primary]')).toBe('color-primary');
      expect(toCssName('spacing[sm]')).toBe('spacing-sm');
    });

    it('should handle names with hyphens already present', () => {
      expect(toCssName('color-primary')).toBe('color-primary');
      expect(toCssName('spacing-sm-x')).toBe('spacing-sm-x');
    });

    it('should handle empty string after processing', () => {
      expect(toCssName('---')).toBe('');
      expect(toCssName('   ')).toBe('');
      expect(toCssName('///')).toBe('');
    });
  });

  describe('toPrefixedName', () => {
    it('should handle empty css name', () => {
      expect(toPrefixedName('', 'ds')).toBe('ds-');
    });

    it('should handle prefix with special characters', () => {
      expect(toPrefixedName('color-primary', 'ds-')).toBe('ds--color-primary');
    });

    it('should handle very long prefix', () => {
      const longPrefix = 'very-long-prefix-name';
      expect(toPrefixedName('color', longPrefix)).toBe(`${longPrefix}-color`);
    });

    it('should handle prefix that is empty string', () => {
      expect(toPrefixedName('color-primary', '')).toBe('color-primary');
    });

    it('should handle css name that already has prefix-like pattern', () => {
      expect(toPrefixedName('ds-color-primary', 'ds')).toBe('ds-ds-color-primary');
    });
  });
});
