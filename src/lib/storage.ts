import type { Assignment, PersistedState } from '../types';

export const STORAGE_KEY = 'deadline-decoder:state';
export const STORAGE_VERSION = 1;

function emptyState(): PersistedState {
  return { version: STORAGE_VERSION, assignments: [] };
}

function isAssignmentShape(value: unknown): value is Assignment {
  if (typeof value !== 'object' || value === null) return false;
  const a = value as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.title === 'string' &&
    typeof a.instructions === 'string' &&
    Array.isArray(a.requirements) &&
    Array.isArray(a.tasks)
  );
}

/**
 * Validate the parsed persisted payload. Returns a clean PersistedState, or the
 * empty state if the payload is missing, corrupt, or from an incompatible version.
 */
export function parseState(raw: unknown): PersistedState {
  if (typeof raw !== 'object' || raw === null) return emptyState();
  const obj = raw as Record<string, unknown>;

  if (obj.version !== STORAGE_VERSION) {
    // No migrations yet: safely reset on version mismatch.
    return emptyState();
  }
  if (!Array.isArray(obj.assignments)) return emptyState();

  const assignments = obj.assignments.filter(isAssignmentShape);
  return { version: STORAGE_VERSION, assignments };
}

/** Load persisted state from localStorage; never throws. */
export function loadState(): PersistedState {
  try {
    if (typeof localStorage === 'undefined') return emptyState();
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyState();
    return parseState(JSON.parse(raw));
  } catch {
    return emptyState();
  }
}

/** Persist assignments to localStorage; never throws. */
export function saveAssignments(assignments: Assignment[]): void {
  try {
    if (typeof localStorage === 'undefined') return;
    const state: PersistedState = { version: STORAGE_VERSION, assignments };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota or serialization failure — ignore for the MVP.
  }
}

export function serializeState(assignments: Assignment[]): string {
  const state: PersistedState = { version: STORAGE_VERSION, assignments };
  return JSON.stringify(state);
}
