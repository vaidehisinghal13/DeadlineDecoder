// Shared domain types for Deadline Decoder.
// Pure data shapes — no React, no DOM.

/**
 * Whether an item was explicitly stated in the assignment instructions
 * ("explicit") or generated as an AI recommendation ("suggested").
 * This distinction is a core product principle: never present AI
 * suggestions as if they were explicit requirements.
 */
export type RequirementSource = 'explicit' | 'suggested';

export interface Requirement {
  id: string;
  text: string;
  source: RequirementSource;
}

export interface Task {
  id: string;
  title: string;
  estimateMinutes: number;
  completed: boolean;
  source: RequirementSource;
  createdAt: string; // ISO timestamp
}

export interface Assignment {
  id: string;
  title: string;
  course?: string;
  /** ISO date (yyyy-mm-dd). Optional; never fabricated by the app. */
  dueDate?: string;
  instructions: string;
  requirements: Requirement[];
  tasks: Task[];
  /** True for the labeled demo assignment produced without calling Gemini. */
  isSample: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlanDayEntry {
  date: string; // ISO date yyyy-mm-dd
  dayLabel: string; // e.g. "Mon Oct 26"
  taskIds: string[];
  totalMinutes: number;
}

export interface StudyPlan {
  assignmentId: string;
  generatedAt: string;
  days: PlanDayEntry[];
  warnings: string[];
  /** True when there is no due date: tasks shown as an unscheduled checklist. */
  unscheduled: boolean;
}

export interface PersistedState {
  version: number;
  assignments: Assignment[];
}

// ---- Decode API contract (shared shape; API keeps its own minimal copy) ----

export interface DecodeRequest {
  instructions: string;
  course?: string;
  dueDate?: string;
}

export interface DecodedRequirement {
  text: string;
  source: RequirementSource;
}

export interface DecodedTask {
  title: string;
  estimateMinutes: number;
  source: RequirementSource;
}

export interface DecodeResponse {
  title: string;
  requirements: DecodedRequirement[];
  tasks: DecodedTask[];
}

export type DecodeErrorCode =
  | 'bad_request'
  | 'rate_limited'
  | 'upstream_error'
  | 'invalid_ai_response'
  | 'server_misconfigured'
  | 'network_error';

export interface DecodeErrorBody {
  error: DecodeErrorCode;
  message: string;
}

/** Thrown/returned by the client API wrapper for a failed decode. */
export class DecodeError extends Error {
  code: DecodeErrorCode;
  constructor(code: DecodeErrorCode, message: string) {
    super(message);
    this.name = 'DecodeError';
    this.code = code;
  }
}
