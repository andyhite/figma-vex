# Configurable Expression Export Mode

**Date:** 2026-01-27
**Status:** Approved

## Overview

Extend the calculation-based variables feature to support two export modes:
1. **Resolved mode** (default): Export computed values (current behavior)
2. **Calc mode**: Export expressions as CSS `calc()` or SCSS native math

Also introduces a new expression syntax using Figma variable paths instead of CSS names, and configurable unit conversion.

## User-Facing Changes

### New Expression Syntax

Variables are referenced by their Figma path (groups + name), not CSS output names:

```
calc: 'Spacing/base' * 2; unit: rem
calc: round('Text/Size/lg' * 1.5)
calc: max('Spacing/min', 'Spacing/base' * 2)
```

**Path format:**
- Quoted with single quotes: `'Group/Subgroup/VariableName'`
- Collection name optional if path is unique across collections
- Collection required if ambiguous: `'Primitives/Spacing/base'`

### Configurable Units

Unit directive now supports conversion parameters:

| Directive | Meaning | Example Output (from 32px) |
|-----------|---------|---------------------------|
| `unit: px` | No conversion | `32px` |
| `unit: rem` | Use global rem base variable | `2rem` |
| `unit: rem(16)` | Hardcoded base, divide by 16 | `2rem` |
| `unit: rem('Typography/base')` | Use specific variable as base | `2rem` or `calc(... / var(--typography-base) * 1rem)` |
| `unit: em(16)` | Same as rem but em | `2em` |
| `unit: percent(100)` | Multiply by 100% | `32%` |

### New Settings

**Settings tab** (global):
- **Rem Base Variable**: Dropdown to select a numeric variable as the default rem base

**CSS tab** (format-specific):
- **Export as calc() expressions**: Checkbox (default: unchecked)

**SCSS tab** (format-specific):
- **Export as calc() expressions**: Checkbox (default: unchecked)

## Output Examples

Given: `--spacing-base: 16px` and expression `calc: 'Spacing/base' * 2; unit: rem`

### Resolved Mode (default)

**CSS:**
```css
--spacing-lg: 2rem;
```

**SCSS:**
```scss
$spacing-lg: 2rem;
```

### Calc Mode

**CSS:**
```css
--spacing-lg: calc(var(--spacing-base) * 2 / var(--rem-base) * 1rem);
```

**SCSS:**
```scss
$spacing-lg: $spacing-base * 2 / $rem-base * 1rem;
```

**JSON/TypeScript:** Always resolved values (no calc mode).

## Technical Design

### Path Resolution Flow

```
'Spacing/base'
    ↓
Search all collections for variable with path "Spacing/base"
    ↓
If 1 match → use it
If 0 matches → error: "Variable 'Spacing/base' not found"
If 2+ matches → error: "Ambiguous reference 'Spacing/base' found in collections: Primitives, Semantic. Use 'CollectionName/Spacing/base'"
```

### Expression Transformation (CSS calc mode)

```
Input:  calc: 'Spacing/base' * 2; unit: rem
                ↓
Parse:  expression = "'Spacing/base' * 2", unit = "rem"
                ↓
Resolve paths: 'Spacing/base' → variable with CSS name "spacing-base"
                ↓
Transform: "var(--spacing-base) * 2"
                ↓
Apply unit (with rem base var "rem-base"):
        "var(--spacing-base) * 2 / var(--rem-base) * 1rem"
                ↓
Wrap:   "calc(var(--spacing-base) * 2 / var(--rem-base) * 1rem)"
```

### Expression Transformation (SCSS mode)

```
Input:  calc: 'Spacing/base' * 2; unit: rem
                ↓
Resolve paths: 'Spacing/base' → SCSS variable "$spacing-base"
                ↓
Transform: "$spacing-base * 2"
                ↓
Apply unit: "$spacing-base * 2 / $rem-base * 1rem"
                ↓
Output (no wrapper): "$spacing-base * 2 / $rem-base * 1rem"
```

## Files to Modify

### Parsing

| File | Changes |
|------|---------|
| `apps/plugin/src/utils/descriptionParser.ts` | Update to parse new `'Path/Name'` reference syntax |
| `apps/plugin/src/utils/variableLookup.ts` | Add lookup by Figma path, handle collection disambiguation |

### Expression Evaluation

| File | Changes |
|------|---------|
| `apps/plugin/src/services/expressionEvaluator.ts` | Update to handle new reference format |
| `apps/plugin/src/services/expressionResolver.ts` | Add path-based variable lookup, conflict detection |

### Output Transformation

| File | Changes |
|------|---------|
| `apps/plugin/src/services/expressionFormatter.ts` | **NEW** - Transform expressions to CSS calc() or SCSS math syntax |

### Exporters

| File | Changes |
|------|---------|
| `apps/plugin/src/services/valueResolver.ts` | Branch on `exportAsCalcExpressions` flag |
| `apps/plugin/src/exporters/cssExporter.ts` | Pass new option through |
| `apps/plugin/src/exporters/scssExporter.ts` | Pass new option through |

### Types & Settings

| File | Changes |
|------|---------|
| `packages/shared/src/types/messages.ts` | Add `exportAsCalcExpressions`, `remBaseVariableId` to settings |
| `packages/shared/src/types/tokens.ts` | Update unit type to support `rem(16)` syntax |

### UI

| File | Changes |
|------|---------|
| `apps/ui/src/components/tabs/CssTab.tsx` | Add "Export as calc() expressions" checkbox |
| `apps/ui/src/components/tabs/ScssTab.tsx` | Add "Export as calc() expressions" checkbox |
| `apps/ui/src/components/tabs/SettingsTab.tsx` | Add "Rem Base Variable" dropdown |

## Type Changes

### ExportOptions

```typescript
interface ExportOptions {
  // ... existing fields
  exportAsCalcExpressions?: boolean;
  remBaseVariableId?: string;
}
```

### PluginSettings

```typescript
interface PluginSettings {
  // ... existing fields
  remBaseVariableId?: string;  // ID of selected rem base variable

  // CSS tab
  cssExportAsCalcExpressions: boolean;

  // SCSS tab
  scssExportAsCalcExpressions: boolean;
}
```

### SettingsTab Props (extends existing)

```typescript
interface SettingsTabProps {
  // ... existing props from settings-tab-reorganization.md

  // Rem base
  remBaseVariableId: string | null;
  onRemBaseVariableChange: (id: string | null) => void;
  numericVariables: Array<{ id: string; name: string; path: string }>;
}
```

## Error Handling

### Variable Resolution Errors

| Error | Behavior |
|-------|----------|
| Variable not found | Warning, fall back to Figma value |
| Ambiguous reference (multiple collections) | Error with message listing collections |
| Non-numeric variable referenced | Warning, fall back to Figma value |
| Circular reference | Warning, fall back to Figma value |

### Calc Mode Specific

| Scenario | Behavior |
|----------|----------|
| Rem base variable not set, `unit: rem` used | Warning: "No rem base variable configured", output without unit conversion |
| Rem base variable deleted from Figma | Warning on export, fall back to no conversion |
| Expression syntax error | Warning, fall back to Figma value |

### Edge Cases

| Case | Handling |
|------|----------|
| Variable name contains quotes | Escape with backslash: `'Brand\'s Color/primary'` |
| Empty expression | Use Figma value directly |
| Calc checkbox on but variable has no expression | Output Figma value (no calc wrapper) |

## Dependencies

- Depends on settings tab reorganization (docs/plans/settings-tab-reorganization.md)
- Replaces current `var(--css-name)` expression syntax (no backward compatibility needed)

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Reference syntax | `'Figma/Path/Name'` | Decouples from output format, matches Figma hierarchy |
| Collection handling | Optional unless ambiguous | Matches Figma's behavior, user-friendly |
| SCSS calc output | Native math (no calc wrapper) | Idiomatic SCSS |
| Rem base | Variable reference in settings | Single source of truth in Figma |
| Per-format toggle | CSS and SCSS separate checkboxes | Different use cases per format |
