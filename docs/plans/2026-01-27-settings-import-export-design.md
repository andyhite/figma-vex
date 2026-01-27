# Settings Import/Export Design

## Overview

Add the ability to import and export plugin settings as JSON files, enabling teams to share configuration across Figma documents.

## Goals

- Allow users to export their settings to a portable JSON file
- Allow users to import settings from a JSON file
- Handle document-specific IDs (collections, variables) by storing names/paths instead
- Warn users about any unresolved references on import

## Export Format

```json
{
  "version": 1,
  "exportedAt": "2026-01-27T12:00:00Z",
  "settings": {
    "prefix": "ds",
    "selectedCollections": ["Primitives", "Semantic"],
    "includeCollectionComments": true,
    "syncCalculations": false,
    "includeStyles": true,
    "styleOutputMode": "variables",
    "styleTypes": ["paint", "text", "effect", "grid"],
    "cssSelector": ":root",
    "cssUseModesAsSelectors": false,
    "cssIncludeModeComments": true,
    "cssExportAsCalcExpressions": false,
    "scssExportAsCalcExpressions": false,
    "githubRepository": "org/design-tokens",
    "githubWorkflowFileName": "update-variables.yml",
    "githubExportTypes": ["css", "json"],
    "githubCssSelector": ":root",
    "githubUseModesAsSelectors": false,
    "remBaseVariable": "Primitives/Spacing/Base"
  }
}
```

Key decisions:
- **`version`** field for future schema changes
- **`activeTab`** excluded (UI state, not shareable config)
- **`selectedCollections`** stored as collection names, not IDs
- **`remBaseVariable`** stored as variable path, not ID
- GitHub token excluded (security)

Default filename: `figma-vex-settings.json`

## Import Flow

1. **File picker** opens (accepts `.json` files only)
2. **Parse & validate** the JSON:
   - Check `version` is supported
   - Validate required fields exist
   - Validate field types (e.g., `styleTypes` is an array of valid types)
3. **Resolve names to IDs**:
   - Look up each collection name → find matching collection ID
   - Look up `remBaseVariable` path → find matching variable ID
4. **Show confirmation dialog** with:
   - Summary of settings to be applied
   - Warnings for any unresolved items (e.g., "Collection 'Legacy' not found - will be skipped")
5. **Apply settings** after user confirms

### Error Handling

- Invalid JSON → "Invalid file format" error
- Wrong/missing version → "Unsupported settings file version" error
- No valid settings → "No valid settings found in file" error

## UI Design

Two buttons at the bottom of the Settings tab:

```
┌─────────────────────────────────────┐
│  [Settings tab content as today]    │
│  ...                                │
│                                     │
├─────────────────────────────────────┤
│  ┌───────────────┐ ┌──────────────┐ │
│  │ Export Settings│ │Import Settings│ │
│  └───────────────┘ └──────────────┘ │
└─────────────────────────────────────┘
```

**Export** - Single click downloads the JSON file immediately.

**Import** - Opens file picker, then shows a modal dialog:

```
┌─────────────────────────────────────┐
│  Import Settings                    │
├─────────────────────────────────────┤
│  Ready to import settings from:     │
│  figma-vex-settings.json            │
│                                     │
│  ⚠ Warnings:                        │
│  • Collection "Legacy" not found    │
│                                     │
│  This will replace your current     │
│  settings.                          │
│                                     │
│  ┌────────┐        ┌──────────────┐ │
│  │ Cancel │        │    Import    │ │
│  └────────┘        └──────────────┘ │
└─────────────────────────────────────┘
```

If no warnings, the warnings section is hidden.

## Implementation Architecture

### 1. Shared Types (`packages/shared`)

- Add `ExportableSettings` type (settings without `activeTab`)
- Add `SettingsExportFile` type (with version, exportedAt, settings)
- Add new message types for resolving names ↔ IDs

### 2. Plugin Backend (`apps/plugin`)

- Add `resolve-collection-names` message handler
  - Takes collection names, returns `{name, id, found}[]`
- Add `resolve-variable-path` message handler
  - Takes variable path, returns ID or null
- Reuse existing collection/variable lookup logic

### 3. UI (`apps/ui`)

- Add export function (create JSON, trigger download)
- Add import function with validation logic
- Add modal component for import confirmation/warnings
- Add buttons to `SettingsTab`

File operations use browser APIs:
- Download: Create blob URL, trigger click on hidden anchor
- Upload: Hidden `<input type="file" accept=".json">`
