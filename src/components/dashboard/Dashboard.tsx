import { Sparkles, Wand2 } from 'lucide-react';
import type { Assignment } from '../../types';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { StatsOverview } from './StatsOverview';
import { UpcomingDeadlines } from './UpcomingDeadlines';
import { AssignmentCard } from './AssignmentCard';

export function Dashboard({
  assignments,
  onOpen,
  onDecode,
}: {
  assignments: Assignment[];
  onOpen: (id: string) => void;
  onDecode: () => void;
}) {
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-500">
            Track your assignments, deadlines, and progress.
          </p>
        </div>
        <Button onClick={onDecode}>
          <Wand2 className="h-4 w-4" /> Decode assignment
        </Button>
      </header>

      {assignments.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="h-6 w-6" />}
          title="No assignments yet"
          description="Decode your first assignment to turn instructions into tasks and a study plan. Not ready? Load the sample to explore."
          action={
            <Button onClick={onDecode}>
              <Wand2 className="h-4 w-4" /> Decode your first assignment
            </Button>
          }
        />
      ) : (
        <>
          <StatsOverview assignments={assignments} />
          <UpcomingDeadlines assignments={assignments} onOpen={onOpen} />
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-800">All assignments</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {assignments.map((a) => (
                <AssignmentCard key={a.id} assignment={a} onOpen={() => onOpen(a.id)} />
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
