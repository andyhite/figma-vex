import { describe, it, expect } from 'vitest';
import { convertToTypeScript } from './typescript';
import type { DTCGDocument, DTCGConversionSettings, DTCGToken } from '../types';

describe('DTCG TypeScript Converter', () => {
  const baseOptions: DTCGConversionSettings = {
    colorFormat: 'hex',
    defaultUnit: 'px',
    remBase: 16,
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

  it('should generate TypeScript type definitions', () => {
    const document = createSimpleDocument();
    const result = convertToTypeScript(document, baseOptions);
    expect(result).toContain('export type CSSVariableName =');
    expect(result).toContain('"--colors-primary"');
  });

  it('should include csstype module declaration', () => {
    const document = createSimpleDocument();
    const result = convertToTypeScript(document, baseOptions);
    expect(result).toContain("declare module 'csstype'");
    expect(result).toContain('interface Properties');
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
    const result = convertToTypeScript(document, baseOptions);
    expect(result).toContain('"--colors-primary"');
    expect(result).toContain('"--spacing-base"');
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
    const result = convertToTypeScript(document, baseOptions);
    expect(result).toContain('"--colors-semantic-primary"');
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
    const result = convertToTypeScript(document, options);
    expect(result).toContain('"--colors-primary"');
    expect(result).not.toContain('"--spacing-base"');
  });

  it('should return message when no variables found', () => {
    const document: DTCGDocument = {
      collections: {},
      $metadata: {
        figmaFile: 'test.figma',
        generatedAt: new Date().toISOString(),
      },
    };
    const result = convertToTypeScript(document, baseOptions);
    expect(result).toContain('// No variables found');
  });

  it('should include styles when styleOutputMode is variables', () => {
    const options = {
      ...baseOptions,
      includeStyles: true,
      styleOutputMode: 'variables',
    };
    const document: DTCGDocument = {
      collections: {
        Colors: {
          primary: {
            $type: 'color',
            $value: '#ff0000',
          } as DTCGToken,
        },
      },
      $styles: {
        paint: {
          'bg-primary': {
            $type: 'color',
            $value: '#ff0000',
          } as DTCGToken,
        },
      },
      $metadata: {
        figmaFile: 'test.figma',
        generatedAt: new Date().toISOString(),
      },
    };
    const result = convertToTypeScript(document, options);
    expect(result).toContain('"--paint-bg-primary"');
  });

  it('should include style class names when styleOutputMode is classes', () => {
    const options = {
      ...baseOptions,
      includeStyles: true,
      styleOutputMode: 'classes',
    };
    const document: DTCGDocument = {
      collections: {
        Colors: {
          primary: {
            $type: 'color',
            $value: '#ff0000',
          } as DTCGToken,
        },
      },
      $styles: {
        paint: {
          'bg-primary': {
            $type: 'color',
            $value: '#ff0000',
          } as DTCGToken,
        },
      },
      $metadata: {
        figmaFile: 'test.figma',
        generatedAt: new Date().toISOString(),
      },
    };
    const result = convertToTypeScript(document, options);
    expect(result).toContain('export type StyleClassName');
  });
});
