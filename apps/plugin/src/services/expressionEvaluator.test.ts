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
      expect(result.value).toBe(13); // ceil(10 * 1.3) = ceil(13) = 13
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
