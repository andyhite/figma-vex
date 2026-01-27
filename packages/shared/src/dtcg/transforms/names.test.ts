import { describe, it, expect } from 'vitest';
import { formatCssName, formatScssName } from './names';
import type { DTCGConversionSettings } from '../types';

describe('DTCG Name Transforms', () => {
  const baseOptions: DTCGConversionSettings = {
    colorFormat: 'hex',
    defaultUnit: 'px',
    remBase: 16,
  };

  describe('formatCssName', () => {
    it('should format simple path without prefix', () => {
      const name = formatCssName(['Collection', 'Token'], baseOptions);
      expect(name).toBe('collection-token');
    });

    it('should format path with prefix', () => {
      const options = { ...baseOptions, prefix: 'ds' };
      const name = formatCssName(['Collection', 'Token'], options);
      expect(name).toBe('ds-collection-token');
    });

    it('should handle nested paths', () => {
      const name = formatCssName(['Collection', 'Group', 'SubGroup', 'Token'], baseOptions);
      // SubGroup gets converted to sub-group (camelCase split)
      expect(name).toBe('collection-group-sub-group-token');
    });

    it('should apply name format rules when provided', () => {
      const options: DTCGConversionSettings = {
        ...baseOptions,
        nameFormatRules: [
          {
            id: 'test-rule',
            pattern: 'Collection/Token',
            replacement: 'custom-name',
            enabled: true,
          },
        ],
      };
      const name = formatCssName(['Collection', 'Token'], options);
      expect(name).toBe('custom-name');
    });

    it('should use default transformation when no rule matches', () => {
      const options: DTCGConversionSettings = {
        ...baseOptions,
        nameFormatRules: [
          {
            id: 'test-rule',
            pattern: 'Other/Pattern',
            replacement: 'custom-name',
            enabled: true,
          },
        ],
      };
      const name = formatCssName(['Collection', 'Token'], options);
      expect(name).toBe('collection-token');
    });

    it('should ignore disabled rules', () => {
      const options: DTCGConversionSettings = {
        ...baseOptions,
        nameFormatRules: [
          {
            id: 'test-rule',
            pattern: 'Collection/Token',
            replacement: 'custom-name',
            enabled: false,
          },
        ],
      };
      const name = formatCssName(['Collection', 'Token'], options);
      expect(name).toBe('collection-token');
    });

    it('should handle camelCase conversion', () => {
      const name = formatCssName(['Color', 'PrimaryBlue'], baseOptions);
      expect(name).toBe('color-primary-blue');
    });

    it('should handle empty path', () => {
      const name = formatCssName([], baseOptions);
      expect(name).toBe('');
    });
  });

  describe('formatScssName', () => {
    it('should format name with $ prefix', () => {
      const name = formatScssName(['Collection', 'Token'], baseOptions);
      expect(name).toBe('$collection-token');
    });

    it('should include prefix in SCSS name', () => {
      const options = { ...baseOptions, prefix: 'ds' };
      const name = formatScssName(['Collection', 'Token'], options);
      expect(name).toBe('$ds-collection-token');
    });

    it('should apply same rules as CSS name formatting', () => {
      const options: DTCGConversionSettings = {
        ...baseOptions,
        nameFormatRules: [
          {
            id: 'test-rule',
            pattern: 'Collection/Token',
            replacement: 'custom-name',
            enabled: true,
          },
        ],
      };
      const name = formatScssName(['Collection', 'Token'], options);
      expect(name).toBe('$custom-name');
    });
  });
});
