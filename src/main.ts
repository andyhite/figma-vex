/// <reference types="@figma/plugin-typings" />

/**
 * Vex - Figma Variables Export Plugin
 *
 * Reads variable descriptions for configuration and exports CSS custom properties
 * with proper units and formatting.
 *
 * Description field format (add to any variable's description):
 *
 *   unit: none        - Output raw number (e.g., 1.5 for line-height)
 *   unit: px          - Output with px suffix (default for numbers)
 *   unit: rem         - Convert to rem (assumes 16px base)
 *   unit: rem:20      - Convert to rem with custom base (20px)
 *   unit: %           - Output as percentage
 *   unit: ms          - Output with ms suffix (for durations)
 *   unit: em          - Output with em suffix
 *
 *   format: hex       - Color as hex (default)
 *   format: rgb       - Color as rgb()
 *   format: rgba      - Color as rgba()
 *   format: hsl       - Color as hsl()
 *   format: oklch     - Color as oklch()
 *
 * Multiple configs can be combined on separate lines:
 *   unit: rem
 *   format: oklch
 */

// ============================================================================
// Types
// ============================================================================

interface TokenConfig {
  unit: "none" | "px" | "rem" | "em" | "%" | "ms" | "s";
  remBase: number;
  colorFormat: "hex" | "rgb" | "rgba" | "hsl" | "oklch";
}

interface ExportOptions {
  includeCollectionComments: boolean;
  includeModeComments: boolean;
  selector: string;
  useModesAsSelectors: boolean;
  prefix?: string;
  selectedCollections?: string[];
}

interface PluginMessage {
  type: "export-css" | "export-json" | "export-scss" | "export-typescript" | "get-collections" | "cancel";
  options?: ExportOptions;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_CONFIG: TokenConfig = {
  unit: "px",
  remBase: 16,
  colorFormat: "hex",
};

const UNIT_REGEX = /unit:\s*(none|px|rem|em|%|ms|s)(?::(\d+))?/i;
const FORMAT_REGEX = /format:\s*(hex|rgb|rgba|hsl|oklch)/i;

// ============================================================================
// Description Parsing
// ============================================================================

const parseDescription = (description: string): Partial<TokenConfig> => {
  if (!description) return {};

  const config: Partial<TokenConfig> = {};

  const unitMatch = description.match(UNIT_REGEX);
  if (unitMatch) {
    config.unit = unitMatch[1].toLowerCase() as TokenConfig["unit"];
    if (unitMatch[2]) {
      config.remBase = parseInt(unitMatch[2], 10);
    }
  }

  const formatMatch = description.match(FORMAT_REGEX);
  if (formatMatch) {
    config.colorFormat =
      formatMatch[1].toLowerCase() as TokenConfig["colorFormat"];
  }

  return config;
};

// ============================================================================
// Name Conversion
// ============================================================================

/**
 * Converts a variable name to a valid CSS custom property name.
 * Handles slashes, spaces, and camelCase conversion.
 */
const toCssName = (name: string): string => {
  if (!name || typeof name !== "string") {
    return "";
  }
  return name
    .replace(/\//g, "-")
    .replace(/\s+/g, "-")
    .replace(/([a-z])([A-Z])/g, "$1-$2")
    .replace(/[^a-z0-9-]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
};

// ============================================================================
// Color Conversion Utilities
// ============================================================================

const toHex = (n: number): string => {
  const hex = Math.round(n * 255).toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
};

const rgbToHex = (color: RGBA): string => {
  const hex = `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  // Include alpha channel only if it's less than 1 (not fully opaque)
  return color.a !== undefined && color.a < 1 ? `${hex}${toHex(color.a)}` : hex;
};

const rgbToRgbString = (color: RGBA): string => {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  return color.a !== undefined && color.a < 1
    ? `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(3)})`
    : `rgb(${r}, ${g}, ${b})`;
};

const rgbToHsl = (color: RGBA): string => {
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
};

const rgbToOklch = (color: RGBA): string => {
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

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
};

const formatColor = (
  color: RGBA,
  format: TokenConfig["colorFormat"],
): string => {
  const formatters: Record<TokenConfig["colorFormat"], (c: RGBA) => string> = {
    hex: rgbToHex,
    rgb: rgbToRgbString,
    rgba: rgbToRgbString,
    hsl: rgbToHsl,
    oklch: rgbToOklch,
  };

  return formatters[format](color);
};

// ============================================================================
// Number Formatting
// ============================================================================

/**
 * Formats a number, removing trailing zeros from decimal values.
 * @param value - The number to format
 * @param decimals - Maximum number of decimal places (default: 4)
 */
const cleanNumber = (value: number, decimals = 4): string => {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(decimals).replace(/\.?0+$/, "");
};

const formatNumber = (value: number, config: TokenConfig): string => {
  const formatters: Record<TokenConfig["unit"], () => string> = {
    none: () => cleanNumber(value),
    px: () => `${value}px`,
    rem: () => `${cleanNumber(value / config.remBase)}rem`,
    em: () => `${cleanNumber(value)}em`,
    "%": () => `${value}%`,
    ms: () => `${value}ms`,
    s: () => `${value}s`,
  };

  return formatters[config.unit]();
};

// ============================================================================
// Value Resolution
// ============================================================================

/**
 * Resolves a variable value to its string representation.
 * Handles variable aliases, colors, numbers, strings, and booleans.
 */
const resolveValue = async (
  value: VariableValue,
  modeId: string,
  variables: Variable[],
  resolvedType: VariableResolvedDataType,
  config: TokenConfig,
  prefix = "",
  depth = 0,
  visited = new Set<string>(),
): Promise<string> => {
  // Prevent infinite recursion
  if (depth > 10) return "/* circular reference */";

  // Handle variable alias - output as CSS var() reference
  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "VARIABLE_ALIAS"
  ) {
    const aliasId = value.id;
    
    // Check for circular references
    if (visited.has(aliasId)) {
      return "/* circular reference */";
    }

    const aliasedVar = variables.find((v) => v.id === aliasId);

    if (aliasedVar) {
      const aliasedCssName = toCssName(aliasedVar.name);
      const prefixedName = prefix ? `${prefix}-${aliasedCssName}` : aliasedCssName;
      return `var(--${prefixedName})`;
    }

    return "/* unresolved alias */";
  }

  // Handle by type
  switch (resolvedType) {
    case "COLOR":
      if (typeof value === "object" && value !== null && "r" in value) {
        return formatColor(value as RGBA, config.colorFormat);
      }
      break;

    case "FLOAT":
      if (typeof value === "number" && Number.isFinite(value)) {
        return formatNumber(value, config);
      }
      break;

    case "STRING":
      if (typeof value === "string") {
        // Escape quotes in string values
        const escaped = value.replace(/"/g, '\\"');
        return `"${escaped}"`;
      }
      break;

    case "BOOLEAN":
      if (typeof value === "boolean") {
        return value ? "1" : "0";
      }
      break;
  }

  // Fallback: convert to string
  return String(value ?? "");
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Filters collections based on selected collections option.
 */
const filterCollections = (
  collections: VariableCollection[],
  selectedCollectionIds?: string[],
): VariableCollection[] => {
  if (selectedCollectionIds && selectedCollectionIds.length > 0) {
    return collections.filter((c) => selectedCollectionIds.includes(c.id));
  }
  return collections;
};

/**
 * Gets variables for a collection, sorted alphabetically.
 */
const getCollectionVariables = (
  variables: Variable[],
  collectionId: string,
): Variable[] => {
  return variables
    .filter((v) => v.variableCollectionId === collectionId)
    .sort((a, b) => toCssName(a.name).localeCompare(toCssName(b.name)));
};

// ============================================================================
// CSS Export
// ============================================================================

const exportVariables = async (options: ExportOptions): Promise<string> => {
  const variables = await figma.variables.getLocalVariablesAsync();
  let collections = await figma.variables.getLocalVariableCollectionsAsync();

  if (variables.length === 0) {
    return "/* No variables found in this file */";
  }

  collections = filterCollections(collections, options.selectedCollections);

  // Validate selector
  const selector = options.selector?.trim() || ":root";

  const lines: string[] = [
    "/**",
    " * Auto-generated CSS Custom Properties",
    ` * Exported from Figma: ${figma.root.name}`,
    ` * Generated: ${new Date().toISOString()}`,
    " */",
    "",
  ];

  const processVariable = async (
    variable: Variable,
    modeId: string,
    indent = "  ",
    prefix = "",
  ): Promise<string> => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      ...parseDescription(variable.description),
    };

    const value = variable.valuesByMode[modeId];

    if (value === undefined) return "";

    const cssName = toCssName(variable.name);
    const prefixedName = prefix ? `${prefix}-${cssName}` : cssName;
    const cssValue = await resolveValue(
      value,
      modeId,
      variables,
      variable.resolvedType,
      config,
      prefix,
    );

    return `${indent}--${prefixedName}: ${cssValue};`;
  };

  if (options.useModesAsSelectors) {
    for (const collection of collections) {
      if (options.includeCollectionComments) {
        lines.push(`/* Collection: ${collection.name} */`);
      }

      for (const mode of collection.modes) {
        const isDefault = mode.name.toLowerCase() === "default";
        const modeSelector = isDefault
          ? selector
          : `${selector}[data-theme="${mode.name.toLowerCase()}"], .theme-${mode.name.toLowerCase()}`;

        if (options.includeModeComments) {
          lines.push(`/* Mode: ${mode.name} */`);
        }

        lines.push(`${modeSelector} {`);

        const collectionVars = getCollectionVariables(variables, collection.id);

        for (const variable of collectionVars) {
          const line = await processVariable(
            variable,
            mode.modeId,
            "  ",
            options.prefix,
          );
          if (line) lines.push(line);
        }

        lines.push("}", "");
      }

      // Add newline between collections
      if (collections.indexOf(collection) < collections.length - 1) {
        lines.push("");
      }
    }
  } else {
    lines.push(`${selector} {`);

    for (const collection of collections) {
      if (options.includeCollectionComments) {
        lines.push(`  /* ${collection.name} */`);
      }

      const collectionVars = getCollectionVariables(variables, collection.id);

      for (const variable of collectionVars) {
        const line = await processVariable(
          variable,
          collection.defaultModeId,
          "  ",
          options.prefix,
        );
        if (line) lines.push(line);
      }

      // Add newline between collections
      if (collections.indexOf(collection) < collections.length - 1) {
        lines.push("");
      }
    }

    lines.push("}");
  }

  return lines.join("\n");
};

// ============================================================================
// JSON Export (Style Dictionary compatible)
// ============================================================================

/**
 * Formats a raw value for JSON export (Style Dictionary compatible).
 * Handles variable aliases and color values.
 */
const formatRawValue = (
  value: VariableValue,
  type: VariableResolvedDataType,
  variables: Variable[],
): unknown => {
  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "VARIABLE_ALIAS"
  ) {
    const aliasedVar = variables.find((v) => v.id === value.id);
    if (aliasedVar) {
      // Convert variable name to token path (e.g., "color/primary" -> "color.primary")
      const tokenPath = aliasedVar.name.split("/").join(".");
      return `{${tokenPath}}`;
    }
    return `{${value.id}}`; // Fallback if variable not found
  }

  if (type === "COLOR" && typeof value === "object" && value !== null && "r" in value) {
    return rgbToHex(value as RGBA);
  }

  return value;
};

const exportJson = async (options?: ExportOptions): Promise<string> => {
  const variables = await figma.variables.getLocalVariablesAsync();
  let collections = await figma.variables.getLocalVariableCollectionsAsync();

  collections = filterCollections(collections, options?.selectedCollections);

  const result: Record<string, unknown> = {};

  for (const collection of collections) {
    const collectionData: Record<string, unknown> = {};
    const collectionVars = getCollectionVariables(variables, collection.id)
      .sort((a, b) => a.name.localeCompare(b.name));

    for (const variable of collectionVars) {
      const config = parseDescription(variable.description);
      const pathParts = variable.name.split("/");

      // Build nested structure
      let current = collectionData as Record<string, unknown>;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }

      const leafName = pathParts[pathParts.length - 1];
      const defaultModeId = collection.defaultModeId;
      const rawValue = variable.valuesByMode[defaultModeId];

      // Build token object (DTCG format)
      const token: Record<string, unknown> = {
        $type: variable.resolvedType.toLowerCase(),
        ...(variable.description && { $description: variable.description }),
      };

      // Add value(s)
      if (collection.modes.length === 1) {
        token.$value = formatRawValue(rawValue, variable.resolvedType, variables);
      } else {
        token.$value = Object.fromEntries(
          collection.modes.map((mode) => [
            mode.name,
            formatRawValue(
              variable.valuesByMode[mode.modeId],
              variable.resolvedType,
              variables,
            ),
          ]),
        );
      }

      // Add unit extension if non-default
      if (config.unit && config.unit !== "px") {
        token.$extensions = {
          "com.figma.vex": { unit: config.unit },
        };
      }

      current[leafName] = token;
    }

    result[collection.name] = collectionData;
  }

  return JSON.stringify(result, null, 2);
};

// ============================================================================
// SCSS/SASS Export
// ============================================================================

const exportScss = async (options: ExportOptions): Promise<string> => {
  const variables = await figma.variables.getLocalVariablesAsync();
  let collections = await figma.variables.getLocalVariableCollectionsAsync();

  if (variables.length === 0) {
    return "// No variables found in this file";
  }

  collections = filterCollections(collections, options.selectedCollections);

  const lines: string[] = [
    "//",
    "// Auto-generated SCSS Variables",
    `// Exported from Figma: ${figma.root.name}`,
    `// Generated: ${new Date().toISOString()}`,
    "//",
    "",
  ];

  const processScssVariable = async (
    variable: Variable,
    modeId: string,
    prefix = "",
  ): Promise<string> => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      ...parseDescription(variable.description),
    };

    const value = variable.valuesByMode[modeId];
    if (value === undefined) return "";

    const scssName = toCssName(variable.name);
    const prefixedName = prefix ? `$${prefix}-${scssName}` : `$${scssName}`;
    const scssValue = await resolveValue(
      value,
      modeId,
      variables,
      variable.resolvedType,
      config,
      prefix,
    );

    // Convert var() references to SCSS variable references
    const scssValueFormatted = scssValue.replace(
      /var\(--([^)]+)\)/g,
      (_, varName) => {
        return `$${varName}`;
      },
    );

    return `${prefixedName}: ${scssValueFormatted};`;
  };

  for (const collection of collections) {
    if (options.includeCollectionComments) {
      lines.push(`// Collection: ${collection.name}`);
    }

    const collectionVars = getCollectionVariables(variables, collection.id);

    for (const variable of collectionVars) {
      const line = await processScssVariable(
        variable,
        collection.defaultModeId,
        options.prefix,
      );
      if (line) lines.push(line);
    }

    // Add newline between collections
    if (collections.indexOf(collection) < collections.length - 1) {
      lines.push("");
    }
  }

  return lines.join("\n");
};

// ============================================================================
// TypeScript Types Export
// ============================================================================

const exportTypeScript = async (options: ExportOptions): Promise<string> => {
  const variables = await figma.variables.getLocalVariablesAsync();
  let collections = await figma.variables.getLocalVariableCollectionsAsync();

  if (variables.length === 0) {
    return "// No variables found in this file";
  }

  collections = filterCollections(collections, options.selectedCollections);

  const lines: string[] = [
    "/**",
    " * Auto-generated TypeScript types for CSS Custom Properties",
    ` * Exported from Figma: ${figma.root.name}`,
    ` * Generated: ${new Date().toISOString()}`,
    " */",
    "",
    "export type CSSVariableName =",
  ];

  const variableNames: string[] = [];

  for (const collection of collections) {
    const collectionVars = getCollectionVariables(variables, collection.id);

    for (const variable of collectionVars) {
      const cssName = toCssName(variable.name);
      const prefixedName = options.prefix
        ? `${options.prefix}-${cssName}`
        : cssName;
      variableNames.push(`  | "--${prefixedName}"`);
    }
  }

  if (variableNames.length === 0) {
    return "// No variables found in this file";
  }

  lines.push(...variableNames);
  lines.push(";");
  lines.push("");
  lines.push("declare module 'csstype' {");
  lines.push("  interface Properties {");
  lines.push("    [key: CSSVariableName]: string | number;");
  lines.push("  }");
  lines.push("}");

  return lines.join("\n");
};

// ============================================================================
// Plugin Entry Point
// ============================================================================

figma.showUI(__html__, { width: 520, height: 700 });

figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    switch (msg.type) {
      case "get-collections": {
        const collections = await figma.variables.getLocalVariableCollectionsAsync();
        figma.ui.postMessage({
          type: "collections-list",
          collections: collections.map((c) => ({ id: c.id, name: c.name })),
        });
        break;
      }

      case "export-css": {
        const options: ExportOptions = msg.options ?? {
          includeCollectionComments: true,
          includeModeComments: true,
          selector: ":root",
          useModesAsSelectors: false,
        };

        const css = await exportVariables(options);
        figma.ui.postMessage({ type: "css-result", css });
        break;
      }

      case "export-json": {
        const json = await exportJson(msg.options);
        figma.ui.postMessage({ type: "json-result", json });
        break;
      }

      case "export-scss": {
        const options: ExportOptions = msg.options ?? {
          includeCollectionComments: true,
          includeModeComments: false,
          selector: ":root",
          useModesAsSelectors: false,
        };

        const scss = await exportScss(options);
        figma.ui.postMessage({ type: "scss-result", scss });
        break;
      }

      case "export-typescript": {
        const options: ExportOptions = msg.options ?? {
          includeCollectionComments: false,
          includeModeComments: false,
          selector: ":root",
          useModesAsSelectors: false,
        };

        const typescript = await exportTypeScript(options);
        figma.ui.postMessage({ type: "typescript-result", typescript });
        break;
      }

      case "cancel": {
        figma.closePlugin();
        break;
      }

      default: {
        // TypeScript should catch this, but handle unknown message types gracefully
        console.warn("Unknown message type:", (msg as { type: string }).type);
        break;
      }
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    figma.ui.postMessage({
      type: "error",
      message: `Export failed: ${errorMessage}`,
    });
    console.error("Plugin error:", error);
  }
};
