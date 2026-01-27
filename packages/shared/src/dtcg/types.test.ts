import { describe, it, expect } from 'vitest';
import type {
  DTCGDocument,
  DTCGToken,
  DTCGTokenType,
  DTCGValue,
  DTCGReference,
  DTCGConversionSettings,
  GitHubDispatchPayload,
} from './types';

describe('DTCG Types', () => {
  describe('DTCGTokenType', () => {
    it('should allow all valid token types', () => {
      const types: DTCGTokenType[] = [
        'color',
        'number',
        'string',
        'boolean',
        'typography',
        'shadow',
        'grid',
      ];
      types.forEach((type) => {
        const token: DTCGToken = {
          $type: type,
          $value: type === 'color' ? '#ff0000' : type === 'number' ? 16 : 'test',
        };
        expect(token.$type).toBe(type);
      });
    });
  });

  describe('DTCGToken', () => {
    it('should allow token with single value', () => {
      const token: DTCGToken = {
        $type: 'color',
        $value: '#ff0000',
      };
      expect(token.$type).toBe('color');
      expect(token.$value).toBe('#ff0000');
    });

    it('should allow token with mode-based values', () => {
      const token: DTCGToken = {
        $type: 'color',
        $value: {
          default: '#ff0000',
          dark: '#cc0000',
        },
      };
      expect(typeof token.$value).toBe('object');
      expect((token.$value as Record<string, DTCGValue>).default).toBe('#ff0000');
    });

    it('should allow token with description', () => {
      const token: DTCGToken = {
        $type: 'color',
        $value: '#ff0000',
        $description: 'Primary color',
      };
      expect(token.$description).toBe('Primary color');
    });

    it('should allow token with extensions', () => {
      const token: DTCGToken = {
        $type: 'number',
        $value: 16,
        $extensions: {
          'com.figma.vex': {
            unit: 'rem',
            expression: "'Spacing/base' * 2",
          },
        },
      };
      expect(token.$extensions?.['com.figma.vex']?.unit).toBe('rem');
      expect(token.$extensions?.['com.figma.vex']?.expression).toBe("'Spacing/base' * 2");
    });
  });

  describe('DTCGReference', () => {
    it('should allow reference format', () => {
      const ref: DTCGReference = {
        $ref: 'Collection.path.to.token',
      };
      expect(ref.$ref).toBe('Collection.path.to.token');
    });
  });

  describe('DTCGDocument', () => {
    it('should allow document with collections', () => {
      const document: DTCGDocument = {
        collections: {
          Colors: {
            primary: {
              $type: 'color',
              $value: '#ff0000',
            },
          },
        },
        $metadata: {
          figmaFile: 'test.figma',
          generatedAt: new Date().toISOString(),
        },
      };
      expect(document.collections.Colors).toBeDefined();
    });

    it('should allow document with styles', () => {
      const document: DTCGDocument = {
        collections: {},
        $styles: {
          paint: {
            'bg-primary': {
              $type: 'color',
              $value: '#ff0000',
            },
          },
        },
        $metadata: {
          figmaFile: 'test.figma',
          generatedAt: new Date().toISOString(),
        },
      };
      expect(document.$styles?.paint).toBeDefined();
    });
  });

  describe('DTCGConversionSettings', () => {
    it('should allow minimal settings', () => {
      const settings: DTCGConversionSettings = {
        colorFormat: 'hex',
        defaultUnit: 'px',
        remBase: 16,
      };
      expect(settings.colorFormat).toBe('hex');
      expect(settings.defaultUnit).toBe('px');
      expect(settings.remBase).toBe(16);
    });

    it('should allow all optional settings', () => {
      const settings: DTCGConversionSettings = {
        prefix: 'ds',
        nameFormatRules: [],
        colorFormat: 'rgb',
        defaultUnit: 'rem',
        remBase: 16,
        selector: ':root',
        useModesAsSelectors: true,
        includeCollectionComments: true,
        includeModeComments: true,
        exportAsCalcExpressions: true,
        includeStyles: true,
        styleOutputMode: 'variables',
        styleTypes: ['paint', 'text'],
        selectedCollections: ['Colors'],
        headerBanner: 'Custom header',
      };
      expect(settings.prefix).toBe('ds');
      expect(settings.useModesAsSelectors).toBe(true);
    });
  });

  describe('GitHubDispatchPayload', () => {
    it('should allow payload with document and settings', () => {
      const payload: GitHubDispatchPayload = {
        document: {
          collections: {},
          $metadata: {
            figmaFile: 'test.figma',
            generatedAt: new Date().toISOString(),
          },
        },
        settings: {
          colorFormat: 'hex',
          defaultUnit: 'px',
          remBase: 16,
        },
        export_types: ['css', 'json'],
      };
      expect(payload.document).toBeDefined();
      expect(payload.settings).toBeDefined();
      expect(payload.export_types).toContain('css');
    });
  });
});
