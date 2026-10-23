import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '../ui/Button';

export function AddTaskForm({
  onAdd,
}: {
  onAdd: (input: { title: string; estimateMinutes: number }) => void;
}) {
  const [title, setTitle] = useState('');
  const [estimate, setEstimate] = useState('30');

  function submit() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const minutes = Math.max(5, Math.round(Number(estimate) || 30));
    onAdd({ title: trimmed, estimateMinutes: minutes });
    setTitle('');
    setEstimate('30');
  }

  return (
    <form
      className="flex flex-col gap-2 rounded-xl border border-dashed border-slate-200 p-3 sm:flex-row sm:items-center"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        aria-label="New task title"
        className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400"
      />
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={5}
          value={estimate}
          onChange={(e) => setEstimate(e.target.value)}
          aria-label="Estimated minutes"
          className="w-20 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
        />
        <span className="text-xs text-slate-400">min</span>
        <Button type="submit" size="sm" disabled={!title.trim()}>
          <Plus className="h-4 w-4" /> Add
        </Button>
      </div>
    </form>
  );
}
