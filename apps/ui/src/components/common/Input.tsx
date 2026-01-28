import type { InputHTMLAttributes } from 'react';
import { FormField } from './FormField';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export function Input({ label, className = '', ...props }: InputProps) {
  return (
    <FormField>
      {label && <label className="text-figma-text mb-1.5 block text-xs font-medium">{label}</label>}
      <input className={`input ${className}`} {...props} />
    </FormField>
  );
}
