import { describe, it, expect } from 'vitest';
import { parseState, serializeState, STORAGE_VERSION } from '../lib/storage';
import type { Assignment } from '../types';

function sampleAssignment(): Assignment {
  return {
    id: 'asg_1',
    title: 'A',
    course: 'CS 101',
    dueDate: '2026-11-01',
    instructions: 'x',
    requirements: [{ id: 'r1', text: 'req', source: 'explicit' }],
    tasks: [
      {
        id: 't1',
        title: 'task',
        estimateMinutes: 30,
        completed: false,
        source: 'explicit',
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    ],
    isSample: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('storage round-trip', () => {
  it('serializes and parses back to an equivalent state', () => {
    const assignments = [sampleAssignment()];
    const parsed = parseState(JSON.parse(serializeState(assignments)));
    expect(parsed.version).toBe(STORAGE_VERSION);
    expect(parsed.assignments).toHaveLength(1);
    expect(parsed.assignments[0].title).toBe('A');
  });
});

describe('parseState resilience', () => {
  it('returns empty state for null/garbage', () => {
    expect(parseState(null).assignments).toHaveLength(0);
    expect(parseState('nope').assignments).toHaveLength(0);
    expect(parseState(42).assignments).toHaveLength(0);
  });

  it('resets on version mismatch', () => {
    const payload = { version: 999, assignments: [sampleAssignment()] };
    expect(parseState(payload).assignments).toHaveLength(0);
  });

  it('drops malformed assignment entries', () => {
    const payload = {
      version: STORAGE_VERSION,
      assignments: [sampleAssignment(), { id: 'bad' }, null, 5],
    };
    const parsed = parseState(payload);
    expect(parsed.assignments).toHaveLength(1);
  });

  it('returns empty state when assignments is not an array', () => {
    const payload = { version: STORAGE_VERSION, assignments: 'nope' };
    expect(parseState(payload).assignments).toHaveLength(0);
  });
});
