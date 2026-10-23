import { useState } from 'react';
import { ArrowLeft, BookOpen, CalendarDays, Trash2 } from 'lucide-react';
import type { Assignment } from '../../types';
import { assignmentProgress, daysUntilDue, isOverdue } from '../../lib/progress';
import { formatDueDate, relativeDueLabel } from '../../lib/format';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { ProgressBar } from '../ui/ProgressBar';
import { TaskList } from '../tasks/TaskList';
import { StudyPlanner } from '../planner/StudyPlanner';
import type { NewTaskInput } from '../../hooks/useAssignments';

export function AssignmentDetail({
  assignment,
  onBack,
  onDelete,
  onToggleTask,
  onEditTask,
  onDeleteTask,
  onAddTask,
}: {
  assignment: Assignment;
  onBack: () => void;
  onDelete: () => void;
  onToggleTask: (taskId: string) => void;
  onEditTask: (taskId: string, patch: Partial<NewTaskInput>) => void;
  onDeleteTask: (taskId: string) => void;
  onAddTask: (input: NewTaskInput) => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const progress = assignmentProgress(assignment);
  const overdue = isOverdue(assignment);
  const days = daysUntilDue(assignment);
  const complete = assignment.tasks.length > 0 && progress >= 100;

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Back to dashboard
      </button>

      <Card className="p-5 md:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold text-slate-900">{assignment.title}</h1>
              {assignment.isSample ? <Badge tone="sample">Sample</Badge> : null}
              {overdue ? <Badge tone="danger">Overdue</Badge> : null}
              {complete ? <Badge tone="success">Complete</Badge> : null}
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-500">
              {assignment.course ? (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" /> {assignment.course}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" /> {formatDueDate(assignment.dueDate)}
                {days !== null ? (
                  <span className={overdue ? 'text-red-600' : 'text-slate-400'}>
                    · {relativeDueLabel(days)}
                  </span>
                ) : null}
              </span>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={() => setConfirmOpen(true)}>
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>

        <div className="mt-5">
          <div className="mb-1.5 flex items-center justify-between text-sm">
            <span className="font-medium text-slate-700">Progress</span>
            <span className="text-slate-500">
              {assignment.tasks.filter((t) => t.completed).length}/{assignment.tasks.length} tasks ·{' '}
              {progress}%
            </span>
          </div>
          <ProgressBar value={progress} tone={complete ? 'success' : overdue ? 'danger' : 'brand'} />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-3 text-sm font-semibold text-slate-800">Tasks</h3>
          <TaskList
            tasks={assignment.tasks}
            onToggle={onToggleTask}
            onEdit={onEditTask}
            onDelete={onDeleteTask}
            onAdd={onAddTask}
          />
        </div>
        <StudyPlanner assignment={assignment} />
      </div>

      <Modal open={confirmOpen} title="Delete assignment?" onClose={() => setConfirmOpen(false)}>
        <p className="text-sm text-slate-600">
          This will permanently remove <strong>{assignment.title}</strong> and all of its tasks
          from this browser.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirmOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={() => {
              setConfirmOpen(false);
              onDelete();
            }}
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}
