import { describe, it, expect } from 'vitest';
import { generatePlan, TIGHT_DAY_THRESHOLD_MINUTES } from '../lib/scheduler';
import type { Assignment, Task } from '../types';

let counter = 0;
function task(estimateMinutes: number, completed = false): Task {
  counter += 1;
  return {
    id: `task_${counter}`,
    title: `Task ${counter}`,
    estimateMinutes,
    completed,
    source: 'explicit',
    createdAt: `2026-01-01T00:00:0${counter % 10}.000Z`,
  };
}

function assignment(tasks: Task[], dueDate?: string): Assignment {
  return {
    id: 'asg_1',
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

const today = new Date(2026, 9, 22); // Oct 22, 2026

describe('generatePlan', () => {
  it('distributes tasks across the days until due', () => {
    const a = assignment([task(60), task(60), task(60), task(60)], '2026-10-25'); // 4 days incl today
    const plan = generatePlan(a, today);
    expect(plan.unscheduled).toBe(false);
    expect(plan.days).toHaveLength(4);
    // Every pending task should be scheduled exactly once.
    const scheduled = plan.days.flatMap((d) => d.taskIds);
    expect(scheduled).toHaveLength(4);
    expect(new Set(scheduled).size).toBe(4);
  });

  it('only schedules incomplete tasks', () => {
    const a = assignment([task(60), task(60, true)], '2026-10-25');
    const plan = generatePlan(a, today);
    const scheduled = plan.days.flatMap((d) => d.taskIds);
    expect(scheduled).toHaveLength(1);
  });

  it('returns a checklist (unscheduled) when there is no due date', () => {
    const a = assignment([task(60)]);
    const plan = generatePlan(a, today);
    expect(plan.unscheduled).toBe(true);
    expect(plan.days).toHaveLength(0);
    expect(plan.warnings.join(' ')).toMatch(/due date/i);
  });

  it('warns and puts everything on today when the deadline has passed', () => {
    const a = assignment([task(60), task(30)], '2026-10-20');
    const plan = generatePlan(a, today);
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].taskIds).toHaveLength(2);
    expect(plan.warnings.join(' ')).toMatch(/passed/i);
  });

  it('handles a deadline that is today (single day)', () => {
    const a = assignment([task(60), task(60)], '2026-10-22');
    const plan = generatePlan(a, today);
    expect(plan.days).toHaveLength(1);
    expect(plan.days[0].taskIds).toHaveLength(2);
  });

  it('warns when time is tight', () => {
    // One day, lots of work -> busiest day exceeds the threshold.
    const a = assignment([task(TIGHT_DAY_THRESHOLD_MINUTES + 120)], '2026-10-22');
    const plan = generatePlan(a, today);
    expect(plan.warnings.join(' ')).toMatch(/tight/i);
  });

  it('balances load across days (no day wildly overloaded)', () => {
    const a = assignment(
      [task(120), task(90), task(60), task(30), task(30), task(30)],
      '2026-10-24', // 3 days
    );
    const plan = generatePlan(a, today);
    const totals = plan.days.map((d) => d.totalMinutes);
    const max = Math.max(...totals);
    const min = Math.min(...totals);
    // Greedy LPT keeps the spread modest (within the largest task size).
    expect(max - min).toBeLessThanOrEqual(120);
  });

  it('reports completion when nothing is pending', () => {
    const a = assignment([task(60, true)], '2026-10-25');
    const plan = generatePlan(a, today);
    expect(plan.days).toHaveLength(0);
    expect(plan.unscheduled).toBe(false);
    expect(plan.warnings.join(' ')).toMatch(/complete/i);
  });
});
