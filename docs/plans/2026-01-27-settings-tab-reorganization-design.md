# Settings Tab Reorganization Design

## Overview

Reorganize the Settings tab from a flat list of controls into a vertically-tabbed interface with logical groupings. This addresses two pain points: too many settings visible at once, and related settings not being grouped together.

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│ Settings                                            │
├──────────┬──────────────────────────────────────────┤
│          │                                          │
│ General  │  [Content area for selected tab]        │
│          │                                          │
│ Variables│                                          │
│          │                                          │
│ Calc     │                                          │
│          │                                          │
│ Styles   │                                          │
│          │                                          │
│ Backup   │                                          │
│          │                                          │
└──────────┴──────────────────────────────────────────┘
```

- Vertical tabs aligned left (~80px wide)
- Content area fills remaining width
- Active tab visually highlighted
- Compact tab labels to fit narrow plugin width

## Tab Contents

### General Tab

Controls what gets exported and how it's commented.

```
┌─────────────────────────────────────────┐
│ Collections                             │
│ ┌─────────────────────────────────────┐ │
│ │ ☑ Primitives                        │ │
│ │ ☑ Semantic                          │ │
│ │ ☐ Deprecated                        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Comments                                │
│ ☑ Include collection comments           │
│ ☑ Include mode comments                 │
│                                         │
│ Header Banner                           │
│ ┌─────────────────────────────────────┐ │
│ │ /* Auto-generated - do not edit */  │ │
│ └─────────────────────────────────────┘ │
│ (Leave empty for default header)        │
└─────────────────────────────────────────┘
```

**Settings:**
- **Collections** - Multi-select list of variable collections to include
- **Include collection comments** - Adds `/* Collection: name */` comments
- **Include mode comments** - Adds `/* Mode: name */` comments (moved from per-export-tab to global)
- **Header Banner** - Custom text for top of export file; empty uses default auto-generated header

### Variables Tab

Controls how variable names are formatted in exports. Uses the new Variable Name Formatting system from the redesign doc.

**Simple Mode:**
```
┌─────────────────────────────────────────┐
│ Variable Name Formatting                │
│                                         │
│ Prefix: [____________]                  │
│ Casing: [kebab-case ▼]                  │
│                                         │
│ Preview: color/teal/alpha/2             │
│       → prefix-color-teal-alpha-2       │
│                                         │
│ ☐ Enable advanced formatting            │
└─────────────────────────────────────────┘
```

**Advanced Mode:**
```
┌─────────────────────────────────────────┐
│ Variable Name Formatting                │
│                                         │
│ ☑ Enable advanced formatting            │
│                                         │
│ Rules (first match wins):               │
│ ┌─────────────────────────────────────┐ │
│ │ ≡ ☑ [pattern] → [replacement]     ✕│ │
│ │ ≡ ☑ [pattern] → [replacement]     ✕│ │
│ └─────────────────────────────────────┘ │
│ [+ Add Rule]                            │
│                                         │
│ ─────────── Default (fallback) ──────── │
│     ** → [${1:kebab}]                   │
│                                         │
│ Test: [variable/name] → result (Rule N) │
└─────────────────────────────────────────┘
```

**Settings:**
- **Prefix** - Text prepended to all variable names (simple mode)
- **Casing** - Dropdown: kebab-case, snake_case, camelCase, PascalCase, lowercase, UPPERCASE (simple mode)
- **Advanced mode toggle** - Switches between simple and advanced
- **Rules list** - Draggable pattern/replacement rules (advanced mode)
- **Default rule** - Always-present `**` fallback, replacement editable, cannot be deleted
- **Test field** - Live preview of transformation

See `docs/plans/2026-01-27-variable-name-formatting-redesign.md` for full details.

### Calculations Tab

Controls numeric calculation behavior.

```
┌─────────────────────────────────────────┐
│ Rem Base Variable                       │
│ ┌─────────────────────────────────────┐ │
│ │ None (use default)              ▼   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Select a numeric variable to use as     │
│ the base for rem calculations.          │
└─────────────────────────────────────────┘
```

**Settings:**
- **Rem Base Variable** - Dropdown of numeric variables, grouped by collection

### Styles Tab

Controls Figma style export behavior.

```
┌─────────────────────────────────────────┐
│ ☑ Include styles (24 available)         │
│                                         │
│ Output Mode                             │
│ ○ CSS Variables                         │
│ ● CSS Classes                           │
│                                         │
│ Style Types                             │
│ ☑ Paint Styles (colors, gradients) (12) │
│ ☑ Text Styles (typography) (8)          │
│ ☐ Effect Styles (shadows, blurs) (3)    │
│ ☐ Grid Styles (layouts) (1)             │
└─────────────────────────────────────────┘
```

**Settings:**
- **Include styles** - Master toggle with count of available styles
- **Output Mode** - Radio: CSS Variables or CSS Classes
- **Style Types** - Checkboxes for paint, text, effect, grid (with counts, disabled if count is 0)

### Backup Tab

Import and export settings for sharing or backup.

```
┌─────────────────────────────────────────┐
│ Export and import your settings to      │
│ share across files or team members.     │
│                                         │
│ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Export Settings │ │ Import Settings │ │
│ └─────────────────┘ └─────────────────┘ │
│                                         │
│ Exports include: collections, comment   │
│ preferences, naming rules, style        │
│ settings, and calculation options.      │
└─────────────────────────────────────────┘
```

**Actions:**
- **Export Settings** - Downloads JSON file with all settings
- **Import Settings** - Opens file picker to load settings JSON

## Implementation Approach

### New Components

1. **SettingsNavigation** - Vertical tab list component
2. **SettingsPanel** - Container that renders the active tab's content
3. **GeneralSettings** - Content for General tab
4. **VariablesSettings** - Content for Variables tab (wraps VariableNameFormatting)
5. **CalculationsSettings** - Content for Calculations tab
6. **StylesSettings** - Content for Styles tab (refactored from StyleOptions)
7. **BackupSettings** - Content for Backup tab

### State Management

- Add `activeSettingsTab` state to track which sub-tab is selected
- Persist active tab selection in plugin settings
- Existing settings state remains in App.tsx, passed down to sub-components

### Migration Notes

- `includeModeComments` moves from per-export-tab to global settings
- Remove mode comments checkbox from CssTab, ScssTab, etc.
- Add `headerBanner` to PluginSettings type
- Existing `NameFormatRules` component replaced by `VariableNameFormatting` (per separate design doc)

## File Changes Summary

| File | Change |
|------|--------|
| `apps/ui/src/components/tabs/SettingsTab.tsx` | Replace flat list with tabbed layout |
| `apps/ui/src/components/settings/SettingsNavigation.tsx` | New - vertical tab navigation |
| `apps/ui/src/components/settings/GeneralSettings.tsx` | New - General tab content |
| `apps/ui/src/components/settings/VariablesSettings.tsx` | New - Variables tab content |
| `apps/ui/src/components/settings/CalculationsSettings.tsx` | New - Calculations tab content |
| `apps/ui/src/components/settings/StylesSettings.tsx` | New - Styles tab content (refactor StyleOptions) |
| `apps/ui/src/components/settings/BackupSettings.tsx` | New - Backup tab content |
| `apps/ui/src/components/tabs/CssTab.tsx` | Remove includeModeComments checkbox |
| `apps/ui/src/components/tabs/ScssTab.tsx` | Remove includeModeComments checkbox |
| `apps/ui/src/components/tabs/TypeScriptTab.tsx` | Remove includeModeComments if present |
| `apps/ui/src/components/tabs/JsonTab.tsx` | Remove includeModeComments if present |
| `packages/shared/src/types/messages.ts` | Add `headerBanner`, `includeModeComments` to PluginSettings |
| `apps/plugin/src/exporters/cssExporter.ts` | Use custom header banner if provided |
| `apps/plugin/src/exporters/scssExporter.ts` | Use custom header banner if provided |

## Dependencies

This design should be implemented after:
- `2026-01-27-variable-name-formatting-redesign.md` - The Variables tab depends on the new formatting system
