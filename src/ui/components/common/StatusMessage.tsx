import type { ReactNode } from 'react';

interface StatusMessageProps {
  type?: 'success' | 'error' | 'info';
  children: ReactNode;
}

export function StatusMessage({ type = 'info', children }: StatusMessageProps) {
  const typeClasses = {
    success: 'text-figma-success',
    error: 'text-figma-error',
    info: 'text-figma-text-secondary',
  };

  return <div className={`status mt-3 text-xs ${typeClasses[type]}`}>{children}</div>;
}
