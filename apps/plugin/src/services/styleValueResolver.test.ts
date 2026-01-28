import { describe, it, expect } from 'vitest';
import type { ResolvedPaintStyle, ResolvedEffectStyle, TokenConfig } from '@figma-vex/shared';
import { DEFAULT_CONFIG } from '@figma-vex/shared';
import { resolvePaintValue, resolveEffectValue, VariableCssNameMap } from './styleValueResolver';

describe('styleValueResolver', () => {
  const defaultConfig: TokenConfig = {
    ...DEFAULT_CONFIG,
    colorFormat: 'hex',
  };

  describe('resolvePaintValue', () => {
    it('should resolve solid paint to color value when no bound variable', () => {
      const style: ResolvedPaintStyle = {
        id: 'style-1',
        name: 'Primary',
        description: '',
        paints: [
          {
            type: 'SOLID',
            color: { r: 1, g: 0, b: 0 },
            opacity: 1,
          },
        ],
      };

      const result = resolvePaintValue(style, defaultConfig);
      expect(result).toBe('#ff0000');
    });

    it('should resolve to var() reference when paint has bound color variable', () => {
      const style: ResolvedPaintStyle = {
        id: 'style-1',
        name: 'Primary',
        description: '',
        paints: [
          {
            type: 'SOLID',
            color: { r: 1, g: 0, b: 0 },
            opacity: 1,
          },
        ],
        paintBoundVariables: [
          {
            color: { variableId: 'var-123' },
          },
        ],
      };

      const variableCssNames: VariableCssNameMap = new Map([['var-123', 'color-primary']]);

      const result = resolvePaintValue(style, defaultConfig, variableCssNames);
      expect(result).toBe('var(--color-primary)');
    });

    it('should fall back to raw value when variable is not in lookup map', () => {
      const style: ResolvedPaintStyle = {
        id: 'style-1',
        name: 'Primary',
        description: '',
        paints: [
          {
            type: 'SOLID',
            color: { r: 1, g: 0, b: 0 },
            opacity: 1,
          },
        ],
        paintBoundVariables: [
          {
            color: { variableId: 'var-unknown' },
          },
        ],
      };

      const variableCssNames: VariableCssNameMap = new Map();

      const result = resolvePaintValue(style, defaultConfig, variableCssNames);
      expect(result).toBe('#ff0000');
    });

    it('should use raw value when no variableCssNames map provided', () => {
      const style: ResolvedPaintStyle = {
        id: 'style-1',
        name: 'Primary',
        description: '',
        paints: [
          {
            type: 'SOLID',
            color: { r: 1, g: 0, b: 0 },
            opacity: 1,
          },
        ],
        paintBoundVariables: [
          {
            color: { variableId: 'var-123' },
          },
        ],
      };

      const result = resolvePaintValue(style, defaultConfig);
      expect(result).toBe('#ff0000');
    });

    it('should return transparent for empty paints array', () => {
      const style: ResolvedPaintStyle = {
        id: 'style-1',
        name: 'Empty',
        description: '',
        paints: [],
      };

      const result = resolvePaintValue(style, defaultConfig);
      expect(result).toBe('transparent');
    });
  });

  describe('resolveEffectValue', () => {
    const createDropShadowEffect = (
      color: { r: number; g: number; b: number; a: number } = { r: 0, g: 0, b: 0, a: 0.5 },
      offset: { x: number; y: number } = { x: 0, y: 4 },
      radius = 8,
      spread = 0
    ) => ({
      type: 'DROP_SHADOW' as const,
      visible: true,
      color,
      offset,
      radius,
      spread,
      blendMode: 'NORMAL' as const,
    });

    it('should resolve shadow effect to CSS value when no bound variables', () => {
      const style: ResolvedEffectStyle = {
        id: 'style-1',
        name: 'Shadow',
        description: '',
        effects: [createDropShadowEffect()],
      };

      const result = resolveEffectValue(style, defaultConfig);
      expect(result).toBe('0px 4px 8px 0px #00000080');
    });

    it('should resolve color to var() reference when bound to variable', () => {
      const style: ResolvedEffectStyle = {
        id: 'style-1',
        name: 'Shadow',
        description: '',
        effects: [createDropShadowEffect()],
        effectBoundVariables: [
          {
            color: { variableId: 'var-shadow-color' },
          },
        ],
      };

      const variableCssNames: VariableCssNameMap = new Map([['var-shadow-color', 'shadow-color']]);

      const result = resolveEffectValue(style, defaultConfig, variableCssNames);
      expect(result).toBe('0px 4px 8px 0px var(--shadow-color)');
    });

    it('should resolve radius to var() reference when bound to variable', () => {
      const style: ResolvedEffectStyle = {
        id: 'style-1',
        name: 'Shadow',
        description: '',
        effects: [createDropShadowEffect()],
        effectBoundVariables: [
          {
            radius: { variableId: 'var-blur-radius' },
          },
        ],
      };

      const variableCssNames: VariableCssNameMap = new Map([['var-blur-radius', 'spacing-blur']]);

      const result = resolveEffectValue(style, defaultConfig, variableCssNames);
      expect(result).toBe('0px 4px var(--spacing-blur) 0px #00000080');
    });

    it('should resolve spread to var() reference when bound to variable', () => {
      const style: ResolvedEffectStyle = {
        id: 'style-1',
        name: 'Shadow',
        description: '',
        effects: [createDropShadowEffect({ r: 0, g: 0, b: 0, a: 0.5 }, { x: 0, y: 4 }, 8, 2)],
        effectBoundVariables: [
          {
            spread: { variableId: 'var-spread' },
          },
        ],
      };

      const variableCssNames: VariableCssNameMap = new Map([['var-spread', 'spacing-spread']]);

      const result = resolveEffectValue(style, defaultConfig, variableCssNames);
      expect(result).toBe('0px 4px 8px var(--spacing-spread) #00000080');
    });

    it('should resolve offsetX and offsetY to var() references when bound', () => {
      const style: ResolvedEffectStyle = {
        id: 'style-1',
        name: 'Shadow',
        description: '',
        effects: [createDropShadowEffect()],
        effectBoundVariables: [
          {
            offsetX: { variableId: 'var-offset-x' },
            offsetY: { variableId: 'var-offset-y' },
          },
        ],
      };

      const variableCssNames: VariableCssNameMap = new Map([
        ['var-offset-x', 'spacing-x'],
        ['var-offset-y', 'spacing-y'],
      ]);

      const result = resolveEffectValue(style, defaultConfig, variableCssNames);
      expect(result).toBe('var(--spacing-x) var(--spacing-y) 8px 0px #00000080');
    });

    it('should resolve multiple bound properties', () => {
      const style: ResolvedEffectStyle = {
        id: 'style-1',
        name: 'Shadow',
        description: '',
        effects: [createDropShadowEffect()],
        effectBoundVariables: [
          {
            color: { variableId: 'var-color' },
            radius: { variableId: 'var-radius' },
            offsetY: { variableId: 'var-y' },
          },
        ],
      };

      const variableCssNames: VariableCssNameMap = new Map([
        ['var-color', 'shadow-color'],
        ['var-radius', 'shadow-blur'],
        ['var-y', 'shadow-offset'],
      ]);

      const result = resolveEffectValue(style, defaultConfig, variableCssNames);
      expect(result).toBe('0px var(--shadow-offset) var(--shadow-blur) 0px var(--shadow-color)');
    });

    it('should handle inset shadow correctly with bound variables', () => {
      const style: ResolvedEffectStyle = {
        id: 'style-1',
        name: 'Inset Shadow',
        description: '',
        effects: [
          {
            type: 'INNER_SHADOW' as const,
            visible: true,
            color: { r: 0, g: 0, b: 0, a: 0.5 },
            offset: { x: 0, y: 2 },
            radius: 4,
            spread: 0,
            blendMode: 'NORMAL' as const,
          },
        ],
        effectBoundVariables: [
          {
            color: { variableId: 'var-inset-color' },
          },
        ],
      };

      const variableCssNames: VariableCssNameMap = new Map([
        ['var-inset-color', 'inset-shadow-color'],
      ]);

      const result = resolveEffectValue(style, defaultConfig, variableCssNames);
      expect(result).toBe('inset 0px 2px 4px 0px var(--inset-shadow-color)');
    });

    it('should handle blur effect with bound radius', () => {
      const style: ResolvedEffectStyle = {
        id: 'style-1',
        name: 'Blur',
        description: '',
        effects: [
          {
            type: 'LAYER_BLUR' as const,
            visible: true,
            radius: 10,
          },
        ],
        effectBoundVariables: [
          {
            radius: { variableId: 'var-blur' },
          },
        ],
      };

      const variableCssNames: VariableCssNameMap = new Map([['var-blur', 'blur-radius']]);

      const result = resolveEffectValue(style, defaultConfig, variableCssNames);
      expect(result).toBe('blur(var(--blur-radius))');
    });

    it('should return none for empty visible effects', () => {
      const style: ResolvedEffectStyle = {
        id: 'style-1',
        name: 'No Effects',
        description: '',
        effects: [],
      };

      const result = resolveEffectValue(style, defaultConfig);
      expect(result).toBe('none');
    });
  });
});
