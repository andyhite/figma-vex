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
