# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Vex is a Figma plugin that exports variables to CSS custom properties, SCSS, JSON (Style Dictionary format), and TypeScript with configurable units and color formats. It features a React-based UI, GitHub integration for CI/CD workflows, and a corresponding GitHub Action.

## Commands

```bash
# Install dependencies
pnpm install

# Build all packages (outputs to dist/)
pnpm build

# Watch mode for development
pnpm dev

# Run all tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests for a specific package
pnpm --filter @figma-vex/plugin test
pnpm --filter @figma-vex/ui test

# Watch tests for a specific package
pnpm --filter @figma-vex/plugin test:watch

# Type checking
pnpm typecheck

# Lint
pnpm lint
pnpm lint:fix

# Format
pnpm format
pnpm format:check
```

## Architecture

### Monorepo Structure (Turborepo + pnpm workspaces)

- **apps/plugin** - Figma plugin backend (runs in Figma's sandbox)
- **apps/ui** - React UI (runs in iframe, bundled as single HTML file)
- **apps/action** - GitHub Action for CI/CD
- **packages/shared** - Shared types, config, and utilities

### Plugin-UI Communication

The plugin and UI communicate via typed messages defined in `packages/shared/src/types/messages.ts`:
- `PluginMessage` - Messages from UI to plugin (e.g., `export-css`, `save-settings`)
- `UIMessage` - Messages from plugin to UI (e.g., `css-result`, `error`)

**UI side**: `apps/ui/src/services/pluginBridge.ts` provides `postMessage()` and `onMessage()`
**Plugin side**: `apps/plugin/src/main.ts` handles messages via `figma.ui.onmessage`

### Key Plugin Modules

- **exporters/** - Format-specific exporters (CSS, SCSS, JSON, TypeScript)
- **formatters/** - Color, name, and number formatting
- **services/** - GitHub integration, value resolution, expression evaluation
- **utils/** - Description parser (reads `unit:`, `format:`, `expression:` from variable descriptions), glob matching for name format rules

### Key UI Patterns

- Tab-based interface with export format tabs (CSS, SCSS, JSON, TypeScript, GitHub) plus Settings and Help
- Custom hooks in `apps/ui/src/hooks/` for plugin communication, settings persistence, and UI state
- Settings are persisted to Figma document via `figma.root.setPluginData()`

### Build Output

All packages build to the root `dist/` directory:
- `dist/plugin.js` - Plugin backend (IIFE format)
- `dist/index.html` - React UI (single file with inlined assets via vite-plugin-singlefile)
- `dist/action.js` - GitHub Action

### Variable Name Formatting

Name format rules use glob patterns to transform Figma variable names to CSS variable names. Rules are defined in `NameFormatRule` interface with pattern/replacement pairs. The default rule (`**`) applies prefix and casing to all unmatched variables.

### Expression Support

Variables can have calculated values using `expression:` in their description field (e.g., `expression: 'Spacing/base' * 2`). The expression evaluator in `apps/plugin/src/services/expressionEvaluator.ts` resolves variable references and evaluates expressions.

## Testing

Tests use Vitest and are co-located with source files (`*.test.ts`/`*.test.tsx`). UI tests use `@testing-library/react`.

```bash
# Run a single test file
pnpm --filter @figma-vex/plugin exec vitest run src/formatters/colorFormatter.test.ts

# Run tests matching a pattern
pnpm --filter @figma-vex/plugin exec vitest run -t "hex format"
```

## Loading the Plugin in Figma

1. Build the plugin: `pnpm build`
2. In Figma: Plugins > Development > Import plugin from manifest...
3. Select `manifest.json` from the repo root
