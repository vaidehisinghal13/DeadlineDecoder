import { useState } from 'react';
import { FileText } from 'lucide-react';
import type { Assignment, DecodeResponse } from '../../types';
import { DecodeError } from '../../types';
import { decodeAssignment } from '../../lib/api';
import { buildAssignment } from '../../lib/assignment';
import { SAMPLE_COURSE, SAMPLE_DECODE, SAMPLE_INSTRUCTIONS } from '../../lib/sample';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { ErrorState } from '../ui/ErrorState';
import { InstructionsForm, type DecoderFormValues } from './InstructionsForm';
import { DecodeResult } from './DecodeResult';

const emptyForm: DecoderFormValues = { instructions: '', course: '', dueDate: '' };

export function Decoder({
  onSaved,
}: {
  onSaved: (assignment: Assignment) => void;
}) {
  const [form, setForm] = useState<DecoderFormValues>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DecodeResponse | null>(null);
  const [resultIsSample, setResultIsSample] = useState(false);

  async function handleDecode() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const decoded = await decodeAssignment({
        instructions: form.instructions,
        course: form.course || undefined,
        dueDate: form.dueDate || undefined,
      });
      setResult(decoded);
      setResultIsSample(false);
    } catch (err) {
      const message =
        err instanceof DecodeError
          ? err.message
          : 'Unexpected error while decoding. Please try again or load the sample.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function loadSample() {
    setForm({
      instructions: SAMPLE_INSTRUCTIONS,
      course: SAMPLE_COURSE,
      dueDate: form.dueDate,
    });
    setError(null);
    setResult(SAMPLE_DECODE);
    setResultIsSample(true);
  }

  function showSampleResult() {
    setError(null);
    setResult(SAMPLE_DECODE);
    setResultIsSample(true);
  }

  function handleSave() {
    if (!result) return;
    const assignment = buildAssignment({
      decoded: result,
      instructions: form.instructions || SAMPLE_INSTRUCTIONS,
      course: form.course || undefined,
      dueDate: form.dueDate || undefined,
      isSample: resultIsSample,
    });
    onSaved(assignment);
    // Reset for the next decode.
    setForm(emptyForm);
    setResult(null);
    setResultIsSample(false);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Decode an assignment</h1>
        <p className="mt-1 text-sm text-slate-500">
          Paste your instructions and let AI extract the requirements and build your task list.
        </p>
      </header>

      <Card className="p-5 md:p-6">
        <InstructionsForm
          values={form}
          onChange={setForm}
          onSubmit={handleDecode}
          onLoadSample={loadSample}
          loading={loading}
        />
      </Card>

      {error ? (
        <ErrorState
          message={error}
          action={
            <Button variant="secondary" size="sm" onClick={showSampleResult}>
              <FileText className="h-4 w-4" /> Use sample result instead
            </Button>
          }
        />
      ) : null}

      {result ? (
        <DecodeResult result={result} isSample={resultIsSample} onSave={handleSave} />
      ) : null}
    </div>
  );
}
