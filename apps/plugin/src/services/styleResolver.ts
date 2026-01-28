import type {
  StyleCollection,
  ResolvedPaintStyle,
  ResolvedTextStyle,
  ResolvedEffectStyle,
  ResolvedGridStyle,
  SerializedLineHeight,
  SerializedLetterSpacing,
  PaintBoundVariables,
  EffectBoundVariables,
} from '@figma-vex/shared';

/**
 * Fetches and resolves all local styles from Figma
 */
export async function fetchAllStyles(): Promise<StyleCollection> {
  const [paintStyles, textStyles, effectStyles, gridStyles] = await Promise.all([
    figma.getLocalPaintStylesAsync(),
    figma.getLocalTextStylesAsync(),
    figma.getLocalEffectStylesAsync(),
    figma.getLocalGridStylesAsync(),
  ]);

  return {
    paint: paintStyles.map(resolvePaintStyle),
    text: textStyles.map(resolveTextStyle),
    effect: effectStyles.map(resolveEffectStyle),
    grid: gridStyles.map(resolveGridStyle),
  };
}

/**
 * Resolves a Figma PaintStyle to our internal format
 */
function resolvePaintStyle(style: PaintStyle): ResolvedPaintStyle {
  // Extract bound variables from each paint
  const paintBoundVariables: PaintBoundVariables[] = style.paints.map((paint) => {
    const boundVars: PaintBoundVariables = {};

    // Check if paint has bound variables (only SolidPaint supports this)
    if (paint.type === 'SOLID') {
      const solidPaint = paint as SolidPaint;
      if (solidPaint.boundVariables?.color) {
        boundVars.color = { variableId: solidPaint.boundVariables.color.id };
      }
    }

    return boundVars;
  });

  // Only include paintBoundVariables if at least one paint has bindings
  const hasBoundVariables = paintBoundVariables.some((bv) => Object.keys(bv).length > 0);

  return {
    id: style.id,
    name: style.name,
    description: style.description,
    paints: [...style.paints],
    ...(hasBoundVariables && { paintBoundVariables }),
  };
}

/**
 * Resolves a Figma TextStyle to our internal format with computed properties
 */
function resolveTextStyle(style: TextStyle): ResolvedTextStyle {
  // Convert Figma LineHeight to serializable format
  const lineHeight: SerializedLineHeight =
    style.lineHeight.unit === 'AUTO'
      ? { unit: 'AUTO', value: 0 }
      : { unit: style.lineHeight.unit, value: style.lineHeight.value };

  // Convert Figma LetterSpacing to serializable format
  const letterSpacing: SerializedLetterSpacing = {
    unit: style.letterSpacing.unit,
    value: style.letterSpacing.value,
  };

  return {
    id: style.id,
    name: style.name,
    description: style.description,
    fontFamily: style.fontName.family,
    fontStyle: style.fontName.style,
    fontSize: style.fontSize,
    fontWeight: getFontWeight(style.fontName.style),
    lineHeight,
    letterSpacing,
    textDecoration: style.textDecoration,
    textCase: style.textCase,
  };
}

/**
 * Resolves a Figma EffectStyle to our internal format
 */
function resolveEffectStyle(style: EffectStyle): ResolvedEffectStyle {
  // Extract bound variables from each effect
  const effectBoundVariables: EffectBoundVariables[] = style.effects.map((effect) => {
    const boundVars: EffectBoundVariables = {};

    // Check if effect has bound variables (shadows have color, radius, spread, offset)
    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
      const shadowEffect = effect as DropShadowEffect | InnerShadowEffect;
      const bv = shadowEffect.boundVariables;
      if (bv?.color) {
        boundVars.color = { variableId: bv.color.id };
      }
      if (bv?.radius) {
        boundVars.radius = { variableId: bv.radius.id };
      }
      if (bv?.spread) {
        boundVars.spread = { variableId: bv.spread.id };
      }
      if (bv?.offsetX) {
        boundVars.offsetX = { variableId: bv.offsetX.id };
      }
      if (bv?.offsetY) {
        boundVars.offsetY = { variableId: bv.offsetY.id };
      }
    } else if (effect.type === 'LAYER_BLUR' || effect.type === 'BACKGROUND_BLUR') {
      const blurEffect = effect as BlurEffect;
      const bv = blurEffect.boundVariables;
      if (bv?.radius) {
        boundVars.radius = { variableId: bv.radius.id };
      }
    }

    return boundVars;
  });

  // Only include effectBoundVariables if at least one effect has bindings
  const hasBoundVariables = effectBoundVariables.some((bv) => Object.keys(bv).length > 0);

  return {
    id: style.id,
    name: style.name,
    description: style.description,
    effects: [...style.effects],
    ...(hasBoundVariables && { effectBoundVariables }),
  };
}

/**
 * Resolves a Figma GridStyle to our internal format
 */
function resolveGridStyle(style: GridStyle): ResolvedGridStyle {
  return {
    id: style.id,
    name: style.name,
    description: style.description,
    layoutGrids: [...style.layoutGrids],
  };
}

/**
 * Maps font style names to CSS font-weight values
 */
function getFontWeight(fontStyle: string): number {
  const weightMap: Record<string, number> = {
    Thin: 100,
    Hairline: 100,
    'Extra Light': 200,
    'Ultra Light': 200,
    Light: 300,
    Regular: 400,
    Normal: 400,
    Medium: 500,
    'Semi Bold': 600,
    SemiBold: 600,
    'Demi Bold': 600,
    Bold: 700,
    'Extra Bold': 800,
    'Ultra Bold': 800,
    Black: 900,
    Heavy: 900,
  };

  // Try exact match first
  if (weightMap[fontStyle]) {
    return weightMap[fontStyle];
  }

  // Try partial match (e.g., "Bold Italic" should match "Bold")
  for (const [key, value] of Object.entries(weightMap)) {
    if (fontStyle.includes(key)) {
      return value;
    }
  }

  // Default to regular
  return 400;
}
