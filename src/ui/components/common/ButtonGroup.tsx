import type { ReactNode } from 'react';

interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
}

/**
 * Groups buttons with consistent spacing.
 * Use this to wrap button rows for consistent top/bottom margins.
 */
export function ButtonGroup({ children, className = '' }: ButtonGroupProps) {
  return <div className={`mb-4 mt-4 flex gap-2 ${className}`}>{children}</div>;
}
