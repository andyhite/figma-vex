import type { ReactNode } from 'react';

interface FormSectionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Wrapper for major form sections with consistent spacing.
 * Use this to separate distinct sections of a form.
 */
export function FormSection({ children, className = '' }: FormSectionProps) {
  return <div className={`mb-6 ${className}`}>{children}</div>;
}
