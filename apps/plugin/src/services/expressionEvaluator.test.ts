import { describe, it, expect } from 'vitest';
import { evaluateExpression, type EvaluationContext } from './expressionEvaluator';

describe('evaluateExpression', () => {
  describe('basic arithmetic', () => {
    it('should evaluate simple multiplication', () => {
      const context: EvaluationContext = {
        "'Spacing/base'": { value: 8, unit: 'px' },
      };
      const result = evaluateExpression("'Spacing/base' * 2", context);
      expect(result.value).toBe(16);
      expect(result.unit).toBe('px');
      expect(result.warnings).toEqual([]);
    });

    it('should evaluate addition', () => {
      const context: EvaluationContext = {
        "'Spacing/a'": { value: 10, unit: 'px' },
        "'Spacing/b'": { value: 5, unit: 'px' },
      };
      const result = evaluateExpression("'Spacing/a' + 'Spacing/b'", context);
      expect(result.value).toBe(15);
    });

    it('should evaluate division', () => {
      const context: EvaluationContext = {
        "'Spacing/total'": { value: 100, unit: 'px' },
      };
      const result = evaluateExpression("'Spacing/total' / 4", context);
      expect(result.value).toBe(25);
    });

    it('should evaluate subtraction', () => {
      const context: EvaluationContext = {
        "'Text/Size/large'": { value: 24, unit: 'rem' },
      };
      const result = evaluateExpression("'Text/Size/large' - 8", context);
      expect(result.value).toBe(16);
      expect(result.unit).toBe('rem');
    });

    it('should respect operator precedence', () => {
      const context: EvaluationContext = {
        "'Spacing/a'": { value: 2, unit: 'px' },
        "'Spacing/b'": { value: 3, unit: 'px' },
      };
      const result = evaluateExpression("'Spacing/a' + 'Spacing/b' * 4", context);
      expect(result.value).toBe(14); // 2 + (3 * 4)
    });

    it('should handle parentheses', () => {
      const context: EvaluationContext = {
        "'Spacing/a'": { value: 2, unit: 'px' },
        "'Spacing/b'": { value: 3, unit: 'px' },
      };
      const result = evaluateExpression("('Spacing/a' + 'Spacing/b') * 4", context);
      expect(result.value).toBe(20); // (2 + 3) * 4
    });
  });

  describe('math functions', () => {
    it('should evaluate round()', () => {
      const context: EvaluationContext = {
        "'Spacing/base'": { value: 10, unit: 'px' },
      };
      const result = evaluateExpression("round('Spacing/base' * 1.5)", context);
      expect(result.value).toBe(15);
    });

    it('should evaluate floor()', () => {
      const context: EvaluationContext = {
        "'Spacing/base'": { value: 10, unit: 'px' },
      };
      const result = evaluateExpression("floor('Spacing/base' * 1.7)", context);
      expect(result.value).toBe(17);
    });

    it('should evaluate ceil()', () => {
      const context: EvaluationContext = {
        "'Spacing/base'": { value: 10, unit: 'px' },
      };
      const result = evaluateExpression("ceil('Spacing/base' * 1.3)", context);
      expect(result.value).toBe(13); // ceil(10 * 1.3) = ceil(13) = 13
    });

    it('should evaluate min()', () => {
      const context: EvaluationContext = {
        "'Spacing/a'": { value: 10, unit: 'px' },
        "'Spacing/b'": { value: 20, unit: 'px' },
      };
      const result = evaluateExpression("min('Spacing/a', 'Spacing/b')", context);
      expect(result.value).toBe(10);
    });

    it('should evaluate max()', () => {
      const context: EvaluationContext = {
        "'Spacing/a'": { value: 10, unit: 'px' },
        "'Spacing/b'": { value: 20, unit: 'px' },
      };
      const result = evaluateExpression("max('Spacing/a', 'Spacing/b')", context);
      expect(result.value).toBe(20);
    });

    it('should evaluate abs()', () => {
      const context: EvaluationContext = {
        "'Spacing/x'": { value: -10, unit: 'px' },
      };
      const result = evaluateExpression("abs('Spacing/x')", context);
      expect(result.value).toBe(10);
    });
  });

  describe('unit inference', () => {
    it('should use unit from first variable reference', () => {
      const context: EvaluationContext = {
        "'Text/rem-value'": { value: 16, unit: 'rem' },
      };
      const result = evaluateExpression("'Text/rem-value' * 2", context);
      expect(result.unit).toBe('rem');
    });

    it('should use first non-px unit', () => {
      const context: EvaluationContext = {
        "'Spacing/a'": { value: 10, unit: 'px' },
        "'Spacing/b'": { value: 20, unit: 'em' },
      };
      const result = evaluateExpression("'Spacing/a' + 'Spacing/b'", context);
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
      const result = evaluateExpression("'Spacing/missing' * 2", {});
      expect(result.value).toBeNull();
      expect(result.warnings).toContain("Variable 'Spacing/missing' not found");
    });

    it('should return warning for syntax error', () => {
      const result = evaluateExpression("'Spacing/x' * * 2", {
        "'Spacing/x'": { value: 10, unit: 'px' },
      });
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toMatch(/syntax/i);
    });

    it('should return warning for division by zero', () => {
      const context: EvaluationContext = {
        "'Spacing/zero'": { value: 0, unit: 'px' },
      };
      const result = evaluateExpression("10 / 'Spacing/zero'", context);
      expect(result.value).toBe(Infinity);
      expect(result.warnings).toContain('Division by zero');
    });
  });

  describe('edge cases', () => {
    it('should handle negative numbers', () => {
      const context: EvaluationContext = {
        "'Spacing/x'": { value: 10, unit: 'px' },
      };
      const result = evaluateExpression("'Spacing/x' * -1", context);
      expect(result.value).toBe(-10);
    });

    it('should handle decimal numbers', () => {
      const context: EvaluationContext = {
        "'Spacing/x'": { value: 10, unit: 'px' },
      };
      const result = evaluateExpression("'Spacing/x' * 1.618", context);
      expect(result.value).toBeCloseTo(16.18);
    });

    it('should handle expression with only literal', () => {
      const result = evaluateExpression('42', {});
      expect(result.value).toBe(42);
    });

    it('should handle zero values', () => {
      const context: EvaluationContext = {
        "'Spacing/x'": { value: 0, unit: 'px' },
      };
      const result = evaluateExpression("'Spacing/x' + 5", context);
      expect(result.value).toBe(5);
    });

    it('should handle negative source values', () => {
      const context: EvaluationContext = {
        "'Spacing/x'": { value: -10, unit: 'px' },
      };
      const result = evaluateExpression("'Spacing/x' * 2", context);
      expect(result.value).toBe(-20);
    });

    it('should handle paths with collection prefix', () => {
      const context: EvaluationContext = {
        "'Primitives/Spacing/base'": { value: 8, unit: 'px' },
      };
      const result = evaluateExpression("'Primitives/Spacing/base' * 2", context);
      expect(result.value).toBe(16);
    });
  });
});
