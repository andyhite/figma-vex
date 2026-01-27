# Variable Name Formatting Redesign

## Overview

Redesign the variable name formatting feature from "overrides" to a canonical formatting system where pattern rules ARE the formatting mechanism. Every variable matches a rule to get formatted.

## Core Concepts

1. **Pattern rules are the formatting system** - Not overrides on top of a default conversion
2. **Default rule always exists** - `**` pattern catches everything, editable replacement, cannot be deleted
3. **Simple mode** - Prefix + casing dropdowns that modify the default rule
4. **Advanced mode** - Full rules list access with the default rule visually separated at bottom
5. **Unmatched detection** - Show count of variables that don't match any enabled rule

## Data Model

### Settings Structure

```typescript
// In PluginSettings
interface NameFormatterSettings {
  // Simple mode values
  prefix: string;              // e.g., "" or "my-prefix-"
  casing: 'kebab' | 'snake' | 'camel' | 'pascal' | 'lower' | 'upper';

  // Mode toggle
  advancedMode: boolean;

  // Advanced mode values
  rules: NameFormatRule[];     // Custom rules (NOT including default)
  defaultReplacement: string;  // Replacement for the ** pattern, e.g., "${1:kebab}"
}

// NameFormatRule remains the same
interface NameFormatRule {
  id: string;
  pattern: string;
  replacement: string;
  enabled: boolean;
}
```

### Default Values

```typescript
const defaultNameFormatterSettings: NameFormatterSettings = {
  prefix: '',
  casing: 'kebab',
  advancedMode: false,
  rules: [],
  defaultReplacement: '${1:kebab}',
};
```

### Computed Default Replacement (Simple Mode)

When in simple mode, the effective `defaultReplacement` is computed as:
```typescript
const effectiveDefaultReplacement = prefix
  ? `${prefix}\${1:${casing}}`
  : `\${1:${casing}}`;
```

## UI Design

### Simple Mode

```
┌─────────────────────────────────────────────────────────┐
│ Variable Name Formatting                                │
│                                                         │
│ Prefix: [____________]     Casing: [kebab-case ▼]      │
│                                                         │
│ Preview: color/teal/alpha/2 → prefix-color-teal-alpha-2│
│                                                         │
│ □ Enable advanced formatting                            │
│                                                         │
│ ⚠ 3 unmatched variables  [Show ▼]                      │
└─────────────────────────────────────────────────────────┘
```

Components:
- **Prefix input** - Text field, prepended to all variable names
- **Casing dropdown** - Options: kebab-case, snake_case, camelCase, PascalCase, lowercase, UPPERCASE
- **Preview** - Live example showing a sample variable transformation
- **Advanced toggle** - Checkbox to switch to advanced mode
- **Unmatched badge** - Warning with count, expandable to show list (only if > 0)

### Advanced Mode

```
┌─────────────────────────────────────────────────────────┐
│ Variable Name Formatting                                │
│                                                         │
│ ☑ Enable advanced formatting                            │
│                                                         │
│ Rules (first match wins):                               │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ≡ ☑ [color/*/alpha/*____] → [color-$1-a$2_________] │ │
│ │     ✕                                               │ │
│ ├─────────────────────────────────────────────────────┤ │
│ │ ≡ ☑ [spacing/*__________] → [space-$1_____________] │ │
│ │     ✕                                               │ │
│ └─────────────────────────────────────────────────────┘ │
│ [+ Add Rule]                                            │
│                                                         │
│ ─────────────── Default (fallback) ───────────────────  │
│     ** → [${1:kebab}______________________________]     │
│                                                         │
│ Test: [color/teal/alpha/2___] → color-teal-a2 (Rule 1) │
│                                                         │
│ ⚠ 3 unmatched variables  [Show ▼]                      │
└─────────────────────────────────────────────────────────┘
```

Components:
- **Advanced toggle** - Checked, switches back to simple mode when unchecked
- **Rules list** - Draggable, each rule has: drag handle, enable checkbox, pattern input, replacement input, delete button
- **Add Rule button** - Adds new empty rule to the list
- **Default rule** - Visually separated below with a divider, pattern shows "**" (not editable), replacement is editable, no delete button
- **Test field** - Input to test a variable name, shows result and which rule matched
- **Unmatched badge** - Same as simple mode

### Unmatched Variables Expandable

When clicked, the badge expands:
```
⚠ 3 unmatched variables  [Hide ▲]
  • special/variable/name
  • another/unmatched/one
  • third/one
```

## Behavior

### Rule Matching

1. Rules are checked in order (first match wins)
2. Custom rules are checked first
3. Default `**` rule is always last and matches everything
4. Disabled rules are skipped

### Mode Switching

**Simple → Advanced:**
- `advancedMode` set to `true`
- `defaultReplacement` is set to the computed value from prefix + casing
- User now sees and can edit the rules list

**Advanced → Simple:**
- `advancedMode` set to `false`
- Custom rules are preserved but not applied
- `prefix` and `casing` values are used to compute the default replacement
- Warning if custom rules exist? (optional, could just silently preserve them)

### Unmatched Variables

In theory, with the `**` default rule, no variables should be unmatched. However:
- If default rule is disabled (should we allow this?), variables could be unmatched
- If someone creates a rule that somehow excludes variables (edge case)

Decision: The default rule cannot be disabled. It's always enabled. The unmatched count should always be 0 if the system is working correctly, but we show the UI element anyway as a safety check.

## Implementation Steps

### Step 1: Update Types

File: `packages/shared/src/types/messages.ts`

1. Add `NameFormatterSettings` interface or expand `PluginSettings`:
   - Add `casing` field
   - Add `advancedMode` field
   - Add `defaultReplacement` field
   - Keep existing `prefix` and `nameFormatRules` (rename to `rules` for clarity)

2. Add message type for sending variable names from plugin to UI

### Step 2: Update Plugin to Send Variable Names

File: `apps/plugin/src/main.ts`

1. When sending collections data, also send a list of all variable names
2. Add to the `update-collections` message or create a new message type

### Step 3: Update Shared Glob Matcher

File: `packages/shared/src/utils/globMatcher.ts`

1. Update `toCustomCssName` to accept the new settings structure
2. Add function to compute effective default replacement from prefix + casing
3. Add function to find unmatched variables given a list of names and rules

### Step 4: Create New UI Component

File: `apps/ui/src/components/settings/VariableNameFormatting.tsx`

Replace `NameFormatRules.tsx` with a new component that handles both modes:

1. Simple mode UI:
   - Prefix input
   - Casing dropdown
   - Preview
   - Advanced mode checkbox
   - Unmatched badge

2. Advanced mode UI:
   - Rules list (reuse drag/drop logic from existing component)
   - Separated default rule section
   - Test field
   - Unmatched badge

3. Unmatched variables expansion

### Step 5: Update Settings Hook

File: `apps/ui/src/hooks/useSettings.ts`

1. Add state for new settings fields
2. Add handler for casing changes
3. Add handler for advanced mode toggle
4. Compute effective default replacement in simple mode

### Step 6: Update Settings Tab

File: `apps/ui/src/components/tabs/SettingsTab.tsx`

1. Replace `NameFormatRules` with new `VariableNameFormatting` component
2. Pass variable names list for unmatched detection
3. Wire up all the new handlers

### Step 7: Update Export Logic

Files: `apps/plugin/src/exporters/*.ts`

1. Update to use new settings structure
2. Ensure default rule is always applied last
3. Use computed default replacement in simple mode

### Step 8: Testing

1. Test simple mode with various prefix/casing combinations
2. Test advanced mode with custom rules
3. Test mode switching preserves settings correctly
4. Test unmatched variables detection
5. Test that default rule cannot be deleted
6. Test invalid pattern handling (existing functionality)

## File Changes Summary

| File | Change |
|------|--------|
| `packages/shared/src/types/messages.ts` | Add new settings fields |
| `packages/shared/src/utils/globMatcher.ts` | Add helper functions |
| `apps/plugin/src/main.ts` | Send variable names to UI |
| `apps/ui/src/components/settings/VariableNameFormatting.tsx` | New component (replaces NameFormatRules) |
| `apps/ui/src/components/settings/NameFormatRules.tsx` | Delete or rename |
| `apps/ui/src/hooks/useSettings.ts` | Add new state/handlers |
| `apps/ui/src/components/tabs/SettingsTab.tsx` | Use new component |
| `apps/plugin/src/exporters/*.ts` | Update to use new settings |

## Notes

- No migration needed (plugin not published yet)
- The `syncCodeSyntax` feature remains unchanged - it syncs names to Figma's codeSyntax.WEB field
- The existing glob pattern syntax and modifiers remain unchanged
