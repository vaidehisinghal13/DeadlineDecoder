import type { Assignment, DecodeResponse } from '../types';
import { uid } from './id';

export interface BuildAssignmentInput {
  decoded: DecodeResponse;
  instructions: string;
  course?: string;
  dueDate?: string;
  isSample?: boolean;
}

/** Turn a decode response into a persistable Assignment with ids and timestamps. */
export function buildAssignment(input: BuildAssignmentInput): Assignment {
  const now = new Date().toISOString();
  return {
    id: uid('asg'),
    title: input.decoded.title,
    course: input.course,
    dueDate: input.dueDate,
    instructions: input.instructions,
    isSample: input.isSample ?? false,
    createdAt: now,
    updatedAt: now,
    requirements: input.decoded.requirements.map((r) => ({
      id: uid('req'),
      text: r.text,
      source: r.source,
    })),
    tasks: input.decoded.tasks.map((t) => ({
      id: uid('task'),
      title: t.title,
      estimateMinutes: t.estimateMinutes,
      completed: false,
      source: t.source,
      createdAt: now,
    })),
  };
}
