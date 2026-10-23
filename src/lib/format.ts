/** Human-readable formatting helpers for dates and durations. */

export function formatMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  if (rem === 0) return `${hours} hr`;
  return `${hours} hr ${rem} min`;
}

export function formatDueDate(dueDate?: string): string {
  if (!dueDate) return 'No due date';
  const parts = dueDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return dueDate;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  if (Number.isNaN(date.getTime())) return dueDate;
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function relativeDueLabel(days: number | null): string {
  if (days === null) return '';
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  return `${days} days left`;
}
