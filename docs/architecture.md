# Architecture — Deadline Decoder

This document explains the major design decisions behind Deadline Decoder. The
authoritative, versioned design lives in
[`.kiro/specs/deadline-decoder/design.md`](../.kiro/specs/deadline-decoder/design.md);
this is a reader-friendly summary.

## 1. High-level shape

Deadline Decoder is a single-page React application plus one serverless function.

```
Browser (React SPA)
  │  POST /api/decode { instructions, course?, dueDate? }
  ▼
Vercel Serverless Function  ──►  Google Gemini API
  │  validate → prompt → call → parse+validate JSON
  ▼
{ title, requirements[], tasks[] }  ──►  SPA saves an Assignment to localStorage
```

The browser never talks to Gemini directly. All AI calls go through the serverless
function so the API key stays server-side.

## 2. Major design decisions

### Serverless proxy for the AI key
**Decision:** a single `POST /api/decode` Vercel function brokers all Gemini calls.
**Why:** the Gemini key must never reach the client. Keeping one small function also
keeps the surface area (and the attack surface) minimal. The function reads the key
from `process.env.GEMINI_API_KEY`, validates input, requests strict JSON, validates
the model's output, and maps every failure to a typed error.

### Client-side calendar export (no OAuth)
**Decision:** the study plan exports as a standard `.ics` file generated entirely in
the browser (`src/lib/ics.ts`), downloaded via a Blob — no calendar API, no OAuth.
**Why:** it works with Google, Apple, and Outlook Calendar through one portable
format, keeps the app server-light and private, and avoids the complexity of OAuth
for an MVP. Because the planner stores **dates only, never times**, the module never
invents a time: the user chooses a daily start time (clearly-labeled default 18:00),
and each day's event length comes from that day's total estimated minutes (with a
30-minute floor). The generator is a pure function — valid RFC 5545 output with CRLF
line endings, line folding at 75 octets, and escaped text — so it is fully unit
tested, and it returns a typed "nothing to export" reason for unscheduled (no due
date) or empty plans.

### Deterministic study planner (not AI)
**Decision:** the schedule is produced by a pure function
(`src/lib/scheduler.ts`), not by Gemini.
**Why:** scheduling is a deterministic optimization, not a language task. A local
algorithm is instant, free, works offline, is unit-testable, and behaves predictably
for edge cases (no due date, due today, past due, too little time). Gemini is used
only where language understanding genuinely helps: decoding instructions.

The algorithm uses a greedy **longest-processing-time-first** heuristic: tasks are
sorted by estimate descending and each is placed on the currently-lightest day. This
balances daily load and front-loads work, which is the safer bias for deadlines.

### State: one hook over localStorage
**Decision:** a single `useAssignments` hook owns all assignment/task state and
persists to localStorage on change; views switch via simple view-state in `App.tsx`.
**Why:** the app has three views and one entity type. A router and a state library
(Redux/Zustand) would be ceremony without payoff. Fewer dependencies means less to
break under a one-day deadline.

### Pure logic separated from UI
**Decision:** all domain math (progress, scheduling, storage, validation) lives in
`src/lib/` as pure functions with no React imports.
**Why:** it keeps components thin, makes the tricky parts unit-testable, and lets the
serverless function reuse the same validation concepts without importing React.

### Honest AI output as a product invariant
**Decision:** every requirement and task carries a `source: 'explicit' | 'suggested'`
field, rendered with distinct badges. The prompt forbids inventing due dates.
**Why:** a study tool that silently blurs "the professor said X" with "the AI guessed
X" is actively harmful. The distinction is enforced in the prompt, re-validated and
defaulted in the backend, and surfaced in the UI.

## 3. Data models

(See `src/types/index.ts` for the exact definitions.)

- **Requirement** `{ id, text, source }`
- **Task** `{ id, title, estimateMinutes, completed, source, createdAt }`
- **Assignment** `{ id, title, course?, dueDate?, instructions, requirements[],
  tasks[], isSample, createdAt, updatedAt }`
- **StudyPlan** (derived, not persisted) `{ assignmentId, days[], warnings[],
  unscheduled }`
- **PersistedState** `{ version, assignments[] }` — versioned for safe migration.

`dueDate` is optional and never fabricated. `isSample` marks demo content so it is
clearly labeled in the UI.

## 4. API contract — `POST /api/decode`

**Request:** `{ instructions: string (1..12000), course?: string, dueDate?: string }`

**Success (200):**
```json
{
  "title": "string",
  "requirements": [{ "text": "string", "source": "explicit" | "suggested" }],
  "tasks": [{ "title": "string", "estimateMinutes": 90, "source": "explicit" | "suggested" }]
}
```

**Error (non-200):** `{ "error": <code>, "message": string }` where `code` is one of
`bad_request` (400), `rate_limited` (429), `server_misconfigured` (500),
`upstream_error` (502), `invalid_ai_response` (502).

The function normalizes the model output: it trims strings, clamps `estimateMinutes`
to 5–1440, coerces unknown `source` values to `suggested`, caps list sizes, and
rejects a response with no usable tasks.

## 5. Error handling & resilience

- **Client:** `src/lib/api.ts` maps non-200 responses and network failures to a typed
  `DecodeError`. The Decoder view shows a friendly message and always offers the
  sample result as a fallback.
- **Server:** every path returns the typed JSON error shape; stack traces and the key
  are never leaked.
- **Storage:** `loadState`/`parseState` never throw — corrupt or version-mismatched
  data resets to a valid empty state.
- **Scheduler:** a total function that handles zero tasks, no due date, and past-due
  deadlines without throwing.

## 6. Testing strategy

Unit tests (Vitest) focus on the pure logic where bugs are most likely and least
visible:

- `validate.test.ts` — decoder response validation/normalization and request validation.
- `scheduler.test.ts` — distribution, due-today, past-due, tight-time, no-due-date,
  load balancing, and completion cases.
- `progress.test.ts` — progress percentages, overdue detection, aggregate stats.
- `storage.test.ts` — serialize/parse round-trip, corruption, version mismatch.
- `ics.test.ts` — valid VCALENDAR structure, CRLF endings, chosen start time,
  minimum event length, text escaping, and graceful null results for unscheduled or
  empty plans.

Component and end-to-end tests were intentionally out of scope for the one-day MVP;
the UI is verified manually against the demo flow.

## 7. Deployment

Static SPA (`dist/`) plus the serverless function, deployed on Vercel.
`GEMINI_API_KEY` is configured as a Vercel environment variable. `vercel.json` sets
the build command, output directory, and an SPA rewrite that excludes `/api/`.
