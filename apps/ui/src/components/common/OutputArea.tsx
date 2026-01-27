import { useEffect, useState } from 'react';
import type { ReactNode, TextareaHTMLAttributes } from 'react';
import { FormField } from './FormField';

interface OutputAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  actions?: ReactNode;
  statusMessage?: string;
  statusType?: 'success' | 'error' | 'info';
}

export function OutputArea({
  label = 'Output',
  className = '',
  actions,
  statusMessage,
  statusType,
  ...props
}: OutputAreaProps) {
  const [displayLabel, setDisplayLabel] = useState(label);

  useEffect(() => {
    if (statusMessage && statusType === 'success') {
      setDisplayLabel(statusMessage);
      const timer = setTimeout(() => {
        setDisplayLabel(label);
      }, 3000);
      return () => clearTimeout(timer);
    } else if (statusMessage && statusType === 'error') {
      setDisplayLabel(statusMessage);
      const timer = setTimeout(() => {
        setDisplayLabel(label);
      }, 5000);
      return () => clearTimeout(timer);
    } else if (!statusMessage) {
      setDisplayLabel(label);
    }
  }, [statusMessage, statusType, label]);

  const labelColor =
    displayLabel === statusMessage && statusType === 'success'
      ? 'text-figma-success'
      : displayLabel === statusMessage && statusType === 'error'
        ? 'text-figma-error'
        : 'text-figma-text';

  return (
    <FormField>
      <div className="relative">
        <div className="mb-2 flex items-center justify-between">
          <h3 className={`text-xs font-semibold transition-colors ${labelColor}`}>
            {displayLabel}
          </h3>
          {actions && <div className="flex items-center gap-1">{actions}</div>}
        </div>
        <textarea
          className={`output-area min-h-[200px] w-full resize-y rounded border border-figma-border bg-figma-bg p-3 font-mono text-xs text-figma-text ${className}`}
          {...props}
        />
      </div>
    </FormField>
  );
}
