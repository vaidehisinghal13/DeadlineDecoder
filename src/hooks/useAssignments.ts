import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Assignment, Task } from '../types';
import { loadState, saveAssignments } from '../lib/storage';
import { uid } from '../lib/id';

export interface NewTaskInput {
  title: string;
  estimateMinutes: number;
}

export interface UseAssignments {
  assignments: Assignment[];
  addAssignment: (assignment: Assignment) => void;
  removeAssignment: (assignmentId: string) => void;
  toggleTask: (assignmentId: string, taskId: string) => void;
  addTask: (assignmentId: string, input: NewTaskInput) => void;
  editTask: (assignmentId: string, taskId: string, patch: Partial<NewTaskInput>) => void;
  deleteTask: (assignmentId: string, taskId: string) => void;
}

function touch(a: Assignment): Assignment {
  return { ...a, updatedAt: new Date().toISOString() };
}

export function useAssignments(): UseAssignments {
  const [assignments, setAssignments] = useState<Assignment[]>(() => loadState().assignments);

  // Persist whenever the collection changes.
  useEffect(() => {
    saveAssignments(assignments);
  }, [assignments]);

  const addAssignment = useCallback((assignment: Assignment) => {
    setAssignments((prev) => [assignment, ...prev]);
  }, []);

  const removeAssignment = useCallback((assignmentId: string) => {
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  }, []);

  const updateAssignment = useCallback(
    (assignmentId: string, updater: (a: Assignment) => Assignment) => {
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignmentId ? touch(updater(a)) : a)),
      );
    },
    [],
  );

  const toggleTask = useCallback(
    (assignmentId: string, taskId: string) => {
      updateAssignment(assignmentId, (a) => ({
        ...a,
        tasks: a.tasks.map((t) =>
          t.id === taskId ? { ...t, completed: !t.completed } : t,
        ),
      }));
    },
    [updateAssignment],
  );

  const addTask = useCallback(
    (assignmentId: string, input: NewTaskInput) => {
      const task: Task = {
        id: uid('task'),
        title: input.title.trim(),
        estimateMinutes: input.estimateMinutes,
        completed: false,
        source: 'suggested',
        createdAt: new Date().toISOString(),
      };
      updateAssignment(assignmentId, (a) => ({ ...a, tasks: [...a.tasks, task] }));
    },
    [updateAssignment],
  );

  const editTask = useCallback(
    (assignmentId: string, taskId: string, patch: Partial<NewTaskInput>) => {
      updateAssignment(assignmentId, (a) => ({
        ...a,
        tasks: a.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                title: patch.title !== undefined ? patch.title.trim() : t.title,
                estimateMinutes:
                  patch.estimateMinutes !== undefined
                    ? patch.estimateMinutes
                    : t.estimateMinutes,
              }
            : t,
        ),
      }));
    },
    [updateAssignment],
  );

  const deleteTask = useCallback(
    (assignmentId: string, taskId: string) => {
      updateAssignment(assignmentId, (a) => ({
        ...a,
        tasks: a.tasks.filter((t) => t.id !== taskId),
      }));
    },
    [updateAssignment],
  );

  return useMemo(
    () => ({
      assignments,
      addAssignment,
      removeAssignment,
      toggleTask,
      addTask,
      editTask,
      deleteTask,
    }),
    [assignments, addAssignment, removeAssignment, toggleTask, addTask, editTask, deleteTask],
  );
}
