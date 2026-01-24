import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface StatusMessageProps {
  type?: 'success' | 'error' | 'info';
  children: ReactNode;
  autoDismiss?: number; // milliseconds, 0 or undefined = no auto-dismiss
  onDismiss?: () => void;
}

export function StatusMessage({
  type = 'info',
  children,
  autoDismiss = 3000,
  onDismiss,
}: StatusMessageProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoDismiss && autoDismiss > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        onDismiss?.();
      }, autoDismiss);

      return () => clearTimeout(timer);
    }
  }, [autoDismiss, onDismiss]);

  if (!isVisible) {
    return null;
  }

  const typeStyles = {
    success: {
      bg: 'bg-figma-success/10',
      border: 'border-figma-success/30',
      text: 'text-figma-success',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M13.5 4L6 11.5L2.5 8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    error: {
      bg: 'bg-figma-error/10',
      border: 'border-figma-error/30',
      text: 'text-figma-error',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M4 4L12 12M12 4L4 12"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ),
    },
    info: {
      bg: 'bg-figma-bg-secondary',
      border: 'border-figma-border',
      text: 'text-figma-text-secondary',
      icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M8 11V8M8 5H8.01"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      ),
    },
  };

  const styles = typeStyles[type];

  return (
    <div
      className={`mb-4 flex items-center gap-2 rounded border px-3 py-2 text-xs transition-all ${styles.bg} ${styles.border} ${styles.text}`}
      role="alert"
    >
      <div className="flex-shrink-0">{styles.icon}</div>
      <div className="flex-1 font-medium">{children}</div>
    </div>
  );
}
