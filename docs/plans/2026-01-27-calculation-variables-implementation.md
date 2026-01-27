# Calculation-Based Variables Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable expression-based calculations in Figma variable descriptions (e.g., `calc: var(--font-lg) * 1.5`) with evaluation at export time and optional write-back to Figma.

**Architecture:** Extend the existing description parsing system to extract `calc:` expressions. Create a new expression evaluator service using `expr-eval` library. Integrate evaluation into the value resolution pipeline. Add sync functionality via new message types.

**Tech Stack:** TypeScript, Vitest, mathjs library

---

## Task 1: Add mathjs Dependency

**Files:**
- Modify: `apps/plugin/package.json`

**Step 1: Add the dependency**

```bash
cd apps/plugin && npm install mathjs
```

**Step 2: Verify installation**

```bash
cd apps/plugin && npm ls mathjs
```

Expected: Shows `mathjs@x.x.x`

**Step 3: Commit**

```bash
git add apps/plugin/package.json apps/plugin/package-lock.json
git commit -m "chore: add mathjs dependency for expression evaluation"
```

---

## Task 2: Extend TokenConfig Type

**Files:**
- Modify: `packages/shared/src/types/tokens.ts`
- Test: `packages/shared/src/types/tokens.test.ts` (create)

**Step 1: Write the type test**

Create `packages/shared/src/types/tokens.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import type { TokenConfig } from './tokens';
import { DEFAULT_CONFIG } from './tokens';

describe('TokenConfig', () => {
  it('should have expression as optional field', () => {
    const config: TokenConfig = {
      ...DEFAULT_CONFIG,
      expression: 'var(--spacing-base) * 2',
    };
    expect(config.expression).toBe('var(--spacing-base) * 2');
  });

  it('should allow TokenConfig without expression', () => {
    const config: TokenConfig = { ...DEFAULT_CONFIG };
    expect(config.expression).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
cd packages/shared && npm test -- --run
```

Expected: FAIL - `expression` property doesn't exist on type

**Step 3: Add expression field to TokenConfig**

Modify `packages/shared/src/types/tokens.ts`:

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
  expression?: string;
}

export const DEFAULT_CONFIG: TokenConfig = {
  unit: 'px',
  remBase: 16,
  colorFormat: 'hex',
};
```

**Step 4: Run test to verify it passes**

```bash
cd packages/shared && npm test -- --run
```

Expected: PASS

**Step 5: Commit**

```bash
git add packages/shared/src/types/tokens.ts packages/shared/src/types/tokens.test.ts
git commit -m "feat: add expression field to TokenConfig type"
```

---

## Task 3: Update Description Parser - Semicolon Splitting

**Files:**
- Modify: `apps/plugin/src/utils/descriptionParser.ts`
- Modify: `apps/plugin/src/utils/descriptionParser.test.ts`

**Step 1: Write failing tests for semicolon separation**

Add to `apps/plugin/src/utils/descriptionParser.test.ts`:

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

**Step 2: Run tests to verify they pass (existing implementation handles this)**

```bash
cd apps/plugin && npm test -- --run descriptionParser
```

Expected: PASS (the regex already matches anywhere in the string)

**Step 3: Commit test additions**

```bash
git add apps/plugin/src/utils/descriptionParser.test.ts
git commit -m "test: add semicolon-separated directive tests"
```

---

## Task 4: Add calc Expression Parsing

**Files:**
- Modify: `apps/plugin/src/utils/descriptionParser.ts`
- Modify: `apps/plugin/src/utils/descriptionParser.test.ts`

**Step 1: Write failing tests for calc parsing**

Add to `apps/plugin/src/utils/descriptionParser.test.ts`:

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

**Step 2: Run tests to verify they fail**

```bash
cd apps/plugin && npm test -- --run descriptionParser
```

Expected: FAIL - `expression` property doesn't exist

**Step 3: Add calc parsing to descriptionParser.ts**

Replace `apps/plugin/src/utils/descriptionParser.ts`:

```typescript
import type { TokenConfig } from '@figma-vex/shared';

export const UNIT_REGEX = /unit:\s*(none|px|rem|em|%|ms|s)(?::(\d+))?/i;
export const FORMAT_REGEX = /format:\s*(rgba|rgb|hex|hsl|oklch)/i;
export const CALC_REGEX = /calc:\s*(.+?)(?:;|$)/i;

/**
 * Parses a variable's description field to extract token configuration.
 * Supports unit, color format, and calc expression specifications.
 * Directives can be separated by semicolons on a single line.
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

**Step 4: Run tests to verify they pass**

```bash
cd apps/plugin && npm test -- --run descriptionParser
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/plugin/src/utils/descriptionParser.ts apps/plugin/src/utils/descriptionParser.test.ts
git commit -m "feat: add calc expression parsing to description parser"
```

---

## Task 5: Create Variable Lookup Utility

**Files:**
- Create: `apps/plugin/src/utils/variableLookup.ts`
- Create: `apps/plugin/src/utils/variableLookup.test.ts`

**Step 1: Write tests for variable lookup**

Create `apps/plugin/src/utils/variableLookup.test.ts`:

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
});

describe('lookupVariable', () => {
  it('should find variable by CSS name', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, '');
    const result = lookupVariable('var(--primitives-spacing-base)', lookup);
    expect(result?.id).toBe('var-1');
  });

  it('should return undefined for non-existent variable', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, '');
    const result = lookupVariable('var(--nonexistent)', lookup);
    expect(result).toBeUndefined();
  });

  it('should handle var() syntax', () => {
    const lookup = buildVariableLookup(mockVariables, mockCollections, '');
    const result = lookupVariable('var(--tokens-typography-font-size-lg)', lookup);
    expect(result?.id).toBe('var-2');
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
});
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/plugin && npm test -- --run variableLookup
```

Expected: FAIL - module not found

**Step 3: Implement variable lookup utility**

Create `apps/plugin/src/utils/variableLookup.ts`:

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
 * @param expression - The expression string
 * @returns Array of var() references found
 */
export function extractVarReferences(expression: string): string[] {
  const regex = /var\(--[^)]+\)/g;
  return expression.match(regex) ?? [];
}
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/plugin && npm test -- --run variableLookup
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/plugin/src/utils/variableLookup.ts apps/plugin/src/utils/variableLookup.test.ts
git commit -m "feat: add variable lookup utility for CSS name resolution"
```

---

## Task 6: Create Expression Evaluator Service

**Files:**
- Create: `apps/plugin/src/services/expressionEvaluator.ts`
- Create: `apps/plugin/src/services/expressionEvaluator.test.ts`

**Step 1: Write tests for expression evaluator**

Create `apps/plugin/src/services/expressionEvaluator.test.ts`:

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
  });

  describe('unit inference', () => {
    it('should use unit from first variable reference', () => {
      const context: EvaluationContext = {
        'var(--rem-value)': { value: 16, unit: 'rem' },
      };
      const result = evaluateExpression('var(--rem-value) * 2', context);
      expect(result.unit).toBe('rem');
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
      expect(result.warnings).toContain("Variable 'var(--missing)' not found");
    });

    it('should return warning for syntax error', () => {
      const result = evaluateExpression('var(--x) * * 2', {
        'var(--x)': { value: 10, unit: 'px' },
      });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('syntax');
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
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/plugin && npm test -- --run expressionEvaluator
```

Expected: FAIL - module not found

**Step 3: Implement expression evaluator**

Create `apps/plugin/src/services/expressionEvaluator.ts`:

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

// Create a mathjs instance with only the functions we need
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

  for (const varRef of varRefs) {
    const contextEntry = context[varRef];

    if (!contextEntry) {
      warnings.push(`Variable '${varRef}' not found`);
      continue;
    }

    // Use first variable's unit as the inferred unit
    if (inferredUnit === 'px' && contextEntry.unit !== 'px') {
      inferredUnit = contextEntry.unit;
    }

    // Create a safe variable name for mathjs (replace special chars)
    const safeVarName = varRef.replace(/[^a-zA-Z0-9]/g, '_');
    evalVars[safeVarName] = contextEntry.value;
    processedExpression = processedExpression.replace(varRef, safeVarName);
  }

  // If any variables were missing, return null value
  if (warnings.length > 0 && varRefs.length > 0 && Object.keys(evalVars).length === 0) {
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

**Step 4: Run tests to verify they pass**

```bash
cd apps/plugin && npm test -- --run expressionEvaluator
```

Expected: PASS

**Step 5: Export from services index**

Add to `apps/plugin/src/services/index.ts`:

```typescript
export { evaluateExpression, type EvaluationContext, type EvaluationResult } from './expressionEvaluator';
```

**Step 6: Commit**

```bash
git add apps/plugin/src/services/expressionEvaluator.ts apps/plugin/src/services/expressionEvaluator.test.ts apps/plugin/src/services/index.ts
git commit -m "feat: add expression evaluator service with math functions"
```

---

## Task 7: Create Expression Resolution Service

**Files:**
- Create: `apps/plugin/src/services/expressionResolver.ts`
- Create: `apps/plugin/src/services/expressionResolver.test.ts`

**Step 1: Write tests for expression resolver**

Create `apps/plugin/src/services/expressionResolver.test.ts`:

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
] as unknown as Variable[];

const mockCollections = [
  { id: 'col-1', name: 'primitives', modes: [{ modeId: 'mode-1', name: 'default' }, { modeId: 'mode-2', name: 'compact' }] },
  { id: 'col-2', name: 'tokens', modes: [{ modeId: 'mode-1', name: 'default' }] },
] as unknown as VariableCollection[];

describe('resolveExpression', () => {
  it('should resolve simple expression', async () => {
    const config: TokenConfig = { ...DEFAULT_CONFIG, expression: 'var(--primitives-spacing-base) * 2' };
    const result = await resolveExpression(config, 'mode-1', mockVariables, mockCollections, '');

    expect(result.value).toBe(16);
    expect(result.unit).toBe('px');
  });

  it('should resolve expression with different mode values', async () => {
    const config: TokenConfig = { ...DEFAULT_CONFIG, expression: 'var(--primitives-spacing-base) * 2' };

    const result1 = await resolveExpression(config, 'mode-1', mockVariables, mockCollections, '');
    const result2 = await resolveExpression(config, 'mode-2', mockVariables, mockCollections, '');

    expect(result1.value).toBe(16); // 8 * 2
    expect(result2.value).toBe(12); // 6 * 2
  });

  it('should resolve aliases fully', async () => {
    const config: TokenConfig = { ...DEFAULT_CONFIG, expression: 'var(--primitives-alias-spacing) * 2' };
    const result = await resolveExpression(config, 'mode-1', mockVariables, mockCollections, '');

    expect(result.value).toBe(16); // alias resolves to 8, 8 * 2 = 16
  });

  it('should respect unit override in config', async () => {
    const config: TokenConfig = { ...DEFAULT_CONFIG, unit: 'rem', expression: 'var(--primitives-spacing-base) * 2' };
    const result = await resolveExpression(config, 'mode-1', mockVariables, mockCollections, '');

    expect(result.value).toBe(16);
    expect(result.unit).toBe('rem');
  });

  it('should return warning for non-existent variable', async () => {
    const config: TokenConfig = { ...DEFAULT_CONFIG, expression: 'var(--nonexistent) * 2' };
    const result = await resolveExpression(config, 'mode-1', mockVariables, mockCollections, '');

    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should handle prefix', async () => {
    const config: TokenConfig = { ...DEFAULT_CONFIG, expression: 'var(--ds-primitives-spacing-base) * 2' };
    const result = await resolveExpression(config, 'mode-1', mockVariables, mockCollections, 'ds');

    expect(result.value).toBe(16);
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/plugin && npm test -- --run expressionResolver
```

Expected: FAIL - module not found

**Step 3: Implement expression resolver**

Create `apps/plugin/src/services/expressionResolver.ts`:

```typescript
import type { TokenConfig, Unit } from '@figma-vex/shared';
import { RESOLUTION_CONFIG } from '@figma-vex/shared';
import { buildVariableLookup, extractVarReferences, lookupVariable } from '@plugin/utils/variableLookup';
import { evaluateExpression, type EvaluationContext, type EvaluationResult } from './expressionEvaluator';

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
  if (typeof value === 'object' && value !== null && 'type' in value && value.type === 'VARIABLE_ALIAS') {
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
      warnings.push(`Variable '${varRef}' is not numeric (type: ${variable.resolvedType})`);
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

**Step 4: Run tests to verify they pass**

```bash
cd apps/plugin && npm test -- --run expressionResolver
```

Expected: PASS

**Step 5: Export from services index**

Add to `apps/plugin/src/services/index.ts`:

```typescript
export { resolveExpression } from './expressionResolver';
```

**Step 6: Commit**

```bash
git add apps/plugin/src/services/expressionResolver.ts apps/plugin/src/services/expressionResolver.test.ts apps/plugin/src/services/index.ts
git commit -m "feat: add expression resolver for full variable lookup and evaluation"
```

---

## Task 8: Integrate Expression Evaluation into Value Resolver

**Files:**
- Modify: `apps/plugin/src/services/valueResolver.ts`
- Modify: `apps/plugin/src/services/valueResolver.test.ts`

**Step 1: Write tests for expression-aware value resolution**

Add to `apps/plugin/src/services/valueResolver.test.ts`:

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

  const mockCollections = [
    { id: 'col-1', name: 'primitives', modes: [{ modeId: 'mode-1', name: 'default' }] },
  ] as unknown as VariableCollection[];

  it('should evaluate expression when provided in config', async () => {
    const config = { ...DEFAULT_CONFIG, expression: 'var(--primitives-spacing-base) * 2' };
    const result = await resolveValue(
      8, // fallback value
      'mode-1',
      mockVariablesWithValues,
      'FLOAT',
      config,
      '',
      0,
      new Set(),
      mockCollections
    );
    expect(result).toBe('16px');
  });

  it('should use fallback value when expression fails', async () => {
    const config = { ...DEFAULT_CONFIG, expression: 'var(--nonexistent) * 2' };
    const result = await resolveValue(
      42,
      'mode-1',
      mockVariablesWithValues,
      'FLOAT',
      config,
      '',
      0,
      new Set(),
      mockCollections
    );
    // Falls back to original value
    expect(result).toBe('42px');
  });

  it('should apply unit from config to expression result', async () => {
    const config = { ...DEFAULT_CONFIG, unit: 'rem' as const, expression: 'var(--primitives-spacing-base) * 2' };
    const result = await resolveValue(
      8,
      'mode-1',
      mockVariablesWithValues,
      'FLOAT',
      config,
      '',
      0,
      new Set(),
      mockCollections
    );
    expect(result).toBe('1rem'); // 16 / 16 (default remBase)
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/plugin && npm test -- --run valueResolver
```

Expected: FAIL - signature doesn't include collections parameter

**Step 3: Update resolveValue to support expressions**

Replace `apps/plugin/src/services/valueResolver.ts`:

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
      console.warn(`Expression evaluation warnings for "${config.expression}":`, result.warnings);
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

**Step 4: Run tests to verify they pass**

```bash
cd apps/plugin && npm test -- --run valueResolver
```

Expected: PASS

**Step 5: Commit**

```bash
git add apps/plugin/src/services/valueResolver.ts apps/plugin/src/services/valueResolver.test.ts
git commit -m "feat: integrate expression evaluation into value resolver"
```

---

## Task 9: Update Exporters to Pass Collections

**Files:**
- Modify: `apps/plugin/src/exporters/cssExporter.ts`
- Modify: `apps/plugin/src/exporters/scssExporter.ts`
- Modify: `apps/plugin/src/exporters/jsonExporter.ts`
- Modify: `apps/plugin/src/exporters/typescriptExporter.ts`

**Step 1: Update CSS exporter**

In `apps/plugin/src/exporters/cssExporter.ts`, find all calls to `resolveValue` and add the `collections` parameter as the last argument.

The pattern is:
```typescript
// Before
await resolveValue(value, modeId, variables, variable.resolvedType, config, prefix)

// After
await resolveValue(value, modeId, variables, variable.resolvedType, config, prefix, 0, new Set(), collections)
```

**Step 2: Update SCSS exporter**

Same pattern in `apps/plugin/src/exporters/scssExporter.ts`.

**Step 3: Update JSON exporter**

Same pattern in `apps/plugin/src/exporters/jsonExporter.ts`.

**Step 4: Update TypeScript exporter**

Same pattern in `apps/plugin/src/exporters/typescriptExporter.ts`.

**Step 5: Run all tests**

```bash
cd apps/plugin && npm test -- --run
```

Expected: PASS

**Step 6: Commit**

```bash
git add apps/plugin/src/exporters/*.ts
git commit -m "feat: pass collections to resolveValue for expression support"
```

---

## Task 10: Add Sync Message Types

**Files:**
- Modify: `packages/shared/src/types/messages.ts`

**Step 1: Add sync message types**

Add to `packages/shared/src/types/messages.ts`:

```typescript
// Add to PluginMessage union type:
| { type: 'sync-calculations'; options: ExportOptions }

// Add to UIMessage union type:
| { type: 'sync-result'; synced: number; failed: number; warnings: string[] }
```

**Step 2: Commit**

```bash
git add packages/shared/src/types/messages.ts
git commit -m "feat: add sync-calculations message types"
```

---

## Task 11: Implement Sync Handler in Main

**Files:**
- Modify: `apps/plugin/src/main.ts`

**Step 1: Add sync handler**

Add a new case to the switch statement in `handleMessage`:

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
            warnings.push(`Failed to update ${variable.name}: ${error}`);
          }
        } else {
          failed++;
          warnings.push(...result.warnings.map((w) => `${variable.name}: ${w}`));
        }
      }
    }
  }

  postToUI({ type: 'sync-result', synced, failed, warnings });
  break;
}
```

**Step 2: Add imports**

Add to imports in `main.ts`:

```typescript
import { parseDescription } from './utils/descriptionParser';
import { resolveExpression } from './services';
import { DEFAULT_CONFIG } from '@figma-vex/shared';
```

**Step 3: Run build to verify**

```bash
cd apps/plugin && npm run build
```

Expected: BUILD SUCCESS

**Step 4: Commit**

```bash
git add apps/plugin/src/main.ts
git commit -m "feat: implement sync-calculations handler to write back evaluated values"
```

---

## Task 12: Export Utils Index

**Files:**
- Modify: `apps/plugin/src/utils/index.ts` (create if needed)

**Step 1: Create or update utils index**

Create `apps/plugin/src/utils/index.ts` if it doesn't exist:

```typescript
export { parseDescription, UNIT_REGEX, FORMAT_REGEX, CALC_REGEX } from './descriptionParser';
export {
  buildVariableLookup,
  lookupVariable,
  extractVarReferences,
  type VariableLookupEntry,
} from './variableLookup';
export { filterCollections, getCollectionVariables, getCollectionVariablesByName } from './collectionUtils';
export { mergeWithDefaults } from './optionDefaults';
```

**Step 2: Commit**

```bash
git add apps/plugin/src/utils/index.ts
git commit -m "chore: export new utilities from utils index"
```

---

## Summary

This plan covers the core backend implementation:

1. **Tasks 1-2**: Dependencies and types
2. **Tasks 3-4**: Description parser updates
3. **Tasks 5-7**: Expression evaluation services
4. **Tasks 8-9**: Integration into existing pipeline
5. **Tasks 10-12**: Sync functionality

**Not covered in this plan (future tasks):**
- UI components (sync button, checkbox, warnings display)
- Integration tests with real Figma plugin environment
- Documentation updates

**Test commands:**
```bash
# Run all plugin tests
cd apps/plugin && npm test -- --run

# Run specific test file
cd apps/plugin && npm test -- --run descriptionParser
cd apps/plugin && npm test -- --run expressionEvaluator

# Run tests in watch mode
cd apps/plugin && npm test
```
