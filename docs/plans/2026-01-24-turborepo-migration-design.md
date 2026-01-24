# Turborepo Migration Design

## Overview

Migrate figma-vex from a single-package repository to a Turborepo monorepo with pnpm workspaces. This provides dependency isolation between the Figma plugin, UI, and GitHub Action, along with better code organization.

## Motivation

- **Dependency isolation**: Currently all dependencies (React, @actions/*, @figma/plugin-typings) are in one package.json, installed everywhere
- **Code organization**: Clear separation between apps and shared code
- **Build caching**: Turborepo caches build outputs, speeding up CI and local development

## Package Structure

```
figma-vex/
├── apps/
│   ├── plugin/           # Figma plugin sandbox code
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   └── src/
│   │       ├── main.ts
│   │       ├── exporters/
│   │       ├── formatters/
│   │       ├── services/
│   │       └── utils/
│   ├── ui/               # React UI for the plugin
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── postcss.config.js
│   │   └── src/
│   │       ├── index.html
│   │       ├── main.tsx
│   │       ├── App.tsx
│   │       ├── components/
│   │       ├── hooks/
│   │       ├── services/
│   │       └── styles/
│   └── action/           # GitHub Action
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── constants.ts
│           ├── files.ts
│           ├── github.ts
│           ├── types.ts
│           ├── git/
│           └── pr/
├── packages/
│   └── shared/           # Shared types, config, messages
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── config.ts
│           └── types/
│               ├── index.ts
│               ├── messages.ts
│               └── tokens.ts
├── turbo.json
├── pnpm-workspace.yaml
├── package.json          # Root - devDeps only
├── manifest.json         # Figma manifest (stays at root)
└── action.yml            # GitHub Action manifest (stays at root)
```

## Dependency Distribution

### Root `package.json`

Shared dev tooling only:

```json
{
  "name": "figma-vex",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "clean": "turbo run clean"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "prettier": "^3.4.0",
    "prettier-plugin-tailwindcss": "^0.6.9",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^10.0.0",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.18.0"
  }
}
```

### `apps/plugin/package.json`

```json
{
  "name": "@figma-vex/plugin",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch --mode development",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@figma-vex/shared": "workspace:*"
  },
  "devDependencies": {
    "@figma/plugin-typings": "^1.90.0",
    "vite": "^6.0.0",
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0"
  }
}
```

### `apps/ui/package.json`

```json
{
  "name": "@figma-vex/ui",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "vite build",
    "dev": "vite build --watch --mode development",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "@figma-vex/shared": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  },
  "devDependencies": {
    "@testing-library/dom": "^10.4.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.6.1",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "autoprefixer": "^10.4.20",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "jsdom": "^24.0.0",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.17",
    "vite": "^6.0.0",
    "vite-plugin-singlefile": "^2.0.3",
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0"
  }
}
```

### `apps/action/package.json`

```json
{
  "name": "@figma-vex/action",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "esbuild src/index.ts --bundle --platform=node --target=node20 --format=cjs --outfile=../../dist/action.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf ../../dist/action.js"
  },
  "dependencies": {
    "@figma-vex/shared": "workspace:*",
    "@actions/core": "^1.10.0",
    "@actions/exec": "^1.1.1",
    "@actions/github": "^6.0.0"
  },
  "devDependencies": {
    "@types/node": "^22.10.0",
    "esbuild": "^0.24.0",
    "vitest": "^3.0.0",
    "@vitest/coverage-v8": "^3.0.0"
  }
}
```

### `packages/shared/package.json`

```json
{
  "name": "@figma-vex/shared",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "build": "tsc --emitDeclarationOnly",
    "test": "vitest run",
    "lint": "eslint src",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "vitest": "^3.0.0"
  }
}
```

## Turborepo Configuration

### `turbo.json`

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", "../../dist/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "dependsOn": ["^build"]
    },
    "typecheck": {
      "dependsOn": ["^build"]
    },
    "clean": {
      "cache": false
    }
  }
}
```

### `pnpm-workspace.yaml`

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

## Build Output Strategy

All three apps output to the root `dist/` folder so `manifest.json` and `action.yml` can reference them without path changes.

```
dist/
├── plugin.js    # From apps/plugin
├── ui.html      # From apps/ui (inlined single file)
└── action.js    # From apps/action
```

### `apps/plugin/vite.config.ts`

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: '../../dist',
    emptyOutDir: false,
    lib: {
      entry: 'src/main.ts',
      fileName: () => 'plugin.js',
      formats: ['es']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'plugin.js'
      }
    }
  }
})
```

### `apps/ui/vite.config.ts`

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: 'src',
  build: {
    outDir: '../../../dist',
    emptyOutDir: false,
    rollupOptions: {
      input: 'src/index.html',
      output: {
        entryFileNames: 'ui.js'
      }
    }
  }
})
```

## Migration Steps

### 1. Initialize Turborepo & workspace

- Add `turbo.json` at root
- Update `pnpm-workspace.yaml`
- Add `turbo` to root devDependencies
- Update root `package.json` scripts

### 2. Create package scaffolding

- Create directory structure: `apps/plugin/`, `apps/ui/`, `apps/action/`, `packages/shared/`
- Add `package.json` and `tsconfig.json` to each package

### 3. Move source files

| From | To |
|------|-----|
| `src/plugin/*` | `apps/plugin/src/` |
| `src/ui/*` | `apps/ui/src/` |
| `src/action/*` | `apps/action/src/` |
| `src/shared/*` | `packages/shared/src/` |
| `src/test/setup.ts` | Duplicate to each app that needs it |

### 4. Update imports

- Change `../shared/` or `../../shared/` imports to `@figma-vex/shared`
- Update any other relative paths between packages

### 5. Move/update config files

| File | Action |
|------|--------|
| `vite.config.ts` | Move to `apps/plugin/`, update paths |
| `vite.config.ui.ts` | Move to `apps/ui/vite.config.ts`, update paths |
| `tsconfig.action.json` | Merge into `apps/action/tsconfig.json` |
| `tailwind.config.js` | Move to `apps/ui/` |
| `postcss.config.js` | Move to `apps/ui/` |
| `vitest.config.ts` | Create per-app configs or keep at root |
| `eslint.config.js` | Keep at root (shared config) |
| `manifest.json` | Keep at root |
| `action.yml` | Keep at root |

### 6. Configure build outputs

- Each app's build config outputs to root `dist/`
- Set `emptyOutDir: false` to avoid apps deleting each other's output
- Verify `manifest.json` paths still work

### 7. Test the migration

```bash
# Link workspaces
pnpm install

# Build all packages
pnpm build

# Run all tests
pnpm test

# Verify Figma plugin works
# (load in Figma from manifest.json)

# Verify GitHub Action works
# (check dist/action.js exists and action.yml paths correct)
```

## File Changes Summary

### Files to delete after migration

- `src/` directory (after moving contents)
- `vite.config.ts` (moved to apps/plugin)
- `vite.config.ui.ts` (moved to apps/ui)
- `tsconfig.action.json` (merged into apps/action)

### Files to keep at root

- `manifest.json`
- `action.yml`
- `eslint.config.js`
- `tsconfig.json` (base config, extended by packages)
- `.prettierrc`, `.prettierignore`
- `.gitignore`
- `README.md`
