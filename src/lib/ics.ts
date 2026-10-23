import type { Assignment, StudyPlan, Task } from '../types';

// Client-side iCalendar (.ics / RFC 5545) generation for a study plan.
// No external APIs, no OAuth — just a string the browser downloads.
//
// IMPORTANT: the planner stores DATES only, not times. We never invent a time.
// The caller supplies an explicit start time (and the event length comes from the
// day's total estimated minutes), so every event time is user-chosen, not guessed.

/** Minimum event length so a zero/short day still produces a visible calendar block. */
export const MIN_EVENT_MINUTES = 30;
/** Clearly-labeled default start time if the user does not change it. */
export const DEFAULT_START_TIME = '18:00';

export interface IcsOptions {
  /** Preferred local start time of each day's study session, "HH:MM" (24h). */
  startTime: string;
}

export interface IcsResult {
  /** The .ics file contents, or null when there is nothing schedulable to export. */
  content: string | null;
  /** Number of VEVENTs produced. */
  eventCount: number;
  /** Human-readable reason when content is null (e.g. no due date, no tasks). */
  reason?: string;
}

/** Escape a text value per RFC 5545 (commas, semicolons, backslashes, newlines). */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Parse "HH:MM" into [hours, minutes], clamped to valid ranges. Defaults on bad input. */
export function parseStartTime(startTime: string): [number, number] {
  const m = /^(\d{1,2}):(\d{2})$/.exec(startTime.trim());
  if (!m) return [18, 0];
  const h = Math.min(23, Math.max(0, Number(m[1])));
  const min = Math.min(59, Math.max(0, Number(m[2])));
  return [h, min];
}

/** Format a Date as a floating local datetime stamp: YYYYMMDDTHHMMSS. */
export function formatLocalStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `T${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

/** Format a Date as a UTC stamp for DTSTAMP: YYYYMMDDTHHMMSSZ. */
export function formatUtcStamp(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}` +
    `T${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}Z`
  );
}

function parseIsoDate(iso: string): Date | null {
  const parts = iso.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  const [y, m, d] = parts;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Fold a content line to 75 octets per RFC 5545 (simple char-based folding). */
function foldLine(line: string): string {
  if (line.length <= 75) return line;
  const chunks: string[] = [];
  let rest = line;
  chunks.push(rest.slice(0, 75));
  rest = rest.slice(75);
  while (rest.length > 0) {
    chunks.push(' ' + rest.slice(0, 74));
    rest = rest.slice(74);
  }
  return chunks.join('\r\n');
}

/**
 * Build an .ics calendar from a study plan. Returns `content: null` with a reason
 * when there is nothing to export (no due date / unscheduled, or no scheduled tasks).
 */
export function buildIcs(
  assignment: Assignment,
  plan: StudyPlan,
  options: IcsOptions,
  now: Date = new Date(),
): IcsResult {
  if (plan.unscheduled) {
    return {
      content: null,
      eventCount: 0,
      reason: 'This assignment has no due date, so there is no dated schedule to export. Add a due date to build a day-by-day plan.',
    };
  }

  const scheduledDays = plan.days.filter((d) => d.taskIds.length > 0);
  if (scheduledDays.length === 0) {
    return {
      content: null,
      eventCount: 0,
      reason: 'There are no scheduled tasks to export. Add tasks or mark some incomplete.',
    };
  }

  const [startH, startM] = parseStartTime(options.startTime);
  const taskById = new Map<string, Task>(assignment.tasks.map((t) => [t.id, t]));
  const dtstamp = formatUtcStamp(now);

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Deadline Decoder//Study Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  let eventCount = 0;

  scheduledDays.forEach((day, index) => {
    const date = parseIsoDate(day.date);
    if (!date) return;

    const start = new Date(date);
    start.setHours(startH, startM, 0, 0);

    const durationMinutes = Math.max(MIN_EVENT_MINUTES, day.totalMinutes);
    const end = new Date(start.getTime() + durationMinutes * 60 * 1000);

    const dayTasks = day.taskIds
      .map((id) => taskById.get(id))
      .filter((t): t is Task => Boolean(t));

    const summary = `Study: ${assignment.title}`;
    const descLines = [
      assignment.course ? `Course: ${assignment.course}` : null,
      'Tasks for this session:',
      ...dayTasks.map((t) => `- ${t.title} (${t.estimateMinutes} min)`),
      '',
      'Generated by Deadline Decoder.',
    ].filter((l): l is string => l !== null);

    // Stable-ish UID from assignment id + date + index (no PII, no network).
    const uid = `${assignment.id}-${day.date}-${index}@deadline-decoder`;

    lines.push(
      'BEGIN:VEVENT',
      foldLine(`UID:${uid}`),
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatLocalStamp(start)}`,
      `DTEND:${formatLocalStamp(end)}`,
      foldLine(`SUMMARY:${escapeIcsText(summary)}`),
      foldLine(`DESCRIPTION:${escapeIcsText(descLines.join('\n'))}`),
      'END:VEVENT',
    );
    eventCount += 1;
  });

  lines.push('END:VCALENDAR');

  if (eventCount === 0) {
    return {
      content: null,
      eventCount: 0,
      reason: 'No valid scheduled days could be exported.',
    };
  }

  // RFC 5545 requires CRLF line endings.
  return { content: lines.join('\r\n') + '\r\n', eventCount };
}

/** Build a safe filename for the download, e.g. "study-plan-research-paper.ics". */
export function icsFilename(assignment: Assignment): string {
  const slug = assignment.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50);
  return `study-plan-${slug || 'assignment'}.ics`;
}
