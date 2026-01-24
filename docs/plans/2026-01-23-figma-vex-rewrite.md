# Figma-Vex Plugin Rewrite Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rewrite the Figma-Vex plugin with a modular backend, React + Tailwind UI, Vite build system, and comprehensive test coverage.

**Architecture:** Dual Vite build configuration - one for the plugin backend (running in Figma's sandbox) and one for the React UI (running in an iframe). Shared types between both. Plugin code organized into focused modules (formatters, exporters, services). React UI with component-based architecture and custom hooks for plugin communication.

**Tech Stack:** TypeScript, React 19, Tailwind CSS, Vite 6, Vitest, ESLint 9, Prettier

---

## Phase 1: Project Setup & Build Tooling

### Task 1.1: Initialize New Package Configuration

**Files:**

- Modify: `package.json`
- Create: `.npmrc`

**Step 1: Update package.json with new dependencies and scripts**

Replace `package.json` with:

```json
{
  "name": "figma-vex",
  "version": "2.0.0",
  "description": "Figma Variables Export Plugin - Export design tokens to CSS, SCSS, JSON, and TypeScript",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"vite build --watch --mode development\" \"vite build --watch --mode development --config vite.config.ui.ts\"",
    "build": "vite build && vite build --config vite.config.ui.ts",
    "test": "vitest",
    "test:coverage": "vitest --coverage",
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist"
  },
  "keywords": ["figma", "plugin", "variables", "design-tokens", "css", "scss"],
  "author": "",
  "license": "MIT",
  "devDependencies": {
    "@figma/plugin-typings": "^1.90.0",
    "@testing-library/dom": "^10.4.0",
    "@testing-library/react": "^16.1.0",
    "@types/node": "^22.10.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "@vitest/coverage-v8": "^3.0.0",
    "autoprefixer": "^10.4.20",
    "concurrently": "^9.1.0",
    "eslint": "^9.17.0",
    "eslint-config-prettier": "^10.0.0",
    "eslint-plugin-react": "^7.37.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "postcss": "^8.4.49",
    "prettier": "^3.4.0",
    "prettier-plugin-tailwindcss": "^0.6.9",
    "tailwindcss": "^3.4.17",
    "typescript": "^5.7.0",
    "typescript-eslint": "^8.18.0",
    "vite": "^6.0.0",
    "vite-plugin-singlefile": "^2.0.3",
    "vitest": "^3.0.0"
  },
  "dependencies": {
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

**Step 2: Create .npmrc for consistent package management**

```
engine-strict=true
auto-install-peers=true
```

**Step 3: Run install**

Run: `pnpm install`
Expected: Dependencies installed successfully

**Step 4: Commit**

```bash
git add package.json .npmrc pnpm-lock.yaml
git commit -m "chore: update dependencies for React + Vite rewrite"
```

---

### Task 1.2: Configure Vite for Plugin Backend

**Files:**

- Create: `vite.config.ts`

**Step 1: Create the plugin backend Vite config**

```typescript
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/plugin/main.ts'),
      formats: ['es'],
      fileName: () => 'main.js',
    },
    outDir: 'dist',
    emptyDirOnBuildStart: false,
    sourcemap: false,
    minify: false,
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
  resolve: {
    alias: {
      '@plugin': resolve(__dirname, 'src/plugin'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});
```

**Step 2: Commit**

```bash
git add vite.config.ts
git commit -m "chore: add Vite config for plugin backend"
```

---

### Task 1.3: Configure Vite for React UI

**Files:**

- Create: `vite.config.ui.ts`

**Step 1: Create the UI Vite config**

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  root: 'src/ui',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyDirOnBuildStart: false,
    target: 'esnext',
    assetsInlineLimit: 100000000,
    chunkSizeWarningLimit: 100000000,
    cssCodeSplit: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/ui/index.html'),
      output: {
        inlineDynamicImports: true,
        entryFileNames: '[name].js',
      },
    },
  },
  resolve: {
    alias: {
      '@ui': resolve(__dirname, 'src/ui'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});
```

**Step 2: Commit**

```bash
git add vite.config.ui.ts
git commit -m "chore: add Vite config for React UI"
```

---

### Task 1.4: Configure TypeScript

**Files:**

- Modify: `tsconfig.json`
- Create: `tsconfig.node.json`

**Step 1: Update main tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "paths": {
      "@plugin/*": ["./src/plugin/*"],
      "@ui/*": ["./src/ui/*"],
      "@shared/*": ["./src/shared/*"]
    },
    "types": ["@figma/plugin-typings", "node"]
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"],
  "exclude": ["node_modules", "dist"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

**Step 2: Create tsconfig.node.json for Vite configs**

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vite.config.ui.ts"]
}
```

**Step 3: Commit**

```bash
git add tsconfig.json tsconfig.node.json
git commit -m "chore: update TypeScript config for Vite + React"
```

---

### Task 1.5: Configure Tailwind CSS

**Files:**

- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `src/ui/styles/globals.css`

**Step 1: Create Tailwind config**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/ui/**/*.{ts,tsx,html}'],
  theme: {
    extend: {
      colors: {
        figma: {
          bg: '#1e1e1e',
          'bg-secondary': '#2c2c2c',
          'bg-tertiary': '#353535',
          border: '#3c3c3c',
          'border-hover': '#4c4c4c',
          text: '#ffffff',
          'text-secondary': '#b3b3b3',
          'text-tertiary': '#666666',
          primary: '#18a0fb',
          'primary-hover': '#0d8de5',
          'primary-active': '#0a7acc',
          success: '#1bc47d',
          error: '#f24822',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['SF Mono', 'Monaco', 'Courier New', 'monospace'],
      },
      fontSize: {
        '2xs': ['10px', '1.4'],
        xs: ['11px', '1.4'],
        sm: ['13px', '1.4'],
      },
    },
  },
  plugins: [],
};
```

**Step 2: Create PostCSS config**

```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Step 3: Create global styles**

Create directory and file:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  * {
    box-sizing: border-box;
  }

  body {
    @apply m-0 bg-figma-bg p-0 font-sans text-xs text-figma-text antialiased;
  }

  ::-webkit-scrollbar {
    @apply h-2 w-2;
  }

  ::-webkit-scrollbar-track {
    @apply bg-figma-bg;
  }

  ::-webkit-scrollbar-thumb {
    @apply rounded bg-figma-border-hover;
  }

  ::-webkit-scrollbar-thumb:hover {
    @apply bg-[#5c5c5c];
  }
}

@layer components {
  .btn {
    @apply cursor-pointer rounded border-none px-3 py-1.5 text-xs font-medium transition-all;
  }

  .btn-primary {
    @apply btn bg-figma-primary text-white hover:bg-figma-primary-hover active:bg-figma-primary-active;
  }

  .btn-secondary {
    @apply btn border border-figma-border bg-figma-bg-secondary text-white hover:border-figma-border-hover hover:bg-figma-bg-tertiary active:bg-figma-bg;
  }

  .input {
    @apply w-full rounded border border-figma-border bg-figma-bg-secondary px-2 py-1.5 font-mono text-xs text-figma-text transition-colors;
    @apply focus:border-figma-primary focus:outline-none;
    @apply placeholder:text-figma-text-tertiary;
  }

  .checkbox {
    @apply h-3.5 w-3.5 cursor-pointer accent-figma-primary;
  }
}
```

**Step 4: Commit**

```bash
mkdir -p src/ui/styles
git add tailwind.config.js postcss.config.js src/ui/styles/globals.css
git commit -m "chore: configure Tailwind CSS with Figma design tokens"
```

---

### Task 1.6: Configure ESLint

**Files:**

- Create: `eslint.config.js`

**Step 1: Create ESLint flat config**

```javascript
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/prop-types': 'off',
    },
  },
  prettier,
  {
    ignores: ['dist/**', 'node_modules/**', '*.config.js', '*.config.ts'],
  }
);
```

**Step 2: Commit**

```bash
git add eslint.config.js
git commit -m "chore: configure ESLint 9 with TypeScript and React"
```

---

### Task 1.7: Configure Prettier

**Files:**

- Create: `.prettierrc`
- Create: `.prettierignore`

**Step 1: Create Prettier config**

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "plugins": ["prettier-plugin-tailwindcss"]
}
```

**Step 2: Create Prettier ignore**

```
dist/
node_modules/
pnpm-lock.yaml
```

**Step 3: Commit**

```bash
git add .prettierrc .prettierignore
git commit -m "chore: configure Prettier with Tailwind plugin"
```

---

### Task 1.8: Configure Vitest

**Files:**

- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

**Step 1: Create Vitest config**

```typescript
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'dist/', 'src/test/', '*.config.*'],
    },
    setupFiles: ['src/test/setup.ts'],
  },
  resolve: {
    alias: {
      '@plugin': resolve(__dirname, 'src/plugin'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});
```

**Step 2: Create test setup file**

```typescript
// src/test/setup.ts
// Global test setup - add mocks and utilities as needed

// Mock Figma plugin API for plugin tests
export const mockFigmaAPI = {
  variables: {
    getLocalVariablesAsync: vi.fn(),
    getLocalVariableCollectionsAsync: vi.fn(),
  },
  root: {
    name: 'Test File',
  },
  showUI: vi.fn(),
  ui: {
    postMessage: vi.fn(),
    onmessage: null as ((msg: unknown) => void) | null,
  },
  closePlugin: vi.fn(),
};

// Helper to reset mocks between tests
export function resetFigmaMocks() {
  mockFigmaAPI.variables.getLocalVariablesAsync.mockReset();
  mockFigmaAPI.variables.getLocalVariableCollectionsAsync.mockReset();
  mockFigmaAPI.ui.postMessage.mockReset();
  mockFigmaAPI.showUI.mockReset();
  mockFigmaAPI.closePlugin.mockReset();
}
```

**Step 3: Commit**

```bash
mkdir -p src/test
git add vitest.config.ts src/test/setup.ts
git commit -m "chore: configure Vitest with coverage"
```

---

### Task 1.9: Create Directory Structure

**Files:**

- Create directory structure

**Step 1: Create all directories**

Run:

```bash
mkdir -p src/plugin/formatters
mkdir -p src/plugin/exporters
mkdir -p src/plugin/services
mkdir -p src/plugin/utils
mkdir -p src/plugin/types
mkdir -p src/plugin/config
mkdir -p src/shared/types
mkdir -p src/ui/components/common
mkdir -p src/ui/components/tabs
mkdir -p src/ui/hooks
mkdir -p src/ui/services
mkdir -p src/ui/styles
```

Expected: Directories created

**Step 2: Create placeholder files to track directories**

Create `src/plugin/.gitkeep`, `src/ui/.gitkeep`, `src/shared/.gitkeep`:

```bash
touch src/plugin/.gitkeep src/ui/.gitkeep src/shared/.gitkeep
```

**Step 3: Commit**

```bash
git add src/
git commit -m "chore: create project directory structure"
```

---

### Task 1.10: Update Manifest for New Build Output

**Files:**

- Modify: `manifest.json`

**Step 1: Update manifest to point to new UI output**

```json
{
  "name": "Vex - Flexible Variables Export",
  "id": "vex-flexible-variables-export",
  "api": "1.0.0",
  "main": "dist/main.js",
  "ui": "dist/index.html",
  "capabilities": [],
  "enableProposedApi": false,
  "editorType": ["figma"],
  "networkAccess": {
    "allowedDomains": ["https://api.github.com"]
  }
}
```

**Step 2: Commit**

```bash
git add manifest.json
git commit -m "chore: update manifest for new build output paths"
```

---

## Phase 2: Shared Types

### Task 2.1: Create Shared Message Types

**Files:**

- Create: `src/shared/types/messages.ts`
- Create: `src/shared/types/index.ts`

**Step 1: Write the test**

Create `src/shared/types/messages.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { PluginMessage, UIMessage, ExportOptions, GitHubDispatchOptions } from './messages';

describe('Message Types', () => {
  it('should allow valid ExportOptions', () => {
    const options: ExportOptions = {
      includeCollectionComments: true,
      includeModeComments: false,
      selector: ':root',
      useModesAsSelectors: false,
    };
    expect(options.selector).toBe(':root');
  });

  it('should allow valid PluginMessage for export-css', () => {
    const msg: PluginMessage = {
      type: 'export-css',
      options: {
        includeCollectionComments: true,
        includeModeComments: true,
        selector: ':root',
        useModesAsSelectors: false,
      },
    };
    expect(msg.type).toBe('export-css');
  });

  it('should allow valid UIMessage for css-result', () => {
    const msg: UIMessage = {
      type: 'css-result',
      css: ':root { --color: #fff; }',
    };
    expect(msg.type).toBe('css-result');
  });

  it('should allow valid GitHubDispatchOptions', () => {
    const options: GitHubDispatchOptions = {
      repository: 'owner/repo',
      token: 'ghp_xxxxx',
      exportTypes: ['css', 'json'],
      exportOptions: {
        includeCollectionComments: true,
        includeModeComments: false,
        selector: ':root',
        useModesAsSelectors: false,
      },
    };
    expect(options.exportTypes).toContain('css');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/shared/types/messages.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/shared/types/messages.ts`:

```typescript
/**
 * Shared message types for plugin <-> UI communication
 */

export type ExportType = 'css' | 'scss' | 'json' | 'typescript';

export interface ExportOptions {
  includeCollectionComments: boolean;
  includeModeComments: boolean;
  selector: string;
  useModesAsSelectors: boolean;
  prefix?: string;
  selectedCollections?: string[];
}

export interface GitHubDispatchOptions {
  repository: string;
  token: string;
  workflowFileName?: string;
  exportTypes: ExportType[];
  exportOptions: ExportOptions;
}

export interface CollectionInfo {
  id: string;
  name: string;
}

// Messages from UI to Plugin
export type PluginMessage =
  | { type: 'get-collections' }
  | { type: 'export-css'; options: ExportOptions }
  | { type: 'export-scss'; options: ExportOptions }
  | { type: 'export-json'; options: ExportOptions }
  | { type: 'export-typescript'; options: ExportOptions }
  | { type: 'github-dispatch'; githubOptions: GitHubDispatchOptions }
  | { type: 'cancel' };

// Messages from Plugin to UI
export type UIMessage =
  | { type: 'collections-list'; collections: CollectionInfo[] }
  | { type: 'css-result'; css: string }
  | { type: 'scss-result'; scss: string }
  | { type: 'json-result'; json: string }
  | { type: 'typescript-result'; typescript: string }
  | { type: 'github-dispatch-success'; message: string }
  | { type: 'error'; message: string };
```

Create `src/shared/types/index.ts`:

```typescript
export * from './messages';
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/shared/types/messages.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/types/
git commit -m "feat: add shared message types for plugin-UI communication"
```

---

### Task 2.2: Create Token Configuration Types

**Files:**

- Create: `src/shared/types/tokens.ts`
- Modify: `src/shared/types/index.ts`

**Step 1: Write the test**

Create `src/shared/types/tokens.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { DEFAULT_CONFIG } from './tokens';
import type { TokenConfig, ColorFormat, Unit } from './tokens';

describe('Token Types', () => {
  it('should have correct DEFAULT_CONFIG values', () => {
    expect(DEFAULT_CONFIG.unit).toBe('px');
    expect(DEFAULT_CONFIG.remBase).toBe(16);
    expect(DEFAULT_CONFIG.colorFormat).toBe('hex');
  });

  it('should allow all valid units', () => {
    const units: Unit[] = ['none', 'px', 'rem', 'em', '%', 'ms', 's'];
    units.forEach((unit) => {
      const config: TokenConfig = { ...DEFAULT_CONFIG, unit };
      expect(config.unit).toBe(unit);
    });
  });

  it('should allow all valid color formats', () => {
    const formats: ColorFormat[] = ['hex', 'rgb', 'rgba', 'hsl', 'oklch'];
    formats.forEach((colorFormat) => {
      const config: TokenConfig = { ...DEFAULT_CONFIG, colorFormat };
      expect(config.colorFormat).toBe(colorFormat);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/shared/types/tokens.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/shared/types/tokens.ts`:

```typescript
/**
 * Token configuration types for variable export formatting
 */

export type Unit = 'none' | 'px' | 'rem' | 'em' | '%' | 'ms' | 's';
export type ColorFormat = 'hex' | 'rgb' | 'rgba' | 'hsl' | 'oklch';

export interface TokenConfig {
  unit: Unit;
  remBase: number;
  colorFormat: ColorFormat;
}

export const DEFAULT_CONFIG: TokenConfig = {
  unit: 'px',
  remBase: 16,
  colorFormat: 'hex',
};
```

Update `src/shared/types/index.ts`:

```typescript
export * from './messages';
export * from './tokens';
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/shared/types/tokens.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/shared/types/
git commit -m "feat: add token configuration types"
```

---

## Phase 3: Plugin Backend Modules

### Task 3.1: Create Description Parser

**Files:**

- Create: `src/plugin/utils/descriptionParser.ts`
- Create: `src/plugin/utils/descriptionParser.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';
import { parseDescription, UNIT_REGEX, FORMAT_REGEX } from './descriptionParser';

describe('parseDescription', () => {
  it('should return empty object for empty description', () => {
    expect(parseDescription('')).toEqual({});
    expect(parseDescription(undefined as unknown as string)).toEqual({});
  });

  it('should parse unit: px', () => {
    expect(parseDescription('unit: px')).toEqual({ unit: 'px' });
  });

  it('should parse unit: rem', () => {
    expect(parseDescription('unit: rem')).toEqual({ unit: 'rem' });
  });

  it('should parse unit: rem with custom base', () => {
    expect(parseDescription('unit: rem:20')).toEqual({ unit: 'rem', remBase: 20 });
  });

  it('should parse unit: none', () => {
    expect(parseDescription('unit: none')).toEqual({ unit: 'none' });
  });

  it('should parse all valid units', () => {
    const units = ['none', 'px', 'rem', 'em', '%', 'ms', 's'];
    units.forEach((unit) => {
      expect(parseDescription(`unit: ${unit}`)).toEqual({ unit });
    });
  });

  it('should parse format: hex', () => {
    expect(parseDescription('format: hex')).toEqual({ colorFormat: 'hex' });
  });

  it('should parse all valid color formats', () => {
    const formats = ['hex', 'rgb', 'rgba', 'hsl', 'oklch'];
    formats.forEach((format) => {
      expect(parseDescription(`format: ${format}`)).toEqual({ colorFormat: format });
    });
  });

  it('should parse both unit and format', () => {
    expect(parseDescription('unit: rem\nformat: oklch')).toEqual({
      unit: 'rem',
      colorFormat: 'oklch',
    });
  });

  it('should be case insensitive', () => {
    expect(parseDescription('UNIT: REM')).toEqual({ unit: 'rem' });
    expect(parseDescription('FORMAT: HSL')).toEqual({ colorFormat: 'hsl' });
  });

  it('should handle extra whitespace', () => {
    expect(parseDescription('unit:   rem')).toEqual({ unit: 'rem' });
    expect(parseDescription('  format:  hsl  ')).toEqual({ colorFormat: 'hsl' });
  });
});

describe('Regex patterns', () => {
  it('UNIT_REGEX should match valid units', () => {
    expect(UNIT_REGEX.test('unit: px')).toBe(true);
    expect(UNIT_REGEX.test('unit: rem:16')).toBe(true);
    expect(UNIT_REGEX.test('unit: invalid')).toBe(false);
  });

  it('FORMAT_REGEX should match valid formats', () => {
    expect(FORMAT_REGEX.test('format: hex')).toBe(true);
    expect(FORMAT_REGEX.test('format: oklch')).toBe(true);
    expect(FORMAT_REGEX.test('format: invalid')).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/plugin/utils/descriptionParser.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/plugin/utils/descriptionParser.ts`:

```typescript
import type { TokenConfig } from '@shared/types';

export const UNIT_REGEX = /unit:\s*(none|px|rem|em|%|ms|s)(?::(\d+))?/i;
export const FORMAT_REGEX = /format:\s*(hex|rgb|rgba|hsl|oklch)/i;

/**
 * Parses a variable's description field to extract token configuration.
 * Supports unit and color format specifications.
 */
export function parseDescription(description: string): Partial<TokenConfig> {
  if (!description) return {};

  const config: Partial<TokenConfig> = {};

  const unitMatch = description.match(UNIT_REGEX);
  if (unitMatch) {
    config.unit = unitMatch[1].toLowerCase() as TokenConfig['unit'];
    if (unitMatch[2]) {
      config.remBase = parseInt(unitMatch[2], 10);
    }
  }

  const formatMatch = description.match(FORMAT_REGEX);
  if (formatMatch) {
    config.colorFormat = formatMatch[1].toLowerCase() as TokenConfig['colorFormat'];
  }

  return config;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/plugin/utils/descriptionParser.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/plugin/utils/descriptionParser.ts src/plugin/utils/descriptionParser.test.ts
git commit -m "feat: add description parser utility"
```

---

### Task 3.2: Create Name Formatter

**Files:**

- Create: `src/plugin/formatters/nameFormatter.ts`
- Create: `src/plugin/formatters/nameFormatter.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';
import { toCssName, toPrefixedName } from './nameFormatter';

describe('toCssName', () => {
  it('should return empty string for invalid input', () => {
    expect(toCssName('')).toBe('');
    expect(toCssName(null as unknown as string)).toBe('');
    expect(toCssName(undefined as unknown as string)).toBe('');
  });

  it('should convert slashes to hyphens', () => {
    expect(toCssName('color/primary')).toBe('color-primary');
    expect(toCssName('spacing/sm/x')).toBe('spacing-sm-x');
  });

  it('should convert spaces to hyphens', () => {
    expect(toCssName('color primary')).toBe('color-primary');
    expect(toCssName('spacing sm x')).toBe('spacing-sm-x');
  });

  it('should convert camelCase to kebab-case', () => {
    expect(toCssName('colorPrimary')).toBe('color-primary');
    expect(toCssName('spacingSmX')).toBe('spacing-sm-x');
  });

  it('should remove invalid characters', () => {
    expect(toCssName('color@primary!')).toBe('color-primary');
    expect(toCssName('spacing$sm#x')).toBe('spacing-sm-x');
  });

  it('should collapse multiple hyphens', () => {
    expect(toCssName('color--primary')).toBe('color-primary');
    expect(toCssName('spacing---sm')).toBe('spacing-sm');
  });

  it('should remove leading and trailing hyphens', () => {
    expect(toCssName('-color-primary-')).toBe('color-primary');
    expect(toCssName('--spacing--')).toBe('spacing');
  });

  it('should lowercase the result', () => {
    expect(toCssName('Color/PRIMARY')).toBe('color-primary');
    expect(toCssName('SPACING')).toBe('spacing');
  });

  it('should handle complex real-world names', () => {
    expect(toCssName('Color/Brand/Primary 500')).toBe('color-brand-primary-500');
    expect(toCssName('Spacing/Component/buttonPadding')).toBe('spacing-component-button-padding');
  });
});

describe('toPrefixedName', () => {
  it('should return name without prefix when prefix is empty', () => {
    expect(toPrefixedName('color-primary', '')).toBe('color-primary');
    expect(toPrefixedName('color-primary', undefined)).toBe('color-primary');
  });

  it('should add prefix when provided', () => {
    expect(toPrefixedName('color-primary', 'ds')).toBe('ds-color-primary');
    expect(toPrefixedName('spacing-sm', 'theme')).toBe('theme-spacing-sm');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/plugin/formatters/nameFormatter.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/plugin/formatters/nameFormatter.ts`:

```typescript
/**
 * Converts a variable name to a valid CSS custom property name.
 * Handles slashes, spaces, and camelCase conversion.
 */
export function toCssName(name: string): string {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .replace(/\//g, '-')
    .replace(/\s+/g, '-')
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[^a-z0-9-]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

/**
 * Adds an optional prefix to a CSS name.
 */
export function toPrefixedName(cssName: string, prefix?: string): string {
  if (!prefix) return cssName;
  return `${prefix}-${cssName}`;
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/plugin/formatters/nameFormatter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/plugin/formatters/nameFormatter.ts src/plugin/formatters/nameFormatter.test.ts
git commit -m "feat: add name formatter utility"
```

---

### Task 3.3: Create Color Formatter

**Files:**

- Create: `src/plugin/formatters/colorFormatter.ts`
- Create: `src/plugin/formatters/colorFormatter.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';
import { rgbToHex, rgbToRgbString, rgbToHsl, rgbToOklch, formatColor } from './colorFormatter';

// Test colors
const RED = { r: 1, g: 0, b: 0, a: 1 };
const GREEN = { r: 0, g: 1, b: 0, a: 1 };
const BLUE = { r: 0, g: 0, b: 1, a: 1 };
const WHITE = { r: 1, g: 1, b: 1, a: 1 };
const BLACK = { r: 0, g: 0, b: 0, a: 1 };
const SEMI_TRANSPARENT = { r: 1, g: 0, b: 0, a: 0.5 };

describe('rgbToHex', () => {
  it('should convert basic colors', () => {
    expect(rgbToHex(RED)).toBe('#ff0000');
    expect(rgbToHex(GREEN)).toBe('#00ff00');
    expect(rgbToHex(BLUE)).toBe('#0000ff');
    expect(rgbToHex(WHITE)).toBe('#ffffff');
    expect(rgbToHex(BLACK)).toBe('#000000');
  });

  it('should include alpha for semi-transparent colors', () => {
    expect(rgbToHex(SEMI_TRANSPARENT)).toBe('#ff000080');
  });

  it('should not include alpha for fully opaque colors', () => {
    expect(rgbToHex(RED)).toBe('#ff0000');
  });
});

describe('rgbToRgbString', () => {
  it('should convert basic colors', () => {
    expect(rgbToRgbString(RED)).toBe('rgb(255, 0, 0)');
    expect(rgbToRgbString(GREEN)).toBe('rgb(0, 255, 0)');
    expect(rgbToRgbString(BLUE)).toBe('rgb(0, 0, 255)');
  });

  it('should use rgba for semi-transparent colors', () => {
    expect(rgbToRgbString(SEMI_TRANSPARENT)).toBe('rgba(255, 0, 0, 0.500)');
  });
});

describe('rgbToHsl', () => {
  it('should convert basic colors', () => {
    expect(rgbToHsl(RED)).toBe('hsl(0, 100%, 50%)');
    expect(rgbToHsl(GREEN)).toBe('hsl(120, 100%, 50%)');
    expect(rgbToHsl(BLUE)).toBe('hsl(240, 100%, 50%)');
  });

  it('should handle white and black', () => {
    expect(rgbToHsl(WHITE)).toBe('hsl(0, 0%, 100%)');
    expect(rgbToHsl(BLACK)).toBe('hsl(0, 0%, 0%)');
  });

  it('should use hsla for semi-transparent colors', () => {
    expect(rgbToHsl(SEMI_TRANSPARENT)).toBe('hsla(0, 100%, 50%, 0.500)');
  });
});

describe('rgbToOklch', () => {
  it('should convert colors to oklch format', () => {
    const result = rgbToOklch(RED);
    expect(result).toMatch(/^oklch\(\d+\.\d+% \d+\.\d+ \d+\.\d+\)$/);
  });

  it('should include alpha for semi-transparent colors', () => {
    const result = rgbToOklch(SEMI_TRANSPARENT);
    expect(result).toMatch(/^oklch\(\d+\.\d+% \d+\.\d+ \d+\.\d+ \/ 0\.500\)$/);
  });
});

describe('formatColor', () => {
  it('should format as hex by default', () => {
    expect(formatColor(RED, 'hex')).toBe('#ff0000');
  });

  it('should format as rgb', () => {
    expect(formatColor(RED, 'rgb')).toBe('rgb(255, 0, 0)');
  });

  it('should format as rgba (same as rgb)', () => {
    expect(formatColor(RED, 'rgba')).toBe('rgb(255, 0, 0)');
  });

  it('should format as hsl', () => {
    expect(formatColor(RED, 'hsl')).toBe('hsl(0, 100%, 50%)');
  });

  it('should format as oklch', () => {
    const result = formatColor(RED, 'oklch');
    expect(result).toMatch(/^oklch\(/);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/plugin/formatters/colorFormatter.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/plugin/formatters/colorFormatter.ts`:

```typescript
import type { ColorFormat } from '@shared/types';

interface RGBA {
  r: number;
  g: number;
  b: number;
  a?: number;
}

function toHex(n: number): string {
  const hex = Math.round(n * 255).toString(16);
  return hex.length === 1 ? `0${hex}` : hex;
}

export function rgbToHex(color: RGBA): string {
  const hex = `#${toHex(color.r)}${toHex(color.g)}${toHex(color.b)}`;
  return color.a !== undefined && color.a < 1 ? `${hex}${toHex(color.a)}` : hex;
}

export function rgbToRgbString(color: RGBA): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);

  return color.a !== undefined && color.a < 1
    ? `rgba(${r}, ${g}, ${b}, ${color.a.toFixed(3)})`
    : `rgb(${r}, ${g}, ${b})`;
}

export function rgbToHsl(color: RGBA): string {
  const { r, g, b, a } = color;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  return a !== undefined && a < 1
    ? `hsla(${hDeg}, ${sPct}%, ${lPct}%, ${a.toFixed(3)})`
    : `hsl(${hDeg}, ${sPct}%, ${lPct}%)`;
}

export function rgbToOklch(color: RGBA): string {
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  const lr = toLinear(color.r);
  const lg = toLinear(color.g);
  const lb = toLinear(color.b);

  // Linear RGB to OKLab
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l = Math.cbrt(l_);
  const m = Math.cbrt(m_);
  const s = Math.cbrt(s_);

  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const b_ = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;

  // OKLab to OKLCH
  const C = Math.sqrt(a * a + b_ * b_);
  let H = (Math.atan2(b_, a) * 180) / Math.PI;
  if (H < 0) H += 360;

  const lPct = (L * 100).toFixed(2);
  const cVal = C.toFixed(4);
  const hDeg = H.toFixed(2);

  return color.a !== undefined && color.a < 1
    ? `oklch(${lPct}% ${cVal} ${hDeg} / ${color.a.toFixed(3)})`
    : `oklch(${lPct}% ${cVal} ${hDeg})`;
}

export function formatColor(color: RGBA, format: ColorFormat): string {
  const formatters: Record<ColorFormat, (c: RGBA) => string> = {
    hex: rgbToHex,
    rgb: rgbToRgbString,
    rgba: rgbToRgbString,
    hsl: rgbToHsl,
    oklch: rgbToOklch,
  };

  return formatters[format](color);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/plugin/formatters/colorFormatter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/plugin/formatters/colorFormatter.ts src/plugin/formatters/colorFormatter.test.ts
git commit -m "feat: add color formatter with hex, rgb, hsl, oklch support"
```

---

### Task 3.4: Create Number Formatter

**Files:**

- Create: `src/plugin/formatters/numberFormatter.ts`
- Create: `src/plugin/formatters/numberFormatter.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';
import { cleanNumber, formatNumber } from './numberFormatter';
import { DEFAULT_CONFIG } from '@shared/types';

describe('cleanNumber', () => {
  it('should return integer as string', () => {
    expect(cleanNumber(42)).toBe('42');
    expect(cleanNumber(0)).toBe('0');
    expect(cleanNumber(-10)).toBe('-10');
  });

  it('should remove trailing zeros from decimals', () => {
    expect(cleanNumber(1.5)).toBe('1.5');
    expect(cleanNumber(1.5)).toBe('1.5');
    expect(cleanNumber(1.1234)).toBe('1.1234');
  });

  it('should respect decimal precision', () => {
    expect(cleanNumber(1.123456789, 4)).toBe('1.1235');
    expect(cleanNumber(1.123456789, 2)).toBe('1.12');
  });

  it('should handle special values', () => {
    expect(cleanNumber(Infinity)).toBe('Infinity');
    expect(cleanNumber(-Infinity)).toBe('-Infinity');
    expect(cleanNumber(NaN)).toBe('NaN');
  });
});

describe('formatNumber', () => {
  it('should format with px unit', () => {
    expect(formatNumber(16, { ...DEFAULT_CONFIG, unit: 'px' })).toBe('16px');
    expect(formatNumber(0, { ...DEFAULT_CONFIG, unit: 'px' })).toBe('0px');
  });

  it('should format with no unit', () => {
    expect(formatNumber(1.5, { ...DEFAULT_CONFIG, unit: 'none' })).toBe('1.5');
    expect(formatNumber(700, { ...DEFAULT_CONFIG, unit: 'none' })).toBe('700');
  });

  it('should convert to rem with default base', () => {
    expect(formatNumber(16, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('1rem');
    expect(formatNumber(24, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('1.5rem');
    expect(formatNumber(8, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 16 })).toBe('0.5rem');
  });

  it('should convert to rem with custom base', () => {
    expect(formatNumber(20, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 20 })).toBe('1rem');
    expect(formatNumber(10, { ...DEFAULT_CONFIG, unit: 'rem', remBase: 20 })).toBe('0.5rem');
  });

  it('should format with em unit', () => {
    expect(formatNumber(1.5, { ...DEFAULT_CONFIG, unit: 'em' })).toBe('1.5em');
  });

  it('should format with percentage', () => {
    expect(formatNumber(100, { ...DEFAULT_CONFIG, unit: '%' })).toBe('100%');
    expect(formatNumber(50, { ...DEFAULT_CONFIG, unit: '%' })).toBe('50%');
  });

  it('should format with ms unit', () => {
    expect(formatNumber(200, { ...DEFAULT_CONFIG, unit: 'ms' })).toBe('200ms');
  });

  it('should format with s unit', () => {
    expect(formatNumber(0.2, { ...DEFAULT_CONFIG, unit: 's' })).toBe('0.2s');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/plugin/formatters/numberFormatter.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/plugin/formatters/numberFormatter.ts`:

```typescript
import type { TokenConfig } from '@shared/types';

/**
 * Formats a number, removing trailing zeros from decimal values.
 */
export function cleanNumber(value: number, decimals = 4): string {
  if (!Number.isFinite(value)) {
    return String(value);
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * Formats a number with the appropriate unit based on config.
 */
export function formatNumber(value: number, config: TokenConfig): string {
  const formatters: Record<TokenConfig['unit'], () => string> = {
    none: () => cleanNumber(value),
    px: () => `${value}px`,
    rem: () => `${cleanNumber(value / config.remBase)}rem`,
    em: () => `${cleanNumber(value)}em`,
    '%': () => `${value}%`,
    ms: () => `${value}ms`,
    s: () => `${value}s`,
  };

  return formatters[config.unit]();
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/plugin/formatters/numberFormatter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/plugin/formatters/numberFormatter.ts src/plugin/formatters/numberFormatter.test.ts
git commit -m "feat: add number formatter with unit conversion"
```

---

### Task 3.5: Create Formatter Index

**Files:**

- Create: `src/plugin/formatters/index.ts`

**Step 1: Create the barrel export**

```typescript
export { toCssName, toPrefixedName } from './nameFormatter';
export { rgbToHex, rgbToRgbString, rgbToHsl, rgbToOklch, formatColor } from './colorFormatter';
export { cleanNumber, formatNumber } from './numberFormatter';
```

**Step 2: Commit**

```bash
git add src/plugin/formatters/index.ts
git commit -m "feat: add formatters barrel export"
```

---

### Task 3.6: Create Value Resolver Service

**Files:**

- Create: `src/plugin/services/valueResolver.ts`
- Create: `src/plugin/services/valueResolver.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveValue } from './valueResolver';
import { DEFAULT_CONFIG } from '@shared/types';

// Mock variable for testing
const mockVariables: Variable[] = [
  {
    id: 'var-1',
    name: 'color/primary',
    resolvedType: 'COLOR',
    valuesByMode: {},
    variableCollectionId: 'col-1',
    description: '',
    hiddenFromPublishing: false,
    scopes: [],
    codeSyntax: {},
    remote: false,
    key: 'key-1',
  } as Variable,
];

describe('resolveValue', () => {
  it('should resolve color values', async () => {
    const color = { r: 1, g: 0, b: 0, a: 1 };
    const result = await resolveValue(color, 'mode-1', mockVariables, 'COLOR', DEFAULT_CONFIG);
    expect(result).toBe('#ff0000');
  });

  it('should resolve float values with px unit', async () => {
    const result = await resolveValue(16, 'mode-1', mockVariables, 'FLOAT', DEFAULT_CONFIG);
    expect(result).toBe('16px');
  });

  it('should resolve float values with rem unit', async () => {
    const config = { ...DEFAULT_CONFIG, unit: 'rem' as const };
    const result = await resolveValue(16, 'mode-1', mockVariables, 'FLOAT', config);
    expect(result).toBe('1rem');
  });

  it('should resolve string values with quotes', async () => {
    const result = await resolveValue('hello', 'mode-1', mockVariables, 'STRING', DEFAULT_CONFIG);
    expect(result).toBe('"hello"');
  });

  it('should escape quotes in strings', async () => {
    const result = await resolveValue(
      'say "hi"',
      'mode-1',
      mockVariables,
      'STRING',
      DEFAULT_CONFIG
    );
    expect(result).toBe('"say \\"hi\\""');
  });

  it('should resolve boolean values as 1 or 0', async () => {
    const resultTrue = await resolveValue(true, 'mode-1', mockVariables, 'BOOLEAN', DEFAULT_CONFIG);
    expect(resultTrue).toBe('1');

    const resultFalse = await resolveValue(
      false,
      'mode-1',
      mockVariables,
      'BOOLEAN',
      DEFAULT_CONFIG
    );
    expect(resultFalse).toBe('0');
  });

  it('should resolve variable aliases as var() references', async () => {
    const alias = { type: 'VARIABLE_ALIAS', id: 'var-1' };
    const result = await resolveValue(
      alias as VariableValue,
      'mode-1',
      mockVariables,
      'COLOR',
      DEFAULT_CONFIG
    );
    expect(result).toBe('var(--color-primary)');
  });

  it('should handle prefixed variable aliases', async () => {
    const alias = { type: 'VARIABLE_ALIAS', id: 'var-1' };
    const result = await resolveValue(
      alias as VariableValue,
      'mode-1',
      mockVariables,
      'COLOR',
      DEFAULT_CONFIG,
      'ds'
    );
    expect(result).toBe('var(--ds-color-primary)');
  });

  it('should handle unresolved aliases', async () => {
    const alias = { type: 'VARIABLE_ALIAS', id: 'non-existent' };
    const result = await resolveValue(
      alias as VariableValue,
      'mode-1',
      mockVariables,
      'COLOR',
      DEFAULT_CONFIG
    );
    expect(result).toBe('/* unresolved alias */');
  });

  it('should detect circular references via visited set', async () => {
    const alias = { type: 'VARIABLE_ALIAS', id: 'var-1' };
    const visited = new Set(['var-1']);
    const result = await resolveValue(
      alias as VariableValue,
      'mode-1',
      mockVariables,
      'COLOR',
      DEFAULT_CONFIG,
      '',
      0,
      visited
    );
    expect(result).toBe('/* circular reference */');
  });

  it('should detect depth-based circular references', async () => {
    const color = { r: 1, g: 0, b: 0, a: 1 };
    const result = await resolveValue(
      color,
      'mode-1',
      mockVariables,
      'COLOR',
      DEFAULT_CONFIG,
      '',
      11
    );
    expect(result).toBe('/* circular reference */');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/plugin/services/valueResolver.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/plugin/services/valueResolver.ts`:

```typescript
import type { TokenConfig } from '@shared/types';
import { toCssName, toPrefixedName } from '@plugin/formatters/nameFormatter';
import { formatColor } from '@plugin/formatters/colorFormatter';
import { formatNumber } from '@plugin/formatters/numberFormatter';

/**
 * Resolves a variable value to its string representation.
 * Handles variable aliases, colors, numbers, strings, and booleans.
 */
export async function resolveValue(
  value: VariableValue,
  modeId: string,
  variables: Variable[],
  resolvedType: VariableResolvedDataType,
  config: TokenConfig,
  prefix = '',
  depth = 0,
  visited = new Set<string>()
): Promise<string> {
  // Prevent infinite recursion
  if (depth > 10) return '/* circular reference */';

  // Handle variable alias - output as CSS var() reference
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'VARIABLE_ALIAS'
  ) {
    const aliasId = value.id;

    // Check for circular references
    if (visited.has(aliasId)) {
      return '/* circular reference */';
    }

    const aliasedVar = variables.find((v) => v.id === aliasId);

    if (aliasedVar) {
      const aliasedCssName = toCssName(aliasedVar.name);
      const prefixedName = toPrefixedName(aliasedCssName, prefix);
      return `var(--${prefixedName})`;
    }

    return '/* unresolved alias */';
  }

  // Handle by type
  switch (resolvedType) {
    case 'COLOR':
      if (typeof value === 'object' && value !== null && 'r' in value) {
        return formatColor(value as RGBA, config.colorFormat);
      }
      break;

    case 'FLOAT':
      if (typeof value === 'number' && Number.isFinite(value)) {
        return formatNumber(value, config);
      }
      break;

    case 'STRING':
      if (typeof value === 'string') {
        const escaped = value.replace(/"/g, '\\"');
        return `"${escaped}"`;
      }
      break;

    case 'BOOLEAN':
      if (typeof value === 'boolean') {
        return value ? '1' : '0';
      }
      break;
  }

  // Fallback: convert to string
  return String(value ?? '');
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/plugin/services/valueResolver.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/plugin/services/valueResolver.ts src/plugin/services/valueResolver.test.ts
git commit -m "feat: add value resolver service for variable processing"
```

---

### Task 3.7: Create CSS Exporter

**Files:**

- Create: `src/plugin/exporters/cssExporter.ts`
- Create: `src/plugin/exporters/cssExporter.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { exportToCss, generateCssHeader } from './cssExporter';
import type { ExportOptions } from '@shared/types';

// Mock the Figma API
const mockVariables: Variable[] = [
  {
    id: 'var-1',
    name: 'color/primary',
    resolvedType: 'COLOR',
    valuesByMode: { 'mode-1': { r: 0.09, g: 0.63, b: 0.98, a: 1 } },
    variableCollectionId: 'col-1',
    description: '',
    hiddenFromPublishing: false,
    scopes: [],
    codeSyntax: {},
    remote: false,
    key: 'key-1',
  } as Variable,
  {
    id: 'var-2',
    name: 'spacing/sm',
    resolvedType: 'FLOAT',
    valuesByMode: { 'mode-1': 8 },
    variableCollectionId: 'col-1',
    description: '',
    hiddenFromPublishing: false,
    scopes: [],
    codeSyntax: {},
    remote: false,
    key: 'key-2',
  } as Variable,
];

const mockCollections: VariableCollection[] = [
  {
    id: 'col-1',
    name: 'Design Tokens',
    modes: [{ modeId: 'mode-1', name: 'Default' }],
    defaultModeId: 'mode-1',
    remote: false,
    key: 'key-col-1',
    hiddenFromPublishing: false,
    variableIds: ['var-1', 'var-2'],
  } as VariableCollection,
];

describe('generateCssHeader', () => {
  it('should generate header with file name and timestamp', () => {
    const header = generateCssHeader('Test File');
    expect(header).toContain('Auto-generated CSS Custom Properties');
    expect(header).toContain('Exported from Figma: Test File');
    expect(header).toContain('Generated:');
  });
});

describe('exportToCss', () => {
  const defaultOptions: ExportOptions = {
    includeCollectionComments: true,
    includeModeComments: true,
    selector: ':root',
    useModesAsSelectors: false,
  };

  it('should export variables with default options', async () => {
    const result = await exportToCss(mockVariables, mockCollections, 'Test File', defaultOptions);

    expect(result).toContain(':root {');
    expect(result).toContain('--color-primary:');
    expect(result).toContain('--spacing-sm: 8px;');
    expect(result).toContain('}');
  });

  it('should include collection comments when enabled', async () => {
    const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      includeCollectionComments: true,
    });

    expect(result).toContain('/* Design Tokens */');
  });

  it('should exclude collection comments when disabled', async () => {
    const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      includeCollectionComments: false,
    });

    expect(result).not.toContain('/* Design Tokens */');
  });

  it('should use custom selector', async () => {
    const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      selector: '.theme',
    });

    expect(result).toContain('.theme {');
  });

  it('should add prefix to variable names', async () => {
    const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      prefix: 'ds',
    });

    expect(result).toContain('--ds-color-primary:');
    expect(result).toContain('--ds-spacing-sm:');
  });

  it('should return message when no variables found', async () => {
    const result = await exportToCss([], mockCollections, 'Test File', defaultOptions);
    expect(result).toBe('/* No variables found in this file */');
  });

  it('should filter by selected collections', async () => {
    const result = await exportToCss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      selectedCollections: ['col-1'],
    });

    expect(result).toContain('--color-primary:');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/plugin/exporters/cssExporter.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/plugin/exporters/cssExporter.ts`:

```typescript
import type { ExportOptions, TokenConfig } from '@shared/types';
import { DEFAULT_CONFIG } from '@shared/types';
import { toCssName, toPrefixedName } from '@plugin/formatters/nameFormatter';
import { parseDescription } from '@plugin/utils/descriptionParser';
import { resolveValue } from '@plugin/services/valueResolver';

/**
 * Generates the CSS file header comment.
 */
export function generateCssHeader(fileName: string): string {
  return [
    '/**',
    ' * Auto-generated CSS Custom Properties',
    ` * Exported from Figma: ${fileName}`,
    ` * Generated: ${new Date().toISOString()}`,
    ' */',
    '',
  ].join('\n');
}

/**
 * Filters collections based on selected collection IDs.
 */
function filterCollections(
  collections: VariableCollection[],
  selectedCollectionIds?: string[]
): VariableCollection[] {
  if (selectedCollectionIds && selectedCollectionIds.length > 0) {
    return collections.filter((c) => selectedCollectionIds.includes(c.id));
  }
  return collections;
}

/**
 * Gets variables for a collection, sorted alphabetically.
 */
function getCollectionVariables(variables: Variable[], collectionId: string): Variable[] {
  return variables
    .filter((v) => v.variableCollectionId === collectionId)
    .sort((a, b) => toCssName(a.name).localeCompare(toCssName(b.name)));
}

/**
 * Exports variables to CSS custom properties format.
 */
export async function exportToCss(
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  options: ExportOptions
): Promise<string> {
  if (variables.length === 0) {
    return '/* No variables found in this file */';
  }

  const filteredCollections = filterCollections(collections, options.selectedCollections);
  const selector = options.selector?.trim() || ':root';

  const lines: string[] = [generateCssHeader(fileName)];

  const processVariable = async (
    variable: Variable,
    modeId: string,
    indent = '  '
  ): Promise<string> => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      ...parseDescription(variable.description),
    };

    const value = variable.valuesByMode[modeId];
    if (value === undefined) return '';

    const cssName = toCssName(variable.name);
    const prefixedName = toPrefixedName(cssName, options.prefix);
    const cssValue = await resolveValue(
      value,
      modeId,
      variables,
      variable.resolvedType,
      config,
      options.prefix
    );

    return `${indent}--${prefixedName}: ${cssValue};`;
  };

  if (options.useModesAsSelectors) {
    for (const collection of filteredCollections) {
      if (options.includeCollectionComments) {
        lines.push(`/* Collection: ${collection.name} */`);
      }

      for (const mode of collection.modes) {
        const isDefault = mode.name.toLowerCase() === 'default';
        const modeSelector = isDefault
          ? selector
          : `${selector}[data-theme="${mode.name.toLowerCase()}"], .theme-${mode.name.toLowerCase()}`;

        if (options.includeModeComments) {
          lines.push(`/* Mode: ${mode.name} */`);
        }

        lines.push(`${modeSelector} {`);

        const collectionVars = getCollectionVariables(variables, collection.id);

        for (const variable of collectionVars) {
          const line = await processVariable(variable, mode.modeId, '  ');
          if (line) lines.push(line);
        }

        lines.push('}', '');
      }
    }
  } else {
    lines.push(`${selector} {`);

    for (const collection of filteredCollections) {
      if (options.includeCollectionComments) {
        lines.push(`  /* ${collection.name} */`);
      }

      const collectionVars = getCollectionVariables(variables, collection.id);

      for (const variable of collectionVars) {
        const line = await processVariable(variable, collection.defaultModeId, '  ');
        if (line) lines.push(line);
      }

      if (filteredCollections.indexOf(collection) < filteredCollections.length - 1) {
        lines.push('');
      }
    }

    lines.push('}');
  }

  return lines.join('\n');
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/plugin/exporters/cssExporter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/plugin/exporters/cssExporter.ts src/plugin/exporters/cssExporter.test.ts
git commit -m "feat: add CSS exporter with modes and prefix support"
```

---

### Task 3.8: Create SCSS Exporter

**Files:**

- Create: `src/plugin/exporters/scssExporter.ts`
- Create: `src/plugin/exporters/scssExporter.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';
import { exportToScss, generateScssHeader } from './scssExporter';
import type { ExportOptions } from '@shared/types';

const mockVariables: Variable[] = [
  {
    id: 'var-1',
    name: 'color/primary',
    resolvedType: 'COLOR',
    valuesByMode: { 'mode-1': { r: 0.09, g: 0.63, b: 0.98, a: 1 } },
    variableCollectionId: 'col-1',
    description: '',
    hiddenFromPublishing: false,
    scopes: [],
    codeSyntax: {},
    remote: false,
    key: 'key-1',
  } as Variable,
  {
    id: 'var-2',
    name: 'spacing/sm',
    resolvedType: 'FLOAT',
    valuesByMode: { 'mode-1': 8 },
    variableCollectionId: 'col-1',
    description: '',
    hiddenFromPublishing: false,
    scopes: [],
    codeSyntax: {},
    remote: false,
    key: 'key-2',
  } as Variable,
];

const mockCollections: VariableCollection[] = [
  {
    id: 'col-1',
    name: 'Design Tokens',
    modes: [{ modeId: 'mode-1', name: 'Default' }],
    defaultModeId: 'mode-1',
    remote: false,
    key: 'key-col-1',
    hiddenFromPublishing: false,
    variableIds: ['var-1', 'var-2'],
  } as VariableCollection,
];

describe('generateScssHeader', () => {
  it('should generate SCSS-style header', () => {
    const header = generateScssHeader('Test File');
    expect(header).toContain('Auto-generated SCSS Variables');
    expect(header).toContain('Exported from Figma: Test File');
  });
});

describe('exportToScss', () => {
  const defaultOptions: ExportOptions = {
    includeCollectionComments: true,
    includeModeComments: false,
    selector: ':root',
    useModesAsSelectors: false,
  };

  it('should export variables as SCSS format', async () => {
    const result = await exportToScss(mockVariables, mockCollections, 'Test File', defaultOptions);

    expect(result).toContain('$color-primary:');
    expect(result).toContain('$spacing-sm: 8px;');
  });

  it('should include collection comments when enabled', async () => {
    const result = await exportToScss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      includeCollectionComments: true,
    });

    expect(result).toContain('// Collection: Design Tokens');
  });

  it('should add prefix to variable names', async () => {
    const result = await exportToScss(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      prefix: 'ds',
    });

    expect(result).toContain('$ds-color-primary:');
    expect(result).toContain('$ds-spacing-sm:');
  });

  it('should convert var() references to SCSS variable references', async () => {
    const varsWithAlias: Variable[] = [
      ...mockVariables,
      {
        id: 'var-3',
        name: 'color/secondary',
        resolvedType: 'COLOR',
        valuesByMode: { 'mode-1': { type: 'VARIABLE_ALIAS', id: 'var-1' } },
        variableCollectionId: 'col-1',
        description: '',
        hiddenFromPublishing: false,
        scopes: [],
        codeSyntax: {},
        remote: false,
        key: 'key-3',
      } as Variable,
    ];

    const result = await exportToScss(varsWithAlias, mockCollections, 'Test File', defaultOptions);
    expect(result).toContain('$color-secondary: $color-primary;');
  });

  it('should return message when no variables found', async () => {
    const result = await exportToScss([], mockCollections, 'Test File', defaultOptions);
    expect(result).toBe('// No variables found in this file');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/plugin/exporters/scssExporter.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/plugin/exporters/scssExporter.ts`:

```typescript
import type { ExportOptions, TokenConfig } from '@shared/types';
import { DEFAULT_CONFIG } from '@shared/types';
import { toCssName, toPrefixedName } from '@plugin/formatters/nameFormatter';
import { parseDescription } from '@plugin/utils/descriptionParser';
import { resolveValue } from '@plugin/services/valueResolver';

/**
 * Generates the SCSS file header comment.
 */
export function generateScssHeader(fileName: string): string {
  return [
    '//',
    '// Auto-generated SCSS Variables',
    `// Exported from Figma: ${fileName}`,
    `// Generated: ${new Date().toISOString()}`,
    '//',
    '',
  ].join('\n');
}

/**
 * Filters collections based on selected collection IDs.
 */
function filterCollections(
  collections: VariableCollection[],
  selectedCollectionIds?: string[]
): VariableCollection[] {
  if (selectedCollectionIds && selectedCollectionIds.length > 0) {
    return collections.filter((c) => selectedCollectionIds.includes(c.id));
  }
  return collections;
}

/**
 * Gets variables for a collection, sorted alphabetically.
 */
function getCollectionVariables(variables: Variable[], collectionId: string): Variable[] {
  return variables
    .filter((v) => v.variableCollectionId === collectionId)
    .sort((a, b) => toCssName(a.name).localeCompare(toCssName(b.name)));
}

/**
 * Exports variables to SCSS format.
 */
export async function exportToScss(
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  options: ExportOptions
): Promise<string> {
  if (variables.length === 0) {
    return '// No variables found in this file';
  }

  const filteredCollections = filterCollections(collections, options.selectedCollections);

  const lines: string[] = [generateScssHeader(fileName)];

  const processVariable = async (variable: Variable, modeId: string): Promise<string> => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      ...parseDescription(variable.description),
    };

    const value = variable.valuesByMode[modeId];
    if (value === undefined) return '';

    const scssName = toCssName(variable.name);
    const prefixedName = options.prefix ? `$${options.prefix}-${scssName}` : `$${scssName}`;
    const scssValue = await resolveValue(
      value,
      modeId,
      variables,
      variable.resolvedType,
      config,
      options.prefix
    );

    // Convert var() references to SCSS variable references
    const scssValueFormatted = scssValue.replace(/var\(--([^)]+)\)/g, (_, varName) => {
      return `$${varName}`;
    });

    return `${prefixedName}: ${scssValueFormatted};`;
  };

  for (const collection of filteredCollections) {
    if (options.includeCollectionComments) {
      lines.push(`// Collection: ${collection.name}`);
    }

    const collectionVars = getCollectionVariables(variables, collection.id);

    for (const variable of collectionVars) {
      const line = await processVariable(variable, collection.defaultModeId);
      if (line) lines.push(line);
    }

    if (filteredCollections.indexOf(collection) < filteredCollections.length - 1) {
      lines.push('');
    }
  }

  return lines.join('\n');
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/plugin/exporters/scssExporter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/plugin/exporters/scssExporter.ts src/plugin/exporters/scssExporter.test.ts
git commit -m "feat: add SCSS exporter with variable references"
```

---

### Task 3.9: Create JSON Exporter

**Files:**

- Create: `src/plugin/exporters/jsonExporter.ts`
- Create: `src/plugin/exporters/jsonExporter.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';
import { exportToJson } from './jsonExporter';
import type { ExportOptions } from '@shared/types';

const mockVariables: Variable[] = [
  {
    id: 'var-1',
    name: 'color/primary',
    resolvedType: 'COLOR',
    valuesByMode: { 'mode-1': { r: 1, g: 0, b: 0, a: 1 } },
    variableCollectionId: 'col-1',
    description: 'Primary brand color',
    hiddenFromPublishing: false,
    scopes: [],
    codeSyntax: {},
    remote: false,
    key: 'key-1',
  } as Variable,
  {
    id: 'var-2',
    name: 'spacing/sm',
    resolvedType: 'FLOAT',
    valuesByMode: { 'mode-1': 8 },
    variableCollectionId: 'col-1',
    description: 'unit: rem',
    hiddenFromPublishing: false,
    scopes: [],
    codeSyntax: {},
    remote: false,
    key: 'key-2',
  } as Variable,
];

const mockCollections: VariableCollection[] = [
  {
    id: 'col-1',
    name: 'Design Tokens',
    modes: [{ modeId: 'mode-1', name: 'Default' }],
    defaultModeId: 'mode-1',
    remote: false,
    key: 'key-col-1',
    hiddenFromPublishing: false,
    variableIds: ['var-1', 'var-2'],
  } as VariableCollection,
];

describe('exportToJson', () => {
  const defaultOptions: ExportOptions = {
    includeCollectionComments: true,
    includeModeComments: false,
    selector: ':root',
    useModesAsSelectors: false,
  };

  it('should export variables in DTCG format', async () => {
    const result = await exportToJson(mockVariables, mockCollections, defaultOptions);
    const json = JSON.parse(result);

    expect(json['Design Tokens']).toBeDefined();
    expect(json['Design Tokens'].color.primary).toBeDefined();
    expect(json['Design Tokens'].color.primary.$type).toBe('color');
    expect(json['Design Tokens'].color.primary.$value).toBe('#ff0000');
  });

  it('should include description in output', async () => {
    const result = await exportToJson(mockVariables, mockCollections, defaultOptions);
    const json = JSON.parse(result);

    expect(json['Design Tokens'].color.primary.$description).toBe('Primary brand color');
  });

  it('should handle nested variable paths', async () => {
    const result = await exportToJson(mockVariables, mockCollections, defaultOptions);
    const json = JSON.parse(result);

    expect(json['Design Tokens'].spacing.sm).toBeDefined();
    expect(json['Design Tokens'].spacing.sm.$type).toBe('float');
  });

  it('should add unit extension for non-default units', async () => {
    const result = await exportToJson(mockVariables, mockCollections, defaultOptions);
    const json = JSON.parse(result);

    expect(json['Design Tokens'].spacing.sm.$extensions).toBeDefined();
    expect(json['Design Tokens'].spacing.sm.$extensions['com.figma.vex'].unit).toBe('rem');
  });

  it('should handle variable aliases', async () => {
    const varsWithAlias: Variable[] = [
      ...mockVariables,
      {
        id: 'var-3',
        name: 'color/secondary',
        resolvedType: 'COLOR',
        valuesByMode: { 'mode-1': { type: 'VARIABLE_ALIAS', id: 'var-1' } },
        variableCollectionId: 'col-1',
        description: '',
        hiddenFromPublishing: false,
        scopes: [],
        codeSyntax: {},
        remote: false,
        key: 'key-3',
      } as Variable,
    ];

    const result = await exportToJson(varsWithAlias, mockCollections, defaultOptions);
    const json = JSON.parse(result);

    expect(json['Design Tokens'].color.secondary.$value).toBe('{color.primary}');
  });

  it('should handle multi-mode collections', async () => {
    const multiModeCollections: VariableCollection[] = [
      {
        id: 'col-1',
        name: 'Design Tokens',
        modes: [
          { modeId: 'mode-1', name: 'Light' },
          { modeId: 'mode-2', name: 'Dark' },
        ],
        defaultModeId: 'mode-1',
        remote: false,
        key: 'key-col-1',
        hiddenFromPublishing: false,
        variableIds: ['var-1'],
      } as VariableCollection,
    ];

    const multiModeVars: Variable[] = [
      {
        id: 'var-1',
        name: 'color/bg',
        resolvedType: 'COLOR',
        valuesByMode: {
          'mode-1': { r: 1, g: 1, b: 1, a: 1 },
          'mode-2': { r: 0, g: 0, b: 0, a: 1 },
        },
        variableCollectionId: 'col-1',
        description: '',
        hiddenFromPublishing: false,
        scopes: [],
        codeSyntax: {},
        remote: false,
        key: 'key-1',
      } as Variable,
    ];

    const result = await exportToJson(multiModeVars, multiModeCollections, defaultOptions);
    const json = JSON.parse(result);

    expect(json['Design Tokens'].color.bg.$value.Light).toBe('#ffffff');
    expect(json['Design Tokens'].color.bg.$value.Dark).toBe('#000000');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/plugin/exporters/jsonExporter.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/plugin/exporters/jsonExporter.ts`:

```typescript
import type { ExportOptions } from '@shared/types';
import { rgbToHex } from '@plugin/formatters/colorFormatter';
import { parseDescription } from '@plugin/utils/descriptionParser';

/**
 * Filters collections based on selected collection IDs.
 */
function filterCollections(
  collections: VariableCollection[],
  selectedCollectionIds?: string[]
): VariableCollection[] {
  if (selectedCollectionIds && selectedCollectionIds.length > 0) {
    return collections.filter((c) => selectedCollectionIds.includes(c.id));
  }
  return collections;
}

/**
 * Gets variables for a collection, sorted by name.
 */
function getCollectionVariables(variables: Variable[], collectionId: string): Variable[] {
  return variables
    .filter((v) => v.variableCollectionId === collectionId)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Formats a raw value for JSON export (Style Dictionary compatible).
 */
function formatRawValue(
  value: VariableValue,
  type: VariableResolvedDataType,
  variables: Variable[]
): unknown {
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'VARIABLE_ALIAS'
  ) {
    const aliasedVar = variables.find((v) => v.id === value.id);
    if (aliasedVar) {
      const tokenPath = aliasedVar.name.split('/').join('.');
      return `{${tokenPath}}`;
    }
    return `{${value.id}}`;
  }

  if (type === 'COLOR' && typeof value === 'object' && value !== null && 'r' in value) {
    return rgbToHex(value as RGBA);
  }

  return value;
}

/**
 * Exports variables to JSON format (DTCG compatible).
 */
export async function exportToJson(
  variables: Variable[],
  collections: VariableCollection[],
  options?: ExportOptions
): Promise<string> {
  const filteredCollections = filterCollections(collections, options?.selectedCollections);

  const result: Record<string, unknown> = {};

  for (const collection of filteredCollections) {
    const collectionData: Record<string, unknown> = {};
    const collectionVars = getCollectionVariables(variables, collection.id);

    for (const variable of collectionVars) {
      const config = parseDescription(variable.description);
      const pathParts = variable.name.split('/');

      // Build nested structure
      let current = collectionData as Record<string, unknown>;
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part] as Record<string, unknown>;
      }

      const leafName = pathParts[pathParts.length - 1];
      const defaultModeId = collection.defaultModeId;
      const rawValue = variable.valuesByMode[defaultModeId];

      // Build token object (DTCG format)
      const token: Record<string, unknown> = {
        $type: variable.resolvedType.toLowerCase(),
        ...(variable.description && { $description: variable.description }),
      };

      // Add value(s)
      if (collection.modes.length === 1) {
        token.$value = formatRawValue(rawValue, variable.resolvedType, variables);
      } else {
        token.$value = Object.fromEntries(
          collection.modes.map((mode) => [
            mode.name,
            formatRawValue(variable.valuesByMode[mode.modeId], variable.resolvedType, variables),
          ])
        );
      }

      // Add unit extension if non-default
      if (config.unit && config.unit !== 'px') {
        token.$extensions = {
          'com.figma.vex': { unit: config.unit },
        };
      }

      current[leafName] = token;
    }

    result[collection.name] = collectionData;
  }

  return JSON.stringify(result, null, 2);
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/plugin/exporters/jsonExporter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/plugin/exporters/jsonExporter.ts src/plugin/exporters/jsonExporter.test.ts
git commit -m "feat: add JSON exporter with DTCG format support"
```

---

### Task 3.10: Create TypeScript Exporter

**Files:**

- Create: `src/plugin/exporters/typescriptExporter.ts`
- Create: `src/plugin/exporters/typescriptExporter.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect } from 'vitest';
import { exportToTypeScript, generateTypeScriptHeader } from './typescriptExporter';
import type { ExportOptions } from '@shared/types';

const mockVariables: Variable[] = [
  {
    id: 'var-1',
    name: 'color/primary',
    resolvedType: 'COLOR',
    valuesByMode: { 'mode-1': { r: 1, g: 0, b: 0, a: 1 } },
    variableCollectionId: 'col-1',
    description: '',
    hiddenFromPublishing: false,
    scopes: [],
    codeSyntax: {},
    remote: false,
    key: 'key-1',
  } as Variable,
  {
    id: 'var-2',
    name: 'spacing/sm',
    resolvedType: 'FLOAT',
    valuesByMode: { 'mode-1': 8 },
    variableCollectionId: 'col-1',
    description: '',
    hiddenFromPublishing: false,
    scopes: [],
    codeSyntax: {},
    remote: false,
    key: 'key-2',
  } as Variable,
];

const mockCollections: VariableCollection[] = [
  {
    id: 'col-1',
    name: 'Design Tokens',
    modes: [{ modeId: 'mode-1', name: 'Default' }],
    defaultModeId: 'mode-1',
    remote: false,
    key: 'key-col-1',
    hiddenFromPublishing: false,
    variableIds: ['var-1', 'var-2'],
  } as VariableCollection,
];

describe('generateTypeScriptHeader', () => {
  it('should generate TypeScript-style header', () => {
    const header = generateTypeScriptHeader('Test File');
    expect(header).toContain('Auto-generated TypeScript types');
    expect(header).toContain('Exported from Figma: Test File');
  });
});

describe('exportToTypeScript', () => {
  const defaultOptions: ExportOptions = {
    includeCollectionComments: false,
    includeModeComments: false,
    selector: ':root',
    useModesAsSelectors: false,
  };

  it('should export as TypeScript type definition', async () => {
    const result = await exportToTypeScript(
      mockVariables,
      mockCollections,
      'Test File',
      defaultOptions
    );

    expect(result).toContain('export type CSSVariableName =');
    expect(result).toContain('| "--color-primary"');
    expect(result).toContain('| "--spacing-sm"');
  });

  it('should include csstype module declaration', async () => {
    const result = await exportToTypeScript(
      mockVariables,
      mockCollections,
      'Test File',
      defaultOptions
    );

    expect(result).toContain("declare module 'csstype'");
    expect(result).toContain('interface Properties');
    expect(result).toContain('[key: CSSVariableName]: string | number;');
  });

  it('should add prefix to variable names', async () => {
    const result = await exportToTypeScript(mockVariables, mockCollections, 'Test File', {
      ...defaultOptions,
      prefix: 'ds',
    });

    expect(result).toContain('| "--ds-color-primary"');
    expect(result).toContain('| "--ds-spacing-sm"');
  });

  it('should return message when no variables found', async () => {
    const result = await exportToTypeScript([], mockCollections, 'Test File', defaultOptions);
    expect(result).toBe('// No variables found in this file');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/plugin/exporters/typescriptExporter.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/plugin/exporters/typescriptExporter.ts`:

```typescript
import type { ExportOptions } from '@shared/types';
import { toCssName, toPrefixedName } from '@plugin/formatters/nameFormatter';

/**
 * Generates the TypeScript file header comment.
 */
export function generateTypeScriptHeader(fileName: string): string {
  return [
    '/**',
    ' * Auto-generated TypeScript types for CSS Custom Properties',
    ` * Exported from Figma: ${fileName}`,
    ` * Generated: ${new Date().toISOString()}`,
    ' */',
    '',
  ].join('\n');
}

/**
 * Filters collections based on selected collection IDs.
 */
function filterCollections(
  collections: VariableCollection[],
  selectedCollectionIds?: string[]
): VariableCollection[] {
  if (selectedCollectionIds && selectedCollectionIds.length > 0) {
    return collections.filter((c) => selectedCollectionIds.includes(c.id));
  }
  return collections;
}

/**
 * Gets variables for a collection, sorted alphabetically.
 */
function getCollectionVariables(variables: Variable[], collectionId: string): Variable[] {
  return variables
    .filter((v) => v.variableCollectionId === collectionId)
    .sort((a, b) => toCssName(a.name).localeCompare(toCssName(b.name)));
}

/**
 * Exports variables to TypeScript type definitions.
 */
export async function exportToTypeScript(
  variables: Variable[],
  collections: VariableCollection[],
  fileName: string,
  options: ExportOptions
): Promise<string> {
  if (variables.length === 0) {
    return '// No variables found in this file';
  }

  const filteredCollections = filterCollections(collections, options.selectedCollections);

  const lines: string[] = [generateTypeScriptHeader(fileName), 'export type CSSVariableName ='];

  const variableNames: string[] = [];

  for (const collection of filteredCollections) {
    const collectionVars = getCollectionVariables(variables, collection.id);

    for (const variable of collectionVars) {
      const cssName = toCssName(variable.name);
      const prefixedName = toPrefixedName(cssName, options.prefix);
      variableNames.push(`  | "--${prefixedName}"`);
    }
  }

  if (variableNames.length === 0) {
    return '// No variables found in this file';
  }

  lines.push(...variableNames);
  lines.push(';');
  lines.push('');
  lines.push("declare module 'csstype' {");
  lines.push('  interface Properties {');
  lines.push('    [key: CSSVariableName]: string | number;');
  lines.push('  }');
  lines.push('}');

  return lines.join('\n');
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/plugin/exporters/typescriptExporter.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/plugin/exporters/typescriptExporter.ts src/plugin/exporters/typescriptExporter.test.ts
git commit -m "feat: add TypeScript exporter with csstype augmentation"
```

---

### Task 3.11: Create Exporter Index

**Files:**

- Create: `src/plugin/exporters/index.ts`

**Step 1: Create the barrel export**

```typescript
export { exportToCss, generateCssHeader } from './cssExporter';
export { exportToScss, generateScssHeader } from './scssExporter';
export { exportToJson } from './jsonExporter';
export { exportToTypeScript, generateTypeScriptHeader } from './typescriptExporter';
```

**Step 2: Commit**

```bash
git add src/plugin/exporters/index.ts
git commit -m "feat: add exporters barrel export"
```

---

### Task 3.12: Create GitHub Service

**Files:**

- Create: `src/plugin/services/githubService.ts`
- Create: `src/plugin/services/githubService.test.ts`

**Step 1: Write the test**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateGitHubOptions, buildDispatchPayload } from './githubService';
import type { GitHubDispatchOptions, ExportOptions } from '@shared/types';

describe('validateGitHubOptions', () => {
  const validOptions: GitHubDispatchOptions = {
    repository: 'owner/repo',
    token: 'ghp_xxxxx',
    exportTypes: ['css'],
    exportOptions: {
      includeCollectionComments: true,
      includeModeComments: false,
      selector: ':root',
      useModesAsSelectors: false,
    },
  };

  it('should pass for valid options', () => {
    expect(() => validateGitHubOptions(validOptions)).not.toThrow();
  });

  it('should throw for invalid repository format', () => {
    expect(() => validateGitHubOptions({ ...validOptions, repository: 'invalid' })).toThrow(
      'Invalid repository format'
    );
  });

  it('should throw for empty repository', () => {
    expect(() => validateGitHubOptions({ ...validOptions, repository: '' })).toThrow(
      'Invalid repository format'
    );
  });

  it('should throw for empty token', () => {
    expect(() => validateGitHubOptions({ ...validOptions, token: '' })).toThrow(
      'GitHub token is required'
    );
  });

  it('should throw for empty export types', () => {
    expect(() => validateGitHubOptions({ ...validOptions, exportTypes: [] })).toThrow(
      'At least one export type must be selected'
    );
  });
});

describe('buildDispatchPayload', () => {
  it('should build correct payload structure', () => {
    const exports = { css: ':root { --color: red; }' };
    const payload = buildDispatchPayload(exports, 'Test File', 'update-variables.yml');

    expect(payload.event_type).toBe('figma-variables-update');
    expect(payload.client_payload.exports).toEqual(exports);
    expect(payload.client_payload.figma_file).toBe('Test File');
    expect(payload.client_payload.workflow_file).toBe('update-variables.yml');
    expect(payload.client_payload.generated_at).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test src/plugin/services/githubService.test.ts`
Expected: FAIL - module not found

**Step 3: Write the implementation**

Create `src/plugin/services/githubService.ts`:

```typescript
import type { GitHubDispatchOptions, ExportOptions } from '@shared/types';

export interface DispatchPayload {
  event_type: string;
  client_payload: {
    exports: Record<string, string>;
    generated_at: string;
    figma_file: string;
    workflow_file: string;
  };
}

/**
 * Validates GitHub dispatch options.
 */
export function validateGitHubOptions(options: GitHubDispatchOptions): void {
  const repoParts = options.repository.trim().split('/').filter(Boolean);

  if (repoParts.length !== 2) {
    throw new Error(
      "Invalid repository format. Expected 'owner/repo' (e.g., 'octocat/Hello-World')"
    );
  }

  const [owner, repo] = repoParts;
  if (!owner || !repo) {
    throw new Error('Repository owner and name are required');
  }

  const token = options.token.trim();
  if (!token) {
    throw new Error('GitHub token is required');
  }

  if (!options.exportTypes || options.exportTypes.length === 0) {
    throw new Error('At least one export type must be selected');
  }
}

/**
 * Builds the dispatch payload for GitHub API.
 */
export function buildDispatchPayload(
  exports: Record<string, string>,
  figmaFile: string,
  workflowFile: string
): DispatchPayload {
  return {
    event_type: 'figma-variables-update',
    client_payload: {
      exports,
      generated_at: new Date().toISOString(),
      figma_file: figmaFile,
      workflow_file: workflowFile,
    },
  };
}

/**
 * Parses GitHub API error response.
 */
export function parseGitHubError(status: number, errorText: string): string {
  let errorMessage = `GitHub API error (${status})`;

  try {
    const errorJson = JSON.parse(errorText);
    errorMessage = errorJson.message || errorJson.errors?.[0]?.message || errorMessage;
  } catch {
    if (errorText && errorText.length < 200) {
      errorMessage = errorText;
    }
  }

  if (status === 401) {
    errorMessage = 'Authentication failed. Please check your GitHub token.';
  } else if (status === 403) {
    errorMessage = "Access forbidden. Ensure your token has 'repo' scope and repository access.";
  } else if (status === 404) {
    errorMessage = 'Repository not found. Check the repository name and your access permissions.';
  }

  return errorMessage;
}

/**
 * Sends a repository_dispatch event to GitHub.
 */
export async function sendGitHubDispatch(
  options: GitHubDispatchOptions,
  exports: Record<string, string>,
  figmaFileName: string
): Promise<void> {
  validateGitHubOptions(options);

  const [owner, repo] = options.repository.trim().split('/');
  const token = options.token.trim();

  const payload = buildDispatchPayload(
    exports,
    figmaFileName,
    options.workflowFileName || 'update-variables.yml'
  );

  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/dispatches`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
  } catch (fetchError) {
    throw new Error(
      `Network error: ${fetchError instanceof Error ? fetchError.message : String(fetchError)}`
    );
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(parseGitHubError(response.status, errorText));
  }
}
```

**Step 4: Run test to verify it passes**

Run: `pnpm test src/plugin/services/githubService.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/plugin/services/githubService.ts src/plugin/services/githubService.test.ts
git commit -m "feat: add GitHub service for repository dispatch"
```

---

### Task 3.13: Create Services Index

**Files:**

- Create: `src/plugin/services/index.ts`

**Step 1: Create the barrel export**

```typescript
export { resolveValue } from './valueResolver';
export {
  validateGitHubOptions,
  buildDispatchPayload,
  parseGitHubError,
  sendGitHubDispatch,
} from './githubService';
```

**Step 2: Commit**

```bash
git add src/plugin/services/index.ts
git commit -m "feat: add services barrel export"
```

---

### Task 3.14: Create Plugin Main Entry Point

**Files:**

- Create: `src/plugin/main.ts`

**Step 1: Write the plugin entry point**

```typescript
/// <reference types="@figma/plugin-typings" />

import type { PluginMessage, ExportOptions, UIMessage } from '@shared/types';
import { exportToCss } from './exporters/cssExporter';
import { exportToScss } from './exporters/scssExporter';
import { exportToJson } from './exporters/jsonExporter';
import { exportToTypeScript } from './exporters/typescriptExporter';
import { sendGitHubDispatch } from './services/githubService';

// UI dimensions
const UI_WIDTH = 520;
const UI_HEIGHT = 700;

/**
 * Sends a message to the UI.
 */
function postToUI(message: UIMessage): void {
  figma.ui.postMessage(message);
}

/**
 * Gets the default export options.
 */
function getDefaultOptions(): ExportOptions {
  return {
    includeCollectionComments: true,
    includeModeComments: true,
    selector: ':root',
    useModesAsSelectors: false,
  };
}

/**
 * Main message handler.
 */
async function handleMessage(msg: PluginMessage): Promise<void> {
  const variables = await figma.variables.getLocalVariablesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const fileName = figma.root.name;

  switch (msg.type) {
    case 'get-collections': {
      postToUI({
        type: 'collections-list',
        collections: collections.map((c) => ({ id: c.id, name: c.name })),
      });
      break;
    }

    case 'export-css': {
      const options = msg.options ?? getDefaultOptions();
      const css = await exportToCss(variables, collections, fileName, options);
      postToUI({ type: 'css-result', css });
      break;
    }

    case 'export-scss': {
      const options = msg.options ?? { ...getDefaultOptions(), includeModeComments: false };
      const scss = await exportToScss(variables, collections, fileName, options);
      postToUI({ type: 'scss-result', scss });
      break;
    }

    case 'export-json': {
      const json = await exportToJson(variables, collections, msg.options);
      postToUI({ type: 'json-result', json });
      break;
    }

    case 'export-typescript': {
      const options = msg.options ?? {
        ...getDefaultOptions(),
        includeCollectionComments: false,
        includeModeComments: false,
      };
      const typescript = await exportToTypeScript(variables, collections, fileName, options);
      postToUI({ type: 'typescript-result', typescript });
      break;
    }

    case 'github-dispatch': {
      if (!msg.githubOptions) {
        throw new Error('GitHub options are required');
      }

      const exports: Record<string, string> = {};
      const baseOptions = msg.githubOptions.exportOptions;

      if (msg.githubOptions.exportTypes.includes('css')) {
        exports.css = await exportToCss(variables, collections, fileName, {
          ...baseOptions,
          includeCollectionComments: baseOptions.includeCollectionComments ?? true,
          includeModeComments: baseOptions.includeModeComments ?? true,
        });
      }

      if (msg.githubOptions.exportTypes.includes('scss')) {
        exports.scss = await exportToScss(variables, collections, fileName, {
          ...baseOptions,
          includeCollectionComments: baseOptions.includeCollectionComments ?? true,
          includeModeComments: false,
        });
      }

      if (msg.githubOptions.exportTypes.includes('json')) {
        exports.json = await exportToJson(variables, collections, baseOptions);
      }

      if (msg.githubOptions.exportTypes.includes('typescript')) {
        exports.typescript = await exportToTypeScript(variables, collections, fileName, {
          ...baseOptions,
          includeCollectionComments: false,
          includeModeComments: false,
        });
      }

      await sendGitHubDispatch(msg.githubOptions, exports, fileName);
      postToUI({
        type: 'github-dispatch-success',
        message: 'Successfully sent to GitHub! The workflow should start shortly.',
      });
      break;
    }

    case 'cancel': {
      figma.closePlugin();
      break;
    }

    default: {
      console.warn('Unknown message type:', (msg as { type: string }).type);
      break;
    }
  }
}

// Initialize plugin
figma.showUI(__html__, { width: UI_WIDTH, height: UI_HEIGHT });

figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    await handleMessage(msg);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    postToUI({
      type: 'error',
      message: `Export failed: ${errorMessage}`,
    });
    console.error('Plugin error:', error);
  }
};
```

**Step 2: Commit**

```bash
git add src/plugin/main.ts
git commit -m "feat: add plugin main entry point with message routing"
```

---

## Phase 4: React UI

_Note: Phase 4 contains Tasks 4.1-4.15 for the complete React UI implementation including:_

- HTML entry point
- React app shell
- Plugin bridge service
- Custom hooks (usePluginMessage, useCollections, useClipboard)
- Common components (Button, Checkbox, Input, StatusMessage, OutputArea)
- Tab components (TabBar, TabPanel)
- Export tab components (CssTab, ScssTab, JsonTab, TypeScriptTab)
- GitHub tab component
- Help tab component
- Main App component integration

_Each task follows the same TDD structure with:_

1. Write the failing test
2. Run test to verify it fails
3. Write minimal implementation
4. Run test to verify it passes
5. Commit

---

## Phase 5: Integration & Polish

### Task 5.1: Verify Full Build

**Step 1: Run full build**

Run: `pnpm build`
Expected: Both plugin and UI build successfully, outputs in `dist/`

**Step 2: Verify output files**

Run: `ls -la dist/`
Expected: `main.js` and `index.html` present

**Step 3: Commit if any changes needed**

```bash
git add -A
git commit -m "chore: verify full build configuration"
```

---

### Task 5.2: Run All Tests

**Step 1: Run test suite with coverage**

Run: `pnpm test:coverage`
Expected: All tests pass with coverage report

**Step 2: Commit coverage config if needed**

```bash
git add -A
git commit -m "chore: finalize test configuration"
```

---

### Task 5.3: Run Linting and Formatting

**Step 1: Run linter**

Run: `pnpm lint`
Expected: No errors

**Step 2: Run formatter**

Run: `pnpm format`
Expected: Files formatted

**Step 3: Commit any formatting changes**

```bash
git add -A
git commit -m "style: apply formatting"
```

---

### Task 5.4: Clean Up Old Files

**Step 1: Remove old source files**

Run:

```bash
rm -f src/main.ts
rm -f ui.html
```

**Step 2: Update .gitignore if needed**

Ensure `dist/` is in `.gitignore`

**Step 3: Commit cleanup**

```bash
git add -A
git commit -m "chore: remove old source files after migration"
```

---

### Task 5.5: Final Integration Test

**Step 1: Build the plugin**

Run: `pnpm build`

**Step 2: Test in Figma**

- Open Figma
- Go to Plugins > Development > Import plugin from manifest
- Select `manifest.json`
- Run the plugin
- Verify all tabs work
- Verify exports generate correctly

**Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "fix: final integration fixes"
```

---

## Summary

This plan migrates the Figma-Vex plugin from:

- Monolithic `main.ts` (978 lines) → Modular backend with 15+ focused files
- Monolithic `ui.html` (982 lines) → React component-based UI
- Plain `tsc` build → Vite dual-build configuration
- No tests → Comprehensive test coverage with Vitest
- No tooling → ESLint, Prettier, TypeScript strict mode

**Key Benefits:**

- Separation of concerns for maintainability
- Type-safe message passing between plugin and UI
- Reusable React components
- Testable pure functions
- Modern build tooling with HMR for development
- Tailwind CSS for consistent, maintainable styling
