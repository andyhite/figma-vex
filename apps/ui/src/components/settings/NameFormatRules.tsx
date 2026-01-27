import { useState, useCallback, useMemo } from 'react';
import { Checkbox } from '../common/Checkbox';
import { FormField } from '../common/FormField';
import { FormGroup } from '../common/FormGroup';
import { FormSection } from '../common/FormSection';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { ButtonGroup } from '../common/ButtonGroup';
import { IconButton } from '../common/IconButton';
import {
  globToRegex,
  applyReplacement,
  toCustomCssName,
  computeDefaultReplacement,
  getAllRulesWithDefault,
} from '@figma-vex/shared';
import type { NameFormatRule, CasingOption } from '@figma-vex/shared';

const CASING_OPTIONS: { value: CasingOption; label: string }[] = [
  { value: 'kebab', label: 'kebab-case' },
  { value: 'snake', label: 'snake_case' },
  { value: 'camel', label: 'camelCase' },
  { value: 'pascal', label: 'PascalCase' },
  { value: 'lower', label: 'lowercase' },
  { value: 'upper', label: 'UPPERCASE' },
];

interface Collection {
  id: string;
  name: string;
}

interface NameFormatRulesProps {
  // Custom rules (excluding default)
  rules: NameFormatRule[];
  onRulesChange: (rules: NameFormatRule[]) => void;

  // Prefix and casing for default rule
  prefix: string;
  onPrefixChange: (prefix: string) => void;
  casing: CasingOption;
  onCasingChange: (casing: CasingOption) => void;

  // Advanced mode toggle
  advancedMode: boolean;
  onAdvancedModeChange: (enabled: boolean) => void;

  // Code syntax sync
  syncCodeSyntax: boolean;
  onSyncCodeSyntaxChange: (enabled: boolean) => void;
  onSyncNow: () => void;

  // Variable names for unmatched detection
  variableNames?: string[];
  collections?: Collection[];
  selectedCollections?: string[];
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

/**
 * Warning badge icon
 */
function WarningIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-figma-warning"
    >
      <path
        d="M6 1L11 10H1L6 1Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M6 7V5M6 9V9.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function NameFormatRules({
  rules,
  onRulesChange,
  prefix,
  onPrefixChange,
  casing,
  onCasingChange,
  advancedMode,
  onAdvancedModeChange,
  syncCodeSyntax,
  onSyncCodeSyntaxChange,
  onSyncNow,
  variableNames = [],
  collections = [],
  selectedCollections = [],
}: NameFormatRulesProps) {
  const [testInput, setTestInput] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showUnmatchedList, setShowUnmatchedList] = useState(false);

  // Computed default replacement
  const defaultReplacement = useMemo(() => computeDefaultReplacement(prefix, casing), [prefix, casing]);

  // All rules including computed default
  const allRules = useMemo(() => getAllRulesWithDefault(rules, prefix, casing), [rules, prefix, casing]);

  // Filter variable names by selected collections
  const filteredVariableNames = useMemo(() => {
    if (!selectedCollections.length) return variableNames;
    // Build a set of selected collection names from their IDs
    const selectedCollectionNames = new Set(
      selectedCollections
        .map((id) => collections.find((c) => c.id === id)?.name)
        .filter((name): name is string => name !== undefined)
    );
    if (selectedCollectionNames.size === 0) return variableNames;
    return variableNames.filter((name) => {
      // variableNames format is "CollectionName/variablePath"
      const collectionName = name.split('/')[0];
      return selectedCollectionNames.has(collectionName);
    });
  }, [variableNames, collections, selectedCollections]);

  // Find unmatched variables
  const unmatchedVariables = useMemo(() => {
    if (!filteredVariableNames.length) return [];
    const enabledRules = allRules.filter((r) => r.enabled);
    return filteredVariableNames.filter((name) => {
      return toCustomCssName(name, enabledRules) === null;
    });
  }, [filteredVariableNames, allRules]);

  // Preview sample transformation
  const previewSample = useMemo(() => {
    const sampleInput = 'color/brand/primary';
    const result = toCustomCssName(sampleInput, allRules);
    return { input: sampleInput, output: result || sampleInput };
  }, [allRules]);

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
  const findMatchingRule = useCallback((): { index: number; result: string; isDefault: boolean } | null => {
    for (let i = 0; i < allRules.length; i++) {
      const rule = allRules[i];
      if (!rule.enabled) continue;

      const test = testPattern(rule.pattern, rule.replacement);
      if (test.matched && test.result) {
        return { index: i, result: test.result, isDefault: rule.id === '__default__' };
      }
    }
    return null;
  }, [allRules, testPattern]);

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
      const dragged = newRules[draggedIndex];
      newRules.splice(draggedIndex, 1);
      newRules.splice(index, 0, dragged);
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
      <FormGroup label="Variable Name Formatting">
        {/* Sync to Figma option */}
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

        {/* Prefix and Casing - always visible */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          <FormField>
            <Input
              label="Name Prefix"
              value={prefix}
              onChange={(e) => onPrefixChange(e.target.value)}
              placeholder="e.g., ds, theme"
            />
          </FormField>
          <FormField>
            <label className="text-figma-text mb-1 block text-xs font-medium">Casing</label>
            <select
              className="border-figma-border bg-figma-bg text-figma-text focus:ring-figma-border-focus w-full rounded border px-2 py-1.5 text-xs focus:outline-none focus:ring-1"
              value={casing}
              onChange={(e) => onCasingChange(e.target.value as CasingOption)}
            >
              {CASING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        {/* Preview */}
        <div className="text-figma-text-secondary mt-2 text-xs">
          Preview:{' '}
          <span className="font-mono">
            {previewSample.input} → {previewSample.output}
          </span>
        </div>

        {/* Unmatched variables warning */}
        {unmatchedVariables.length > 0 && (
          <div className="mt-3">
            <button
              onClick={() => setShowUnmatchedList(!showUnmatchedList)}
              className="text-figma-warning flex items-center gap-1 text-xs hover:underline"
            >
              <WarningIcon />
              {unmatchedVariables.length} unmatched variable{unmatchedVariables.length !== 1 ? 's' : ''}
            </button>
            {showUnmatchedList && (
              <div className="border-figma-border bg-figma-bg-secondary mt-2 max-h-32 overflow-y-auto rounded border p-2 text-xs">
                <ul className="text-figma-text-tertiary list-inside list-disc space-y-0.5">
                  {unmatchedVariables.slice(0, 20).map((name, i) => (
                    <li key={i} className="font-mono">
                      {name}
                    </li>
                  ))}
                  {unmatchedVariables.length > 20 && (
                    <li className="text-figma-text-secondary italic">...and {unmatchedVariables.length - 20} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Advanced mode toggle */}
        <FormField className="mt-3">
          <Checkbox
            label="Enable advanced formatting rules"
            checked={advancedMode}
            onChange={(e) => onAdvancedModeChange(e.target.checked)}
          />
        </FormField>

        {/* Advanced mode: Custom rules */}
        {advancedMode && (
          <div className="mt-3 space-y-3">
            <div className="text-figma-text-secondary text-xs">
              Custom rules are checked first. The default rule (shown below) catches any unmatched variables.
            </div>

            {/* Rules list (custom rules + default rule at bottom) */}
            <div className="space-y-2">
              {rules.map((rule, index) => (
                <div
                  key={rule.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`border-figma-border bg-figma-bg-secondary flex items-center gap-2 rounded border px-2 py-1 transition-opacity ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex cursor-move items-center" title="Drag to reorder">
                    <DragHandleIcon />
                  </div>

                  <input
                    className="input flex-1 text-xs"
                    value={rule.pattern}
                    onChange={(e) => handleUpdateRule(rule.id, { pattern: e.target.value })}
                    placeholder="Pattern"
                  />
                  <span className="text-figma-text-tertiary">→</span>
                  <input
                    className="input flex-1 text-xs"
                    value={rule.replacement}
                    onChange={(e) => handleUpdateRule(rule.id, { replacement: e.target.value })}
                    placeholder="Replacement"
                  />

                  <IconButton
                    icon={<DeleteIcon />}
                    aria-label="Delete rule"
                    onClick={() => handleDeleteRule(rule.id)}
                  />
                </div>
              ))}

              {/* Default rule (read-only, always at bottom) */}
              <div className="border-figma-border bg-figma-bg-secondary flex items-center gap-2 rounded border px-2 py-1 opacity-60">
                <div className="flex items-center" style={{ width: 12 }} />

                <input
                  className="input flex-1 text-xs"
                  value="**"
                  disabled
                  readOnly
                />
                <span className="text-figma-text-tertiary">→</span>
                <input
                  className="input flex-1 text-xs"
                  value={defaultReplacement}
                  disabled
                  readOnly
                />

                <div style={{ width: 24 }} />
              </div>

            </div>

            <ButtonGroup>
              <Button variant="secondary" onClick={handleAddRule}>
                + Add Rule
              </Button>
            </ButtonGroup>
          </div>
        )}

        {/* Test field */}
        <FormField className="mt-4">
          <label className="text-figma-text mb-1 block text-xs font-medium">Test</label>
          <select
            className="border-figma-border bg-figma-bg text-figma-text focus:ring-figma-border-focus w-full rounded border px-2 py-1.5 text-xs focus:outline-none focus:ring-1"
            value={testInput}
            onChange={(e) => setTestInput(e.target.value)}
          >
            <option value="">Select a variable to test...</option>
            {Object.entries(
              filteredVariableNames.reduce(
                (groups, name) => {
                  const collectionName = name.split('/')[0] || 'Other';
                  if (!groups[collectionName]) {
                    groups[collectionName] = [];
                  }
                  groups[collectionName].push(name);
                  return groups;
                },
                {} as Record<string, string[]>
              )
            ).map(([collectionName, names]) => (
              <optgroup key={collectionName} label={collectionName}>
                {names.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          {testInput && matchingRule && (
            <div className="text-figma-text-secondary mt-2 text-xs">
              <span className="text-figma-text-tertiary">Result:</span>{' '}
              <span className="text-figma-text font-mono">{matchingRule.result}</span>
              <span className="text-figma-text-tertiary ml-1">
                {matchingRule.isDefault ? '(default rule)' : `(Rule ${matchingRule.index + 1})`}
              </span>
            </div>
          )}
          {testInput && !matchingRule && (
            <div className="text-figma-text-tertiary mt-2 text-xs">No matching rule found</div>
          )}
        </FormField>
      </FormGroup>
    </FormSection>
  );
}
