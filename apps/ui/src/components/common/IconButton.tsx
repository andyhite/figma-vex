import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  'aria-label': string;
}

export function IconButton({ icon, className = '', ...props }: IconButtonProps) {
  return (
    <button
      className={`text-figma-text-secondary hover:bg-figma-bg-secondary hover:text-figma-text active:bg-figma-bg-tertiary flex items-center justify-center rounded p-1.5 transition-colors ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
