import type { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <div className="form-group">
      {label && (
        <label className="text-label mb-1.5 block text-xs font-medium text-figma-text">
          {label}
        </label>
      )}
      <input className={`input ${className}`} {...props} />
    </div>
  );
}
