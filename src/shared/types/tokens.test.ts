import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from './tokens';
import type { TokenConfig, ColorFormat, Unit } from './tokens';

describe('Token Types', () => {
  it('should have correct DEFAULT_CONFIG values', () => {
    expect(DEFAULT_CONFIG.unit).toBe('px');
    expect(DEFAULT_CONFIG.remBase).toBe(16);
    expect(DEFAULT_CONFIG.colorFormat).toBe('hex');
  });

  it('should allow all valid units', () => {
    const units: Unit[] = ['none', 'px', 'rem', 'em', '%', 'ms', 's'];
    units.forEach((unit) => {
      const config: TokenConfig = { ...DEFAULT_CONFIG, unit };
      expect(config.unit).toBe(unit);
    });
  });

  it('should allow all valid color formats', () => {
    const formats: ColorFormat[] = ['hex', 'rgb', 'rgba', 'hsl', 'oklch'];
    formats.forEach((colorFormat) => {
      const config: TokenConfig = { ...DEFAULT_CONFIG, colorFormat };
      expect(config.colorFormat).toBe(colorFormat);
    });
  });
});
