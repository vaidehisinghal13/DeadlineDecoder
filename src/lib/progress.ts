import type { Assignment } from '../types';

/** Percentage (0–100, integer) of an assignment's tasks that are complete. */
export function assignmentProgress(assignment: Assignment): number {
  const total = assignment.tasks.length;
  if (total === 0) return 0;
  const done = assignment.tasks.filter((t) => t.completed).length;
  return Math.round((done / total) * 100);
}

/** Parse an ISO date (yyyy-mm-dd) to a local Date at midnight, or null. */
function parseDueDate(dueDate?: string): Date | null {
  if (!dueDate) return null;
  const parts = dueDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [year, month, day] = parts;
  const d = new Date(year, month - 1, day);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * An assignment is overdue when it has a due date strictly before today and it
 * is not fully complete.
 */
export function isOverdue(assignment: Assignment, today: Date = new Date()): boolean {
  const due = parseDueDate(assignment.dueDate);
  if (!due) return false;
  if (assignmentProgress(assignment) >= 100) return false;
  return startOfDay(due).getTime() < startOfDay(today).getTime();
}

/** Whole days from today until the due date (negative if the date has passed). */
export function daysUntilDue(
  assignment: Assignment,
  today: Date = new Date(),
): number | null {
  const due = parseDueDate(assignment.dueDate);
  if (!due) return null;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(
    (startOfDay(due).getTime() - startOfDay(today).getTime()) / msPerDay,
  );
}

export interface DashboardStats {
  totalAssignments: number;
  completedAssignments: number;
  overdueAssignments: number;
  totalTasks: number;
  completedTasks: number;
  /** Aggregate progress across all tasks of all assignments (0–100). */
  overallProgress: number;
}

export function dashboardStats(
  assignments: Assignment[],
  today: Date = new Date(),
): DashboardStats {
  let totalTasks = 0;
  let completedTasks = 0;
  let completedAssignments = 0;
  let overdueAssignments = 0;

  for (const a of assignments) {
    totalTasks += a.tasks.length;
    completedTasks += a.tasks.filter((t) => t.completed).length;
    if (a.tasks.length > 0 && assignmentProgress(a) >= 100) completedAssignments += 1;
    if (isOverdue(a, today)) overdueAssignments += 1;
  }

  return {
    totalAssignments: assignments.length,
    completedAssignments,
    overdueAssignments,
    totalTasks,
    completedTasks,
    overallProgress: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
  };
}
