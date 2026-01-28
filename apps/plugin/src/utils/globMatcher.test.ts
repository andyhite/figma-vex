import { describe, it, expect } from 'vitest';
import { globToRegex, applyReplacement, toCustomCssName } from './globMatcher';
import type { NameFormatRule } from '@figma-vex/shared';

describe('globToRegex', () => {
  it('converts single wildcard to capture group', () => {
    const regex = globToRegex('color/*');
    expect(regex.test('color/teal')).toBe(true);
    expect(regex.test('color/teal/alpha')).toBe(false);
    expect(regex.test('spacing/md')).toBe(false);
  });

  it('converts multiple wildcards', () => {
    const regex = globToRegex('color/*/alpha/*');
    expect(regex.test('color/teal/alpha/2')).toBe(true);
    expect(regex.test('color/blue/alpha/5')).toBe(true);
    expect(regex.test('color/teal/alpha')).toBe(false);
  });

  it('handles globstar (**) for multiple segments', () => {
    const regex = globToRegex('typography/**/size');
    expect(regex.test('typography/heading/size')).toBe(true);
    expect(regex.test('typography/body/large/size')).toBe(true);
    expect(regex.test('typography/size')).toBe(true);
  });

  it('is case-insensitive', () => {
    const regex = globToRegex('color/*');
    expect(regex.test('COLOR/teal')).toBe(true);
    expect(regex.test('Color/Teal')).toBe(true);
  });

  it('escapes special characters', () => {
    const regex = globToRegex('test.*/value');
    expect(regex.test('test.x/value')).toBe(true);
    expect(regex.test('testx/value')).toBe(false);
  });
});

describe('applyReplacement', () => {
  it('replaces $1, $2 with captures', () => {
    expect(applyReplacement('color-$1-a$2', ['teal', '2'])).toBe('color-teal-a2');
    expect(applyReplacement('space-$1', ['md'])).toBe('space-md');
  });

  it('handles missing captures', () => {
    expect(applyReplacement('test-$1-$2', ['value'])).toBe('test-value-');
  });

  it('handles multiple uses of same capture', () => {
    expect(applyReplacement('$1-$1-$1', ['repeat'])).toBe('repeat-repeat-repeat');
  });

  it('handles non-numeric text', () => {
    expect(applyReplacement('test-$1-dollar', ['value'])).toBe('test-value-dollar');
  });

  describe('modifiers', () => {
    describe(':kebab modifier', () => {
      it('converts to kebab-case with hyphens', () => {
        expect(applyReplacement('$1:kebab', ['Color/Teal/Alpha/2'])).toBe('color-teal-alpha-2');
        expect(applyReplacement('$1:kebab', ['UPPERCASE'])).toBe('uppercase');
      });

      it('handles single segment', () => {
        expect(applyReplacement('$1:kebab', ['Teal'])).toBe('teal');
      });
    });

    describe(':snake modifier', () => {
      it('converts to snake_case with underscores', () => {
        expect(applyReplacement('$1:snake', ['Color/Teal/Alpha/2'])).toBe('color_teal_alpha_2');
        expect(applyReplacement('$1:snake', ['UPPERCASE'])).toBe('uppercase');
      });
    });

    describe(':camel modifier', () => {
      it('converts to camelCase', () => {
        expect(applyReplacement('$1:camel', ['Color/Teal/Alpha/2'])).toBe('colorTealAlpha2');
        expect(applyReplacement('$1:camel', ['color/teal'])).toBe('colorTeal');
      });

      it('handles single segment', () => {
        expect(applyReplacement('$1:camel', ['Teal'])).toBe('teal');
      });
    });

    describe(':pascal modifier', () => {
      it('converts to PascalCase', () => {
        expect(applyReplacement('$1:pascal', ['Color/Teal/Alpha/2'])).toBe('ColorTealAlpha2');
        expect(applyReplacement('$1:pascal', ['color/teal'])).toBe('ColorTeal');
      });

      it('handles single segment', () => {
        expect(applyReplacement('$1:pascal', ['teal'])).toBe('Teal');
      });
    });

    describe(':lower modifier', () => {
      it('lowercases but preserves separators', () => {
        expect(applyReplacement('$1:lower', ['Color/Teal/Alpha'])).toBe('color/teal/alpha');
        expect(applyReplacement('$1:lower', ['UPPERCASE'])).toBe('uppercase');
      });
    });

    describe(':upper modifier', () => {
      it('uppercases but preserves separators', () => {
        expect(applyReplacement('$1:upper', ['Color/Teal/Alpha'])).toBe('COLOR/TEAL/ALPHA');
        expect(applyReplacement('$1:upper', ['lowercase'])).toBe('LOWERCASE');
      });
    });

    describe('no modifier', () => {
      it('preserves original value', () => {
        expect(applyReplacement('$1-$2', ['Teal', 'ALPHA'])).toBe('Teal-ALPHA');
        expect(applyReplacement('$1', ['Color/Teal'])).toBe('Color/Teal');
      });
    });

    describe('mixed usage', () => {
      it('handles mixed modifiers', () => {
        expect(applyReplacement('$1:kebab-a$2', ['Color/Teal', '2'])).toBe('color-teal-a2');
      });

      it('ignores unknown modifiers', () => {
        expect(applyReplacement('$1:unknown', ['Value'])).toBe('Value');
      });

      it('works with globstar captures containing paths', () => {
        // Simulating ** capturing "Color/Teal" from "Color/Teal/Alpha/2"
        expect(applyReplacement('$1:kebab-a$2', ['Color/Teal', '2'])).toBe('color-teal-a2');
        expect(applyReplacement('$1:pascal$2:pascal', ['color/teal', 'alpha/2'])).toBe(
          'ColorTealAlpha2'
        );
      });
    });

    describe('curly brace syntax', () => {
      it('supports ${n} format', () => {
        expect(applyReplacement('${1}-${2}', ['Teal', 'Alpha'])).toBe('Teal-Alpha');
      });

      it('supports ${n:modifier} format', () => {
        expect(applyReplacement('${1:kebab}', ['Color/Teal/Alpha'])).toBe('color-teal-alpha');
        expect(applyReplacement('${1:pascal}', ['color/teal'])).toBe('ColorTeal');
      });

      it('allows mixing curly brace and plain syntax', () => {
        expect(applyReplacement('${1:kebab}-a$2', ['Color/Teal', '2'])).toBe('color-teal-a2');
        expect(applyReplacement('$1:kebab-a${2}', ['Color/Teal', '2'])).toBe('color-teal-a2');
      });

      it('disambiguates with curly braces', () => {
        // Without braces, $1text could be ambiguous
        // With braces, ${1}text is clear
        expect(applyReplacement('${1}Text', ['color'])).toBe('colorText');
        expect(applyReplacement('${1:pascal}Text', ['color'])).toBe('ColorText');
      });
    });
  });
});

describe('toCustomCssName', () => {
  const rules: NameFormatRule[] = [
    {
      id: '1',
      pattern: 'color/*/alpha/*',
      replacement: 'color-$1-a$2',
      enabled: true,
    },
    {
      id: '2',
      pattern: 'spacing/*',
      replacement: 'space-$1',
      enabled: true,
    },
    {
      id: '3',
      pattern: 'typography/*/size/*',
      replacement: 'type-$1-$2',
      enabled: true,
    },
  ];

  it('matches first rule and transforms', () => {
    expect(toCustomCssName('color/teal/alpha/2', rules)).toBe('color-teal-a2');
    expect(toCustomCssName('color/blue/alpha/5', rules)).toBe('color-blue-a5');
  });

  it('matches second rule', () => {
    expect(toCustomCssName('spacing/md', rules)).toBe('space-md');
  });

  it('matches third rule', () => {
    expect(toCustomCssName('typography/heading/size/lg', rules)).toBe('type-heading-lg');
  });

  it('returns null when no match', () => {
    expect(toCustomCssName('other/name', rules)).toBeNull();
  });

  it('skips disabled rules', () => {
    const disabledRules: NameFormatRule[] = [
      { ...rules[0], enabled: false },
      { ...rules[1], enabled: true },
    ];
    expect(toCustomCssName('color/teal/alpha/2', disabledRules)).toBeNull();
    expect(toCustomCssName('spacing/md', disabledRules)).toBe('space-md');
  });

  it('uses first matching rule when multiple could match', () => {
    const overlappingRules: NameFormatRule[] = [
      { id: '1', pattern: 'color/*', replacement: 'first-$1', enabled: true },
      { id: '2', pattern: 'color/teal', replacement: 'second', enabled: true },
    ];
    // First rule matches first, so it wins
    expect(toCustomCssName('color/teal', overlappingRules)).toBe('first-teal');
  });

  it('is case-insensitive', () => {
    expect(toCustomCssName('COLOR/teal/alpha/2', rules)).toBe('color-teal-a2');
    expect(toCustomCssName('Spacing/Md', rules)).toBe('space-Md');
  });
});
