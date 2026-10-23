import type {
  DecodeResponse,
  DecodedRequirement,
  DecodedTask,
  RequirementSource,
} from '../types';

export const MAX_INSTRUCTIONS_LENGTH = 12_000;
export const MIN_ESTIMATE_MINUTES = 5;
export const MAX_ESTIMATE_MINUTES = 1_440; // one day
export const MAX_REQUIREMENTS = 30;
export const MAX_TASKS = 30;

function coerceSource(value: unknown): RequirementSource {
  return value === 'explicit' ? 'explicit' : 'suggested';
}

function clampEstimate(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 30;
  const rounded = Math.round(n);
  return Math.min(MAX_ESTIMATE_MINUTES, Math.max(MIN_ESTIMATE_MINUTES, rounded));
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Validate and normalize a raw (untrusted) decode payload — typically the parsed
 * JSON returned by Gemini. Returns a clean DecodeResponse, or throws on a shape
 * that cannot be salvaged. Used by both the serverless function and unit tests.
 */
export function validateDecodeResponse(raw: unknown): DecodeResponse {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Decoded response is not an object');
  }
  const obj = raw as Record<string, unknown>;

  if (!nonEmptyString(obj.title)) {
    throw new Error('Decoded response is missing a valid "title"');
  }

  if (!Array.isArray(obj.requirements) || !Array.isArray(obj.tasks)) {
    throw new Error('Decoded response must include "requirements" and "tasks" arrays');
  }

  const requirements: DecodedRequirement[] = obj.requirements
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      text: typeof r.text === 'string' ? r.text.trim() : '',
      source: coerceSource(r.source),
    }))
    .filter((r) => r.text.length > 0)
    .slice(0, MAX_REQUIREMENTS);

  const tasks: DecodedTask[] = obj.tasks
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .map((t) => ({
      title: typeof t.title === 'string' ? t.title.trim() : '',
      estimateMinutes: clampEstimate(t.estimateMinutes),
      source: coerceSource(t.source),
    }))
    .filter((t) => t.title.length > 0)
    .slice(0, MAX_TASKS);

  if (tasks.length === 0) {
    throw new Error('Decoded response produced no usable tasks');
  }

  return {
    title: obj.title.trim(),
    requirements,
    tasks,
  };
}

/** Validate an incoming decode request body (server-side request validation). */
export function validateDecodeRequest(raw: unknown): {
  instructions: string;
  course?: string;
  dueDate?: string;
} {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('Request body must be a JSON object');
  }
  const obj = raw as Record<string, unknown>;

  if (!nonEmptyString(obj.instructions)) {
    throw new Error('Field "instructions" is required and must be a non-empty string');
  }
  if (obj.instructions.length > MAX_INSTRUCTIONS_LENGTH) {
    throw new Error(
      `Field "instructions" exceeds the ${MAX_INSTRUCTIONS_LENGTH} character limit`,
    );
  }

  const course =
    typeof obj.course === 'string' && obj.course.trim().length > 0
      ? obj.course.trim()
      : undefined;
  const dueDate =
    typeof obj.dueDate === 'string' && obj.dueDate.trim().length > 0
      ? obj.dueDate.trim()
      : undefined;

  return { instructions: obj.instructions, course, dueDate };
}
