import { useState } from 'react';
import { Shell, type View } from './components/layout/Shell';
import { Dashboard } from './components/dashboard/Dashboard';
import { Decoder } from './components/decoder/Decoder';
import { AssignmentDetail } from './components/detail/AssignmentDetail';
import { useAssignments } from './hooks/useAssignments';
import type { Assignment } from './types';

export default function App() {
  const store = useAssignments();
  const [view, setView] = useState<View>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected: Assignment | undefined = selectedId
    ? store.assignments.find((a) => a.id === selectedId)
    : undefined;

  function openAssignment(id: string) {
    setSelectedId(id);
  }

  function backToDashboard() {
    setSelectedId(null);
    setView('dashboard');
  }

  function handleNavigate(next: View) {
    setSelectedId(null);
    setView(next);
  }

  function handleSaved(assignment: Assignment) {
    store.addAssignment(assignment);
    setSelectedId(assignment.id);
    setView('dashboard');
  }

  // Detail view takes over the main area when an assignment is selected.
  const content = selected ? (
    <AssignmentDetail
      assignment={selected}
      onBack={backToDashboard}
      onDelete={() => {
        store.removeAssignment(selected.id);
        backToDashboard();
      }}
      onToggleTask={(taskId) => store.toggleTask(selected.id, taskId)}
      onEditTask={(taskId, patch) => store.editTask(selected.id, taskId, patch)}
      onDeleteTask={(taskId) => store.deleteTask(selected.id, taskId)}
      onAddTask={(input) => store.addTask(selected.id, input)}
    />
  ) : view === 'decoder' ? (
    <Decoder onSaved={handleSaved} />
  ) : (
    <Dashboard
      assignments={store.assignments}
      onOpen={openAssignment}
      onDecode={() => handleNavigate('decoder')}
    />
  );

  return (
    <Shell view={selected ? 'dashboard' : view} onNavigate={handleNavigate}>
      {content}
    </Shell>
  );
}
