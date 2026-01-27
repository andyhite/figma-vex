# Calculation-Based Variables

**Date:** 2026-01-27
**Status:** Proposed

## Overview

Add support for expression-based calculations in Figma variable descriptions. Expressions are evaluated at export time to generate output values, with optional write-back to sync computed values to Figma.

## Example

A variable with description:
```
calc: round(var(--text-font-size-lg) * 1.5); unit: rem
```

Will:
1. Parse the `calc:` expression during export
2. Look up `--text-font-size-lg` across all collections
3. Resolve aliases fully to get the numeric value
4. Evaluate `round(24 * 1.5)` → `36`
5. Format with `rem` unit → `2.25rem` (assuming remBase: 16)
6. Output in CSS/SCSS/JSON/TS as normal
7. Optionally write `36` back to Figma (with expression preserved)

## Expression Syntax

### Description Format

Directives are separated by semicolons. All are optional and can appear in any order:

```
calc: <expression>; unit: <unit>; format: <format>
```

Examples:
```
calc: var(--text-font-size-lg) * 1.5
calc: round(var(--spacing-base) * 1.5); unit: rem
calc: max(var(--min-height), var(--content-height)); unit: px
```

### Variable References

- Use CSS var syntax: `var(--collection-name-variable-name)`
- Cross-collection references allowed
- Names match the CSS output format (kebab-case, collection prefix)

### Supported Operations

| Type | Operations |
|------|------------|
| Arithmetic | `+`, `-`, `*`, `/` |
| Grouping | `(` `)` |
| Functions | `round()`, `floor()`, `ceil()`, `min()`, `max()` |

## Evaluation Pipeline

1. Parse expression from description
2. Extract all `var(--name)` references using regex
3. For each referenced variable:
   - Look up by CSS name across all collections
   - If alias, resolve fully to concrete value
   - If not a number, mark as error
4. Build evaluation context: `{ "var(--spacing-base)": 16, "var(--font-lg)": 24 }`
5. Evaluate expression with expr-eval library
6. Apply unit formatting to result (defaults to source variable's unit if not specified)

### Mode Handling

- Evaluation runs separately for each mode
- Each mode resolves its own variable values
- Result: different calculated values per mode (e.g., desktop vs mobile)

## Error Handling

| Error | Example | Behavior |
|-------|---------|----------|
| Variable not found | `var(--nonexistent)` | Warning, use Figma value |
| Non-numeric variable | `var(--brand-color) * 2` | Warning, use Figma value |
| Circular reference | A → B → A | Warning, use Figma value |
| Syntax error | `var(--x) * * 2` | Warning, use Figma value |
| Division by zero | `var(--x) / 0` | Warning, use Figma value |

### Fallback Strategy

- On any error, fall back to the raw value stored in Figma
- Collect all warnings during evaluation
- Continue processing other variables (don't abort export)

### Warning Display

- Warnings surfaced in the export UI (collapsible list)
- Each warning includes: variable name, expression, error message
- Count badge on export button if warnings exist (e.g., "Export (3 warnings)")

### Circular Reference Detection

- Track visited variables during resolution
- Max depth limit (reuse existing `MAX_ALIAS_DEPTH: 10`)
- If cycle detected, break and report

## Writing Back to Figma

### Trigger Options

1. **Dedicated "Sync Calculations" button** in the plugin UI
2. **Checkbox during export:** "Update Figma variables with calculated values"

### Write-Back Process

1. Evaluate all expressions (per mode)
2. For each calculated variable:
   - Call Figma API: `variable.setValueForMode(modeId, calculatedValue)`
   - Preserve the description (expression remains canonical)
3. Report success/failure count to user

### Expression Preservation

- The `calc:` expression in the description is never modified
- Figma's numeric value is treated as a cache of the computed result
- Re-sync anytime source values change

## Implementation

### Files to Modify

| File | Changes |
|------|---------|
| `packages/shared/src/types/tokens.ts` | Add `expression?: string` to `TokenConfig` |
| `apps/plugin/src/utils/descriptionParser.ts` | Semicolon splitting, extract `calc:` expressions |
| `apps/plugin/src/services/valueResolver.ts` | Call expression evaluator when `expression` is present |
| `packages/shared/src/types/messages.ts` | Add `SYNC_CALCULATIONS` message type |
| `apps/plugin/src/main.ts` | Handle sync message, implement write-back |

### New Files

| File | Purpose |
|------|---------|
| `apps/plugin/src/services/expressionEvaluator.ts` | Core evaluation logic using expr-eval |
| `apps/plugin/src/utils/variableLookup.ts` | Resolve CSS var names to Figma variables |

### Dependencies

- Add `expr-eval` to `apps/plugin/package.json`

### UI Changes (apps/ui)

- Sync button component
- Export checkbox for sync option
- Warnings display component

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Reference syntax | `var(--css-name)` | Matches CSS output, familiar to developers |
| Alias handling | Resolve fully | Calculations need actual numbers |
| Mode handling | Evaluate per mode | Respects mode-specific design decisions |
| Error handling | Fallback + warnings | Non-blocking, allows partial progress |
| Write-back trigger | Button + export checkbox | Flexible, no surprise side effects |
| Expression library | expr-eval | Lightweight, supports custom functions |
| Directive separator | Semicolon | Unambiguous, won't conflict with expressions |
| Unit default | Source variable's unit | Intuitive behavior for scaling operations |
| Cross-collection refs | Allowed | CSS namespace is flat, enables flexibility |
