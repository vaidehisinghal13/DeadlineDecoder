import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white card-shadow',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
