import { useMemo, useState } from 'react';
import { CalendarClock, CalendarPlus, RefreshCw, TriangleAlert } from 'lucide-react';
import type { Assignment } from '../../types';
import { generatePlan } from '../../lib/scheduler';
import { formatMinutes } from '../../lib/format';
import { buildIcs, icsFilename, DEFAULT_START_TIME } from '../../lib/ics';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';

/** Trigger a client-side download of the given text as a file. */
function downloadTextFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function StudyPlanner({ assignment }: { assignment: Assignment }) {
  // `nonce` lets the user regenerate; the plan is otherwise derived from tasks.
  const [nonce, setNonce] = useState(0);
  const [startTime, setStartTime] = useState(DEFAULT_START_TIME);
  const [exportError, setExportError] = useState<string | null>(null);
  const plan = useMemo(
    () => generatePlan(assignment, new Date()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [assignment, nonce],
  );

  const taskById = useMemo(
    () => new Map(assignment.tasks.map((t) => [t.id, t])),
    [assignment.tasks],
  );

  // Export is only meaningful for a dated plan with at least one scheduled task.
  const canExport = !plan.unscheduled && plan.days.some((d) => d.taskIds.length > 0);

  function handleExport() {
    setExportError(null);
    const result = buildIcs(assignment, plan, { startTime });
    if (!result.content) {
      setExportError(result.reason ?? 'Nothing to export.');
      return;
    }
    downloadTextFile(icsFilename(assignment), result.content, 'text/calendar;charset=utf-8');
  }

  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800">
          <CalendarClock className="h-4 w-4 text-brand-500" /> Study plan
        </h3>
        <Button variant="ghost" size="sm" onClick={() => setNonce((n) => n + 1)}>
          <RefreshCw className="h-4 w-4" /> Regenerate
        </Button>
      </div>

      {canExport ? (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-xl border border-slate-100 bg-slate-50/60 p-3">
          <div>
            <label
              htmlFor={`start-${assignment.id}`}
              className="mb-1 block text-xs font-medium text-slate-600"
            >
              Daily start time
            </label>
            <input
              id={`start-${assignment.id}`}
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value || DEFAULT_START_TIME)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-brand-400"
            />
          </div>
          <Button variant="secondary" size="sm" onClick={handleExport}>
            <CalendarPlus className="h-4 w-4" /> Export to Calendar
          </Button>
          <p className="w-full text-xs text-slate-400 sm:w-auto sm:flex-1">
            Downloads an .ics file for Google, Apple, or Outlook Calendar. Each day becomes
            a study session starting at the time you choose (default {DEFAULT_START_TIME}).
          </p>
        </div>
      ) : null}

      {exportError ? (
        <p className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          {exportError}
        </p>
      ) : null}

      {plan.warnings.length ? (
        <div className="mb-4 space-y-2">
          {plan.warnings.map((w, i) => (
            <p
              key={i}
              className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
            >
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              {w}
            </p>
          ))}
        </div>
      ) : null}

      {plan.unscheduled ? (
        <ul className="space-y-2">
          {assignment.tasks
            .filter((t) => !t.completed)
            .map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm text-slate-700"
              >
                {t.title}
                <span className="text-xs text-slate-500">{formatMinutes(t.estimateMinutes)}</span>
              </li>
            ))}
        </ul>
      ) : plan.days.length === 0 ? (
        <p className="text-sm text-slate-500">
          Nothing to schedule right now. Add tasks or mark some incomplete to build a plan.
        </p>
      ) : (
        <ol className="space-y-3">
          {plan.days.map((day) => (
            <li key={day.date} className="rounded-xl border border-slate-100 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium text-slate-800">{day.dayLabel}</p>
                <span className="text-xs text-slate-500">{formatMinutes(day.totalMinutes)}</span>
              </div>
              {day.taskIds.length === 0 ? (
                <p className="text-xs text-slate-400">Rest / buffer day</p>
              ) : (
                <ul className="space-y-1.5">
                  {day.taskIds.map((id) => {
                    const t = taskById.get(id);
                    if (!t) return null;
                    return (
                      <li
                        key={id}
                        className="flex items-center justify-between text-sm text-slate-600"
                      >
                        <span className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-brand-400" />
                          {t.title}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatMinutes(t.estimateMinutes)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
