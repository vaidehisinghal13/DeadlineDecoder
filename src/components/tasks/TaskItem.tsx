import { useState } from 'react';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import type { Task } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { formatMinutes } from '../../lib/format';
import { cn } from '../ui/cn';

export function TaskItem({
  task,
  onToggle,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggle: () => void;
  onEdit: (patch: { title?: string; estimateMinutes?: number }) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [estimate, setEstimate] = useState(String(task.estimateMinutes));

  function save() {
    const minutes = Math.max(5, Math.round(Number(estimate) || task.estimateMinutes));
    if (title.trim().length === 0) return;
    onEdit({ title: title.trim(), estimateMinutes: minutes });
    setEditing(false);
  }

  if (editing) {
    return (
      <li className="flex flex-col gap-2 rounded-xl border border-brand-200 bg-brand-50/40 p-3 sm:flex-row sm:items-center">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
          aria-label="Task title"
        />
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={5}
            value={estimate}
            onChange={(e) => setEstimate(e.target.value)}
            className="w-20 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
            aria-label="Estimated minutes"
          />
          <span className="text-xs text-slate-400">min</span>
          <Button size="sm" onClick={save}>
            <Check className="h-4 w-4" /> Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="group flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 hover:border-slate-200">
      <button
        onClick={onToggle}
        aria-label={task.completed ? 'Mark incomplete' : 'Mark complete'}
        aria-pressed={task.completed}
        className={cn(
          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
          task.completed
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-300 bg-white hover:border-brand-400',
        )}
      >
        {task.completed ? <Check className="h-3.5 w-3.5" /> : null}
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            'truncate text-sm',
            task.completed ? 'text-slate-400 line-through' : 'text-slate-800',
          )}
        >
          {task.title}
        </p>
      </div>

      {task.source === 'suggested' ? <Badge tone="suggested">suggested</Badge> : null}
      <span className="shrink-0 text-xs font-medium text-slate-500">
        {formatMinutes(task.estimateMinutes)}
      </span>

      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        <button
          onClick={() => setEditing(true)}
          aria-label="Edit task"
          className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <button
          onClick={onDelete}
          aria-label="Delete task"
          className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
