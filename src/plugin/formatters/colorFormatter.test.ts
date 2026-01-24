import { describe, it, expect } from 'vitest';
import { rgbToHex, rgbToRgbString, rgbToHsl, rgbToOklch, formatColor } from './colorFormatter';

// Test colors
const RED = { r: 1, g: 0, b: 0, a: 1 };
const GREEN = { r: 0, g: 1, b: 0, a: 1 };
const BLUE = { r: 0, g: 0, b: 1, a: 1 };
const WHITE = { r: 1, g: 1, b: 1, a: 1 };
const BLACK = { r: 0, g: 0, b: 0, a: 1 };
const SEMI_TRANSPARENT = { r: 1, g: 0, b: 0, a: 0.5 };

describe('rgbToHex', () => {
  it('should convert basic colors', () => {
    expect(rgbToHex(RED)).toBe('#ff0000');
    expect(rgbToHex(GREEN)).toBe('#00ff00');
    expect(rgbToHex(BLUE)).toBe('#0000ff');
    expect(rgbToHex(WHITE)).toBe('#ffffff');
    expect(rgbToHex(BLACK)).toBe('#000000');
  });

  it('should include alpha for semi-transparent colors', () => {
    expect(rgbToHex(SEMI_TRANSPARENT)).toBe('#ff000080');
  });

  it('should not include alpha for fully opaque colors', () => {
    expect(rgbToHex(RED)).toBe('#ff0000');
  });
});

describe('rgbToRgbString', () => {
  it('should convert basic colors', () => {
    expect(rgbToRgbString(RED)).toBe('rgb(255, 0, 0)');
    expect(rgbToRgbString(GREEN)).toBe('rgb(0, 255, 0)');
    expect(rgbToRgbString(BLUE)).toBe('rgb(0, 0, 255)');
  });

  it('should use rgba for semi-transparent colors', () => {
    expect(rgbToRgbString(SEMI_TRANSPARENT)).toBe('rgba(255, 0, 0, 0.500)');
  });
});

describe('rgbToHsl', () => {
  it('should convert basic colors', () => {
    expect(rgbToHsl(RED)).toBe('hsl(0, 100%, 50%)');
    expect(rgbToHsl(GREEN)).toBe('hsl(120, 100%, 50%)');
    expect(rgbToHsl(BLUE)).toBe('hsl(240, 100%, 50%)');
  });

  it('should handle white and black', () => {
    expect(rgbToHsl(WHITE)).toBe('hsl(0, 0%, 100%)');
    expect(rgbToHsl(BLACK)).toBe('hsl(0, 0%, 0%)');
  });

  it('should use hsla for semi-transparent colors', () => {
    expect(rgbToHsl(SEMI_TRANSPARENT)).toBe('hsla(0, 100%, 50%, 0.500)');
  });
});

describe('rgbToOklch', () => {
  it('should convert colors to oklch format', () => {
    const result = rgbToOklch(RED);
    expect(result).toMatch(/^oklch\(\d+\.\d+% \d+\.\d+ \d+\.\d+\)$/);
  });

  it('should include alpha for semi-transparent colors', () => {
    const result = rgbToOklch(SEMI_TRANSPARENT);
    expect(result).toMatch(/^oklch\(\d+\.\d+% \d+\.\d+ \d+\.\d+ \/ 0\.500\)$/);
  });
});

describe('formatColor', () => {
  it('should format as hex by default', () => {
    expect(formatColor(RED, 'hex')).toBe('#ff0000');
  });

  it('should format as rgb', () => {
    expect(formatColor(RED, 'rgb')).toBe('rgb(255, 0, 0)');
  });

  it('should format as rgba (same as rgb)', () => {
    expect(formatColor(RED, 'rgba')).toBe('rgb(255, 0, 0)');
  });

  it('should format as hsl', () => {
    expect(formatColor(RED, 'hsl')).toBe('hsl(0, 100%, 50%)');
  });

  it('should format as oklch', () => {
    const result = formatColor(RED, 'oklch');
    expect(result).toMatch(/^oklch\(/);
  });
});
