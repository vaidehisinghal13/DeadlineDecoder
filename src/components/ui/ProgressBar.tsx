import { cn } from './cn';

export function ProgressBar({
  value,
  className,
  tone = 'brand',
}: {
  value: number; // 0..100
  className?: string;
  tone?: 'brand' | 'success' | 'danger';
}) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  const bar =
    tone === 'success' ? 'bg-emerald-500' : tone === 'danger' ? 'bg-red-500' : 'bg-brand-600';
  return (
    <div
      className={cn('h-2 w-full overflow-hidden rounded-full bg-slate-100', className)}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', bar)}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
