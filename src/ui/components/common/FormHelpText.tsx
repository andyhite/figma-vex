import type { ReactNode } from 'react';

interface FormHelpTextProps {
  children: ReactNode;
  className?: string;
}

/**
 * Help text that appears below form fields with consistent spacing.
 * Use this for descriptions, hints, or additional information.
 * This component should be placed as a sibling after an Input component.
 * It provides a tight gap to the input above and proper spacing before the next field.
 */
export function FormHelpText({ children, className = '' }: FormHelpTextProps) {
  return (
    <p className={`-mt-2.5 mb-4 text-[10px] text-figma-text-tertiary ${className}`}>{children}</p>
  );
}
