import { describe, it, expect } from 'vitest';
import { convertToCss } from './css';
import type { DTCGDocument, DTCGConversionSettings, DTCGToken } from '../types';

describe('DTCG CSS Converter', () => {
  const baseOptions: DTCGConversionSettings = {
    colorFormat: 'hex',
    defaultUnit: 'px',
    remBase: 16,
    selector: ':root',
    useModesAsSelectors: false,
    includeCollectionComments: false,
    includeModeComments: false,
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

  it('should generate CSS with default selector', () => {
    const document = createSimpleDocument();
    const result = convertToCss(document, baseOptions);
    expect(result).toContain(':root {');
    expect(result).toContain('--colors-primary');
    expect(result).toContain('#ff0000');
  });

  it('should use custom selector', () => {
    const options = { ...baseOptions, selector: '.theme' };
    const document = createSimpleDocument();
    const result = convertToCss(document, options);
    expect(result).toContain('.theme {');
  });

  it('should include collection comments when enabled', () => {
    const options = { ...baseOptions, includeCollectionComments: true };
    const document = createSimpleDocument();
    const result = convertToCss(document, options);
    expect(result).toContain('/* Colors */');
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
    const result = convertToCss(document, baseOptions);
    expect(result).toContain('--colors-primary');
    expect(result).toContain('--spacing-base');
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
    const result = convertToCss(document, baseOptions);
    expect(result).toContain('--colors-semantic-primary');
  });

  it('should handle mode-based values', () => {
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
    const result = convertToCss(document, baseOptions);
    // Should use default mode value
    expect(result).toContain('#ff0000');
  });

  it('should handle useModesAsSelectors', () => {
    const options = {
      ...baseOptions,
      useModesAsSelectors: true,
      includeModeComments: true,
    };
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
    const result = convertToCss(document, options);
    expect(result).toContain(':root {');
    expect(result).toContain('[data-theme="dark"]');
    expect(result).toContain('/* Mode: default */');
    expect(result).toContain('/* Mode: dark */');
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
    const result = convertToCss(document, options);
    expect(result).toContain('--colors-primary');
    expect(result).not.toContain('--spacing-base');
  });

  it('should include header banner when provided', () => {
    const options = { ...baseOptions, headerBanner: '/* Custom Header */' };
    const document = createSimpleDocument();
    const result = convertToCss(document, options);
    expect(result).toContain('/* Custom Header */');
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
    const result = convertToCss(document, baseOptions);
    expect(result).toContain('1rem');
  });

  it('should handle string tokens', () => {
    const document: DTCGDocument = {
      collections: {
        Typography: {
          fontFamily: {
            $type: 'string',
            $value: 'Inter',
          } as DTCGToken,
        },
      },
      $metadata: {
        figmaFile: 'test.figma',
        generatedAt: new Date().toISOString(),
      },
    };
    const result = convertToCss(document, baseOptions);
    expect(result).toContain('"Inter"');
  });

  it('should handle boolean tokens', () => {
    const document: DTCGDocument = {
      collections: {
        Feature: {
          enabled: {
            $type: 'boolean',
            $value: true,
          } as DTCGToken,
        },
      },
      $metadata: {
        figmaFile: 'test.figma',
        generatedAt: new Date().toISOString(),
      },
    };
    const result = convertToCss(document, baseOptions);
    expect(result).toContain('1');
  });
});
