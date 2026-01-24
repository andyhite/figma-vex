import type { ReactNode } from 'react';

interface FormGroupProps {
  children: ReactNode;
  label?: string;
  className?: string;
}

/**
 * Groups related form fields with a label and consistent spacing.
 * Use this for collections of checkboxes, radio buttons, or related inputs.
 * Note: When using Input components inside FormGroup, they will have extra spacing
 * due to their FormField wrapper. This is acceptable for visual consistency.
 */
export function FormGroup({ children, label, className = '' }: FormGroupProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {label && (
        <label className="mb-2 block text-xs font-medium text-figma-text">{label}</label>
      )}
      <div className="space-y-2">{children}</div>
    </div>
  );
}
