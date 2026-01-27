import { describe, it, expect } from 'vitest';
import { serializeToDTCG } from './dtcgSerializer';
import type { StyleCollection, DTCGToken } from '@figma-vex/shared';

const mockCollections = [
  {
    id: 'col-1',
    name: 'Colors',
    defaultModeId: 'mode-1',
    modes: [{ modeId: 'mode-1', name: 'Default' }],
  },
  {
    id: 'col-2',
    name: 'Spacing',
    defaultModeId: 'mode-2',
    modes: [
      { modeId: 'mode-2', name: 'Default' },
      { modeId: 'mode-3', name: 'Compact' },
    ],
  },
] as unknown as VariableCollection[];

const mockVariables = [
  {
    id: 'var-1',
    name: 'primary',
    variableCollectionId: 'col-1',
    resolvedType: 'COLOR' as const,
    description: '',
    valuesByMode: {
      'mode-1': { r: 0, g: 0.5, b: 1, a: 1 },
    },
  },
  {
    id: 'var-2',
    name: 'brand/secondary',
    variableCollectionId: 'col-1',
    resolvedType: 'COLOR' as const,
    description: 'Secondary brand color',
    valuesByMode: {
      'mode-1': { r: 1, g: 0, b: 0, a: 1 },
    },
  },
  {
    id: 'var-3',
    name: 'base',
    variableCollectionId: 'col-2',
    resolvedType: 'FLOAT' as const,
    description: '@unit:rem',
    valuesByMode: {
      'mode-2': 16,
      'mode-3': 12,
    },
  },
  {
    id: 'var-4',
    name: 'enabled',
    variableCollectionId: 'col-1',
    resolvedType: 'BOOLEAN' as const,
    description: '',
    valuesByMode: {
      'mode-1': true,
    },
  },
  {
    id: 'var-5',
    name: 'label',
    variableCollectionId: 'col-1',
    resolvedType: 'STRING' as const,
    description: '',
    valuesByMode: {
      'mode-1': 'Hello',
    },
  },
  {
    id: 'var-6',
    name: 'alias',
    variableCollectionId: 'col-1',
    resolvedType: 'COLOR' as const,
    description: '',
    valuesByMode: {
      'mode-1': { type: 'VARIABLE_ALIAS', id: 'var-1' },
    },
  },
] as unknown as Variable[];

describe('serializeToDTCG', () => {
  it('should create a valid DTCG document structure', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {});

    expect(result.$schema).toBe('https://design-tokens.github.io/format/');
    expect(result.$metadata?.figmaFile).toBe('test.figma');
    expect(result.$metadata?.generatedAt).toBeDefined();
    expect(result.collections).toBeDefined();
  });

  it('should serialize color variables correctly', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {});

    const primaryToken = result.collections['Colors']?.['primary'];
    expect(primaryToken).toBeDefined();
    expect(primaryToken?.$type).toBe('color');
    expect(primaryToken?.$value).toBe('#0080ff');
  });

  it('should serialize nested variable paths correctly', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {});

    const brandGroup = result.collections['Colors']?.['brand'] as Record<string, unknown>;
    expect(brandGroup).toBeDefined();
    expect(brandGroup?.['secondary']).toBeDefined();
    expect((brandGroup?.['secondary'] as { $type: string })?.$type).toBe('color');
  });

  it('should preserve descriptions', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {});

    const brandGroup = result.collections['Colors']?.['brand'] as Record<string, unknown>;
    const secondaryToken = brandGroup?.['secondary'] as { $description?: string };
    expect(secondaryToken?.$description).toBe('Secondary brand color');
  });

  it('should map FLOAT to number type', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {});

    const baseToken = result.collections['Spacing']?.['base'];
    expect(baseToken?.$type).toBe('number');
  });

  it('should handle multi-mode values', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {});

    const baseToken = result.collections['Spacing']?.['base'];
    expect(baseToken?.$value).toEqual({
      Default: 16,
      Compact: 12,
    });
  });

  it('should serialize boolean variables', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {});

    const enabledToken = result.collections['Colors']?.['enabled'];
    expect(enabledToken?.$type).toBe('boolean');
    expect(enabledToken?.$value).toBe(true);
  });

  it('should serialize string variables', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {});

    const labelToken = result.collections['Colors']?.['label'];
    expect(labelToken?.$type).toBe('string');
    expect(labelToken?.$value).toBe('Hello');
  });

  it('should serialize variable aliases as references', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {});

    const aliasToken = result.collections['Colors']?.['alias'];
    expect(aliasToken?.$type).toBe('color');
    expect(aliasToken?.$value).toEqual({ $ref: 'Colors.primary' });
  });

  it('should extract unit from description into extensions', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {});

    const baseToken = result.collections['Spacing']?.['base'] as DTCGToken;
    expect(baseToken?.$extensions?.['com.figma.vex']?.unit).toBe('rem');
  });

  it('should filter collections by selectedCollections', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {
      selectedCollections: ['col-1'],
    });

    expect(result.collections['Colors']).toBeDefined();
    expect(result.collections['Spacing']).toBeUndefined();
  });

  it('should include all collections when no filter specified', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {});

    expect(Object.keys(result.collections)).toHaveLength(2);
    expect(result.collections['Colors']).toBeDefined();
    expect(result.collections['Spacing']).toBeDefined();
  });
});

describe('serializeToDTCG with styles', () => {
  const mockStyles: StyleCollection = {
    paint: [
      {
        id: 'paint-1',
        name: 'brand/primary',
        description: '',
        paints: [{ type: 'SOLID', color: { r: 0, g: 0.5, b: 1 }, opacity: 1 }],
      },
    ],
    text: [
      {
        id: 'text-1',
        name: 'heading/h1',
        description: '',
        fontFamily: 'Inter',
        fontStyle: 'Bold',
        fontSize: 32,
        fontWeight: 700,
        lineHeight: { unit: 'AUTO', value: 0 },
        letterSpacing: { unit: 'PIXELS', value: 0 },
        textDecoration: 'NONE',
        textCase: 'ORIGINAL',
      },
    ],
    effect: [
      {
        id: 'effect-1',
        name: 'shadow/small',
        description: '',
        effects: [
          {
            type: 'DROP_SHADOW',
            visible: true,
            color: { r: 0, g: 0, b: 0, a: 0.1 },
            offset: { x: 0, y: 2 },
            radius: 4,
            spread: 0,
          },
        ],
      },
    ],
    grid: [
      {
        id: 'grid-1',
        name: 'layout/12col',
        description: '',
        layoutGrids: [
          {
            pattern: 'COLUMNS',
            visible: true,
            count: 12,
            gutterSize: 16,
            offset: 0,
          },
        ],
      },
    ],
  };

  it('should include styles when includeStyles is true', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {
      includeStyles: true,
    }, mockStyles);

    expect(result.$styles).toBeDefined();
    expect(result.$styles?.paint).toBeDefined();
    expect(result.$styles?.text).toBeDefined();
    expect(result.$styles?.effect).toBeDefined();
    expect(result.$styles?.grid).toBeDefined();
  });

  it('should not include styles when includeStyles is false', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {
      includeStyles: false,
    }, mockStyles);

    expect(result.$styles).toBeUndefined();
  });

  it('should serialize paint styles correctly', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {
      includeStyles: true,
      styleTypes: ['paint'],
    }, mockStyles);

    const brandGroup = result.$styles?.paint?.['brand'] as Record<string, unknown>;
    const primaryStyle = brandGroup?.['primary'] as { $type: string; $value: string };
    expect(primaryStyle?.$type).toBe('color');
    expect(primaryStyle?.$value).toBeDefined();
  });

  it('should serialize text styles as typography tokens', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {
      includeStyles: true,
      styleTypes: ['text'],
    }, mockStyles);

    const headingGroup = result.$styles?.text?.['heading'] as Record<string, unknown>;
    const h1Style = headingGroup?.['h1'] as { $type: string; $value: { fontFamily: string } };
    expect(h1Style?.$type).toBe('typography');
    expect(h1Style?.$value?.fontFamily).toBe('Inter');
  });

  it('should serialize effect styles as shadow tokens', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {
      includeStyles: true,
      styleTypes: ['effect'],
    }, mockStyles);

    const shadowGroup = result.$styles?.effect?.['shadow'] as Record<string, unknown>;
    const smallShadow = shadowGroup?.['small'] as { $type: string; $value: { blur: number } };
    expect(smallShadow?.$type).toBe('shadow');
    expect(smallShadow?.$value?.blur).toBe(4);
  });

  it('should serialize grid styles correctly', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {
      includeStyles: true,
      styleTypes: ['grid'],
    }, mockStyles);

    const layoutGroup = result.$styles?.grid?.['layout'] as Record<string, unknown>;
    const gridStyle = layoutGroup?.['12col'] as { $type: string; $value: { pattern: string; count: number } };
    expect(gridStyle?.$type).toBe('grid');
    expect(gridStyle?.$value?.pattern).toBe('columns');
    expect(gridStyle?.$value?.count).toBe(12);
  });

  it('should filter style types', async () => {
    const result = await serializeToDTCG(mockVariables, mockCollections, 'test.figma', {
      includeStyles: true,
      styleTypes: ['paint', 'text'],
    }, mockStyles);

    expect(result.$styles?.paint).toBeDefined();
    expect(result.$styles?.text).toBeDefined();
    expect(result.$styles?.effect).toBeUndefined();
    expect(result.$styles?.grid).toBeUndefined();
  });
});
