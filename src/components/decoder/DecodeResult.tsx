import { CheckCircle2, Clock, ListChecks, Lightbulb, Save } from 'lucide-react';
import type { DecodeResponse } from '../../types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { formatMinutes } from '../../lib/format';

export function DecodeResult({
  result,
  isSample,
  onSave,
}: {
  result: DecodeResponse;
  isSample: boolean;
  onSave: () => void;
}) {
  const explicit = result.requirements.filter((r) => r.source === 'explicit');
  const suggested = result.requirements.filter((r) => r.source === 'suggested');
  const totalMinutes = result.tasks.reduce((sum, t) => sum + t.estimateMinutes, 0);

  return (
    <div className="space-y-5 animate-fade-in">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <h2 className="text-lg font-semibold text-slate-900">{result.title}</h2>
              {isSample ? <Badge tone="sample">Sample / demo</Badge> : <Badge tone="success">AI decoded</Badge>}
            </div>
            <p className="flex items-center gap-1.5 text-sm text-slate-500">
              <Clock className="h-4 w-4" />
              {result.tasks.length} tasks · about {formatMinutes(totalMinutes)} total
            </p>
          </div>
          <Button onClick={onSave}>
            <Save className="h-4 w-4" /> Save assignment
          </Button>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Stated requirements
          </h3>
          {explicit.length ? (
            <ul className="space-y-2">
              {explicit.map((r, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" />
                  {r.text}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">
              No explicitly stated requirements were detected.
            </p>
          )}

          {suggested.length ? (
            <>
              <h3 className="mb-3 mt-5 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Lightbulb className="h-4 w-4 text-amber-500" /> AI suggestions
              </h3>
              <ul className="space-y-2">
                {suggested.map((r, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {r.text}
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-400">
                Suggestions are AI recommendations, not stated in the instructions.
              </p>
            </>
          ) : null}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ListChecks className="h-4 w-4 text-brand-500" /> Generated tasks
          </h3>
          <ul className="space-y-2">
            {result.tasks.map((t, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2"
              >
                <span className="flex items-center gap-2 text-sm text-slate-700">
                  {t.title}
                  {t.source === 'suggested' ? <Badge tone="suggested">suggested</Badge> : null}
                </span>
                <span className="shrink-0 text-xs font-medium text-slate-500">
                  {formatMinutes(t.estimateMinutes)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
