/**
 * Color format conversion transforms for DTCG tokens
 */

import type { ColorFormat } from '../types';

interface RGBA {
  r: number;
  g: number;
  b: number;
  a?: number;
}

function hexToRgb(hex: string): RGBA | null {
  // Remove # if present
  const cleanHex = hex.replace('#', '');

  // Handle 3, 6, or 8 character hex
  let r: number, g: number, b: number, a: number | undefined;

  if (cleanHex.length === 3) {
    r = parseInt(cleanHex[0] + cleanHex[0], 16) / 255;
    g = parseInt(cleanHex[1] + cleanHex[1], 16) / 255;
    b = parseInt(cleanHex[2] + cleanHex[2], 16) / 255;
  } else if (cleanHex.length === 6) {
    r = parseInt(cleanHex.slice(0, 2), 16) / 255;
    g = parseInt(cleanHex.slice(2, 4), 16) / 255;
    b = parseInt(cleanHex.slice(4, 6), 16) / 255;
  } else if (cleanHex.length === 8) {
    r = parseInt(cleanHex.slice(0, 2), 16) / 255;
    g = parseInt(cleanHex.slice(2, 4), 16) / 255;
    b = parseInt(cleanHex.slice(4, 6), 16) / 255;
    a = parseInt(cleanHex.slice(6, 8), 16) / 255;
  } else {
    return null;
  }

  return { r, g, b, a };
}

function rgbToRgbString(color: RGBA): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  return color.a !== undefined && color.a < 1
    ? `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(3)})`
    : `rgb(${r}, ${g}, ${b})`;
}

function rgbToHsl(color: RGBA): string {
  const { r, g, b, a } = color;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return a !== undefined && a < 1
    ? `hsla(${hDeg}, ${sPct}%, ${lPct}%, ${a.toFixed(3)})`
    : `hsl(${hDeg}, ${sPct}%, ${lPct}%)`;
}

function rgbToOklch(color: RGBA): string {
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  const lr = toLinear(color.r);
  const lg = toLinear(color.g);
  const lb = toLinear(color.b);

  // Linear RGB to OKLab
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l = Math.cbrt(l_);
  const m = Math.cbrt(m_);
  const s = Math.cbrt(s_);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const b_ = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  // OKLab to OKLCH
  const C = Math.sqrt(a * a + b_ * b_);
  let H = (Math.atan2(b_, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  const lPct = (L * 100).toFixed(2);
  const cVal = C.toFixed(4);
  const hDeg = H.toFixed(2);

  return color.a !== undefined && color.a < 1
    ? `oklch(${lPct}% ${cVal} ${hDeg} / ${color.a.toFixed(3)})`
    : `oklch(${lPct}% ${cVal} ${hDeg})`;
}

/**
 * Converts a hex color value to the specified format.
 *
 * @param hex - Hex color string (e.g., "#RRGGBB" or "#RRGGBBAA")
 * @param format - Target color format
 * @returns Formatted color string
 */
export function formatColor(hex: string, format: ColorFormat): string {
  // If already in hex format and requested format is hex, return as-is
  if (format === 'hex') {
    return hex;
  }

  // Convert hex to RGB
  const rgb = hexToRgb(hex);
  if (!rgb) {
    // Fallback if hex parsing fails
    return hex;
  }

  // Convert to requested format
  switch (format) {
    case 'rgb':
    case 'rgba':
      return rgbToRgbString(rgb);
    case 'hsl':
      return rgbToHsl(rgb);
    case 'oklch':
      return rgbToOklch(rgb);
    default:
      return hex;
  }
}
