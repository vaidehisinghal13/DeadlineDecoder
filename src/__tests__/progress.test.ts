import { describe, it, expect } from 'vitest';
import { assignmentProgress, isOverdue, daysUntilDue, dashboardStats } from '../lib/progress';
import type { Assignment, Task } from '../types';

function task(completed: boolean): Task {
  return {
    id: Math.random().toString(),
    title: 't',
    estimateMinutes: 30,
    completed,
    source: 'explicit',
    createdAt: '2026-01-01T00:00:00.000Z',
  };
}

function assignment(tasks: Task[], dueDate?: string): Assignment {
  return {
    id: Math.random().toString(),
    title: 'A',
    dueDate,
    instructions: 'x',
    requirements: [],
    tasks,
    isSample: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('assignmentProgress', () => {
  it('is 0 with no tasks', () => {
    expect(assignmentProgress(assignment([]))).toBe(0);
  });

  it('is 50 with half complete', () => {
    expect(assignmentProgress(assignment([task(true), task(false)]))).toBe(50);
  });

  it('is 100 when all complete', () => {
    expect(assignmentProgress(assignment([task(true), task(true)]))).toBe(100);
  });
});

describe('isOverdue', () => {
  const today = new Date(2026, 9, 22); // Oct 22, 2026

  it('is overdue when due date passed and incomplete', () => {
    const a = assignment([task(false)], '2026-10-20');
    expect(isOverdue(a, today)).toBe(true);
  });

  it('is not overdue when complete', () => {
    const a = assignment([task(true)], '2026-10-20');
    expect(isOverdue(a, today)).toBe(false);
  });

  it('is not overdue when due in the future', () => {
    const a = assignment([task(false)], '2026-10-30');
    expect(isOverdue(a, today)).toBe(false);
  });

  it('is not overdue without a due date', () => {
    expect(isOverdue(assignment([task(false)]), today)).toBe(false);
  });
});

describe('daysUntilDue', () => {
  const today = new Date(2026, 9, 22);

  it('returns null without a due date', () => {
    expect(daysUntilDue(assignment([]), today)).toBeNull();
  });

  it('counts future days', () => {
    expect(daysUntilDue(assignment([], '2026-10-25'), today)).toBe(3);
  });

  it('is negative for past dates', () => {
    expect(daysUntilDue(assignment([], '2026-10-20'), today)).toBe(-2);
  });
});

describe('dashboardStats', () => {
  const today = new Date(2026, 9, 22);

  it('aggregates across assignments', () => {
    const a1 = assignment([task(true), task(false)], '2026-10-30');
    const a2 = assignment([task(true), task(true)], '2026-10-15'); // complete, not overdue
    const a3 = assignment([task(false)], '2026-10-10'); // overdue
    const stats = dashboardStats([a1, a2, a3], today);

    expect(stats.totalAssignments).toBe(3);
    expect(stats.totalTasks).toBe(5);
    expect(stats.completedTasks).toBe(3);
    expect(stats.completedAssignments).toBe(1);
    expect(stats.overdueAssignments).toBe(1);
    expect(stats.overallProgress).toBe(60);
  });

  it('handles an empty list', () => {
    const stats = dashboardStats([], today);
    expect(stats.overallProgress).toBe(0);
    expect(stats.totalAssignments).toBe(0);
  });
});
