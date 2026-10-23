import { CalendarClock } from 'lucide-react';
import type { Assignment } from '../../types';
import { assignmentProgress, daysUntilDue, isOverdue } from '../../lib/progress';
import { formatDueDate, relativeDueLabel } from '../../lib/format';
import { Card } from '../ui/Card';
import { cn } from '../ui/cn';

export function UpcomingDeadlines({
  assignments,
  onOpen,
}: {
  assignments: Assignment[];
  onOpen: (id: string) => void;
}) {
  const withDates = assignments
    .filter((a) => a.dueDate && assignmentProgress(a) < 100)
    .sort((a, b) => (a.dueDate! < b.dueDate! ? -1 : 1))
    .slice(0, 5);

  if (withDates.length === 0) return null;

  return (
    <Card className="p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <CalendarClock className="h-4 w-4 text-brand-500" /> Upcoming deadlines
      </h3>
      <ul className="divide-y divide-slate-100">
        {withDates.map((a) => {
          const overdue = isOverdue(a);
          const days = daysUntilDue(a);
          return (
            <li key={a.id}>
              <button
                onClick={() => onOpen(a.id)}
                className="flex w-full items-center justify-between py-2.5 text-left hover:opacity-80"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-800">
                    {a.title}
                  </span>
                  <span className="text-xs text-slate-400">{formatDueDate(a.dueDate)}</span>
                </span>
                <span
                  className={cn(
                    'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                    overdue ? 'bg-red-50 text-red-600' : 'bg-slate-100 text-slate-600',
                  )}
                >
                  {relativeDueLabel(days)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
