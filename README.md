# Vex - Flexible Figma Variables Export

A Figma plugin that exports variables to CSS custom properties with configurable units and color formats. Control output using the variable's description field.

## Installation

### Option 1: Load directly in Figma (Development)

1. In Figma, go to **Plugins > Development > Import plugin from manifest...**
2. Select the `manifest.json` file from this folder
3. The plugin will appear in your Plugins menu

### Option 2: Build from source

```bash
pnpm install
pnpm build
```

The source files will be compiled and bundled into `dist/`. Then import the manifest.json in Figma as above.

## Usage

### Basic Export

1. Run the plugin from **Plugins > Variables Export**
2. Configure options (selector, modes, comments)
3. Click **Generate CSS**
4. Copy the output

### Configuring Variable Units

Add configuration to any variable's **description field** in Figma:

#### Number Units

| Description    | Output Example              |
| -------------- | --------------------------- |
| `unit: none`   | `1.5` (raw number)          |
| `unit: px`     | `16px` (default)            |
| `unit: rem`    | `1rem`                      |
| `unit: rem:20` | `0.8rem` (custom 20px base) |
| `unit: em`     | `1.5em`                     |
| `unit: %`      | `100%`                      |
| `unit: ms`     | `200ms`                     |

#### Color Formats

| Description     | Output Example          |
| --------------- | ----------------------- |
| `format: hex`   | `#ff5500` (default)     |
| `format: rgb`   | `rgb(255, 85, 0)`       |
| `format: rgba`  | `rgba(255, 85, 0, 0.5)` |
| `format: hsl`   | `hsl(20, 100%, 50%)`    |
| `format: oklch` | `oklch(70% 0.15 45)`    |

### Common Use Cases

| Variable Type | Description to Add |
| ------------- | ------------------ |
| Line height   | `unit: none`       |
| Font weight   | `unit: none`       |
| Z-index       | `unit: none`       |
| Opacity       | `unit: none`       |
| Flex ratios   | `unit: none`       |
| Spacing (rem) | `unit: rem`        |
| Durations     | `unit: ms`         |

### Example

Given a variable named `typography/line-height/body` with value `1.5`:

- **Without config:** `--typography-line-height-body: 1.5px;` ❌
- **With `unit: none`:** `--typography-line-height-body: 1.5;` ✅

## Output Formats

### CSS (Default)

```css
:root {
  --color-primary: #18a0fb;
  --spacing-4: 16px;
  --line-height-body: 1.5;
}
```

### CSS with Modes as Selectors

When "Export modes as separate selectors" is enabled:

```css
:root {
  --color-primary: #18a0fb;
}

:root[data-theme='dark'],
.theme-dark {
  --color-primary: #60c5ff;
}
```

### JSON (for Style Dictionary)

```json
{
  "colors": {
    "primary": {
      "$type": "color",
      "$value": "#18a0fb"
    }
  }
}
```

## Features

- ✅ Reads native Figma variables (no Enterprise required)
- ✅ Configurable units via description field
- ✅ Multiple color format options
- ✅ Variable alias resolution
- ✅ Multi-mode support
- ✅ JSON export for Style Dictionary
- ✅ GitHub integration with automatic PR creation
- ✅ No external dependencies at runtime

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Watch mode (auto-rebuild on changes)
pnpm dev

# Run tests
pnpm test

# Type check
pnpm typecheck

# Lint
pnpm lint

# Format code
pnpm format
```

### Project Structure

This is a Turborepo monorepo with the following structure:

```
figma-vex/
├── apps/
│   ├── plugin/              # Figma plugin backend (runs in sandbox)
│   │   └── src/
│   │       ├── exporters/   # CSS, JSON, TypeScript exporters
│   │       ├── formatters/  # Color, name, number formatting
│   │       ├── services/    # GitHub, value resolver
│   │       ├── utils/       # Description parser, collection utils
│   │       └── main.ts      # Plugin entry point
│   ├── ui/                  # Figma plugin UI (React, runs in iframe)
│   │   └── src/
│   │       ├── components/  # React components
│   │       ├── hooks/       # usePluginMessage, useClipboard, etc.
│   │       ├── services/    # Plugin bridge
│   │       └── styles/      # Tailwind CSS
│   └── action/              # GitHub Action for CI/CD integration
│       └── src/
├── packages/
│   └── shared/              # Shared types and config
│       └── src/
│           └── types/       # Message types, token types
├── dist/                    # Build output (generated)
│   ├── plugin.js            # Plugin backend (IIFE)
│   ├── index.html           # React UI (inlined single file)
│   └── action.js            # GitHub Action
├── manifest.json            # Figma plugin manifest
├── action.yml               # GitHub Action manifest
├── turbo.json               # Turborepo config
└── pnpm-workspace.yaml      # pnpm workspace config
```

### Tech Stack

- **TypeScript** - Strict mode enabled
- **React 19** - Component-based UI
- **Tailwind CSS** - Styling with Figma design tokens
- **Vite 6** - Build tooling for all packages
- **Vitest** - Unit testing with coverage
- **Turborepo** - Monorepo build orchestration
- **pnpm** - Package management with workspaces
- **ESLint 9 + Prettier** - Code quality

### Working with Packages

```bash
# Build a specific package
pnpm --filter @figma-vex/plugin build

# Run tests for a specific package
pnpm --filter @figma-vex/ui test

# Add a dependency to a package
pnpm --filter @figma-vex/plugin add lodash
```

## GitHub Integration

The plugin can send generated exports to GitHub via `repository_dispatch` events. This allows you to trigger custom workflows in your repository to process the exported variables.

### Setup

1. **Create a GitHub Personal Access Token**:
   - Go to [GitHub Settings > Tokens](https://github.com/settings/tokens)
   - Generate a new token with `repo` scope
   - Copy the token

2. **Use the plugin**:
   - Open the GitHub tab in the plugin
   - Enter your repository: `owner/repo`
   - Paste your GitHub token
   - Select export types to include
   - Click "Send to GitHub"

### Payload Structure

The plugin sends a `repository_dispatch` event with:

- **Event type**: `figma-variables-update`
- **Payload**:
  ```json
  {
    "exports": {
      "css": "...",
      "json": "...",
      "typescript": "..."
    },
    "generated_at": "2024-01-01T00:00:00.000Z",
    "figma_file": "Design File",
    "workflow_file": "update-variables.yml"
  }
  ```

Access the exports in your workflow via `${{ github.event.client_payload.exports.* }}`.

## License

MIT
