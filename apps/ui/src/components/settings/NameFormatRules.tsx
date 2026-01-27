import { useState, useCallback } from 'react';
import { Checkbox } from '../common/Checkbox';
import { FormField } from '../common/FormField';
import { FormGroup } from '../common/FormGroup';
import { FormSection } from '../common/FormSection';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { IconButton } from '../common/IconButton';
import { globToRegex, applyReplacement } from '@figma-vex/shared';
import type { NameFormatRule } from '@figma-vex/shared';

interface NameFormatRulesProps {
  rules: NameFormatRule[];
  syncCodeSyntax: boolean;
  onRulesChange: (rules: NameFormatRule[]) => void;
  onSyncCodeSyntaxChange: (enabled: boolean) => void;
  onSyncNow: () => void;
  prefix?: string;
}

/**
 * Drag handle icon (three horizontal lines)
 */
function DragHandleIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-figma-text-tertiary"
    >
      <path d="M2 3h8M2 6h8M2 9h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

/**
 * Delete/X icon
 */
function DeleteIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-figma-text-secondary"
    >
      <path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function NameFormatRules({
  rules,
  syncCodeSyntax,
  onRulesChange,
  onSyncCodeSyntaxChange,
  onSyncNow,
  prefix,
}: NameFormatRulesProps) {
  const [testInput, setTestInput] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Validate a pattern and return error message if invalid
  const validatePattern = useCallback((pattern: string): string | null => {
    if (!pattern.trim()) return null; // Empty is okay, just won't match
    try {
      globToRegex(pattern);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Invalid pattern';
    }
  }, []);

  // Test a pattern against the test input
  const testPattern = useCallback(
    (pattern: string, replacement: string): { matched: boolean; result: string | null; error: string | null } => {
      if (!testInput.trim()) {
        return { matched: false, result: null, error: null };
      }

      try {
        const regex = globToRegex(pattern);
        const match = testInput.match(regex);

        if (match) {
          const captures = match.slice(1);
          const result = applyReplacement(replacement, captures);
          return { matched: true, result, error: null };
        }

        return { matched: false, result: null, error: null };
      } catch (e) {
        return { matched: false, result: null, error: e instanceof Error ? e.message : 'Invalid pattern' };
      }
    },
    [testInput]
  );

  // Find which rule matches the test input
  const findMatchingRule = useCallback((): { index: number; result: string } | null => {
    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (!rule.enabled) continue;

      const test = testPattern(rule.pattern, rule.replacement);
      if (test.matched && test.result) {
        return { index: i, result: test.result };
      }
    }
    return null;
  }, [rules, testPattern]);

  const matchingRule = testInput ? findMatchingRule() : null;

  const handleAddRule = useCallback(() => {
    const newRule: NameFormatRule = {
      id: `rule-${Date.now()}-${Math.random()}`,
      pattern: '',
      replacement: '',
      enabled: true,
    };
    onRulesChange([...rules, newRule]);
  }, [rules, onRulesChange]);

  const handleDeleteRule = useCallback(
    (id: string) => {
      onRulesChange(rules.filter((r) => r.id !== id));
    },
    [rules, onRulesChange]
  );

  const handleUpdateRule = useCallback(
    (id: string, updates: Partial<NameFormatRule>) => {
      onRulesChange(rules.map((r) => (r.id === id ? { ...r, ...updates } : r)));
    },
    [rules, onRulesChange]
  );

  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  const handleDragOver = useCallback(
    (e: React.DragEvent, index: number) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === index) return;

      const newRules = [...rules];
      const draggedRule = newRules[draggedIndex];
      newRules.splice(draggedIndex, 1);
      newRules.splice(index, 0, draggedRule);
      onRulesChange(newRules);
      setDraggedIndex(index);
    },
    [draggedIndex, rules, onRulesChange]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
  }, []);

  return (
    <FormSection>
      <FormGroup label="Variable Name Overrides">
        <FormField>
          <div className="flex items-center gap-2">
            <Checkbox
              label="Sync names to Figma code syntax"
              checked={syncCodeSyntax}
              onChange={(e) => onSyncCodeSyntaxChange(e.target.checked)}
            />
            <Button variant="secondary" onClick={onSyncNow} className="ml-auto">
              Sync Now
            </Button>
          </div>
        </FormField>

        <div className="mt-3 space-y-2">
          {rules.map((rule, index) => (
            <div
              key={rule.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragOver={(e) => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              className={`border-figma-border bg-figma-bg-secondary flex items-start gap-2 rounded border p-2 transition-opacity ${
                draggedIndex === index ? 'opacity-50' : ''
              }`}
            >
              <div className="flex cursor-move items-center pt-2" title="Drag to reorder">
                <DragHandleIcon />
              </div>

              <Checkbox
                checked={rule.enabled}
                onChange={(e) => handleUpdateRule(rule.id, { enabled: e.target.checked })}
                className="pt-2"
              />

              <div className="flex-1 space-y-2">
                <div>
                  <Input
                    value={rule.pattern}
                    onChange={(e) => handleUpdateRule(rule.id, { pattern: e.target.value })}
                    placeholder="Pattern (e.g., color/*/alpha/*)"
                    className="text-xs"
                  />
                  {validatePattern(rule.pattern) && (
                    <div className="text-figma-error mt-1 text-xs">
                      Invalid pattern: {validatePattern(rule.pattern)}
                    </div>
                  )}
                </div>
                <Input
                  value={rule.replacement}
                  onChange={(e) => handleUpdateRule(rule.id, { replacement: e.target.value })}
                  placeholder="Replacement (e.g., color-$1-a$2)"
                  className="text-xs"
                />
              </div>

              <IconButton
                icon={<DeleteIcon />}
                aria-label="Delete rule"
                onClick={() => handleDeleteRule(rule.id)}
                className="pt-2"
              />
            </div>
          ))}
        </div>

        <ButtonGroup className="mt-3">
          <Button variant="secondary" onClick={handleAddRule}>
            + Add Rule
          </Button>
        </ButtonGroup>

        <FormField className="mt-4">
          <Input
            label="Test"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
            placeholder="Enter a Figma variable name to test"
            className="text-xs"
          />
          {testInput && matchingRule && (
            <div className="text-figma-text-secondary mt-1 text-xs">
              Result: <span className="text-figma-text font-mono">{matchingRule.result}</span> (Rule{' '}
              {matchingRule.index + 1})
            </div>
          )}
          {testInput && !matchingRule && (
            <div className="text-figma-text-tertiary mt-1 text-xs">No matching rule found</div>
          )}
        </FormField>
      </FormGroup>
    </FormSection>
  );
}
