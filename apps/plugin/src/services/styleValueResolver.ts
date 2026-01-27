import type {
  TokenConfig,
  ResolvedPaintStyle,
  ResolvedTextStyle,
  ResolvedEffectStyle,
  ResolvedGridStyle,
} from '@figma-vex/shared';
import { formatColor } from '@plugin/formatters/colorFormatter';
import { formatNumber, cleanNumber } from '@plugin/formatters/numberFormatter';

/**
 * Resolves a paint style to its CSS value
 */
export function resolvePaintValue(style: ResolvedPaintStyle, config: TokenConfig): string {
  if (style.paints.length === 0) {
    return 'transparent';
  }

  // Cast to Paint type since we know it's a Figma Paint in the plugin context
  const paint = style.paints[0] as Paint;

  if (paint.type === 'SOLID') {
    const color = paint.color;
    const alpha = paint.opacity ?? 1;
    return formatColor({ r: color.r, g: color.g, b: color.b, a: alpha }, config.colorFormat);
  }

  if (paint.type === 'GRADIENT_LINEAR') {
    return resolveLinearGradient(paint as GradientPaint, config);
  }

  if (paint.type === 'GRADIENT_RADIAL') {
    return resolveRadialGradient(paint as GradientPaint, config);
  }

  if (paint.type === 'GRADIENT_ANGULAR') {
    return resolveConicGradient(paint as GradientPaint, config);
  }

  if (paint.type === 'GRADIENT_DIAMOND') {
    // Diamond gradient doesn't have a CSS equivalent, approximate with radial
    return resolveRadialGradient(paint as GradientPaint, config);
  }

  return '/* unsupported paint type */';
}

/**
 * Resolves a linear gradient to CSS
 */
function resolveLinearGradient(paint: GradientPaint, config: TokenConfig): string {
  const stops = formatGradientStops(paint.gradientStops, config);
  const angle = calculateGradientAngle(paint.gradientTransform);
  return `linear-gradient(${angle}deg, ${stops})`;
}

/**
 * Resolves a radial gradient to CSS
 */
function resolveRadialGradient(paint: GradientPaint, config: TokenConfig): string {
  const stops = formatGradientStops(paint.gradientStops, config);
  return `radial-gradient(${stops})`;
}

/**
 * Resolves an angular/conic gradient to CSS
 */
function resolveConicGradient(paint: GradientPaint, config: TokenConfig): string {
  const stops = formatGradientStops(paint.gradientStops, config);
  return `conic-gradient(${stops})`;
}

/**
 * Formats gradient stops to CSS
 */
function formatGradientStops(stops: readonly ColorStop[], config: TokenConfig): string {
  return stops
    .map((stop) => {
      const color = formatColor(
        {
          r: stop.color.r,
          g: stop.color.g,
          b: stop.color.b,
          a: stop.color.a,
        },
        config.colorFormat
      );
      return `${color} ${(stop.position * 100).toFixed(1)}%`;
    })
    .join(', ');
}

/**
 * Calculates gradient angle from Figma transform matrix
 */
function calculateGradientAngle(transform: Transform): number {
  // Transform is a 2x3 matrix [[a, b, c], [d, e, f]]
  const [[a, b]] = transform;
  // Angle = atan2(b, a) converted to degrees, adjusted for CSS convention
  return Math.round(Math.atan2(b, a) * (180 / Math.PI) + 90);
}

/**
 * Resolves a text style to CSS properties
 */
export function resolveTextProperties(
  style: ResolvedTextStyle,
  config: TokenConfig
): Record<string, string> {
  const props: Record<string, string> = {
    'font-family': `"${style.fontFamily}", sans-serif`,
    'font-size': formatNumber(style.fontSize, config),
    'font-weight': String(style.fontWeight),
  };

  // Font style (italic, etc.)
  if (style.fontStyle.toLowerCase().includes('italic')) {
    props['font-style'] = 'italic';
  }

  // Line height
  if (style.lineHeight.unit !== 'AUTO') {
    if (style.lineHeight.unit === 'PIXELS') {
      props['line-height'] = formatNumber(style.lineHeight.value, config);
    } else if (style.lineHeight.unit === 'PERCENT') {
      props['line-height'] = `${style.lineHeight.value}%`;
    }
  }

  // Letter spacing
  if (style.letterSpacing.unit === 'PIXELS') {
    props['letter-spacing'] = formatNumber(style.letterSpacing.value, config);
  } else if (style.letterSpacing.unit === 'PERCENT') {
    // Convert percentage to em (CSS letter-spacing is relative to font-size)
    props['letter-spacing'] = `${cleanNumber(style.letterSpacing.value / 100)}em`;
  }

  // Text decoration
  if (style.textDecoration !== 'NONE') {
    props['text-decoration'] = style.textDecoration.toLowerCase().replace('_', '-');
  }

  // Text transform (from textCase)
  const textCaseMap: Record<string, string> = {
    UPPER: 'uppercase',
    LOWER: 'lowercase',
    TITLE: 'capitalize',
  };
  if (textCaseMap[style.textCase]) {
    props['text-transform'] = textCaseMap[style.textCase];
  }

  return props;
}

/**
 * Resolves an effect style to CSS value (box-shadow or filter)
 */
export function resolveEffectValue(style: ResolvedEffectStyle, config: TokenConfig): string {
  const shadows: string[] = [];
  const filters: string[] = [];

  // Cast to Effect[] since we know it's Figma Effects in the plugin context
  const effects = style.effects as Effect[];

  for (const effect of effects) {
    if (!effect.visible) continue;

    if (effect.type === 'DROP_SHADOW' || effect.type === 'INNER_SHADOW') {
      const shadow = resolveShadow(effect as DropShadowEffect | InnerShadowEffect, config);
      shadows.push(shadow);
    } else if (effect.type === 'LAYER_BLUR') {
      filters.push(`blur(${(effect as BlurEffect).radius}px)`);
    } else if (effect.type === 'BACKGROUND_BLUR') {
      // Background blur uses backdrop-filter in CSS
      filters.push(`blur(${(effect as BlurEffect).radius}px)`);
    }
  }

  // Return shadows if any, otherwise filters
  if (shadows.length > 0) {
    return shadows.join(', ');
  }
  if (filters.length > 0) {
    return filters.join(' ');
  }

  return 'none';
}

/**
 * Checks if effect style has shadow effects
 */
export function hasBoxShadow(style: ResolvedEffectStyle): boolean {
  const effects = style.effects as Effect[];
  return effects.some(
    (e) => e.visible && (e.type === 'DROP_SHADOW' || e.type === 'INNER_SHADOW')
  );
}

/**
 * Checks if effect style has blur effects
 */
export function hasFilter(style: ResolvedEffectStyle): boolean {
  const effects = style.effects as Effect[];
  return effects.some((e) => e.visible && e.type === 'LAYER_BLUR');
}

/**
 * Checks if effect style has backdrop blur effects
 */
export function hasBackdropFilter(style: ResolvedEffectStyle): boolean {
  const effects = style.effects as Effect[];
  return effects.some((e) => e.visible && e.type === 'BACKGROUND_BLUR');
}

/**
 * Resolves a shadow effect to CSS
 */
function resolveShadow(
  effect: DropShadowEffect | InnerShadowEffect,
  config: TokenConfig
): string {
  const x = effect.offset.x;
  const y = effect.offset.y;
  const blur = effect.radius;
  const spread = effect.spread ?? 0;
  const color = formatColor(
    {
      r: effect.color.r,
      g: effect.color.g,
      b: effect.color.b,
      a: effect.color.a,
    },
    config.colorFormat
  );

  const inset = effect.type === 'INNER_SHADOW' ? 'inset ' : '';
  return `${inset}${x}px ${y}px ${blur}px ${spread}px ${color}`;
}

/**
 * Resolves a grid style to CSS grid-template-columns value
 */
export function resolveGridValue(style: ResolvedGridStyle): string {
  // Cast to LayoutGrid[] since we know it's Figma LayoutGrids in the plugin context
  const layoutGrids = style.layoutGrids as LayoutGrid[];
  const grids = layoutGrids.filter((g) => g.visible);

  if (grids.length === 0) {
    return 'none';
  }

  // Find column and row grids (these are RowsColsLayoutGrid types with count property)
  const columnsGrid = grids.find((g): g is RowsColsLayoutGrid => g.pattern === 'COLUMNS');
  const rowsGrid = grids.find((g): g is RowsColsLayoutGrid => g.pattern === 'ROWS');

  const values: string[] = [];

  if (columnsGrid) {
    const count = columnsGrid.count;
    const size = columnsGrid.sectionSize;

    if (count === Infinity || count < 0) {
      values.push(`repeat(auto-fill, ${size}px)`);
    } else {
      values.push(`repeat(${count}, ${size}px)`);
    }
  }

  if (rowsGrid) {
    const count = rowsGrid.count;
    const size = rowsGrid.sectionSize;

    if (count === Infinity || count < 0) {
      values.push(`repeat(auto-fill, ${size}px)`);
    } else {
      values.push(`repeat(${count}, ${size}px)`);
    }
  }

  return values.join(' / ') || 'none';
}
