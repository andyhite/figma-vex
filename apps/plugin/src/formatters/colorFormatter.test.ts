import { describe, it, expect } from 'vitest';
import { rgbToHex, rgbToRgbString, rgbToHsl, rgbToOklch, formatColor } from './colorFormatter';
import type { ColorFormat } from '@figma-vex/shared';

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

describe('edge cases', () => {
  describe('rgbToHex', () => {
    it('should handle color values at boundaries (0 and 1)', () => {
      expect(rgbToHex({ r: 0, g: 0, b: 0, a: 1 })).toBe('#000000');
      expect(rgbToHex({ r: 1, g: 1, b: 1, a: 1 })).toBe('#ffffff');
    });

    it('should handle very small RGB values', () => {
      const result = rgbToHex({ r: 0.001, g: 0.002, b: 0.003, a: 1 });
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should handle values very close to 1', () => {
      const result = rgbToHex({ r: 0.999, g: 0.998, b: 0.997, a: 1 });
      expect(result).toMatch(/^#[0-9a-f]{6}$/);
    });

    it('should handle alpha exactly at 1', () => {
      expect(rgbToHex({ r: 1, g: 0, b: 0, a: 1 })).toBe('#ff0000');
    });

    it('should handle alpha very close to 0', () => {
      const result = rgbToHex({ r: 1, g: 0, b: 0, a: 0.001 });
      expect(result).toMatch(/^#[0-9a-f]{8}$/);
    });

    it('should handle alpha exactly at 0', () => {
      const result = rgbToHex({ r: 1, g: 0, b: 0, a: 0 });
      expect(result).toBe('#ff000000');
    });

    it('should handle grayscale colors', () => {
      const gray = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
      expect(rgbToHex(gray)).toBe('#808080');
    });

    it('should round RGB values correctly', () => {
      // 0.5 * 255 = 127.5, should round to 128 (80 in hex)
      expect(rgbToHex({ r: 0.502, g: 0.502, b: 0.502, a: 1 })).toBe('#808080');
    });
  });

  describe('rgbToRgbString', () => {
    it('should handle boundary RGB values', () => {
      expect(rgbToRgbString({ r: 0, g: 0, b: 0, a: 1 })).toBe('rgb(0, 0, 0)');
      expect(rgbToRgbString({ r: 1, g: 1, b: 1, a: 1 })).toBe('rgb(255, 255, 255)');
    });

    it('should handle alpha at exactly 1', () => {
      expect(rgbToRgbString({ r: 1, g: 0, b: 0, a: 1 })).toBe('rgb(255, 0, 0)');
    });

    it('should handle alpha just below 1', () => {
      const result = rgbToRgbString({ r: 1, g: 0, b: 0, a: 0.999 });
      expect(result).toBe('rgba(255, 0, 0, 0.999)');
    });

    it('should handle very small alpha values', () => {
      const result = rgbToRgbString({ r: 1, g: 0, b: 0, a: 0.001 });
      expect(result).toBe('rgba(255, 0, 0, 0.001)');
    });

    it('should round RGB values correctly', () => {
      // 0.5 * 255 = 127.5, should round to 128
      expect(rgbToRgbString({ r: 0.502, g: 0.502, b: 0.502, a: 1 })).toBe('rgb(128, 128, 128)');
    });
  });

  describe('rgbToHsl', () => {
    it('should handle pure grayscale (r=g=b)', () => {
      const gray = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
      const result = rgbToHsl(gray);
      expect(result).toBe('hsl(0, 0%, 50%)');
    });

    it('should handle white (saturation 0, lightness 100)', () => {
      expect(rgbToHsl(WHITE)).toBe('hsl(0, 0%, 100%)');
    });

    it('should handle black (saturation 0, lightness 0)', () => {
      expect(rgbToHsl(BLACK)).toBe('hsl(0, 0%, 0%)');
    });

    it('should handle colors with max = min (no saturation)', () => {
      const color = { r: 0.3, g: 0.3, b: 0.3, a: 1 };
      const result = rgbToHsl(color);
      expect(result).toMatch(/^hsl\(0, 0%, \d+%\)$/);
    });

    it('should handle alpha at exactly 1', () => {
      expect(rgbToHsl({ r: 1, g: 0, b: 0, a: 1 })).toBe('hsl(0, 100%, 50%)');
    });

    it('should handle alpha just below 1', () => {
      const result = rgbToHsl({ r: 1, g: 0, b: 0, a: 0.999 });
      expect(result).toMatch(/^hsla\(0, 100%, 50%, 0\.999\)$/);
    });

    it('should handle colors where max is red', () => {
      const color = { r: 1, g: 0.5, b: 0, a: 1 };
      const result = rgbToHsl(color);
      expect(result).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
    });

    it('should handle colors where max is green', () => {
      const color = { r: 0, g: 1, b: 0.5, a: 1 };
      const result = rgbToHsl(color);
      expect(result).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
    });

    it('should handle colors where max is blue', () => {
      const color = { r: 0.5, g: 0, b: 1, a: 1 };
      const result = rgbToHsl(color);
      expect(result).toMatch(/^hsl\(\d+, \d+%, \d+%\)$/);
    });
  });

  describe('rgbToOklch', () => {
    it('should handle boundary values', () => {
      const blackResult = rgbToOklch(BLACK);
      const whiteResult = rgbToOklch(WHITE);
      expect(blackResult).toMatch(/^oklch\(/);
      expect(whiteResult).toMatch(/^oklch\(/);
    });

    it('should handle grayscale colors', () => {
      const gray = { r: 0.5, g: 0.5, b: 0.5, a: 1 };
      const result = rgbToOklch(gray);
      expect(result).toMatch(/^oklch\(/);
      // Grayscale should have chroma near 0
      expect(result).toMatch(/oklch\(\d+\.\d+% 0\.\d+ /);
    });

    it('should handle alpha at exactly 1', () => {
      const result = rgbToOklch({ r: 1, g: 0, b: 0, a: 1 });
      expect(result).not.toMatch(/\/ /);
    });

    it('should handle alpha just below 1', () => {
      const result = rgbToOklch({ r: 1, g: 0, b: 0, a: 0.999 });
      expect(result).toMatch(/\/ 0\.999\)$/);
    });

    it('should handle very small RGB values', () => {
      const result = rgbToOklch({ r: 0.001, g: 0.002, b: 0.003, a: 1 });
      expect(result).toMatch(/^oklch\(/);
    });
  });

  describe('formatColor', () => {
    it('should handle all format types with edge case colors', () => {
      const edgeColors = [
        BLACK,
        WHITE,
        { r: 0.5, g: 0.5, b: 0.5, a: 1 }, // Gray
        { r: 1, g: 0, b: 0, a: 0.001 }, // Very transparent
        { r: 0.999, g: 0.998, b: 0.997, a: 1 }, // Near white
      ];

      const formats: ColorFormat[] = ['hex', 'rgb', 'rgba', 'hsl', 'oklch'];

      edgeColors.forEach((color) => {
        formats.forEach((format) => {
          expect(() => formatColor(color, format)).not.toThrow();
          const result = formatColor(color, format);
          expect(typeof result).toBe('string');
          expect(result.length).toBeGreaterThan(0);
        });
      });
    });
  });
});
