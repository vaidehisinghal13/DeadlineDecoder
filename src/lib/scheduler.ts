import type { Assignment, PlanDayEntry, StudyPlan, Task } from '../types';

/** Minutes per day above which we warn the plan is "tight". */
export const TIGHT_DAY_THRESHOLD_MINUTES = 300;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayLabel(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function parseDueDate(dueDate?: string): Date | null {
  if (!dueDate) return null;
  const parts = dueDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

function emptyDay(date: Date): PlanDayEntry {
  return { date: toIsoDate(date), dayLabel: dayLabel(date), taskIds: [], totalMinutes: 0 };
}

/**
 * Generate a deterministic study plan for an assignment.
 *
 * Rules (see design.md §5):
 * - Only incomplete tasks are scheduled.
 * - No due date  -> unscheduled checklist mode.
 * - Due date in the past -> everything on "today" with an ASAP warning.
 * - Otherwise distribute tasks across remaining days using a greedy
 *   longest-processing-time-first heuristic that balances per-day load.
 * - Warn when the busiest day exceeds the comfort threshold.
 */
export function generatePlan(assignment: Assignment, today: Date = new Date()): StudyPlan {
  const generatedAt = new Date().toISOString();
  const pending: Task[] = assignment.tasks.filter((t) => !t.completed);
  const warnings: string[] = [];

  const base: Omit<StudyPlan, 'days' | 'unscheduled'> = {
    assignmentId: assignment.id,
    generatedAt,
    warnings,
  };

  if (pending.length === 0) {
    warnings.push('All tasks are complete. Nothing left to schedule.');
    return { ...base, days: [], unscheduled: false };
  }

  const due = parseDueDate(assignment.dueDate);
  if (!due) {
    warnings.push('Add a due date to get a day-by-day schedule. Showing a checklist for now.');
    return { ...base, days: [], unscheduled: true };
  }

  const todayStart = startOfDay(today);
  const dueStart = startOfDay(due);
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysRemaining = Math.round((dueStart.getTime() - todayStart.getTime()) / msPerDay);

  // Past due: put everything on today as ASAP.
  if (daysRemaining < 0) {
    warnings.push('The deadline has passed. Complete the remaining tasks as soon as possible.');
    const day = emptyDay(todayStart);
    for (const t of pending) {
      day.taskIds.push(t.id);
      day.totalMinutes += t.estimateMinutes;
    }
    return { ...base, days: [day], unscheduled: false };
  }

  // usableDays includes today through the due date (inclusive).
  const usableDays = daysRemaining + 1;
  const days: PlanDayEntry[] = [];
  for (let i = 0; i < usableDays; i += 1) {
    days.push(emptyDay(addDays(todayStart, i)));
  }

  // Greedy LPT: sort tasks by estimate desc, assign each to the lightest day.
  // Tie-break on earliest day index to keep the result stable and front-loaded.
  const ordered = [...pending].sort((a, b) => {
    if (b.estimateMinutes !== a.estimateMinutes) {
      return b.estimateMinutes - a.estimateMinutes;
    }
    return a.createdAt.localeCompare(b.createdAt);
  });

  for (const task of ordered) {
    let lightest = 0;
    for (let i = 1; i < days.length; i += 1) {
      if (days[i].totalMinutes < days[lightest].totalMinutes) lightest = i;
    }
    days[lightest].taskIds.push(task.id);
    days[lightest].totalMinutes += task.estimateMinutes;
  }

  const busiest = days.reduce((max, d) => Math.max(max, d.totalMinutes), 0);
  if (busiest > TIGHT_DAY_THRESHOLD_MINUTES) {
    const hours = Math.round((busiest / 60) * 10) / 10;
    warnings.push(
      `Time is tight: your busiest day needs about ${hours} hours. Consider starting early.`,
    );
  }

  return { ...base, days, unscheduled: false };
}
