import type { TextareaHTMLAttributes } from 'react';

interface OutputAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export function OutputArea({ label, className = '', ...props }: OutputAreaProps) {
  return (
    <div className="form-group">
      {label && (
        <h3 className="mb-2 mt-4 text-xs font-semibold text-figma-text first:mt-0">{label}</h3>
      )}
      <textarea
        className={`output-area min-h-[200px] w-full resize-y rounded border border-figma-border bg-figma-bg p-3 font-mono text-xs text-figma-text ${className}`}
        {...props}
      />
    </div>
  );
}
