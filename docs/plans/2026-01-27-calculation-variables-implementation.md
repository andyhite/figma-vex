# Calculation-Based Variables - Detailed Implementation Plan

**Goal:** Enable expression-based calculations in Figma variable descriptions (e.g., `calc: var(--font-lg) * 1.5`) with evaluation at export time and optional write-back to Figma.

**Design Document:** See `docs/plans/2026-01-27-calculation-variables-design.md` for the full design rationale.

---

## Codebase Context

### Project Structure
```
figma-vex/
├── apps/
│   ├── plugin/          # Figma plugin backend (TypeScript)
│   │   ├── src/
│   │   │   ├── exporters/    # CSS, SCSS, JSON, TypeScript exporters
│   │   │   ├── formatters/   # Color, number, name formatting
│   │   │   ├── services/     # Value resolution, GitHub, styles
│   │   │   ├── utils/        # Description parser, collection utils
│   │   │   └── main.ts       # Plugin entry point
│   │   └── package.json
│   └── ui/              # React UI (separate package)
└── packages/
    └── shared/          # Shared types and config
        └── src/
            ├── types/
            │   ├── tokens.ts    # TokenConfig, Unit, ColorFormat
            │   ├── messages.ts  # Plugin <-> UI message types
            │   └── styles.ts    # Style types
            └── config.ts        # Shared configuration
```

### Key Existing Files

**`packages/shared/src/types/tokens.ts`** - Token configuration types:
```typescript
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

**`apps/plugin/src/utils/descriptionParser.ts`** - Parses variable descriptions:
```typescript
import type { TokenConfig } from '@figma-vex/shared';

export const UNIT_REGEX = /unit:\s*(none|px|rem|em|%|ms|s)(?::(\d+))?/i;
export const FORMAT_REGEX = /format:\s*(rgba|rgb|hex|hsl|oklch)/i;

export function parseDescription(description: string): Partial<TokenConfig> {
  if (!description) return {};
  const config: Partial<TokenConfig> = {};
  // ... parses unit: and format: directives
  return config;
}
```

**`apps/plugin/src/services/valueResolver.ts`** - Resolves variable values:
```typescript
export async function resolveValue(
  value: VariableValue,
  _modeId: string,
  variables: Variable[],
  resolvedType: VariableResolvedDataType,
  config: TokenConfig,
  prefix = '',
  depth = 0,
  visited = new Set<string>()
): Promise<string>
```

### Test Framework
- Uses **Vitest** for testing
- Tests are co-located with source files (e.g., `descriptionParser.test.ts`)
- Run tests: `cd apps/plugin && npm test -- --run`

### Path Aliases
The plugin uses TypeScript path aliases:
- `@plugin/` → `apps/plugin/src/`
- `@figma-vex/shared` → `packages/shared/src/`

---

## Implementation Tasks

### Task 1: Add mathjs Dependency

**Purpose:** Install the math expression evaluation library.

**Commands:**
```bash
cd /Users/user/Code/andyhite/figma-vex/apps/plugin
npm install mathjs
```

**Verification:**
```bash
npm ls mathjs
# Should show: mathjs@x.x.x
```

**Commit:**
```bash
git add package.json package-lock.json
git commit -m "chore: add mathjs dependency for expression evaluation"
```

---

### Task 2: Extend TokenConfig Type

**Purpose:** Add `expression` field to store calc expressions.

**File:** `packages/shared/src/types/tokens.ts`

**Replace entire file with:**
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
  /** Optional calculation expression (e.g., "var(--spacing-base) * 2") */
  expression?: string;
}

export const DEFAULT_CONFIG: TokenConfig = {
  unit: 'px',
  remBase: 16,
  colorFormat: 'hex',
};
```

**Commit:**
```bash
git add packages/shared/src/types/tokens.ts
git commit -m "feat: add expression field to TokenConfig type"
```

---

### Task 3: Add Semicolon-Separated Directive Tests

**Purpose:** Verify existing parser handles semicolon-separated directives (it should already work).

**File:** `apps/plugin/src/utils/descriptionParser.test.ts`

**Add this test suite at the end of the file (before the final closing brace if any):**
```typescript
describe('semicolon-separated directives', () => {
  it('should parse unit and format separated by semicolon', () => {
    const result = parseDescription('unit: rem; format: hex');
    expect(result.unit).toBe('rem');
    expect(result.colorFormat).toBe('hex');
  });

  it('should parse unit with remBase separated by semicolon', () => {
    const result = parseDescription('unit: rem:20; format: oklch');
    expect(result.unit).toBe('rem');
    expect(result.remBase).toBe(20);
    expect(result.colorFormat).toBe('oklch');
  });

  it('should handle whitespace around semicolons', () => {
    const result = parseDescription('unit: px ; format: rgb');
    expect(result.unit).toBe('px');
    expect(result.colorFormat).toBe('rgb');
  });

  it('should handle multiple semicolons', () => {
    const result = parseDescription('unit: em; ; format: hsl');
    expect(result.unit).toBe('em');
    expect(result.colorFormat).toBe('hsl');
  });
});
```

**Run tests:**
```bash
cd /Users/user/Code/andyhite/figma-vex/apps/plugin
npm test -- --run descriptionParser
```

**Expected:** All tests pass (existing regex handles semicolons).

**Commit:**
```bash
git add src/utils/descriptionParser.test.ts
git commit -m "test: add semicolon-separated directive tests"
```

---

### Task 4: Add calc Expression Parsing

**Purpose:** Parse `calc:` expressions from variable descriptions.

#### Step 4.1: Add tests

**File:** `apps/plugin/src/utils/descriptionParser.test.ts`

**Add this test suite:**
```typescript
describe('calc expression parsing', () => {
  it('should parse simple calc expression', () => {
    const result = parseDescription('calc: var(--spacing-base) * 2');
    expect(result.expression).toBe('var(--spacing-base) * 2');
  });

  it('should parse calc with unit directive', () => {
    const result = parseDescription('calc: var(--font-lg) * 1.5; unit: rem');
    expect(result.expression).toBe('var(--font-lg) * 1.5');
    expect(result.unit).toBe('rem');
  });

  it('should parse calc with function calls', () => {
    const result = parseDescription('calc: round(var(--spacing-base) * 1.5)');
    expect(result.expression).toBe('round(var(--spacing-base) * 1.5)');
  });

  it('should parse calc with min/max functions', () => {
    const result = parseDescription('calc: max(var(--min-size), var(--preferred-size))');
    expect(result.expression).toBe('max(var(--min-size), var(--preferred-size))');
  });

  it('should parse calc with complex arithmetic', () => {
    const result = parseDescription('calc: (var(--a) + var(--b)) / 2');
    expect(result.expression).toBe('(var(--a) + var(--b)) / 2');
  });

  it('should be case insensitive for calc keyword', () => {
    const result = parseDescription('CALC: var(--x) * 2');
    expect(result.expression).toBe('var(--x) * 2');
  });

  it('should handle calc at different positions', () => {
    const result = parseDescription('unit: px; calc: var(--x) * 2; format: hex');
    expect(result.expression).toBe('var(--x) * 2');
    expect(result.unit).toBe('px');
    expect(result.colorFormat).toBe('hex');
  });

  it('should return undefined expression for non-calc descriptions', () => {
    const result = parseDescription('unit: px; format: hex');
    expect(result.expression).toBeUndefined();
  });

  it('should handle calc with negative numbers', () => {
    const result = parseDescription('calc: var(--x) * -1');
    expect(result.expression).toBe('var(--x) * -1');
  });

  it('should handle calc with decimal numbers', () => {
    const result = parseDescription('calc: var(--x) * 1.618');
    expect(result.expression).toBe('var(--x) * 1.618');
  });
});
```

**Run tests to see them fail:**
```bash
npm test -- --run descriptionParser
```

**Expected:** Tests fail because `expression` property doesn't exist.

#### Step 4.2: Implement calc parsing

**File:** `apps/plugin/src/utils/descriptionParser.ts`

**Replace entire file with:**
```typescript
import type { TokenConfig } from '@figma-vex/shared';

export const UNIT_REGEX = /unit:\s*(none|px|rem|em|%|ms|s)(?::(\d+))?/i;
export const FORMAT_REGEX = /format:\s*(rgba|rgb|hex|hsl|oklch)/i;
export const CALC_REGEX = /calc:\s*(.+?)(?:;|$)/i;

/**
 * Parses a variable's description field to extract token configuration.
 * Supports unit, color format, and calc expression specifications.
 * Directives can be separated by semicolons on a single line.
 *
 * Examples:
 * - "unit: rem:16"
 * - "format: oklch"
 * - "calc: var(--spacing-base) * 2"
 * - "calc: var(--font-lg) * 1.5; unit: rem"
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

  const calcMatch = description.match(CALC_REGEX);
  if (calcMatch) {
    config.expression = calcMatch[1].trim();
  }

  return config;
}
```

**Run tests:**
```bash
npm test -- --run descriptionParser
```

**Expected:** All tests pass.

**Commit:**
```bash
git add src/utils/descriptionParser.ts src/utils/descriptionParser.test.ts
git commit -m "feat: add calc expression parsing to description parser"
```

---

### Task 5: Create Variable Lookup Utility

**Purpose:** Map CSS variable names (like `--primitives-spacing-base`) back to Figma variables.

#### Step 5.1: Create test file

**File:** `apps/plugin/src/utils/variableLookup.test.ts`

**Create with content:**
```typescript
import { describe, it, expect } from 'vitest';
import { buildVariableLookup, lookupVariable, extractVarReferences } from './variableLookup';

const mockVariables = [
  {
    id: 'var-1',
    name: 'spacing/base',
    resolvedType: 'FLOAT',
    variableCollectionId: 'col-1',
  },
  {
    id: 'var-2',
    name: 'typography/font-size/lg',
    resolvedType: 'FLOAT',
    variableCollectionId: 'col-2',
  },
  {
    id: 'var-3',
    name: 'colors/primary',
    resolvedType: 'COLOR',
    variableCollectionId: 'col-1',
  },
] as unknown as Variable[];

const mockCollections = [
  { id: 'col-1', name: 'primitives' },
  { id: 'col-2', name: 'tokens' },
] as unknown as VariableCollection[];

describe('buildVariableLookup', () => {
  it('should create lookup map with CSS variable names as keys', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, '');
    expect(lookup.has('--primitives-spacing-base')).toBe(true);
    expect(lookup.has('--tokens-typography-font-size-lg')).toBe(true);
    expect(lookup.has('--primitives-colors-primary')).toBe(true);
  });

  it('should include prefix in keys when provided', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, 'ds');
    expect(lookup.has('--ds-primitives-spacing-base')).toBe(true);
  });

  it('should skip variables with missing collections', () => {
    const varsWithMissingCollection = [
      ...mockVariables,
      { id: 'var-orphan', name: 'orphan', variableCollectionId: 'nonexistent' },
    ] as unknown as Variable[];
    const lookup = buildVariableLookup(varsWithMissingCollection, mockCollections, '');
    expect(lookup.size).toBe(3); // Only the 3 valid ones
  });
});

describe('lookupVariable', () => {
  it('should find variable by CSS var() reference', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, '');
    const result = lookupVariable('var(--primitives-spacing-base)', lookup);
    expect(result?.variable.id).toBe('var-1');
  });

  it('should return undefined for non-existent variable', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, '');
    const result = lookupVariable('var(--nonexistent)', lookup);
    expect(result).toBeUndefined();
  });

  it('should handle var() syntax correctly', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, '');
    const result = lookupVariable('var(--tokens-typography-font-size-lg)', lookup);
    expect(result?.variable.id).toBe('var-2');
  });

  it('should return undefined for invalid var() syntax', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, '');
    expect(lookupVariable('--spacing-base', lookup)).toBeUndefined();
    expect(lookupVariable('var(spacing-base)', lookup)).toBeUndefined();
    expect(lookupVariable('', lookup)).toBeUndefined();
  });
});

describe('extractVarReferences', () => {
  it('should extract single var reference', () => {
    const refs = extractVarReferences('var(--spacing-base) * 2');
    expect(refs).toEqual(['var(--spacing-base)']);
  });

  it('should extract multiple var references', () => {
    const refs = extractVarReferences('var(--a) + var(--b)');
    expect(refs).toEqual(['var(--a)', 'var(--b)']);
  });

  it('should extract var references from function calls', () => {
    const refs = extractVarReferences('max(var(--min), var(--max))');
    expect(refs).toEqual(['var(--min)', 'var(--max)']);
  });

  it('should return empty array for no references', () => {
    const refs = extractVarReferences('10 * 2');
    expect(refs).toEqual([]);
  });

  it('should handle complex nested expressions', () => {
    const refs = extractVarReferences('round((var(--a) + var(--b)) / var(--c))');
    expect(refs).toEqual(['var(--a)', 'var(--b)', 'var(--c)']);
  });

  it('should handle empty string', () => {
    expect(extractVarReferences('')).toEqual([]);
  });

  it('should handle duplicate references', () => {
    const refs = extractVarReferences('var(--x) + var(--x)');
    expect(refs).toEqual(['var(--x)', 'var(--x)']);
  });
});
```

#### Step 5.2: Create implementation

**File:** `apps/plugin/src/utils/variableLookup.ts`

**Create with content:**
```typescript
import { toCssName, toPrefixedName } from '@plugin/formatters/nameFormatter';

/**
 * Lookup map entry containing variable and its collection
 */
export interface VariableLookupEntry {
  variable: Variable;
  collection: VariableCollection;
}

/**
 * Builds a lookup map from CSS variable names to Figma variables.
 * Keys are in the format "--[prefix-]collection-name-variable-name".
 *
 * @param variables - All Figma variables
 * @param collections - All variable collections
 * @param prefix - Optional CSS variable prefix
 * @returns Map from CSS variable name to variable entry
 */
export function buildVariableLookup(
  variables: Variable[],
  collections: VariableCollection[],
  prefix: string
): Map<string, VariableLookupEntry> {
  const lookup = new Map<string, VariableLookupEntry>();
  const collectionMap = new Map(collections.map((c) => [c.id, c]));

  for (const variable of variables) {
    const collection = collectionMap.get(variable.variableCollectionId);
    if (!collection) continue;

    const collectionPrefix = toCssName(collection.name);
    const variableName = toCssName(variable.name);
    const fullName = `${collectionPrefix}-${variableName}`;
    const cssName = `--${toPrefixedName(fullName, prefix)}`;

    lookup.set(cssName, { variable, collection });
  }

  return lookup;
}

/**
 * Looks up a variable by its CSS var() reference.
 *
 * @param varRef - The var() reference, e.g., "var(--spacing-base)"
 * @param lookup - The lookup map from buildVariableLookup
 * @returns The variable entry or undefined if not found
 */
export function lookupVariable(
  varRef: string,
  lookup: Map<string, VariableLookupEntry>
): VariableLookupEntry | undefined {
  // Extract the variable name from var(--name) syntax
  const match = varRef.match(/var\((--[^)]+)\)/);
  if (!match) return undefined;

  return lookup.get(match[1]);
}

/**
 * Extracts all var() references from an expression.
 *
 * @param expression - The expression string
 * @returns Array of var() references found (may contain duplicates)
 */
export function extractVarReferences(expression: string): string[] {
  const regex = /var\(--[^)]+\)/g;
  return expression.match(regex) ?? [];
}
```

**Run tests:**
```bash
npm test -- --run variableLookup
```

**Expected:** All tests pass.

**Commit:**
```bash
git add src/utils/variableLookup.ts src/utils/variableLookup.test.ts
git commit -m "feat: add variable lookup utility for CSS name resolution"
```

---

### Task 6: Create Expression Evaluator Service

**Purpose:** Evaluate mathematical expressions using mathjs.

#### Step 6.1: Create test file

**File:** `apps/plugin/src/services/expressionEvaluator.test.ts`

**Create with content:**
```typescript
import { describe, it, expect } from 'vitest';
import { evaluateExpression, type EvaluationContext } from './expressionEvaluator';

describe('evaluateExpression', () => {
  describe('basic arithmetic', () => {
    it('should evaluate simple multiplication', () => {
      const context: EvaluationContext = {
        'var(--spacing-base)': { value: 8, unit: 'px' },
      };
      const result = evaluateExpression('var(--spacing-base) * 2', context);
      expect(result.value).toBe(16);
      expect(result.unit).toBe('px');
      expect(result.warnings).toEqual([]);
    });

    it('should evaluate addition', () => {
      const context: EvaluationContext = {
        'var(--a)': { value: 10, unit: 'px' },
        'var(--b)': { value: 5, unit: 'px' },
      };
      const result = evaluateExpression('var(--a) + var(--b)', context);
      expect(result.value).toBe(15);
    });

    it('should evaluate division', () => {
      const context: EvaluationContext = {
        'var(--total)': { value: 100, unit: 'px' },
      };
      const result = evaluateExpression('var(--total) / 4', context);
      expect(result.value).toBe(25);
    });

    it('should evaluate subtraction', () => {
      const context: EvaluationContext = {
        'var(--large)': { value: 24, unit: 'rem' },
      };
      const result = evaluateExpression('var(--large) - 8', context);
      expect(result.value).toBe(16);
      expect(result.unit).toBe('rem');
    });

    it('should respect operator precedence', () => {
      const context: EvaluationContext = {
        'var(--a)': { value: 2, unit: 'px' },
        'var(--b)': { value: 3, unit: 'px' },
      };
      const result = evaluateExpression('var(--a) + var(--b) * 4', context);
      expect(result.value).toBe(14); // 2 + (3 * 4)
    });

    it('should handle parentheses', () => {
      const context: EvaluationContext = {
        'var(--a)': { value: 2, unit: 'px' },
        'var(--b)': { value: 3, unit: 'px' },
      };
      const result = evaluateExpression('(var(--a) + var(--b)) * 4', context);
      expect(result.value).toBe(20); // (2 + 3) * 4
    });
  });

  describe('math functions', () => {
    it('should evaluate round()', () => {
      const context: EvaluationContext = {
        'var(--base)': { value: 10, unit: 'px' },
      };
      const result = evaluateExpression('round(var(--base) * 1.5)', context);
      expect(result.value).toBe(15);
    });

    it('should evaluate floor()', () => {
      const context: EvaluationContext = {
        'var(--base)': { value: 10, unit: 'px' },
      };
      const result = evaluateExpression('floor(var(--base) * 1.7)', context);
      expect(result.value).toBe(17);
    });

    it('should evaluate ceil()', () => {
      const context: EvaluationContext = {
        'var(--base)': { value: 10, unit: 'px' },
      };
      const result = evaluateExpression('ceil(var(--base) * 1.3)', context);
      expect(result.value).toBe(14);
    });

    it('should evaluate min()', () => {
      const context: EvaluationContext = {
        'var(--a)': { value: 10, unit: 'px' },
        'var(--b)': { value: 20, unit: 'px' },
      };
      const result = evaluateExpression('min(var(--a), var(--b))', context);
      expect(result.value).toBe(10);
    });

    it('should evaluate max()', () => {
      const context: EvaluationContext = {
        'var(--a)': { value: 10, unit: 'px' },
        'var(--b)': { value: 20, unit: 'px' },
      };
      const result = evaluateExpression('max(var(--a), var(--b))', context);
      expect(result.value).toBe(20);
    });

    it('should evaluate abs()', () => {
      const context: EvaluationContext = {
        'var(--x)': { value: -10, unit: 'px' },
      };
      const result = evaluateExpression('abs(var(--x))', context);
      expect(result.value).toBe(10);
    });
  });

  describe('unit inference', () => {
    it('should use unit from first variable reference', () => {
      const context: EvaluationContext = {
        'var(--rem-value)': { value: 16, unit: 'rem' },
      };
      const result = evaluateExpression('var(--rem-value) * 2', context);
      expect(result.unit).toBe('rem');
    });

    it('should use first non-px unit', () => {
      const context: EvaluationContext = {
        'var(--a)': { value: 10, unit: 'px' },
        'var(--b)': { value: 20, unit: 'em' },
      };
      const result = evaluateExpression('var(--a) + var(--b)', context);
      expect(result.unit).toBe('em');
    });

    it('should default to px when no variables', () => {
      const result = evaluateExpression('10 * 2', {});
      expect(result.value).toBe(20);
      expect(result.unit).toBe('px');
    });
  });

  describe('error handling', () => {
    it('should return warning for missing variable', () => {
      const result = evaluateExpression('var(--missing) * 2', {});
      expect(result.value).toBeNull();
      expect(result.warnings).toContain("Variable 'var(--missing)' not found");
    });

    it('should return warning for syntax error', () => {
      const result = evaluateExpression('var(--x) * * 2', {
        'var(--x)': { value: 10, unit: 'px' },
      });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toMatch(/syntax/i);
    });

    it('should return warning for division by zero', () => {
      const context: EvaluationContext = {
        'var(--zero)': { value: 0, unit: 'px' },
      };
      const result = evaluateExpression('10 / var(--zero)', context);
      expect(result.value).toBe(Infinity);
      expect(result.warnings).toContain('Division by zero');
    });
  });

  describe('edge cases', () => {
    it('should handle negative numbers', () => {
      const context: EvaluationContext = {
        'var(--x)': { value: 10, unit: 'px' },
      };
      const result = evaluateExpression('var(--x) * -1', context);
      expect(result.value).toBe(-10);
    });

    it('should handle decimal numbers', () => {
      const context: EvaluationContext = {
        'var(--x)': { value: 10, unit: 'px' },
      };
      const result = evaluateExpression('var(--x) * 1.618', context);
      expect(result.value).toBeCloseTo(16.18);
    });

    it('should handle expression with only literal', () => {
      const result = evaluateExpression('42', {});
      expect(result.value).toBe(42);
    });

    it('should handle zero values', () => {
      const context: EvaluationContext = {
        'var(--x)': { value: 0, unit: 'px' },
      };
      const result = evaluateExpression('var(--x) + 5', context);
      expect(result.value).toBe(5);
    });

    it('should handle negative source values', () => {
      const context: EvaluationContext = {
        'var(--x)': { value: -10, unit: 'px' },
      };
      const result = evaluateExpression('var(--x) * 2', context);
      expect(result.value).toBe(-20);
    });
  });
});
```

#### Step 6.2: Create implementation

**File:** `apps/plugin/src/services/expressionEvaluator.ts`

**Create with content:**
```typescript
import { create, all, type MathJsInstance } from 'mathjs';
import type { Unit } from '@figma-vex/shared';
import { extractVarReferences } from '@plugin/utils/variableLookup';

/**
 * Context for expression evaluation containing resolved variable values
 */
export interface EvaluationContext {
  [varRef: string]: {
    value: number;
    unit: Unit;
  };
}

/**
 * Result of expression evaluation
 */
export interface EvaluationResult {
  value: number | null;
  unit: Unit;
  warnings: string[];
}

// Create a mathjs instance with all functions
const math: MathJsInstance = create(all);

/**
 * Evaluates a calculation expression with the given variable context.
 *
 * Supported operations:
 * - Arithmetic: +, -, *, /
 * - Parentheses: ()
 * - Functions: round(), floor(), ceil(), min(), max(), abs()
 *
 * @param expression - The expression to evaluate (e.g., "var(--spacing-base) * 2")
 * @param context - Map of var references to their resolved values
 * @returns Evaluation result with value, inferred unit, and any warnings
 */
export function evaluateExpression(
  expression: string,
  context: EvaluationContext
): EvaluationResult {
  const warnings: string[] = [];
  let inferredUnit: Unit = 'px';

  // Extract all var() references
  const varRefs = extractVarReferences(expression);

  // Build evaluation variables and check for missing refs
  const evalVars: Record<string, number> = {};
  let processedExpression = expression;
  let hasAllVariables = true;

  for (const varRef of varRefs) {
    const contextEntry = context[varRef];

    if (!contextEntry) {
      warnings.push(`Variable '${varRef}' not found`);
      hasAllVariables = false;
      continue;
    }

    // Use first non-px unit as the inferred unit
    if (inferredUnit === 'px' && contextEntry.unit !== 'px') {
      inferredUnit = contextEntry.unit;
    }

    // Create a safe variable name for mathjs (replace special chars)
    const safeVarName = varRef.replace(/[^a-zA-Z0-9]/g, '_');
    evalVars[safeVarName] = contextEntry.value;
    processedExpression = processedExpression.split(varRef).join(safeVarName);
  }

  // If any required variables were missing, return null value
  if (!hasAllVariables && varRefs.length > 0) {
    return { value: null, unit: inferredUnit, warnings };
  }

  // Parse and evaluate the expression
  try {
    const value = math.evaluate(processedExpression, evalVars);

    // Ensure result is a number
    if (typeof value !== 'number') {
      warnings.push(`Expression did not evaluate to a number: ${typeof value}`);
      return { value: null, unit: inferredUnit, warnings };
    }

    // Check for division by zero (results in Infinity)
    if (!Number.isFinite(value)) {
      if (value === Infinity || value === -Infinity) {
        warnings.push('Division by zero');
      }
      return { value, unit: inferredUnit, warnings };
    }

    return { value, unit: inferredUnit, warnings };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnings.push(`Expression syntax error: ${message}`);
    return { value: null, unit: inferredUnit, warnings };
  }
}
```

**Run tests:**
```bash
npm test -- --run expressionEvaluator
```

**Expected:** All tests pass.

#### Step 6.3: Export from services index

**File:** `apps/plugin/src/services/index.ts`

**Add these exports:**
```typescript
export {
  evaluateExpression,
  type EvaluationContext,
  type EvaluationResult,
} from './expressionEvaluator';
```

**Commit:**
```bash
git add src/services/expressionEvaluator.ts src/services/expressionEvaluator.test.ts src/services/index.ts
git commit -m "feat: add expression evaluator service with math functions"
```

---

### Task 7: Create Expression Resolution Service

**Purpose:** Combine variable lookup with expression evaluation.

#### Step 7.1: Create test file

**File:** `apps/plugin/src/services/expressionResolver.test.ts`

**Create with content:**
```typescript
import { describe, it, expect } from 'vitest';
import { resolveExpression } from './expressionResolver';
import type { TokenConfig } from '@figma-vex/shared';
import { DEFAULT_CONFIG } from '@figma-vex/shared';

const mockVariables = [
  {
    id: 'var-1',
    name: 'spacing/base',
    resolvedType: 'FLOAT',
    variableCollectionId: 'col-1',
    valuesByMode: { 'mode-1': 8, 'mode-2': 6 },
  },
  {
    id: 'var-2',
    name: 'typography/font-lg',
    resolvedType: 'FLOAT',
    variableCollectionId: 'col-2',
    valuesByMode: { 'mode-1': 24 },
  },
  {
    id: 'var-3',
    name: 'alias/spacing',
    resolvedType: 'FLOAT',
    variableCollectionId: 'col-1',
    valuesByMode: { 'mode-1': { type: 'VARIABLE_ALIAS', id: 'var-1' } },
  },
  {
    id: 'var-4',
    name: 'colors/primary',
    resolvedType: 'COLOR',
    variableCollectionId: 'col-1',
    valuesByMode: { 'mode-1': { r: 1, g: 0, b: 0, a: 1 } },
  },
] as unknown as Variable[];

const mockCollections = [
  {
    id: 'col-1',
    name: 'primitives',
    modes: [
      { modeId: 'mode-1', name: 'default' },
      { modeId: 'mode-2', name: 'compact' },
    ],
  },
  {
    id: 'col-2',
    name: 'tokens',
    modes: [{ modeId: 'mode-1', name: 'default' }],
  },
] as unknown as VariableCollection[];

describe('resolveExpression', () => {
  it('should resolve simple expression', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--primitives-spacing-base) * 2',
    };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result.value).toBe(16);
    expect(result.unit).toBe('px');
    expect(result.warnings).toEqual([]);
  });

  it('should resolve expression with different mode values', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--primitives-spacing-base) * 2',
    };

    const result1 = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );
    const result2 = await resolveExpression(
      config,
      'mode-2',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result1.value).toBe(16); // 8 * 2
    expect(result2.value).toBe(12); // 6 * 2
  });

  it('should resolve aliases fully', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--primitives-alias-spacing) * 2',
    };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result.value).toBe(16); // alias resolves to 8, 8 * 2 = 16
  });

  it('should respect unit override in config', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      unit: 'rem',
      expression: 'var(--primitives-spacing-base) * 2',
    };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result.value).toBe(16);
    expect(result.unit).toBe('rem');
  });

  it('should return warning for non-existent variable', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--nonexistent) * 2',
    };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('not found');
  });

  it('should return warning for non-numeric variable', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--primitives-colors-primary) * 2',
    };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('not numeric');
  });

  it('should handle prefix', async () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--ds-primitives-spacing-base) * 2',
    };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      'ds'
    );

    expect(result.value).toBe(16);
  });

  it('should return warning when no expression provided', async () => {
    const config: TokenConfig = { ...DEFAULT_CONFIG };
    const result = await resolveExpression(
      config,
      'mode-1',
      mockVariables,
      mockCollections,
      ''
    );

    expect(result.value).toBeNull();
    expect(result.warnings).toContain('No expression provided');
  });
});
```

#### Step 7.2: Create implementation

**File:** `apps/plugin/src/services/expressionResolver.ts`

**Create with content:**
```typescript
import type { TokenConfig, Unit } from '@figma-vex/shared';
import { RESOLUTION_CONFIG } from '@figma-vex/shared';
import {
  buildVariableLookup,
  extractVarReferences,
  lookupVariable,
} from '@plugin/utils/variableLookup';
import {
  evaluateExpression,
  type EvaluationContext,
  type EvaluationResult,
} from './expressionEvaluator';

/**
 * Resolves a variable value to a number, following aliases if needed.
 */
async function resolveToNumber(
  variable: Variable,
  modeId: string,
  variables: Variable[],
  depth = 0,
  visited = new Set<string>()
): Promise<{ value: number | null; unit: Unit }> {
  if (depth > RESOLUTION_CONFIG.MAX_ALIAS_DEPTH) {
    return { value: null, unit: 'px' };
  }

  if (visited.has(variable.id)) {
    return { value: null, unit: 'px' };
  }
  visited.add(variable.id);

  const value = variable.valuesByMode[modeId];

  // Handle alias - resolve to actual value
  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    value.type === 'VARIABLE_ALIAS'
  ) {
    const aliasedVar = variables.find((v) => v.id === value.id);
    if (!aliasedVar) {
      return { value: null, unit: 'px' };
    }
    return resolveToNumber(aliasedVar, modeId, variables, depth + 1, visited);
  }

  // Handle direct number value
  if (typeof value === 'number' && Number.isFinite(value)) {
    return { value, unit: 'px' };
  }

  return { value: null, unit: 'px' };
}

/**
 * Resolves a calculation expression by looking up variable values and evaluating.
 *
 * @param config - Token config containing the expression
 * @param modeId - Current mode ID for variable value lookup
 * @param variables - All available variables
 * @param collections - All available collections
 * @param prefix - CSS variable prefix
 * @returns Evaluation result with resolved value
 */
export async function resolveExpression(
  config: TokenConfig,
  modeId: string,
  variables: Variable[],
  collections: VariableCollection[],
  prefix: string
): Promise<EvaluationResult> {
  const expression = config.expression;
  if (!expression) {
    return { value: null, unit: config.unit, warnings: ['No expression provided'] };
  }

  const lookup = buildVariableLookup(variables, collections, prefix);
  const varRefs = extractVarReferences(expression);
  const context: EvaluationContext = {};
  const warnings: string[] = [];

  // Resolve each variable reference
  for (const varRef of varRefs) {
    const entry = lookupVariable(varRef, lookup);

    if (!entry) {
      warnings.push(`Variable '${varRef}' not found`);
      continue;
    }

    const { variable } = entry;

    // Check if variable is numeric
    if (variable.resolvedType !== 'FLOAT') {
      warnings.push(
        `Variable '${varRef}' is not numeric (type: ${variable.resolvedType})`
      );
      continue;
    }

    const resolved = await resolveToNumber(variable, modeId, variables);

    if (resolved.value === null) {
      warnings.push(`Could not resolve value for '${varRef}'`);
      continue;
    }

    context[varRef] = { value: resolved.value, unit: resolved.unit };
  }

  // Evaluate the expression
  const result = evaluateExpression(expression, context);

  // Merge warnings
  result.warnings = [...warnings, ...result.warnings];

  // Override unit if specified in config (and not default)
  if (config.unit !== 'px') {
    result.unit = config.unit;
  }

  return result;
}
```

**Run tests:**
```bash
npm test -- --run expressionResolver
```

**Expected:** All tests pass.

#### Step 7.3: Export from services index

**File:** `apps/plugin/src/services/index.ts`

**Add this export:**
```typescript
export { resolveExpression } from './expressionResolver';
```

**Commit:**
```bash
git add src/services/expressionResolver.ts src/services/expressionResolver.test.ts src/services/index.ts
git commit -m "feat: add expression resolver for full variable lookup and evaluation"
```

---

### Task 8: Integrate Expression Evaluation into Value Resolver

**Purpose:** Make the existing value resolver use expression evaluation when `expression` is present in config.

#### Step 8.1: Add tests to valueResolver.test.ts

**File:** `apps/plugin/src/services/valueResolver.test.ts`

**Add this test suite:**
```typescript
describe('expression evaluation', () => {
  const mockVariablesWithValues = [
    {
      id: 'var-1',
      name: 'spacing/base',
      resolvedType: 'FLOAT',
      variableCollectionId: 'col-1',
      valuesByMode: { 'mode-1': 8 },
    },
  ] as unknown as Variable[];

  const mockCollectionsForExpr = [
    {
      id: 'col-1',
      name: 'primitives',
      modes: [{ modeId: 'mode-1', name: 'default' }],
    },
  ] as unknown as VariableCollection[];

  it('should evaluate expression when provided in config', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      expression: 'var(--primitives-spacing-base) * 2',
    };
    const result = await resolveValue(
      8, // fallback value
      'mode-1',
      mockVariablesWithValues,
      'FLOAT',
      config,
      '',
      0,
      new Set(),
      mockCollectionsForExpr
    );
    expect(result).toBe('16px');
  });

  it('should use fallback value when expression fails', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      expression: 'var(--nonexistent) * 2',
    };
    const result = await resolveValue(
      42,
      'mode-1',
      mockVariablesWithValues,
      'FLOAT',
      config,
      '',
      0,
      new Set(),
      mockCollectionsForExpr
    );
    // Falls back to original value
    expect(result).toBe('42px');
  });

  it('should apply unit from config to expression result', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      unit: 'rem' as const,
      expression: 'var(--primitives-spacing-base) * 2',
    };
    const result = await resolveValue(
      8,
      'mode-1',
      mockVariablesWithValues,
      'FLOAT',
      config,
      '',
      0,
      new Set(),
      mockCollectionsForExpr
    );
    expect(result).toBe('1rem'); // 16 / 16 (default remBase)
  });

  it('should not evaluate expression for non-FLOAT types', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      expression: 'var(--primitives-spacing-base) * 2',
    };
    const result = await resolveValue(
      'hello',
      'mode-1',
      mockVariablesWithValues,
      'STRING',
      config,
      '',
      0,
      new Set(),
      mockCollectionsForExpr
    );
    expect(result).toBe('"hello"'); // Normal string handling
  });

  it('should not evaluate expression when collections not provided', async () => {
    const config = {
      ...DEFAULT_CONFIG,
      expression: 'var(--primitives-spacing-base) * 2',
    };
    const result = await resolveValue(
      8,
      'mode-1',
      mockVariablesWithValues,
      'FLOAT',
      config,
      ''
      // No collections parameter
    );
    expect(result).toBe('8px'); // Falls back to normal resolution
  });
});
```

#### Step 8.2: Update valueResolver.ts

**File:** `apps/plugin/src/services/valueResolver.ts`

**Replace entire file with:**
```typescript
import type { TokenConfig } from '@figma-vex/shared';
import { RESOLUTION_CONFIG } from '@figma-vex/shared';
import { toCssName, toPrefixedName } from '@plugin/formatters/nameFormatter';
import { formatColor } from '@plugin/formatters/colorFormatter';
import { formatNumber } from '@plugin/formatters/numberFormatter';
import { resolveExpression } from './expressionResolver';

/**
 * Resolves a variable value to its string representation.
 * Handles variable aliases, colors, numbers, strings, booleans, and expressions.
 *
 * @param value - The raw value from Figma
 * @param modeId - Current mode ID
 * @param variables - All available variables
 * @param resolvedType - The variable's resolved data type
 * @param config - Token configuration including optional expression
 * @param prefix - CSS variable prefix
 * @param depth - Current resolution depth (for circular reference detection)
 * @param visited - Set of visited variable IDs
 * @param collections - All available collections (required for expression evaluation)
 */
export async function resolveValue(
  value: VariableValue,
  modeId: string,
  variables: Variable[],
  resolvedType: VariableResolvedDataType,
  config: TokenConfig,
  prefix = '',
  depth = 0,
  visited = new Set<string>(),
  collections?: VariableCollection[]
): Promise<string> {
  // Prevent infinite recursion
  if (depth > RESOLUTION_CONFIG.MAX_ALIAS_DEPTH) return '/* circular reference */';

  // Handle expression evaluation if present
  if (config.expression && collections && resolvedType === 'FLOAT') {
    const result = await resolveExpression(config, modeId, variables, collections, prefix);

    if (result.value !== null && result.warnings.length === 0) {
      // Apply the configured unit/remBase to the evaluated result
      const effectiveConfig = { ...config, unit: result.unit };
      return formatNumber(result.value, effectiveConfig);
    }
    // Fall through to normal resolution if expression failed
    // Warnings are logged but we use the fallback value
    if (result.warnings.length > 0) {
      console.warn(
        `Expression evaluation warnings for "${config.expression}":`,
        result.warnings
      );
    }
  }

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
  return String(value != null ? value : '');
}
```

**Run tests:**
```bash
npm test -- --run valueResolver
```

**Expected:** All tests pass.

**Commit:**
```bash
git add src/services/valueResolver.ts src/services/valueResolver.test.ts
git commit -m "feat: integrate expression evaluation into value resolver"
```

---

### Task 9: Update Exporters to Pass Collections

**Purpose:** Each exporter needs to pass `collections` to `resolveValue` for expression support.

#### Step 9.1: Update CSS Exporter

**File:** `apps/plugin/src/exporters/cssExporter.ts`

Find all calls to `resolveValue` and add the `collections` parameter. The function signature changed from:

```typescript
resolveValue(value, modeId, variables, type, config, prefix)
```

To:
```typescript
resolveValue(value, modeId, variables, type, config, prefix, 0, new Set(), collections)
```

You need to ensure `collections` is passed through from the export function parameters.

#### Step 9.2: Update SCSS Exporter

**File:** `apps/plugin/src/exporters/scssExporter.ts`

Same pattern as CSS exporter.

#### Step 9.3: Update JSON Exporter

**File:** `apps/plugin/src/exporters/jsonExporter.ts`

Same pattern.

#### Step 9.4: Update TypeScript Exporter

**File:** `apps/plugin/src/exporters/typescriptExporter.ts`

Same pattern.

**Run all exporter tests:**
```bash
npm test -- --run
```

**Expected:** All tests pass.

**Commit:**
```bash
git add src/exporters/*.ts
git commit -m "feat: pass collections to resolveValue for expression support"
```

---

### Task 10: Add Sync Message Types

**Purpose:** Define message types for syncing calculated values back to Figma.

**File:** `packages/shared/src/types/messages.ts`

**Add to `PluginMessage` union type:**
```typescript
| { type: 'sync-calculations'; options: ExportOptions }
```

**Add to `UIMessage` union type:**
```typescript
| { type: 'sync-result'; synced: number; failed: number; warnings: string[] }
```

**Commit:**
```bash
git add packages/shared/src/types/messages.ts
git commit -m "feat: add sync-calculations message types"
```

---

### Task 11: Implement Sync Handler in Main

**Purpose:** Handle sync-calculations message to write evaluated values back to Figma.

**File:** `apps/plugin/src/main.ts`

**Add imports at top:**
```typescript
import { parseDescription } from './utils/descriptionParser';
import { resolveExpression } from './services';
import { DEFAULT_CONFIG } from '@figma-vex/shared';
```

**Add new case to switch statement in `handleMessage`:**
```typescript
case 'sync-calculations': {
  const options = mergeWithDefaults('css', msg.options);
  const prefix = options.prefix ?? '';

  let synced = 0;
  let failed = 0;
  const warnings: string[] = [];

  for (const collection of collections) {
    const collectionVars = variables.filter(
      (v) => v.variableCollectionId === collection.id
    );

    for (const variable of collectionVars) {
      const descConfig = parseDescription(variable.description);
      if (!descConfig.expression) continue;

      const config = { ...DEFAULT_CONFIG, ...descConfig };

      for (const mode of collection.modes) {
        const result = await resolveExpression(
          config,
          mode.modeId,
          variables,
          collections,
          prefix
        );

        if (result.value !== null && result.warnings.length === 0) {
          try {
            await variable.setValueForMode(mode.modeId, result.value);
            synced++;
          } catch (error) {
            failed++;
            const errorMsg = error instanceof Error ? error.message : String(error);
            warnings.push(`Failed to update ${variable.name}: ${errorMsg}`);
          }
        } else {
          failed++;
          warnings.push(
            ...result.warnings.map((w) => `${variable.name}: ${w}`)
          );
        }
      }
    }
  }

  postToUI({ type: 'sync-result', synced, failed, warnings });
  break;
}
```

**Verify build:**
```bash
npm run build
```

**Expected:** Build succeeds.

**Commit:**
```bash
git add src/main.ts
git commit -m "feat: implement sync-calculations handler to write back evaluated values"
```

---

### Task 12: Create Utils Index (Optional)

**Purpose:** Clean export of all utilities.

**File:** `apps/plugin/src/utils/index.ts`

**Create or update with:**
```typescript
export {
  parseDescription,
  UNIT_REGEX,
  FORMAT_REGEX,
  CALC_REGEX,
} from './descriptionParser';
export {
  buildVariableLookup,
  lookupVariable,
  extractVarReferences,
  type VariableLookupEntry,
} from './variableLookup';
export {
  filterCollections,
  getCollectionVariables,
  getCollectionVariablesByName,
} from './collectionUtils';
export { mergeWithDefaults } from './optionDefaults';
```

**Commit:**
```bash
git add src/utils/index.ts
git commit -m "chore: export new utilities from utils index"
```

---

## Final Verification

After all tasks are complete:

```bash
# Run all tests
cd /Users/user/Code/andyhite/figma-vex/apps/plugin
npm test -- --run

# Build plugin
npm run build

# Type check
npm run typecheck
```

All should pass without errors.

---

## Not Covered (Future Work)

- UI components (sync button, checkbox, warnings display)
- Integration tests with real Figma plugin environment
- Documentation updates
- E2E tests
