import { FileText, Sparkles } from 'lucide-react';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';
import { MAX_INSTRUCTIONS_LENGTH } from '../../lib/validate';

export interface DecoderFormValues {
  instructions: string;
  course: string;
  dueDate: string;
}

export function InstructionsForm({
  values,
  onChange,
  onSubmit,
  onLoadSample,
  loading,
}: {
  values: DecoderFormValues;
  onChange: (values: DecoderFormValues) => void;
  onSubmit: () => void;
  onLoadSample: () => void;
  loading: boolean;
}) {
  const length = values.instructions.length;
  const overLimit = length > MAX_INSTRUCTIONS_LENGTH;
  const empty = values.instructions.trim().length === 0;

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        if (!empty && !overLimit && !loading) onSubmit();
      }}
    >
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="instructions" className="text-sm font-medium text-slate-700">
            Assignment instructions
          </label>
          <span
            className={
              overLimit ? 'text-xs font-medium text-red-600' : 'text-xs text-slate-400'
            }
          >
            {length.toLocaleString()} / {MAX_INSTRUCTIONS_LENGTH.toLocaleString()}
          </span>
        </div>
        <textarea
          id="instructions"
          value={values.instructions}
          onChange={(e) => onChange({ ...values, instructions: e.target.value })}
          placeholder="Paste the full assignment instructions here…"
          rows={10}
          className="w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400"
        />
        {overLimit ? (
          <p className="mt-1 text-xs text-red-600">
            Instructions are too long. Please trim to {MAX_INSTRUCTIONS_LENGTH.toLocaleString()}{' '}
            characters.
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="course" className="mb-1.5 block text-sm font-medium text-slate-700">
            Course <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="course"
            type="text"
            value={values.course}
            onChange={(e) => onChange({ ...values, course: e.target.value })}
            placeholder="e.g. CS 101"
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-brand-400"
          />
        </div>
        <div>
          <label htmlFor="dueDate" className="mb-1.5 block text-sm font-medium text-slate-700">
            Due date <span className="font-normal text-slate-400">(optional)</span>
          </label>
          <input
            id="dueDate"
            type="date"
            value={values.dueDate}
            onChange={(e) => onChange({ ...values, dueDate: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-800 focus:border-brand-400"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={empty || overLimit || loading}>
          {loading ? (
            <>
              <Spinner className="h-4 w-4" /> Decoding…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Decode with AI
            </>
          )}
        </Button>
        <Button type="button" variant="secondary" onClick={onLoadSample} disabled={loading}>
          <FileText className="h-4 w-4" /> Load sample assignment
        </Button>
        {empty ? (
          <span className="text-xs text-slate-400">
            Paste instructions or load the sample to begin.
          </span>
        ) : null}
      </div>
    </form>
  );
}
