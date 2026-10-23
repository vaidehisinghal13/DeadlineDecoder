import { describe, it, expect } from 'vitest';
import {
  buildIcs,
  escapeIcsText,
  parseStartTime,
  formatLocalStamp,
  icsFilename,
  MIN_EVENT_MINUTES,
} from '../lib/ics';
import { generatePlan } from '../lib/scheduler';
import type { Assignment, Task } from '../types';

let counter = 0;
function task(estimateMinutes: number, completed = false, title?: string): Task {
  counter += 1;
  return {
    id: `task_${counter}`,
    title: title ?? `Task ${counter}`,
    estimateMinutes,
    completed,
    source: 'explicit',
    createdAt: `2026-01-01T00:00:0${counter % 10}.000Z`,
  };
}

function assignment(tasks: Task[], dueDate?: string, extra: Partial<Assignment> = {}): Assignment {
  return {
    id: 'asg_1',
    title: 'Research Paper',
    course: 'PSY 201',
    dueDate,
    instructions: 'x',
    requirements: [],
    tasks,
    isSample: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...extra,
  };
}

const today = new Date(2026, 9, 22); // Oct 22, 2026

describe('escapeIcsText', () => {
  it('escapes special characters', () => {
    expect(escapeIcsText('a, b; c\\ d')).toBe('a\\, b\\; c\\\\ d');
  });
  it('escapes newlines', () => {
    expect(escapeIcsText('line1\nline2')).toBe('line1\\nline2');
  });
});

describe('parseStartTime', () => {
  it('parses a valid HH:MM', () => {
    expect(parseStartTime('09:30')).toEqual([9, 30]);
  });
  it('clamps out-of-range values', () => {
    expect(parseStartTime('99:99')).toEqual([23, 59]);
  });
  it('falls back to 18:00 on bad input', () => {
    expect(parseStartTime('nonsense')).toEqual([18, 0]);
  });
});

describe('formatLocalStamp', () => {
  it('formats a floating local datetime', () => {
    expect(formatLocalStamp(new Date(2026, 9, 22, 18, 5, 0))).toBe('20261022T180500');
  });
});

describe('icsFilename', () => {
  it('slugifies the title', () => {
    expect(icsFilename(assignment([]))).toBe('study-plan-research-paper.ics');
  });
  it('falls back when title has no alphanumerics', () => {
    expect(icsFilename(assignment([], undefined, { title: '!!!' }))).toBe(
      'study-plan-assignment.ics',
    );
  });
});

describe('buildIcs', () => {
  const opts = { startTime: '18:00' };

  it('produces a valid VCALENDAR with one VEVENT per scheduled day', () => {
    const a = assignment([task(60), task(60)], '2026-10-23'); // today + tomorrow = 2 days
    const plan = generatePlan(a, today);
    const result = buildIcs(a, plan, opts, today);

    expect(result.content).not.toBeNull();
    const ics = result.content!;
    expect(ics.startsWith('BEGIN:VCALENDAR')).toBe(true);
    expect(ics.trimEnd().endsWith('END:VCALENDAR')).toBe(true);
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:');

    const eventCount = (ics.match(/BEGIN:VEVENT/g) || []).length;
    expect(eventCount).toBe(result.eventCount);
    expect(eventCount).toBeGreaterThanOrEqual(1);

    // Balanced BEGIN/END.
    expect((ics.match(/BEGIN:VEVENT/g) || []).length).toBe(
      (ics.match(/END:VEVENT/g) || []).length,
    );
  });

  it('uses CRLF line endings (RFC 5545)', () => {
    const a = assignment([task(60)], '2026-10-22');
    const plan = generatePlan(a, today);
    const ics = buildIcs(a, plan, opts, today).content!;
    expect(ics).toContain('\r\n');
    expect(ics).not.toMatch(/[^\r]\n/); // no bare LF
  });

  // Reverse RFC 5545 line folding (CRLF followed by a single space/tab) so we can
  // assert on logical content the way a real calendar parser would read it.
  function unfold(ics: string): string {
    return ics.replace(/\r\n[ \t]/g, '');
  }

  it('includes the assignment title and task descriptions', () => {
    const a = assignment([task(60, false, 'Draft the literature review')], '2026-10-22');
    const plan = generatePlan(a, today);
    const ics = unfold(buildIcs(a, plan, opts, today).content!);
    expect(ics).toContain('SUMMARY:Study: Research Paper');
    expect(ics).toContain('Draft the literature review');
    expect(ics).toContain('Course: PSY 201');
  });

  it('respects the chosen start time in DTSTART', () => {
    const a = assignment([task(60)], '2026-10-22');
    const plan = generatePlan(a, today);
    const ics = buildIcs(a, plan, { startTime: '09:15' }, today).content!;
    expect(ics).toContain('DTSTART:20261022T091500');
  });

  it('enforces a minimum event length', () => {
    // A tiny task would be < MIN_EVENT_MINUTES; event should still span the minimum.
    const a = assignment([task(5)], '2026-10-22');
    const plan = generatePlan(a, today);
    const ics = buildIcs(a, plan, { startTime: '18:00' }, today).content!;
    // 18:00 + 30 min = 18:30
    expect(ics).toContain('DTSTART:20261022T180000');
    expect(ics).toContain('DTEND:20261022T183000');
    expect(MIN_EVENT_MINUTES).toBe(30);
  });

  it('returns null content when there is no due date (unscheduled)', () => {
    const a = assignment([task(60)]); // no due date
    const plan = generatePlan(a, today);
    const result = buildIcs(a, plan, opts, today);
    expect(result.content).toBeNull();
    expect(result.eventCount).toBe(0);
    expect(result.reason).toMatch(/due date/i);
  });

  it('returns null content when there are no scheduled tasks', () => {
    const a = assignment([task(60, true)], '2026-10-23'); // only completed task
    const plan = generatePlan(a, today);
    const result = buildIcs(a, plan, opts, today);
    expect(result.content).toBeNull();
    expect(result.reason).toMatch(/no scheduled tasks/i);
  });

  it('escapes special characters in the title', () => {
    const a = assignment([task(60)], '2026-10-22', { title: 'Essay; Part 1, Draft' });
    const plan = generatePlan(a, today);
    const ics = buildIcs(a, plan, opts, today).content!;
    expect(ics).toContain('SUMMARY:Study: Essay\\; Part 1\\, Draft');
  });
});
