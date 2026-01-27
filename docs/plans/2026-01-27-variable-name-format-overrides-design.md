# Variable Name Format Overrides

**Date:** 2026-01-27
**Status:** Approved

## Overview

Allow users to define pattern-based rules that transform Figma variable names into custom CSS variable names. Transformed names are synced to Figma's native `codeSyntax.WEB` field, which becomes the source of truth for CSS output.

## User-Facing Changes

### Pattern Matching Rules

Users define glob-style patterns in the Settings tab that match Figma variable paths and transform them:

| Pattern | Replacement | Input | Output |
|---------|-------------|-------|--------|
| `color/*/alpha/*` | `color-$1-a$2` | `color/teal/alpha/2` | `--color-teal-a2` |
| `spacing/*` | `space-$1` | `spacing/md` | `--space-md` |
| `typography/*/size/*` | `type-$1-$2` | `typography/heading/size/lg` | `--type-heading-lg` |

**Pattern Syntax:**
- `*` matches any single path segment (captured as `$1`, `$2`, etc. in order)
- `**` matches zero or more path segments
- Literal segments must match exactly (case-insensitive)
- First matching rule wins; rules checked in list order

### Settings UI

New section in the Settings tab called "Variable Name Overrides":

```
┌─────────────────────────────────────────────────────────────┐
│ Variable Name Overrides                                     │
├─────────────────────────────────────────────────────────────┤
│ ☑ Sync names to Figma code syntax    [Sync Now]            │
├─────────────────────────────────────────────────────────────┤
│ ≡ │ ☑ │ color/*/alpha/*     │ color-$1-a$2      │ [×]     │
│ ≡ │ ☑ │ spacing/*           │ space-$1          │ [×]     │
│ ≡ │ ☐ │ typography/*/size/* │ type-$1-$2        │ [×]     │
├─────────────────────────────────────────────────────────────┤
│                                        [+ Add Rule]         │
├─────────────────────────────────────────────────────────────┤
│ Test: [color/teal/alpha/2        ]                         │
│ Result: color-teal-a2 (Rule 1)                             │
└─────────────────────────────────────────────────────────────┘
```

**UI Elements:**
- **Sync checkbox**: Toggle whether to sync to Figma's `codeSyntax.WEB` on export
- **Sync Now button**: Manual trigger for syncing names to Figma
- **Rule list**: Drag handle, enabled checkbox, pattern input, replacement input, delete button
- **Add Rule button**: Appends new empty rule at bottom
- **Test field**: Type a Figma variable name to preview which rule matches and the output

### Sync Behavior

When sync is enabled:
1. On export (CSS/SCSS): Before generating output, write transformed names to `codeSyntax.WEB`
2. Manual "Sync Now": User can trigger sync without exporting

The sync uses Figma's Plugin API:
```javascript
variable.setVariableCodeSyntax('WEB', '--color-teal-a2')
```

## Technical Design

### Data Model

```typescript
export interface NameFormatRule {
  id: string;           // Unique identifier for reordering/deletion
  pattern: string;      // Glob pattern, e.g., "color/*/alpha/*"
  replacement: string;  // Template, e.g., "color-$1-a$2"
  enabled: boolean;     // Allow toggling rules on/off
}
```

### Pattern Matching Implementation

**Glob-to-Regex Conversion:**

```typescript
// "color/*/alpha/*" becomes /^color\/([^/]+)\/alpha\/([^/]+)$/i

function globToRegex(pattern: string): RegExp {
  const regexStr = pattern
    .replace(/\*\*/g, '{{GLOBSTAR}}')     // Temp placeholder
    .replace(/\*/g, '([^/]+)')             // * → capture single segment
    .replace(/{{GLOBSTAR}}/g, '(.+)')      // ** → capture multiple segments
    .replace(/\//g, '\\/')                 // Escape slashes
  return new RegExp(`^${regexStr}$`, 'i')  // Case-insensitive
}
```

**Replacement Application:**

```typescript
// "color-$1-a$2" with captures ["teal", "2"] → "color-teal-a2"

function applyReplacement(template: string, captures: string[]): string {
  return template.replace(/\$(\d+)/g, (_, index) => {
    const i = parseInt(index, 10) - 1  // $1 → captures[0]
    return captures[i] ?? ''
  })
}
```

**Main Matching Function:**

```typescript
function toCustomCssName(
  figmaName: string,
  rules: NameFormatRule[]
): string | null {
  for (const rule of rules) {
    if (!rule.enabled) continue
    const regex = globToRegex(rule.pattern)
    const match = figmaName.match(regex)
    if (match) {
      const captures = match.slice(1)  // Remove full match
      return applyReplacement(rule.replacement, captures)
    }
  }
  return null  // No match, use default toCssName()
}
```

### Export Integration

```typescript
function getVariableCssName(
  variable: Variable,
  prefix?: string,
  rules?: NameFormatRule[]
): string {
  // 1. Check for codeSyntax.WEB first (set by our sync or manually by user)
  if (variable.codeSyntax?.WEB) {
    return variable.codeSyntax.WEB  // Already includes -- prefix
  }

  // 2. Check for matching rule (fallback if not synced yet)
  if (rules?.length) {
    const customName = toCustomCssName(variable.name, rules)
    if (customName) {
      return prefix ? `--${prefix}-${customName}` : `--${customName}`
    }
  }

  // 3. Fall back to default transformation
  const cssName = toCssName(variable.name)
  return prefix ? `--${prefix}-${cssName}` : `--${cssName}`
}
```

### Figma CodeSyntax Sync

```typescript
async function syncVariableCodeSyntax(
  variables: Variable[],
  rules: NameFormatRule[],
  prefix?: string
): Promise<{ synced: number; skipped: number }> {
  let synced = 0, skipped = 0

  for (const variable of variables) {
    const customName = toCustomCssName(variable.name, rules)

    if (customName) {
      // Apply prefix if set, add -- for CSS custom property
      const cssVarName = prefix
        ? `--${prefix}-${customName}`
        : `--${customName}`

      variable.setVariableCodeSyntax('WEB', cssVarName)
      synced++
    } else {
      skipped++  // No matching rule, leave codeSyntax unchanged
    }
  }

  return { synced, skipped }
}
```

### Compatibility with Calc Expression Feature

Both features use Figma paths for variable references. When `exportAsCalcExpressions` is enabled, the expression formatter should use `codeSyntax.WEB` (if set) when generating `var(--name)` references.

In `expressionFormatter.ts`, update variable reference resolution:
```typescript
function getVariableReference(variable: Variable, prefix?: string): string {
  // Use codeSyntax.WEB if available
  if (variable.codeSyntax?.WEB) {
    return `var(${variable.codeSyntax.WEB})`
  }
  // Fall back to default
  const cssName = toCssName(variable.name)
  const fullName = prefix ? `--${prefix}-${cssName}` : `--${cssName}`
  return `var(${fullName})`
}
```

## Type Changes

### messages.ts

```typescript
// New type
export interface NameFormatRule {
  id: string;
  pattern: string;
  replacement: string;
  enabled: boolean;
}

// Add to PluginSettings
export interface PluginSettings {
  // ... existing fields ...

  // Name format override settings (global)
  nameFormatRules: NameFormatRule[];
  syncCodeSyntax: boolean;
}

// Add to ExportOptions
export interface ExportOptions {
  // ... existing fields ...
  nameFormatRules?: NameFormatRule[];
}

// Add to PluginMessage union
| { type: 'sync-code-syntax'; options: { nameFormatRules: NameFormatRule[]; prefix?: string } }

// Add to UIMessage union
| { type: 'sync-code-syntax-result'; synced: number; skipped: number }
```

### useSettings.ts DEFAULT_SETTINGS

```typescript
export const DEFAULT_SETTINGS: PluginSettings = {
  // ... existing ...
  nameFormatRules: [],
  syncCodeSyntax: true,  // On by default
};
```

## Files to Modify

### New Files

| File | Purpose |
|------|---------|
| `apps/plugin/src/utils/globMatcher.ts` | Glob-to-regex conversion, pattern matching, replacement |
| `apps/ui/src/components/settings/NameFormatRules.tsx` | Rule list UI with drag-reorder, test field |

### Modified Files

| File | Changes |
|------|---------|
| **Types** | |
| `packages/shared/src/types/messages.ts` | Add `NameFormatRule`, update `PluginSettings`, `ExportOptions`, add sync messages |
| **Plugin** | |
| `apps/plugin/src/formatters/nameFormatter.ts` | Add `toCustomCssName()`, `getVariableCssName()` |
| `apps/plugin/src/exporters/cssExporter.ts` | Use `getVariableCssName()` for variable name resolution |
| `apps/plugin/src/exporters/scssExporter.ts` | Use `getVariableCssName()` for variable name resolution |
| `apps/plugin/src/services/exportService.ts` | Pass `nameFormatRules` to exporters, trigger sync if enabled |
| `apps/plugin/src/services/expressionFormatter.ts` | Use `codeSyntax.WEB` when generating `var()` references |
| `apps/plugin/src/main.ts` | Handle `sync-code-syntax` message |
| **UI** | |
| `apps/ui/src/hooks/useSettings.ts` | Add `nameFormatRules`, `syncCodeSyntax` to `DEFAULT_SETTINGS` |
| `apps/ui/src/components/tabs/SettingsTab.tsx` | Add NameFormatRules section and sync checkbox/button |
| `apps/ui/src/App.tsx` | Wire up name format rules state and handlers |

## Implementation Order

**Phase 1: Core Pattern Matching**
1. Add `NameFormatRule` type to `messages.ts`
2. Create `globMatcher.ts` with `globToRegex()`, `applyReplacement()`, `toCustomCssName()`
3. Write unit tests for pattern matching

**Phase 2: Export Integration**
4. Add `getVariableCssName()` to `nameFormatter.ts`
5. Update `cssExporter.ts` to use `getVariableCssName()`
6. Update `scssExporter.ts` similarly
7. Update `exportService.ts` to pass rules through

**Phase 3: Figma Sync**
8. Add `syncVariableCodeSyntax()` function
9. Add message types for sync communication
10. Handle `sync-code-syntax` message in `main.ts`
11. Wire up sync on export (when enabled)

**Phase 4: Settings UI**
12. Add `nameFormatRules`, `syncCodeSyntax` to settings persistence
13. Create `NameFormatRules.tsx` component with drag-reorder
14. Add test input field for previewing matches
15. Integrate into `SettingsTab.tsx`
16. Wire up in `App.tsx`

**Phase 5: Calc Expression Compatibility**
17. Update `expressionFormatter.ts` to use `codeSyntax.WEB` for var() references

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Pattern syntax | Glob with `*` and `**` | More intuitive than regex, sufficient power |
| Capture replacement | Positional `$1`, `$2` | Familiar syntax, concise patterns |
| Conflict resolution | First match wins | Predictable, user controls order |
| Storage location | Figma `codeSyntax.WEB` | Native Figma feature for this purpose |
| Sync timing | On export + manual button | Automatic when it matters, user control too |
| Settings location | Global Settings tab | Applies to all export formats |
