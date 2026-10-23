import type { ReactNode } from 'react';
import { cn } from './cn';

type Tone = 'explicit' | 'suggested' | 'neutral' | 'danger' | 'success' | 'sample';

const tones: Record<Tone, string> = {
  explicit: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suggested: 'bg-amber-50 text-amber-700 border-amber-200',
  neutral: 'bg-slate-100 text-slate-600 border-slate-200',
  danger: 'bg-red-50 text-red-700 border-red-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  sample: 'bg-brand-50 text-brand-700 border-brand-200',
};

export function Badge({
  tone = 'neutral',
  children,
}: {
  tone?: Tone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium',
        tones[tone],
      )}
    >
      {children}
    </span>
  );
}
