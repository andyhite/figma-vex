# DTCG Intermediate Format Design

## Overview

Refactor the GitHub integration to use DTCG (Design Tokens Community Group) JSON as a canonical intermediate format. Instead of sending pre-formatted CSS/SCSS/TypeScript to the GitHub workflow, we send the DTCG document plus conversion settings. The conversion to output formats happens in shared code used by both the plugin and the action.

## Goals

1. **Code reuse** - Single implementation of CSS/SCSS/TypeScript converters shared between plugin and action
2. **Reduced payload size** - Send one DTCG document instead of multiple pre-formatted strings
3. **Future flexibility** - Action can generate different formats than configured in plugin

## Architecture

```
Plugin                          Shared Package                    Action
──────                          ──────────────                    ──────
Figma Variables ─┐
                 ├─► serializeToDTCG() ─► DTCGDocument
Figma Styles ────┘                              │
                                                ▼
                                    ┌─────────────────────┐
                                    │  convertToCss()     │
                                    │  convertToScss()    │◄── Used by both
                                    │  convertToTs()      │
                                    │  transforms/*       │
                                    └─────────────────────┘
                                                │
Preview in plugin ◄─────────────────────────────┴─────────────────► Write files
```

### Transform Separation

**Serialization transforms (Figma → DTCG, plugin only):**
- Variable/collection structure flattening
- Mode handling
- Alias references as `{ $ref: "path" }`
- Raw value capture (colors to hex)
- Token config extraction from descriptions

**Output transforms (DTCG → formats, shared):**
- Name formatting (prefix, casing rules)
- Unit conversion (px → rem)
- Color format conversion (hex → rgb/hsl/oklch)
- Calc expression generation
- Format-specific syntax (CSS custom properties, SCSS variables, TS types)

## Package Structure

```
packages/shared/src/
├── dtcg/
│   ├── types.ts              # DTCG token types
│   ├── converters/
│   │   ├── css.ts            # DTCG → CSS
│   │   ├── scss.ts           # DTCG → SCSS
│   │   ├── typescript.ts     # DTCG → TypeScript
│   │   └── index.ts
│   ├── transforms/
│   │   ├── names.ts          # Name formatting (prefix, casing, rules)
│   │   ├── colors.ts         # Color format conversion
│   │   ├── units.ts          # Unit conversion (px→rem, calc)
│   │   └── index.ts
│   └── index.ts
├── types/                    # (existing)
└── index.ts                  # Re-export dtcg module

apps/plugin/src/
├── serializers/
│   └── dtcgSerializer.ts     # Figma → DTCG conversion
└── ...

apps/action/src/
└── ...                       # Uses shared converters
```

## Type Definitions

### DTCG Token Types

```typescript
// packages/shared/src/dtcg/types.ts

export type DTCGTokenType =
  | 'color' | 'number' | 'string' | 'boolean'
  | 'typography' | 'shadow' | 'grid';

export interface DTCGToken {
  $type: DTCGTokenType;
  $value: DTCGValue | Record<string, DTCGValue>;  // Single or per-mode
  $description?: string;
  $extensions?: {
    'com.figma.vex'?: {
      unit?: Unit;
      expression?: string;
      resolvedType?: string;
    };
  };
}

export type DTCGValue =
  | string | number | boolean
  | DTCGColorValue
  | DTCGTypographyValue
  | DTCGShadowValue
  | DTCGGridValue
  | DTCGReference;

export interface DTCGReference {
  $ref: string;  // "Collection.path.to.token"
}

export type DTCGColorValue = string;  // "#RRGGBB" or "#RRGGBBAA"

export interface DTCGTypographyValue {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle?: string;
  lineHeight?: number | string;
  letterSpacing?: number | string;
  textDecoration?: string;
  textTransform?: string;
}

export interface DTCGShadowValue {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  type?: 'dropShadow' | 'innerShadow';
}

export interface DTCGGridValue {
  pattern: 'columns' | 'rows' | 'grid';
  count?: number;
  gutterSize?: number;
  offset?: number;
}

export interface DTCGDocument {
  $schema?: string;
  collections: Record<string, DTCGTokenGroup>;
  $styles?: {
    paint?: DTCGTokenGroup;
    text?: DTCGTokenGroup;
    effect?: DTCGTokenGroup;
    grid?: DTCGTokenGroup;
  };
  $metadata?: {
    figmaFile: string;
    generatedAt: string;
  };
}

export type DTCGTokenGroup = {
  [key: string]: DTCGToken | DTCGTokenGroup;
};
```

### Conversion Settings

```typescript
export interface DTCGConversionSettings {
  // Name formatting
  prefix?: string;
  nameFormatRules?: NameFormatRule[];

  // Value formatting
  colorFormat: ColorFormat;
  defaultUnit: Unit;
  remBase: number;

  // CSS/SCSS specific
  selector?: string;
  useModesAsSelectors?: boolean;
  includeCollectionComments?: boolean;
  includeModeComments?: boolean;
  exportAsCalcExpressions?: boolean;

  // Style handling
  includeStyles?: boolean;
  styleOutputMode?: StyleOutputMode;
  styleTypes?: StyleType[];

  // Collection filtering
  selectedCollections?: string[];
}

export interface GitHubDispatchPayload {
  document: DTCGDocument;
  settings: DTCGConversionSettings;
  exportTypes: ExportType[];
}
```

## Serialization (Plugin)

```typescript
// apps/plugin/src/serializers/dtcgSerializer.ts

export interface SerializationOptions {
  selectedCollections?: string[];
  includeStyles?: boolean;
  styleTypes?: StyleType[];
}

export async function serializeToDTCG(
  variables: Variable[],
  collections: VariableCollection[],
  figmaFileName: string,
  options: SerializationOptions,
  styles?: StyleCollection
): Promise<DTCGDocument>;
```

Key responsibilities:
- Flatten Figma's variable structure into DTCG groups
- Convert aliases to `{ $ref: "path" }` references
- Extract token config from descriptions into `$extensions`
- Serialize colors to hex (canonical format)
- Include styles in `$styles` section

## Converters (Shared)

```typescript
// packages/shared/src/dtcg/converters/css.ts
export function convertToCss(document: DTCGDocument, options: DTCGConversionSettings): string;

// packages/shared/src/dtcg/converters/scss.ts
export function convertToScss(document: DTCGDocument, options: DTCGConversionSettings): string;

// packages/shared/src/dtcg/converters/typescript.ts
export function convertToTypeScript(document: DTCGDocument, options: DTCGConversionSettings): string;
```

### Transform Utilities

```typescript
// packages/shared/src/dtcg/transforms/names.ts
export function formatCssName(path: string[], options: DTCGConversionSettings): string;

// packages/shared/src/dtcg/transforms/colors.ts
export function formatColor(hex: string, format: ColorFormat): string;

// packages/shared/src/dtcg/transforms/units.ts
export function formatNumberWithUnit(value: number, unit: Unit, options: DTCGConversionSettings): string;
export function formatCalcExpression(expression: string, options: DTCGConversionSettings, document: DTCGDocument): string;
```

## Integration

### Plugin Export Service

```typescript
// apps/plugin/src/services/exportService.ts

export async function generateExports(
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  exportTypes: ExportType[],
  baseOptions: Partial<ExportOptions>
): Promise<Record<ExportType, string>> {
  const styles = baseOptions.includeStyles ? await fetchAllStyles() : undefined;

  // Step 1: Serialize to DTCG
  const document = await serializeToDTCG(variables, collections, fileName, baseOptions, styles);

  // Step 2: Convert to output formats
  const settings = mapOptionsToSettings(baseOptions);
  const exports: Partial<Record<ExportType, string>> = {};

  for (const type of exportTypes) {
    exports[type] = convertToFormat(document, type, settings);
  }

  return exports as Record<ExportType, string>;
}

export async function prepareGitHubPayload(
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  options: GitHubDispatchOptions
): Promise<GitHubDispatchPayload> {
  const styles = options.exportOptions.includeStyles ? await fetchAllStyles() : undefined;

  const document = await serializeToDTCG(variables, collections, fileName, options.exportOptions, styles);

  return {
    document,
    settings: mapOptionsToSettings(options.exportOptions),
    exportTypes: options.exportTypes,
  };
}
```

### GitHub Action

```typescript
// apps/action/src/index.ts

import { convertToCss, convertToScss, convertToTypeScript } from '@figma-vex/shared';

function generateFiles(payload: GitHubDispatchPayload, inputs: ActionInputs): FileWrite[] {
  const { document, settings, exportTypes } = payload;
  const files: FileWrite[] = [];

  if (inputs.cssPath && exportTypes.includes('css')) {
    files.push({ path: inputs.cssPath, content: convertToCss(document, settings) });
  }

  if (inputs.scssPath && exportTypes.includes('scss')) {
    files.push({ path: inputs.scssPath, content: convertToScss(document, settings) });
  }

  if (inputs.jsonPath && exportTypes.includes('json')) {
    files.push({ path: inputs.jsonPath, content: JSON.stringify(document, null, 2) });
  }

  if (inputs.typescriptPath && exportTypes.includes('typescript')) {
    files.push({ path: inputs.typescriptPath, content: convertToTypeScript(document, settings) });
  }

  return files;
}
```

## Implementation Steps

1. Add DTCG types to `@figma-vex/shared`
2. Create shared transform utilities (names, colors, units)
3. Build shared converters (CSS, SCSS, TypeScript)
4. Create `dtcgSerializer.ts` in plugin
5. Refactor plugin exporters to use serialize → convert flow
6. Update GitHub dispatch to send DTCG payload
7. Update action to use shared converters
8. Update/add tests throughout

## Files to Create

- `packages/shared/src/dtcg/types.ts`
- `packages/shared/src/dtcg/converters/css.ts`
- `packages/shared/src/dtcg/converters/scss.ts`
- `packages/shared/src/dtcg/converters/typescript.ts`
- `packages/shared/src/dtcg/converters/index.ts`
- `packages/shared/src/dtcg/transforms/names.ts`
- `packages/shared/src/dtcg/transforms/colors.ts`
- `packages/shared/src/dtcg/transforms/units.ts`
- `packages/shared/src/dtcg/transforms/index.ts`
- `packages/shared/src/dtcg/index.ts`
- `apps/plugin/src/serializers/dtcgSerializer.ts`

## Files to Modify

- `packages/shared/src/index.ts` (re-exports)
- `apps/plugin/src/services/exportService.ts`
- `apps/plugin/src/services/githubService.ts`
- `apps/plugin/src/main.ts` (github-dispatch handler)
- `apps/action/src/index.ts`
- `apps/action/src/types.ts`

## Testing Strategy

- Unit tests for DTCG types and converters in shared package
- Unit tests for serializer in plugin
- Integration tests verifying plugin export output matches action output
- Existing exporter tests updated to use new flow
