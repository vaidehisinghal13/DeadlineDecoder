import { ListTodo } from 'lucide-react';
import type { Task } from '../../types';
import { EmptyState } from '../ui/EmptyState';
import { TaskItem } from './TaskItem';
import { AddTaskForm } from './AddTaskForm';

export function TaskList({
  tasks,
  onToggle,
  onEdit,
  onDelete,
  onAdd,
}: {
  tasks: Task[];
  onToggle: (taskId: string) => void;
  onEdit: (taskId: string, patch: { title?: string; estimateMinutes?: number }) => void;
  onDelete: (taskId: string) => void;
  onAdd: (input: { title: string; estimateMinutes: number }) => void;
}) {
  return (
    <div className="space-y-3">
      {tasks.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="h-6 w-6" />}
          title="No tasks yet"
          description="Add your first task below to start tracking progress."
        />
      ) : (
        <ul className="space-y-2">
          {tasks.map((task) => (
            <TaskItem
              key={task.id}
              task={task}
              onToggle={() => onToggle(task.id)}
              onEdit={(patch) => onEdit(task.id, patch)}
              onDelete={() => onDelete(task.id)}
            />
          ))}
        </ul>
      )}
      <AddTaskForm onAdd={onAdd} />
    </div>
  );
}
