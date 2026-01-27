import { describe, it, expect } from 'vitest';
import { formatColor } from './colors';

describe('DTCG Color Transforms', () => {
  describe('formatColor', () => {
    it('should return hex as-is when format is hex', () => {
      const result = formatColor('#ff0000', 'hex');
      expect(result).toBe('#ff0000');
    });

    it('should convert hex to rgb', () => {
      const result = formatColor('#ff0000', 'rgb');
      expect(result).toBe('rgb(255, 0, 0)');
    });

    it('should convert hex with alpha to rgba', () => {
      const result = formatColor('#ff000080', 'rgba');
      expect(result).toContain('rgba');
      expect(result).toContain('255');
      expect(result).toContain('0');
    });

    it('should convert hex to hsl', () => {
      const result = formatColor('#ff0000', 'hsl');
      expect(result).toContain('hsl');
      expect(result).toContain('0'); // Red hue
    });

    it('should convert hex to oklch', () => {
      const result = formatColor('#ff0000', 'oklch');
      expect(result).toContain('oklch');
      expect(result).toContain('%');
    });

    it('should handle 3-character hex', () => {
      const result = formatColor('#f00', 'rgb');
      expect(result).toBe('rgb(255, 0, 0)');
    });

    it('should handle 6-character hex', () => {
      const result = formatColor('#00ff00', 'rgb');
      expect(result).toBe('rgb(0, 255, 0)');
    });

    it('should handle 8-character hex with alpha', () => {
      const result = formatColor('#0000ff80', 'rgba');
      expect(result).toContain('rgba');
      expect(result).toContain('0');
      expect(result).toContain('255');
    });

    it('should handle invalid hex gracefully', () => {
      const result = formatColor('invalid', 'hex');
      expect(result).toBe('invalid'); // Falls back to original
    });

    it('should convert white correctly', () => {
      const rgb = formatColor('#ffffff', 'rgb');
      expect(rgb).toBe('rgb(255, 255, 255)');
    });

    it('should convert black correctly', () => {
      const rgb = formatColor('#000000', 'rgb');
      expect(rgb).toBe('rgb(0, 0, 0)');
    });

    it('should handle semi-transparent colors', () => {
      const rgba = formatColor('#ff000080', 'rgba');
      expect(rgba).toContain('rgba');
      expect(rgba).toMatch(/0\.\d+/); // Should contain alpha value
    });
  });
});
