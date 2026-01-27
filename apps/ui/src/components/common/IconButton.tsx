import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  'aria-label': string;
}

export function IconButton({ icon, className = '', ...props }: IconButtonProps) {
  return (
    <button
      className={`flex items-center justify-center rounded p-1.5 text-figma-text-secondary transition-colors hover:bg-figma-bg-secondary hover:text-figma-text active:bg-figma-bg-tertiary ${className}`}
      {...props}
    >
      {icon}
    </button>
  );
}
