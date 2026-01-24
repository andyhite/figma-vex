# Figma-Vex Plugin Rewrite - Implementation Plan

**Status:** 🟡 Ready to Start  
**Created:** 2026-01-23  
**Goal:** Complete modular rewrite with React UI, Vite build system, and comprehensive tests

---

## 📋 Overview

This implementation plan breaks down the rewrite into 5 phases with 50+ trackable tasks. Each task follows TDD (Test-Driven Development) where applicable.

### Migration Summary

| From                             | To                                    |
| -------------------------------- | ------------------------------------- |
| Monolithic `main.ts` (978 lines) | Modular backend (15+ focused modules) |
| Monolithic `ui.html` (982 lines) | React component-based UI              |
| Plain `tsc` build                | Vite dual-build configuration         |
| No tests                         | Comprehensive Vitest coverage         |
| No tooling                       | ESLint 9, Prettier, TypeScript strict |

---

## 🎯 Phase 1: Project Setup & Build Tooling

**Goal:** Establish modern build infrastructure and development environment

### ✅ Task 1.1: Initialize New Package Configuration

- [ ] Update `package.json` with React 19, Vite 6, Vitest dependencies
- [ ] Create `.npmrc` for consistent package management
- [ ] Run `pnpm install`
- [ ] Commit changes

**Files:** `package.json`, `.npmrc`

### ✅ Task 1.2: Configure Vite for Plugin Backend

- [ ] Create `vite.config.ts` for plugin backend build
- [ ] Configure library mode with ES output
- [ ] Set up path aliases (`@plugin`, `@shared`)
- [ ] Commit changes

**Files:** `vite.config.ts`

### ✅ Task 1.3: Configure Vite for React UI

- [ ] Create `vite.config.ui.ts` for UI build
- [ ] Configure React plugin and single-file output
- [ ] Set up path aliases (`@ui`, `@shared`)
- [ ] Commit changes

**Files:** `vite.config.ui.ts`

### ✅ Task 1.4: Configure TypeScript

- [ ] Update `tsconfig.json` for React + Vite
- [ ] Create `tsconfig.node.json` for config files
- [ ] Configure path aliases and strict mode
- [ ] Commit changes

**Files:** `tsconfig.json`, `tsconfig.node.json`

### ✅ Task 1.5: Configure Tailwind CSS

- [ ] Create `tailwind.config.js` with Figma design tokens
- [ ] Create `postcss.config.js`
- [ ] Create `src/ui/styles/globals.css` with base styles
- [ ] Commit changes

**Files:** `tailwind.config.js`, `postcss.config.js`, `src/ui/styles/globals.css`

### ✅ Task 1.6: Configure ESLint

- [ ] Create `eslint.config.js` (flat config)
- [ ] Configure TypeScript ESLint, React, React Hooks
- [ ] Set up Prettier integration
- [ ] Commit changes

**Files:** `eslint.config.js`

### ✅ Task 1.7: Configure Prettier

- [ ] Create `.prettierrc` with Tailwind plugin
- [ ] Create `.prettierignore`
- [ ] Commit changes

**Files:** `.prettierrc`, `.prettierignore`

### ✅ Task 1.8: Configure Vitest

- [ ] Create `vitest.config.ts` with coverage
- [ ] Create `src/test/setup.ts` with Figma API mocks
- [ ] Commit changes

**Files:** `vitest.config.ts`, `src/test/setup.ts`

### ✅ Task 1.9: Create Directory Structure

- [ ] Create all required directories:
  - `src/plugin/{formatters,exporters,services,utils,types,config}`
  - `src/shared/types`
  - `src/ui/{components/{common,tabs},hooks,services,styles}`
- [ ] Create `.gitkeep` files
- [ ] Commit changes

### ✅ Task 1.10: Update Manifest

- [ ] Update `manifest.json` to point to new build outputs
- [ ] Set `main` to `dist/main.js`
- [ ] Set `ui` to `dist/index.html`
- [ ] Commit changes

**Files:** `manifest.json`

---

## 🎯 Phase 2: Shared Types

**Goal:** Establish type-safe communication contract between plugin and UI

### ✅ Task 2.1: Create Shared Message Types

- [ ] Write tests for message types (`messages.test.ts`)
- [ ] Create `src/shared/types/messages.ts` with:
  - `ExportType`, `ExportOptions`, `GitHubDispatchOptions`
  - `PluginMessage` (UI → Plugin)
  - `UIMessage` (Plugin → UI)
- [ ] Create `src/shared/types/index.ts` barrel export
- [ ] Verify tests pass
- [ ] Commit changes

**Files:** `src/shared/types/messages.ts`, `src/shared/types/messages.test.ts`, `src/shared/types/index.ts`

### ✅ Task 2.2: Create Token Configuration Types

- [ ] Write tests for token config (`tokens.test.ts`)
- [ ] Create `src/shared/types/tokens.ts` with:
  - `Unit`, `ColorFormat`, `TokenConfig`
  - `DEFAULT_CONFIG` constant
- [ ] Update `src/shared/types/index.ts`
- [ ] Verify tests pass
- [ ] Commit changes

**Files:** `src/shared/types/tokens.ts`, `src/shared/types/tokens.test.ts`

---

## 🎯 Phase 3: Plugin Backend Modules

**Goal:** Refactor monolithic plugin code into focused, testable modules

### ✅ Task 3.1: Create Description Parser

- [ ] Write tests (`descriptionParser.test.ts`)
- [ ] Create `src/plugin/utils/descriptionParser.ts`
- [ ] Implement `parseDescription`, `UNIT_REGEX`, `FORMAT_REGEX`
- [ ] Verify tests pass
- [ ] Commit changes

**Files:** `src/plugin/utils/descriptionParser.ts`, `src/plugin/utils/descriptionParser.test.ts`

### ✅ Task 3.2: Create Name Formatter

- [ ] Write tests (`nameFormatter.test.ts`)
- [ ] Create `src/plugin/formatters/nameFormatter.ts`
- [ ] Implement `toCssName`, `toPrefixedName`
- [ ] Verify tests pass
- [ ] Commit changes

**Files:** `src/plugin/formatters/nameFormatter.ts`, `src/plugin/formatters/nameFormatter.test.ts`

### ✅ Task 3.3: Create Color Formatter

- [ ] Write tests (`colorFormatter.test.ts`)
- [ ] Create `src/plugin/formatters/colorFormatter.ts`
- [ ] Implement color conversion functions:
  - `rgbToHex`, `rgbToRgbString`, `rgbToHsl`, `rgbToOklch`, `formatColor`
- [ ] Verify tests pass
- [ ] Commit changes

**Files:** `src/plugin/formatters/colorFormatter.ts`, `src/plugin/formatters/colorFormatter.test.ts`

### ✅ Task 3.4: Create Number Formatter

- [ ] Write tests (`numberFormatter.test.ts`)
- [ ] Create `src/plugin/formatters/numberFormatter.ts`
- [ ] Implement `cleanNumber`, `formatNumber` with unit conversion
- [ ] Verify tests pass
- [ ] Commit changes

**Files:** `src/plugin/formatters/numberFormatter.ts`, `src/plugin/formatters/numberFormatter.test.ts`

### ✅ Task 3.5: Create Formatter Index

- [ ] Create `src/plugin/formatters/index.ts` barrel export
- [ ] Commit changes

**Files:** `src/plugin/formatters/index.ts`

### ✅ Task 3.6: Create Value Resolver Service

- [ ] Write tests (`valueResolver.test.ts`)
- [ ] Create `src/plugin/services/valueResolver.ts`
- [ ] Implement `resolveValue` with alias handling and circular reference detection
- [ ] Verify tests pass
- [ ] Commit changes

**Files:** `src/plugin/services/valueResolver.ts`, `src/plugin/services/valueResolver.test.ts`

### ✅ Task 3.7: Create CSS Exporter

- [ ] Write tests (`cssExporter.test.ts`)
- [ ] Create `src/plugin/exporters/cssExporter.ts`
- [ ] Implement `exportToCss`, `generateCssHeader`
- [ ] Support modes as selectors, prefixes, collection filtering
- [ ] Verify tests pass
- [ ] Commit changes

**Files:** `src/plugin/exporters/cssExporter.ts`, `src/plugin/exporters/cssExporter.test.ts`

### ✅ Task 3.8: Create SCSS Exporter

- [ ] Write tests (`scssExporter.test.ts`)
- [ ] Create `src/plugin/exporters/scssExporter.ts`
- [ ] Implement `exportToScss`, `generateScssHeader`
- [ ] Convert `var()` references to SCSS variable references
- [ ] Verify tests pass
- [ ] Commit changes

**Files:** `src/plugin/exporters/scssExporter.ts`, `src/plugin/exporters/scssExporter.test.ts`

### ✅ Task 3.9: Create JSON Exporter

- [ ] Write tests (`jsonExporter.test.ts`)
- [ ] Create `src/plugin/exporters/jsonExporter.ts`
- [ ] Implement `exportToJson` with DTCG format support
- [ ] Handle nested paths, multi-mode collections, variable aliases
- [ ] Verify tests pass
- [ ] Commit changes

**Files:** `src/plugin/exporters/jsonExporter.ts`, `src/plugin/exporters/jsonExporter.test.ts`

### ✅ Task 3.10: Create TypeScript Exporter

- [ ] Write tests (`typescriptExporter.test.ts`)
- [ ] Create `src/plugin/exporters/typescriptExporter.ts`
- [ ] Implement `exportToTypeScript`, `generateTypeScriptHeader`
- [ ] Generate CSS variable name types and csstype augmentation
- [ ] Verify tests pass
- [ ] Commit changes

**Files:** `src/plugin/exporters/typescriptExporter.ts`, `src/plugin/exporters/typescriptExporter.test.ts`

### ✅ Task 3.11: Create Exporter Index

- [ ] Create `src/plugin/exporters/index.ts` barrel export
- [ ] Commit changes

**Files:** `src/plugin/exporters/index.ts`

### ✅ Task 3.12: Create GitHub Service

- [ ] Write tests (`githubService.test.ts`)
- [ ] Create `src/plugin/services/githubService.ts`
- [ ] Implement:
  - `validateGitHubOptions`
  - `buildDispatchPayload`
  - `parseGitHubError`
  - `sendGitHubDispatch`
- [ ] Verify tests pass
- [ ] Commit changes

**Files:** `src/plugin/services/githubService.ts`, `src/plugin/services/githubService.test.ts`

### ✅ Task 3.13: Create Services Index

- [ ] Create `src/plugin/services/index.ts` barrel export
- [ ] Commit changes

**Files:** `src/plugin/services/index.ts`

### ✅ Task 3.14: Create Plugin Main Entry Point

- [ ] Create `src/plugin/main.ts`
- [ ] Implement message routing for all export types
- [ ] Handle `get-collections`, `export-*`, `github-dispatch`, `cancel`
- [ ] Set up error handling and UI communication
- [ ] Commit changes

**Files:** `src/plugin/main.ts`

---

## 🎯 Phase 4: React UI

**Goal:** Replace monolithic HTML UI with React component-based architecture

### ✅ Task 4.1: Create HTML Entry Point

- [ ] Create `src/ui/index.html`
- [ ] Set up React root div
- [ ] Import global styles
- [ ] Commit changes

**Files:** `src/ui/index.html`

### ✅ Task 4.2: Create React App Shell

- [ ] Create `src/ui/main.tsx` (React entry point)
- [ ] Create `src/ui/App.tsx` with tab structure
- [ ] Set up React 19 with JSX transform
- [ ] Commit changes

**Files:** `src/ui/main.tsx`, `src/ui/App.tsx`

### ✅ Task 4.3: Create Plugin Bridge Service

- [ ] Create `src/ui/services/pluginBridge.ts`
- [ ] Implement `postMessage`, `onMessage` helpers
- [ ] Type-safe message handling
- [ ] Commit changes

**Files:** `src/ui/services/pluginBridge.ts`

### ✅ Task 4.4: Create usePluginMessage Hook

- [ ] Create `src/ui/hooks/usePluginMessage.ts`
- [ ] Implement hook for sending/receiving messages
- [ ] Handle error states
- [ ] Commit changes

**Files:** `src/ui/hooks/usePluginMessage.ts`

### ✅ Task 4.5: Create useCollections Hook

- [ ] Create `src/ui/hooks/useCollections.ts`
- [ ] Fetch collections on mount
- [ ] Manage selected collections state
- [ ] Commit changes

**Files:** `src/ui/hooks/useCollections.ts`

### ✅ Task 4.6: Create useClipboard Hook

- [ ] Create `src/ui/hooks/useClipboard.ts`
- [ ] Implement clipboard copy with fallback
- [ ] Handle success/error states
- [ ] Commit changes

**Files:** `src/ui/hooks/useClipboard.ts`

### ✅ Task 4.7: Create Common Components - Button

- [ ] Create `src/ui/components/common/Button.tsx`
- [ ] Support primary/secondary variants
- [ ] Style with Tailwind
- [ ] Commit changes

**Files:** `src/ui/components/common/Button.tsx`

### ✅ Task 4.8: Create Common Components - Checkbox

- [ ] Create `src/ui/components/common/Checkbox.tsx`
- [ ] Style with Tailwind
- [ ] Commit changes

**Files:** `src/ui/components/common/Checkbox.tsx`

### ✅ Task 4.9: Create Common Components - Input

- [ ] Create `src/ui/components/common/Input.tsx`
- [ ] Support text/password types
- [ ] Style with Tailwind
- [ ] Commit changes

**Files:** `src/ui/components/common/Input.tsx`

### ✅ Task 4.10: Create Common Components - StatusMessage

- [ ] Create `src/ui/components/common/StatusMessage.tsx`
- [ ] Support success/error states
- [ ] Style with Tailwind
- [ ] Commit changes

**Files:** `src/ui/components/common/StatusMessage.tsx`

### ✅ Task 4.11: Create Common Components - OutputArea

- [ ] Create `src/ui/components/common/OutputArea.tsx`
- [ ] Textarea with monospace font
- [ ] Style with Tailwind
- [ ] Commit changes

**Files:** `src/ui/components/common/OutputArea.tsx`

### ✅ Task 4.12: Create Tab Components

- [ ] Create `src/ui/components/tabs/TabBar.tsx`
- [ ] Create `src/ui/components/tabs/TabPanel.tsx`
- [ ] Implement tab switching logic
- [ ] Style with Tailwind
- [ ] Commit changes

**Files:** `src/ui/components/tabs/TabBar.tsx`, `src/ui/components/tabs/TabPanel.tsx`

### ✅ Task 4.13: Create Export Tab Components

- [ ] Create `src/ui/components/tabs/CssTab.tsx`
- [ ] Create `src/ui/components/tabs/ScssTab.tsx`
- [ ] Create `src/ui/components/tabs/JsonTab.tsx`
- [ ] Create `src/ui/components/tabs/TypeScriptTab.tsx`
- [ ] Each with export, copy, download functionality
- [ ] Commit changes

**Files:** `src/ui/components/tabs/CssTab.tsx`, `src/ui/components/tabs/ScssTab.tsx`, `src/ui/components/tabs/JsonTab.tsx`, `src/ui/components/tabs/TypeScriptTab.tsx`

### ✅ Task 4.14: Create GitHub Tab Component

- [ ] Create `src/ui/components/tabs/GitHubTab.tsx`
- [ ] Form for repository, token, workflow file
- [ ] Export type checkboxes
- [ ] CSS options when CSS is selected
- [ ] Dispatch handler
- [ ] Commit changes

**Files:** `src/ui/components/tabs/GitHubTab.tsx`

### ✅ Task 4.15: Create Help Tab Component

- [ ] Create `src/ui/components/tabs/HelpTab.tsx`
- [ ] Documentation for description field format
- [ ] Unit and color format examples
- [ ] Style with Tailwind
- [ ] Commit changes

**Files:** `src/ui/components/tabs/HelpTab.tsx`

### ✅ Task 4.16: Integrate App Component

- [ ] Update `src/ui/App.tsx` to use all tab components
- [ ] Add common options (prefix, collections)
- [ ] Implement tab state management
- [ ] Wire up all functionality
- [ ] Commit changes

**Files:** `src/ui/App.tsx`

---

## 🎯 Phase 5: Integration & Polish

**Goal:** Verify everything works together and clean up

### ✅ Task 5.1: Verify Full Build

- [ ] Run `pnpm build`
- [ ] Verify both plugin and UI build successfully
- [ ] Check `dist/main.js` and `dist/index.html` exist
- [ ] Commit if needed

### ✅ Task 5.2: Run All Tests

- [ ] Run `pnpm test:coverage`
- [ ] Verify all tests pass
- [ ] Review coverage report
- [ ] Commit if needed

### ✅ Task 5.3: Run Linting and Formatting

- [ ] Run `pnpm lint`
- [ ] Fix any linting errors
- [ ] Run `pnpm format`
- [ ] Commit formatting changes

### ✅ Task 5.4: Clean Up Old Files

- [ ] Remove `src/main.ts` (old plugin entry)
- [ ] Remove `ui.html` (old UI)
- [ ] Verify `.gitignore` includes `dist/`
- [ ] Commit cleanup

### ✅ Task 5.5: Final Integration Test

- [ ] Build plugin: `pnpm build`
- [ ] Test in Figma:
  - Import plugin from manifest
  - Verify all tabs render
  - Test CSS export
  - Test SCSS export
  - Test JSON export
  - Test TypeScript export
  - Test GitHub dispatch
  - Verify copy/download functionality
- [ ] Fix any issues found
- [ ] Commit final fixes

---

## 📊 Progress Tracking

### Phase Completion

- [ ] Phase 1: Project Setup & Build Tooling (10 tasks)
- [ ] Phase 2: Shared Types (2 tasks)
- [ ] Phase 3: Plugin Backend Modules (14 tasks)
- [ ] Phase 4: React UI (16 tasks)
- [ ] Phase 5: Integration & Polish (5 tasks)

### Overall Progress

- **Total Tasks:** 47
- **Completed:** 0
- **In Progress:** 0
- **Remaining:** 47

---

## 🚀 Quick Start Commands

```bash
# Install dependencies
pnpm install

# Development (watch mode)
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Lint code
pnpm lint

# Format code
pnpm format

# Type check
pnpm typecheck

# Clean build artifacts
pnpm clean
```

---

## 📝 Notes

- **TDD Approach:** All backend modules follow Test-Driven Development (write test first, then implementation)
- **Commits:** Each task should be committed independently for clear history
- **Testing:** Focus on unit tests for pure functions, integration tests for exporters
- **UI Testing:** React components can be tested with React Testing Library (optional but recommended)

---

## 🔗 Related Documents

- [Detailed Implementation Plan](./2026-01-23-figma-vex-rewrite.md) - Full task details with code examples
- [README.md](../../README.md) - Project overview

---

**Last Updated:** 2026-01-23
