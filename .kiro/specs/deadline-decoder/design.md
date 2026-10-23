# Technical Design — Deadline Decoder

## 1. Overview

Deadline Decoder is a single-page React app (Vite + TypeScript + Tailwind) with one
Vercel serverless function (`/api/decode`) that brokers calls to Google's Gemini API.
The browser never sees the Gemini key. All user data (assignments, tasks, plans) lives
in `localStorage` behind a typed storage module. Domain logic (progress math, study-plan
scheduling, AI-response validation) is implemented as pure, unit-tested functions in
`src/lib/`, separate from React components.

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

## 2. Data Models

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

## 3. API Contract — `POST /api/decode`

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
4. Build prompt (section 4) and call Gemini `generateContent` with
   `responseMimeType: application/json`.
5. On 429 from Gemini → 429 `rate_limited`. On other non-OK → 502 `upstream_error`.
6. Extract text, `JSON.parse`, then schema-validate with `validateDecodeResponse`
   (shared with a unit test). On failure → 502 `invalid_ai_response`.
7. Normalize: clamp `estimateMinutes` to a sane range (5..1440), coerce `source`
   to `explicit|suggested` (default `suggested`), trim strings, cap list sizes.
8. Return normalized `{ title, requirements, tasks }`.

### Gemini endpoint
`POST https://generativelanguage.googleapis.com/v1beta/models/<MODEL>:generateContent?key=<KEY>`
with `MODEL = gemini-2.5-flash` by default (free-tier eligible as of 2026, fast,
JSON-capable). Configurable via the `GEMINI_MODEL` env var.

> **Model availability:** `gemini-2.0-flash` is restricted to existing customers for
> new projects; new projects should use `gemini-2.5-flash` / `gemini-2.5-flash-lite`.
> To confirm what a specific key can access, call ListModels:
> `GET https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY`
> and pick a model whose `supportedGenerationMethods` includes `generateContent`.
> The README documents this check.

---

## 4. Gemini Prompt Design

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

## 5. Study Planner Algorithm (`src/lib/scheduler.ts`)

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

## 6. Progress & Storage Logic

- `src/lib/progress.ts`: `assignmentProgress(a)` = completedTasks / totalTasks (0 if none).
  Aggregate helpers compute dashboard totals and overdue flags
  (`isOverdue(a, today)` = `dueDate < today && progress < 100`).
- `src/lib/storage.ts`: `loadState()` reads versioned key, safe-parses, validates shape,
  returns empty valid state on failure (Req 3.5 / 8.3). `saveState(state)` writes with
  `STORAGE_VERSION`. Debounced writes via the hook. CRUD helpers operate immutably.
- `src/hooks/useAssignments.ts`: owns in-memory state, exposes
  `add/update/remove/toggleTask/addTask/editTask/deleteTask`, persists on change.

---

## 7. Component Architecture

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

## 8. Error Handling Strategy

- **Client (`lib/api.ts`)**: wraps fetch; maps non-200 bodies to typed errors; network
  failure → `upstream_error`. Decoder view renders a friendly message per error type
  and always offers "Load sample" as a fallback (Req 7.4).
- **Server**: try/catch around parse + fetch + validate; always returns the typed JSON
  error shape; never leaks stack traces or the key.
- **Storage**: all reads guarded; corrupt data resets to empty state.
- **Scheduler**: pure, total function — handles 0 tasks, no due date, past due date.

---

## 9. Testing Strategy (Vitest)

Unit tests for pure logic only (keep MVP fast):
- `scheduler.test.ts`: normal distribution, due today, past due, tight time, no due date,
  no tasks.
- `progress.test.ts`: 0 tasks, partial, all complete, overdue detection.
- `storage.test.ts`: round-trip serialize/parse, corrupt data → empty, version mismatch.
- `validate.test.ts`: `validateDecodeResponse` accepts valid, rejects missing fields,
  coerces/clamps estimates and sources.

No component/E2E tests required for the MVP (manual demo verification instead).

---

## 10. Configuration & Deployment

- Env: `GEMINI_API_KEY` (required, server-side), `GEMINI_MODEL` (optional, defaults to
  `gemini-2.5-flash`).
- `vercel.json`: ensures `/api/*` runs as functions; SPA fallback to `index.html`.
- Local dev: `vercel dev` runs SPA + function together; `.env.local` supplies the key.
- Deploy: push to GitHub → import in Vercel → set `GEMINI_API_KEY` in project env → deploy.
- `.kiro/` is committed; `.env*` remains gitignored.

---

## 11. Traceability (requirements → design)

| Requirement | Addressed by |
|---|---|
| 1 Decoder | §3 API, §4 prompt, §7 Decoder components |
| 2 Secure backend | §3 server flow, §4 prompt, §10 config |
| 3 Task mgmt | §6 progress/storage, §7 tasks components |
| 4 Dashboard | §7 dashboard, §6 overdue/aggregate |
| 5 Study planner | §5 scheduler algorithm, §7 planner |
| 6 UI/UX states | §7 components, §8 error handling |
| 7 Sample fallback | §2 isSample, §8 client fallback, lib/sample.ts |
| 8 Persistence/privacy | §6 storage, §10 config |
