import { AlertTriangle } from 'lucide-react';
import type { ReactNode } from 'react';

export function ErrorState({
  title = 'Something went wrong',
  message,
  action,
}: {
  title?: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 animate-fade-in"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" aria-hidden />
      <div className="flex-1">
        <p className="font-semibold">{title}</p>
        <p className="mt-0.5 text-red-700">{message}</p>
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    </div>
  );
}
