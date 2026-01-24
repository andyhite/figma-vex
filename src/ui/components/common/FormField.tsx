import type { ReactNode } from 'react';

interface FormFieldProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper component for form fields that provides consistent bottom spacing.
 * Use this to wrap Input, Checkbox, or other form elements.
 */
export function FormField({ children, className = '' }: FormFieldProps) {
  return <div className={`mb-4 ${className}`}>{children}</div>;
}
