import type { InputHTMLAttributes } from 'react';

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Checkbox({ label, className = '', ...props }: CheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input type="checkbox" className={`checkbox ${className}`} {...props} />
      {label && <span className="text-figma-text-secondary text-xs">{label}</span>}
    </label>
  );
}
