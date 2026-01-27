import { describe, it, expect } from 'vitest';
import { convertToScss } from './scss';
import type { DTCGDocument, DTCGConversionSettings, DTCGToken } from '../types';

describe('DTCG SCSS Converter', () => {
  const baseOptions: DTCGConversionSettings = {
    colorFormat: 'hex',
    defaultUnit: 'px',
    remBase: 16,
    includeCollectionComments: false,
  };

  const createSimpleDocument = (): DTCGDocument => ({
    collections: {
      Colors: {
        primary: {
          $type: 'color',
          $value: '#ff0000',
        } as DTCGToken,
      },
    },
    $metadata: {
      figmaFile: 'test.figma',
      generatedAt: new Date().toISOString(),
    },
  });

  it('should generate SCSS variables', () => {
    const document = createSimpleDocument();
    const result = convertToScss(document, baseOptions);
    expect(result).toContain('$colors-primary');
    expect(result).toContain('#ff0000');
  });

  it('should include collection comments when enabled', () => {
    const options = { ...baseOptions, includeCollectionComments: true };
    const document = createSimpleDocument();
    const result = convertToScss(document, options);
    expect(result).toContain('// Collection: Colors');
  });

  it('should handle multiple collections', () => {
    const document: DTCGDocument = {
      collections: {
        Colors: {
          primary: {
            $type: 'color',
            $value: '#ff0000',
          } as DTCGToken,
        },
        Spacing: {
          base: {
            $type: 'number',
            $value: 16,
          } as DTCGToken,
        },
      },
      $metadata: {
        figmaFile: 'test.figma',
        generatedAt: new Date().toISOString(),
      },
    };
    const result = convertToScss(document, baseOptions);
    expect(result).toContain('$colors-primary');
    expect(result).toContain('$spacing-base');
  });

  it('should handle nested token groups', () => {
    const document: DTCGDocument = {
      collections: {
        Colors: {
          semantic: {
            primary: {
              $type: 'color',
              $value: '#ff0000',
            } as DTCGToken,
          },
        },
      },
      $metadata: {
        figmaFile: 'test.figma',
        generatedAt: new Date().toISOString(),
      },
    };
    const result = convertToScss(document, baseOptions);
    expect(result).toContain('$colors-semantic-primary');
  });

  it('should convert var() references to SCSS variables', () => {
    const document: DTCGDocument = {
      collections: {
        Colors: {
          primary: {
            $type: 'color',
            $value: '#ff0000',
          } as DTCGToken,
          secondary: {
            $type: 'color',
            $value: {
              $ref: 'Colors.primary',
            },
          } as DTCGToken,
        },
      },
      $metadata: {
        figmaFile: 'test.figma',
        generatedAt: new Date().toISOString(),
      },
    };
    const result = convertToScss(document, baseOptions);
    expect(result).toContain('$colors-primary');
    expect(result).toContain('$colors-secondary');
  });

  it('should handle mode-based values (use first mode)', () => {
    const document: DTCGDocument = {
      collections: {
        Colors: {
          primary: {
            $type: 'color',
            $value: {
              default: '#ff0000',
              dark: '#cc0000',
            },
          } as DTCGToken,
        },
      },
      $metadata: {
        figmaFile: 'test.figma',
        generatedAt: new Date().toISOString(),
      },
    };
    const result = convertToScss(document, baseOptions);
    // Should use first mode value
    expect(result).toContain('#ff0000');
  });

  it('should filter collections when selectedCollections is provided', () => {
    const options = { ...baseOptions, selectedCollections: ['Colors'] };
    const document: DTCGDocument = {
      collections: {
        Colors: {
          primary: {
            $type: 'color',
            $value: '#ff0000',
          } as DTCGToken,
        },
        Spacing: {
          base: {
            $type: 'number',
            $value: 16,
          } as DTCGToken,
        },
      },
      $metadata: {
        figmaFile: 'test.figma',
        generatedAt: new Date().toISOString(),
      },
    };
    const result = convertToScss(document, options);
    expect(result).toContain('$colors-primary');
    expect(result).not.toContain('$spacing-base');
  });

  it('should include header banner when provided', () => {
    const options = { ...baseOptions, headerBanner: '// Custom Header' };
    const document = createSimpleDocument();
    const result = convertToScss(document, options);
    expect(result).toContain('// Custom Header');
  });

  it('should handle number tokens with units', () => {
    const document: DTCGDocument = {
      collections: {
        Spacing: {
          base: {
            $type: 'number',
            $value: 16,
            $extensions: {
              'com.figma.vex': {
                unit: 'rem',
              },
            },
          } as DTCGToken,
        },
      },
      $metadata: {
        figmaFile: 'test.figma',
        generatedAt: new Date().toISOString(),
      },
    };
    const result = convertToScss(document, baseOptions);
    expect(result).toContain('1rem');
  });
});
