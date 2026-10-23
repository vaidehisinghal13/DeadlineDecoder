import { BookOpen, CalendarDays, ChevronRight } from 'lucide-react';
import type { Assignment } from '../../types';
import { assignmentProgress, daysUntilDue, isOverdue } from '../../lib/progress';
import { formatDueDate, relativeDueLabel } from '../../lib/format';
import { Badge } from '../ui/Badge';
import { Card } from '../ui/Card';
import { ProgressBar } from '../ui/ProgressBar';

export function AssignmentCard({
  assignment,
  onOpen,
}: {
  assignment: Assignment;
  onOpen: () => void;
}) {
  const progress = assignmentProgress(assignment);
  const overdue = isOverdue(assignment);
  const days = daysUntilDue(assignment);
  const complete = assignment.tasks.length > 0 && progress >= 100;

  return (
    <Card
      className="cursor-pointer p-5 transition-shadow hover:shadow-md"
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <h3 className="truncate font-semibold text-slate-900">{assignment.title}</h3>
            {assignment.isSample ? <Badge tone="sample">Sample</Badge> : null}
            {overdue ? <Badge tone="danger">Overdue</Badge> : null}
            {complete ? <Badge tone="success">Done</Badge> : null}
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
            {assignment.course ? (
              <span className="flex items-center gap-1">
                <BookOpen className="h-3.5 w-3.5" /> {assignment.course}
              </span>
            ) : null}
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> {formatDueDate(assignment.dueDate)}
            </span>
            {days !== null ? (
              <span className={overdue ? 'font-medium text-red-600' : 'text-slate-400'}>
                {relativeDueLabel(days)}
              </span>
            ) : null}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" />
      </div>

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
          <span>
            {assignment.tasks.filter((t) => t.completed).length}/{assignment.tasks.length} tasks
          </span>
          <span className="font-medium">{progress}%</span>
        </div>
        <ProgressBar value={progress} tone={complete ? 'success' : overdue ? 'danger' : 'brand'} />
      </div>
    </Card>
  );
}
