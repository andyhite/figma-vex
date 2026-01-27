import type {
  ExportOptions,
  TokenConfig,
  StyleCollection,
  ResolvedPaintStyle,
  ResolvedTextStyle,
  ResolvedEffectStyle,
  ResolvedGridStyle,
} from '@figma-vex/shared';
import { DEFAULT_CONFIG } from '@figma-vex/shared';
import { parseDescription } from '@plugin/utils/descriptionParser';
import { toStyleClassName, toStyleVarName } from '@plugin/formatters/styleFormatter';
import {
  resolvePaintValue,
  resolveTextProperties,
  resolveEffectValue,
  resolveGridValue,
  hasBoxShadow,
  hasFilter,
  hasBackdropFilter,
} from '@plugin/services/styleValueResolver';

/**
 * Generates CSS variables for paint styles
 */
export function exportPaintStylesToCss(
  styles: ResolvedPaintStyle[],
  options: ExportOptions,
  indent = '  '
): string[] {
  const lines: string[] = [];

  if (styles.length === 0) return lines;

  lines.push(`${indent}/* Paint Styles */`);

  for (const style of styles) {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      ...parseDescription(style.description),
      ...(options.numberPrecision !== undefined && { precision: options.numberPrecision }),
    };

    const value = resolvePaintValue(style, config);
    const varName = toStyleVarName(style.name, options.prefix);
    lines.push(`${indent}${varName}: ${value};`);
  }

  return lines;
}

/**
 * Generates CSS variables for text styles
 */
export function exportTextStylesToCss(
  styles: ResolvedTextStyle[],
  options: ExportOptions,
  indent = '  '
): string[] {
  const lines: string[] = [];

  if (styles.length === 0) return lines;

  lines.push(`${indent}/* Text Styles */`);

  for (const style of styles) {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      ...parseDescription(style.description),
      ...(options.numberPrecision !== undefined && { precision: options.numberPrecision }),
    };

    const props = resolveTextProperties(style, config);
    const baseName = toStyleVarName(style.name, options.prefix);

    for (const [prop, value] of Object.entries(props)) {
      lines.push(`${indent}${baseName}-${prop}: ${value};`);
    }
  }

  return lines;
}

/**
 * Generates CSS variables for effect styles
 */
export function exportEffectStylesToCss(
  styles: ResolvedEffectStyle[],
  options: ExportOptions,
  indent = '  '
): string[] {
  const lines: string[] = [];

  if (styles.length === 0) return lines;

  lines.push(`${indent}/* Effect Styles */`);

  for (const style of styles) {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      ...parseDescription(style.description),
      ...(options.numberPrecision !== undefined && { precision: options.numberPrecision }),
    };

    const value = resolveEffectValue(style, config);
    const varName = toStyleVarName(style.name, options.prefix);
    lines.push(`${indent}${varName}: ${value};`);
  }

  return lines;
}

/**
 * Generates CSS variables for grid styles
 */
export function exportGridStylesToCss(
  styles: ResolvedGridStyle[],
  options: ExportOptions,
  indent = '  '
): string[] {
  const lines: string[] = [];

  if (styles.length === 0) return lines;

  lines.push(`${indent}/* Grid Styles */`);

  for (const style of styles) {
    const value = resolveGridValue(style);
    const varName = toStyleVarName(style.name, options.prefix);
    lines.push(`${indent}${varName}: ${value};`);
  }

  return lines;
}

/**
 * Generates CSS classes for all styles
 */
export function exportStylesAsCssClasses(
  styles: StyleCollection,
  options: ExportOptions
): string[] {
  const lines: string[] = [];
  const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];

  // Paint styles as color classes
  if (styleTypes.includes('paint') && styles.paint.length > 0) {
    lines.push('/* Paint Style Classes */');

    for (const style of styles.paint) {
      const config: TokenConfig = {
        ...DEFAULT_CONFIG,
        ...parseDescription(style.description),
        ...(options.numberPrecision !== undefined && { precision: options.numberPrecision }),
      };
      const className = toStyleClassName(style.name, options.prefix);
      const value = resolvePaintValue(style, config);

      lines.push(`.${className} {`);
      lines.push(`  color: ${value};`);
      lines.push(`}`);
      lines.push(`.bg-${className} {`);
      lines.push(`  background-color: ${value};`);
      lines.push(`}`);
      lines.push(`.border-${className} {`);
      lines.push(`  border-color: ${value};`);
      lines.push(`}`);
      lines.push('');
    }
  }

  // Text styles as typography classes
  if (styleTypes.includes('text') && styles.text.length > 0) {
    lines.push('/* Text Style Classes */');

    for (const style of styles.text) {
      const config: TokenConfig = {
        ...DEFAULT_CONFIG,
        ...parseDescription(style.description),
        ...(options.numberPrecision !== undefined && { precision: options.numberPrecision }),
      };
      const className = toStyleClassName(style.name, options.prefix);
      const props = resolveTextProperties(style, config);

      lines.push(`.${className} {`);
      for (const [prop, value] of Object.entries(props)) {
        lines.push(`  ${prop}: ${value};`);
      }
      lines.push(`}`);
      lines.push('');
    }
  }

  // Effect styles as shadow/filter classes
  if (styleTypes.includes('effect') && styles.effect.length > 0) {
    lines.push('/* Effect Style Classes */');

    for (const style of styles.effect) {
      const config: TokenConfig = {
        ...DEFAULT_CONFIG,
        ...parseDescription(style.description),
        ...(options.numberPrecision !== undefined && { precision: options.numberPrecision }),
      };
      const className = toStyleClassName(style.name, options.prefix);
      const value = resolveEffectValue(style, config);

      lines.push(`.${className} {`);

      if (hasBoxShadow(style)) {
        lines.push(`  box-shadow: ${value};`);
      }
      if (hasFilter(style)) {
        lines.push(`  filter: ${value};`);
      }
      if (hasBackdropFilter(style)) {
        lines.push(`  backdrop-filter: ${value};`);
      }

      lines.push(`}`);
      lines.push('');
    }
  }

  // Grid styles as layout classes
  if (styleTypes.includes('grid') && styles.grid.length > 0) {
    lines.push('/* Grid Style Classes */');

    for (const style of styles.grid) {
      const className = toStyleClassName(style.name, options.prefix);
      const gridValue = resolveGridValue(style);

      lines.push(`.${className} {`);
      lines.push(`  display: grid;`);
      lines.push(`  grid-template-columns: ${gridValue};`);
      lines.push(`}`);
      lines.push('');
    }
  }

  return lines;
}

/**
 * Combined export for CSS variables mode - integrates styles into selector block
 */
export function exportStylesToCssVariables(
  styles: StyleCollection,
  options: ExportOptions,
  indent = '  '
): string[] {
  const lines: string[] = [];
  const styleTypes = options.styleTypes || ['paint', 'text', 'effect', 'grid'];

  const hasAnyStyles =
    (styleTypes.includes('paint') && styles.paint.length > 0) ||
    (styleTypes.includes('text') && styles.text.length > 0) ||
    (styleTypes.includes('effect') && styles.effect.length > 0) ||
    (styleTypes.includes('grid') && styles.grid.length > 0);

  if (!hasAnyStyles) return lines;

  lines.push('');
  lines.push(`${indent}/* ═══ Figma Styles ═══ */`);

  if (styleTypes.includes('paint')) {
    lines.push(...exportPaintStylesToCss(styles.paint, options, indent));
  }
  if (styleTypes.includes('text')) {
    lines.push(...exportTextStylesToCss(styles.text, options, indent));
  }
  if (styleTypes.includes('effect')) {
    lines.push(...exportEffectStylesToCss(styles.effect, options, indent));
  }
  if (styleTypes.includes('grid')) {
    lines.push(...exportGridStylesToCss(styles.grid, options, indent));
  }

  return lines;
}
