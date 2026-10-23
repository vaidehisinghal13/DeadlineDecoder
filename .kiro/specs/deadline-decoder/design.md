# Design Document

## Overview

Deadline Decoder is a single-page React app (Vite + TypeScript + Tailwind) with one
Vercel serverless function (`/api/decode`) that brokers calls to Google's Gemini API.
The browser never sees the Gemini key. All user data (assignments, tasks, plans) lives
in `localStorage` behind a typed storage module. Domain logic (progress math, study-plan
scheduling, AI-response validation) is implemented as pure, unit-tested functions in
`src/lib/`, separate from React components.

## Architecture

The system is a static React SPA plus a single serverless function. The browser calls
the function, which is the only component that talks to Gemini (so the API key stays
server-side). Decoded assignments are persisted in the browser's `localStorage`.

```
Browser (React SPA)
  │  POST /api/decode { instructions, course?, dueDate? }
  ▼
Vercel Serverless Function  ──►  Google Gemini API (key from GEMINI_API_KEY)
  │  validate body → build prompt → call Gemini → parse+validate JSON
  ▼
{ title, requirements[], tasks[] }  ──►  SPA saves Assignment to localStorage
```

### Key design decisions (summary)
| Decision | Choice | Rationale |
|---|---|---|
| AI access | Serverless proxy only | Keep key server-side; satisfies security reqs. |
| State mgmt | React hooks + a single `useAssignments` hook over localStorage | No Redux needed; small app, one source of truth. |
| Routing | Lightweight view-state switch (no router dep) OR `react-router` | Fewer deps; three views. We use simple state-based views. |
| Scheduling | Pure deterministic algorithm in `lib/scheduler.ts` | Testable, predictable, works offline, no AI needed for planning. |
| Persistence | Versioned localStorage key, safe parse | Survives reloads, resilient to corruption. |
| Fallback | Precomputed sample decode result | App demoable without Gemini. |
| Styling | Tailwind, hand-built UI primitives | Fast, consistent, no heavy UI lib. |

---

## Data Models

Shared types live in `src/types/index.ts`. The serverless function keeps a minimal
local copy of the request/response contract to avoid cross-bundle import coupling.

```ts
// Source of a requirement: found verbatim/explicitly in the prompt, vs AI-suggested.
export type RequirementSource = 'explicit' | 'suggested';

export interface Requirement {
  id: string;
  text: string;
  source: RequirementSource;   // Req 1.4 / 2.6 — must distinguish these
}

export interface Task {
  id: string;
  title: string;
  estimateMinutes: number;     // AI or user provided; integer minutes
  completed: boolean;
  source: RequirementSource;   // whether task came from explicit req or suggestion
  createdAt: string;           // ISO timestamp
}

export interface Assignment {
  id: string;
  title: string;
  course?: string;
  dueDate?: string;            // ISO date (yyyy-mm-dd). Never fabricated. Req 1.5
  instructions: string;        // original pasted text
  requirements: Requirement[];
  tasks: Task[];
  isSample: boolean;           // true for the labeled demo assignment. Req 7.3
  createdAt: string;
  updatedAt: string;
}

// Generated on demand, not persisted as source of truth (derived from tasks+dueDate).
export interface PlanDayEntry {
  date: string;                // ISO date
  dayLabel: string;            // e.g. "Mon Oct 26"
  taskIds: string[];
  totalMinutes: number;
}
export interface StudyPlan {
  assignmentId: string;
  generatedAt: string;
  days: PlanDayEntry[];
  warnings: string[];          // e.g. "Deadline passed", "Time is tight". Req 5.3/5.4
  unscheduled: boolean;        // true when no due date (checklist mode). Req 5.6
}

export interface PersistedState {
  version: number;             // STORAGE_VERSION
  assignments: Assignment[];
}
```

---

## API Contract — `POST /api/decode`

### Request
```json
{
  "instructions": "string (required, 1..12000 chars)",
  "course": "string (optional)",
  "dueDate": "string (optional, yyyy-mm-dd)"
}
```

### Success response — `200`
```json
{
  "title": "string",
  "requirements": [
    { "text": "string", "source": "explicit" | "suggested" }
  ],
  "tasks": [
    { "title": "string", "estimateMinutes": 90, "source": "explicit" | "suggested" }
  ]
}
```
The client assigns `id`/`completed`/`createdAt` when persisting. The function returns
no `dueDate` and never fabricates one (Req 1.5 / 2.6).

### Error response — non-200
```json
{ "error": "bad_request | rate_limited | upstream_error | invalid_ai_response | server_misconfigured",
  "message": "human-readable string" }
```
Status mapping: `bad_request`→400, `rate_limited`→429, `server_misconfigured`→500,
`upstream_error`→502, `invalid_ai_response`→502.

### Server flow
1. Reject non-POST with 405.
2. Parse JSON body; validate `instructions` (non-empty, ≤ 12000). Else 400 `bad_request`.
3. If `GEMINI_API_KEY` missing → 500 `server_misconfigured`.
4. Build prompt (see Gemini Prompt Design) and call Gemini `generateContent` with
   `responseMimeType: application/json`.
5. On 429 from Gemini → 429 `rate_limited`. On other non-OK → 502 `upstream_error`.
6. Extract text, `JSON.parse`, then schema-validate with `validateDecodeResponse`
   (shared with a unit test). On failure → 502 `invalid_ai_response`.
7. Normalize: clamp `estimateMinutes` to a sane range (5..1440), coerce `source`
   to `explicit|suggested` (default `suggested`), trim strings, cap list sizes.
8. Return normalized `{ title, requirements, tasks }`.

### Gemini endpoint
`POST https://generativelanguage.googleapis.com/v1beta/models/<MODEL>:generateContent?key=<KEY>`
with `MODEL = gemini-flash-lite-latest` by default (a stable, non-dated alias verified
to return 200 from the live API). Configurable via the `GEMINI_MODEL` env var.

> **Model availability (verified against the live API):** Google retires older pinned
> models for new keys. `gemini-2.5-flash` now returns HTTP 404 ("no longer available to
> new users") on `generateContent` even though it still appears in ListModels. We
> therefore default to the stable alias `gemini-flash-lite-latest`.
> A model appearing in ListModels does NOT guarantee it works for `generateContent`;
> confirm with a real POST (expect 200):
> `POST .../v1beta/models/<MODEL>:generateContent?key=$GEMINI_API_KEY`.
> The backend maps a 404 to a typed `model_unavailable` error with an actionable message.

---

## Gemini Prompt Design

System/instruction content enforces the product's honesty rules:

- Return **only** JSON matching the schema (no prose, no markdown fences).
- `requirements[].source = "explicit"` ONLY when the item is directly stated in the
  instructions; otherwise `"suggested"`.
- Generate `tasks` as concrete, actionable steps; include realistic `estimateMinutes`.
- **Never** invent or output a due date. Do not claim inferred details are confirmed.
- If instructions are vague, produce fewer explicit items and more clearly-marked
  suggestions rather than hallucinating requirements.

The user's `course`/`dueDate` are passed as context only (the model must not echo a
fabricated due date into output). `responseMimeType: 'application/json'` plus a
`responseSchema` (where supported) further constrains output; the backend still
validates defensively.

---

## Study Planner Algorithm (`src/lib/scheduler.ts`)

Pure function: `generatePlan(assignment, today = new Date()): StudyPlan`.

1. Collect **incomplete** tasks (Req 5.5). If none → plan with empty days and a note.
2. If `dueDate` is absent → `unscheduled = true`, return checklist-mode plan (Req 5.6).
3. Compute `daysRemaining = diffInDays(dueDate, today)` (inclusive of today).
   - If `daysRemaining < 0` (due date passed) → `warnings += "Deadline has passed…"`,
     put all remaining tasks on "today" as ASAP (Req 5.3).
   - If `daysRemaining === 0` → single day (due today).
4. Distribute tasks across available days using a **greedy balanced fill**:
   - Target per-day minutes = `ceil(totalMinutes / usableDays)`.
   - Sort tasks by estimate descending; assign each to the currently-lightest day
     (bin-packing/LPT heuristic) so load is balanced and task order is stable.
5. If `maxDayMinutes` exceeds a comfort threshold (e.g. > 300 min/day) →
   `warnings += "Time is tight…"` (Req 5.4) but still return the best-effort plan.
6. Produce `PlanDayEntry[]` with ISO dates and friendly labels.

Deterministic and fully unit-testable (no AI, no network).

---

## Progress & Storage Logic

- `src/lib/progress.ts`: `assignmentProgress(a)` = completedTasks / totalTasks (0 if none).
  Aggregate helpers compute dashboard totals and overdue flags
  (`isOverdue(a, today)` = `dueDate < today && progress < 100`).
- `src/lib/storage.ts`: `loadState()` reads versioned key, safe-parses, validates shape,
  returns empty valid state on failure (Req 3.5 / 8.3). `saveState(state)` writes with
  `STORAGE_VERSION`. Debounced writes via the hook. CRUD helpers operate immutably.
- `src/hooks/useAssignments.ts`: owns in-memory state, exposes
  `add/update/remove/toggleTask/addTask/editTask/deleteTask`, persists on change.

---

## Components and Interfaces

```
App.tsx                  // view state: 'dashboard' | 'decoder' | 'detail'; holds useAssignments
├─ layout/Shell          // sidebar/topbar nav, responsive
├─ dashboard/Dashboard
│   ├─ StatsOverview      // aggregate progress, counts
│   ├─ UpcomingDeadlines  // sorted by due date, overdue flagged
│   └─ AssignmentCard[]   // title, course, due, progress ring/bar
├─ decoder/Decoder
│   ├─ InstructionsForm   // textarea + course + dueDate + "Load sample" + submit
│   ├─ DecodeResult       // requirements (explicit vs suggested) + task preview
│   └─ states: Loading / Error (with sample fallback)
├─ detail/AssignmentDetail
│   ├─ tasks/TaskList → TaskItem (toggle/edit/delete) + AddTaskForm
│   ├─ ProgressBar
│   └─ planner/StudyPlanner → PlanDay[] + regenerate + warnings
└─ ui/{Button,Card,Badge,ProgressBar,Modal,EmptyState,Spinner,ErrorState}
```

Explicit vs suggested items rendered with distinct `Badge` styles (Req 1.4). Sample
content shows a prominent "Sample" badge (Req 7.3).

---

## Error Handling

- **Client (`lib/api.ts`)**: wraps fetch; maps non-200 bodies to typed errors; network
  failure → `upstream_error`. Decoder view renders a friendly message per error type
  and always offers "Load sample" as a fallback (Req 7.4).
- **Server**: try/catch around parse + fetch + validate; always returns the typed JSON
  error shape; never leaks stack traces or the key.
- **Storage**: all reads guarded; corrupt data resets to empty state.
- **Scheduler**: pure, total function — handles 0 tasks, no due date, past due date.

---

## Testing Strategy

Unit tests for pure logic only (keep MVP fast):
- `scheduler.test.ts`: normal distribution, due today, past due, tight time, no due date,
  no tasks.
- `progress.test.ts`: 0 tasks, partial, all complete, overdue detection.
- `storage.test.ts`: round-trip serialize/parse, corrupt data → empty, version mismatch.
- `validate.test.ts`: `validateDecodeResponse` accepts valid, rejects missing fields,
  coerces/clamps estimates and sources.
- `ics.test.ts`: valid VCALENDAR structure, CRLF endings, chosen start time, minimum
  event length, text escaping, and graceful null results for unscheduled/empty plans.

No component/E2E tests required for the MVP (manual demo verification instead).

---

## Correctness Properties

Invariants the implementation must uphold (enforced in code and covered by tests):

- **Key secrecy:** the Gemini API key is only ever read server-side from
  `process.env.GEMINI_API_KEY`; it never appears in any client bundle or response.
- **No fabricated due dates:** the system never invents a `dueDate`. A due date is only
  ever the value the user supplied; the AI is instructed not to produce one.
- **Explicit vs. suggested is preserved:** every requirement/task has a `source` of
  `explicit` or `suggested`; unknown values from the model are coerced to `suggested`,
  never silently promoted to `explicit`.
- **Validated AI output:** decoded responses are schema-checked and normalized —
  strings trimmed, `estimateMinutes` clamped to 5–1440, lists capped, and a response
  with no usable tasks rejected.
- **Progress bounds:** assignment progress is always an integer in [0, 100], and is 0
  when there are no tasks.
- **Scheduler totality:** `generatePlan` always returns a valid plan without throwing,
  for every input — zero tasks, no due date, due today, and past-due deadlines.
- **Storage resilience:** loading persisted state never throws; corrupt or
  version-mismatched data resets to a valid empty state.
- **Calendar export fidelity:** generated `.ics` is valid RFC 5545 (CRLF endings,
  escaped text), uses only the user-chosen start time (never an invented time), and
  returns a typed "nothing to export" result for unscheduled or empty plans.

---

## Configuration & Deployment

- Env: `GEMINI_API_KEY` (required, server-side), `GEMINI_MODEL` (optional, defaults to
  `gemini-flash-lite-latest`).
- `vercel.json`: ensures `/api/*` runs as functions; SPA fallback to `index.html`.
- Local dev: `vercel dev` runs SPA + function together; `.env.local` supplies the key.
- Deploy: push to GitHub → import in Vercel → set `GEMINI_API_KEY` in project env → deploy.
- `.kiro/` is committed; `.env*` remains gitignored.

---

## Traceability (requirements → design)

| Requirement | Addressed by |
|---|---|
| 1 Decoder | API Contract, Gemini Prompt Design, Component Architecture (Decoder) |
| 2 Secure backend | API Contract (server flow), Gemini Prompt Design, Configuration & Deployment |
| 3 Task mgmt | Progress & Storage Logic, Component Architecture (tasks) |
| 4 Dashboard | Component Architecture (dashboard), Progress & Storage Logic (overdue/aggregate) |
| 5 Study planner | Study Planner Algorithm, Component Architecture (planner) |
| 6 UI/UX states | Component Architecture, Error Handling Strategy |
| 7 Sample fallback | Data Models (isSample), Error Handling Strategy (client fallback), lib/sample.ts |
| 8 Persistence/privacy | Progress & Storage Logic, Configuration & Deployment |
