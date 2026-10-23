# Deadline Decoder — Technical Write-Up

**From Overwhelming Assignments to Actionable Plans.**

---

## 1. Project Overview

### The problem

College students regularly receive assignment descriptions that are long and dense.
A single prompt can bury technical requirements, a list of deliverables, grading
criteria, and one or more deadlines inside several paragraphs of prose. Most students
are juggling several courses at once, on top of jobs, clubs, and life outside school.

Turning that wall of text into a concrete plan is slow and easy to get wrong. A
requirement mentioned in passing — "submit a one-paragraph proposal first," "use at
least six peer-reviewed sources" — is easy to miss on a first read. And even when the
requirements are clear, students routinely underestimate how long the work will
actually take, which is how a two-week assignment becomes a frantic final night.

### The solution

Deadline Decoder turns that prompt into a plan.

- A student pastes the assignment instructions (optionally adding a course name and a
  due date).
- Google's Gemini model reads the instructions and returns a structured breakdown:
  the requirements it found, and a checklist of actionable tasks, each with an
  estimated duration.
- The app **clearly separates requirements that were explicitly stated in the
  instructions from tasks and suggestions the AI generated**, so the student always
  knows which is which.
- The student saves the assignment, checks tasks off as they go, and watches progress
  update automatically.
- From the saved tasks and the due date, the app generates a **personalized day-by-day
  study plan**.
- That plan can be **exported as a standard `.ics` calendar file**, importable into
  Google Calendar, Apple Calendar, or Outlook.
- All data is stored locally in the browser. There are no accounts to create and no
  database to sign in to.

### Why it matters

Deadline Decoder is built around a problem its author actually lives with as a
student. It does not try to do the assignment; it removes the friction between
*receiving* an assignment and *starting* it.

- It makes complicated academic requirements easier to parse at a glance.
- It cuts down the manual effort of translating instructions into a task list.
- By turning a deadline into a day-by-day plan, it nudges students toward starting
  early instead of cramming.
- Because it needs no account and no setup beyond pasting text, it stays approachable
  for someone who just wants help organizing one assignment.

The goal is modest and honest: make academic planning a little more accessible, and
help students see the shape of their work before the deadline instead of after.

---

## 2. Design Decisions

### Technology stack

| Layer | Choice | Role |
|---|---|---|
| Frontend | React 18 + TypeScript + Vite | SPA, type safety, fast builds |
| Styling | Tailwind CSS + lucide-react | Hand-built, consistent UI |
| AI | Google Gemini API | Natural-language assignment decoding |
| Backend | Vercel serverless function (`/api/decode`) | Secure proxy for Gemini |
| Persistence | Browser `localStorage` | Account-free local storage |
| Testing | Vitest | Unit tests for pure logic |

Each architectural decision below is presented with its tradeoffs, not just its
benefits.

### Secure AI integration

All Gemini requests go through a single serverless function (`api/decode.ts`). The
browser calls `POST /api/decode`; the function reads the API key from the server-side
`GEMINI_API_KEY` environment variable, builds the prompt, calls Gemini, validates the
response, and returns a clean result. The frontend never receives or sees the key.

The function validates the incoming request (a non-empty `instructions` string, capped
at 12,000 characters, with optional `course` and `dueDate`) before spending an API
call, and validates Gemini's JSON before trusting it. Failures are mapped to a
consistent, typed error shape (`{ error, message }`) so the UI can respond predictably.

**Tradeoff:** the serverless hop adds a small amount of latency and means live
decoding requires the backend to be running (handled locally by `vercel dev`). That
cost is acceptable because the alternative — shipping the key to the browser — is a
non-starter.

### Deterministic study planner

The split of responsibilities is deliberate: **Gemini handles natural-language
interpretation; a conventional algorithm handles scheduling.**

The scheduler (`src/lib/scheduler.ts`) is a pure function. It collects the assignment's
incomplete tasks and distributes them across the days remaining until the due date
using a **greedy longest-processing-time-first heuristic**: tasks are sorted by
estimated duration (largest first) and each is placed on whichever day currently has
the lightest load. This balances daily effort and front-loads the heavier work, which
is the safer bias when a deadline is involved.

Edge cases are handled explicitly rather than left to chance:

- **No due date:** the plan becomes an unscheduled checklist, with a note that a due
  date is needed for a day-by-day schedule.
- **Overdue (due date in the past):** every remaining task is placed on "today" with a
  clear warning to complete the work as soon as possible, instead of producing an
  impossible past-dated schedule.
- **Not enough time:** if the busiest day exceeds a comfort threshold (300 minutes),
  the plan still generates but adds a "time is tight" warning.

Keeping this logic out of the model makes it **predictable, instant, free, offline-
capable, and unit-testable**. It also reduces dependence on the Gemini API: once an
assignment is decoded, planning never needs another API call.

**Tradeoff:** a heuristic scheduler does not account for real-world nuance — a student's
other commitments, energy levels, or which days are busy. It treats every available day
as equally usable. A future version could let students mark unavailable days; for the
MVP, a transparent, balanced default is more valuable than a clever but opaque one.

### Responsible AI design

A study tool that blurs "the professor required this" with "the AI guessed this" would
be worse than no tool at all. Several decisions follow from that principle:

- **Explicit vs. suggested.** Every requirement and task carries a `source` of
  `explicit` or `suggested`. The prompt instructs the model to mark an item `explicit`
  only when it is directly stated in the instructions, the backend re-validates and
  defaults unknown values to `suggested`, and the UI renders the two with distinct
  badges.
- **No fabricated deadlines.** The prompt explicitly forbids inventing a due date, and
  the app never derives one. The due date is only ever what the student entered.
- **Estimates are approximations.** Task durations are presented as estimates, and are
  clamped to a sane range (5–1,440 minutes) so a malformed response cannot produce
  absurd values.
- **Validated JSON.** Even with Gemini's JSON response mode, the backend assumes the
  output may be imperfect: it strips stray markdown code fences, parses defensively,
  coerces enums, trims and caps lists, and rejects a response with no usable tasks.
- **Verify against the source.** The original instructions are kept with the saved
  assignment, and the app is framed as an aid — students should confirm the extracted
  requirements against the real prompt.

**Tradeoff:** marking items conservatively as `suggested` sometimes labels a reasonable
inference as "AI suggestion" rather than a firm requirement. Erring toward
under-claiming is the right default for a tool students rely on.

### Simple architecture

The MVP deliberately avoids infrastructure it does not need:

- **`localStorage`, not a database.** Assignments, tasks, and progress persist in the
  browser under a versioned key, with safe parsing that resets to an empty state on
  corrupt or version-mismatched data. *Tradeoff:* data lives on one device/browser and
  does not sync — an acceptable limit for a single-user planning tool, and an obvious
  future upgrade.
- **No authentication.** No accounts or OAuth for the MVP. *Tradeoff:* no cross-device
  use, but zero signup friction and no credentials to secure.
- **Simple view-state navigation, not a router.** Three views (dashboard, decoder,
  detail) are switched with React state in `App.tsx` rather than a routing dependency.
  *Tradeoff:* no deep-linkable URLs, in exchange for one fewer dependency.
- **Reusable components and separated logic.** UI primitives live in
  `src/components/ui/`, and all domain math (scheduling, progress, storage, validation,
  calendar generation) lives in pure modules under `src/lib/` with no React imports.
  This keeps components thin and the tricky logic testable.
- **Sample assignment fallback.** A clearly labeled sample assignment produces a
  complete decode result without calling Gemini, so the full flow is demonstrable even
  if the API key is missing or the service is unavailable — a reliability safeguard
  that matters for a live demo.

### Calendar export

The study plan exports as a standard `.ics` (iCalendar / RFC 5545) file, generated
**entirely in the browser** (`src/lib/ics.ts`) and downloaded via a Blob. There is no
calendar API call and no OAuth.

OAuth was unnecessary because the goal is a one-way export, not account access. A
portable `.ics` file imports into Google, Apple, and Outlook Calendar alike, keeps the
app private and server-light, and sidesteps the complexity and consent scope of
calendar APIs.

Because the planner stores **dates only, not times**, the generator never invents a
time: the student picks a daily start time (a clearly labeled default of 18:00), and
each day's event length comes from that day's total estimated minutes, with a 30-minute
minimum so short days still produce a visible block. Events include the assignment
title and that day's task list.

**Tradeoff:** the export is a **snapshot, not live synchronization.** If the plan
changes later (tasks completed, edited, or regenerated), the student must export again;
previously imported events will not update themselves. For an MVP this is the honest and
simple behavior, and live sync is noted as future work.

---

## 3. How Kiro Was Used

Kiro was the only IDE used to build Deadline Decoder, and it was used across the whole
development lifecycle — specification, steering, implementation, debugging, iteration,
and verification — not merely to generate code. The evidence lives in the committed
`.kiro/` directory and the project's git history.

### Spec-driven development

Development began with a spec, authored and **reviewed before any application code was
written**, in `.kiro/specs/deadline-decoder/`:

- **`requirements.md`** — eight requirements written as user stories with EARS-style
  acceptance criteria (WHEN/IF … THE SYSTEM SHALL …), covering the decoder, secure
  backend, task management, dashboard, study planner, UI/UX states, the sample
  fallback, and persistence/privacy, plus non-functional requirements.
- **`design.md`** — the technical design: an architecture diagram, data models, the
  `/api/decode` contract with its typed error codes, the Gemini prompt rules, the
  deterministic scheduler algorithm, the storage strategy, the component tree, a
  testing plan, and a requirements → design traceability table.
- **`tasks.md`** — a staged implementation plan (Stage 0 scaffold through Stage 11
  verification), where each task references the requirements it satisfies and the
  stages are ordered so a working end-to-end MVP lands early.

Writing the spec first surfaced decisions that would have been costly to discover
mid-implementation — most notably that the study planner should be deterministic and
local rather than AI-generated, and that the Gemini model choice needed to be verified
against current availability rather than assumed.

### Steering files

Three always-included steering files in `.kiro/steering/` kept the implementation
aligned with the plan as it grew:

- **`product.md`** — the product's purpose, MVP feature priority order, and
  non-negotiable principles (honest AI output, always-demoable, graceful degradation).
- **`tech.md`** — the stack, the hard rule that the Gemini key is server-side only and
  must never reach the client bundle, error-handling conventions, and the testing
  approach.
- **`structure.md`** — the directory layout, the layering rule that `src/lib/` stays
  pure while the serverless function is self-contained, and naming conventions.

Because steering is always in context, cross-cutting rules — "the key never reaches the
browser," "domain logic stays in pure, testable functions" — were applied consistently
across every file instead of being re-decided per component.

### Application implementation

Kiro generated the application following the staged tasks: the Vite/React/TypeScript
scaffold; the shared types and pure logic modules; the serverless Gemini integration;
and the UI — the dashboard (assignment cards, aggregate stats, upcoming deadlines), the
decoder (paste form, result with explicit-vs-suggested badges, sample fallback), task
management (toggle/add/edit/delete with live progress), and the study planner. The
`localStorage` persistence layer and, later, the calendar export were built the same
way. Each stage was verified before the next began.

### Debugging and iteration — the Gemini 404

The most instructive moment came after deployment. Live decoding on Vercel failed with
**"The AI service returned an error (404)."** Kiro was used to investigate rather than
guess:

1. It inspected `api/decode.ts` to confirm the endpoint, API version (`v1beta`), and
   model name, and reasoned that the 404 came from Gemini (the message only appears on a
   non-OK upstream response) rather than from the Vercel route.
2. It queried the Gemini ListModels API with the project's key (never printed) and found
   that the then-default model still *appeared* in the list.
3. Crucially, a real `generateContent` call returned a structured 404 whose message
   stated the model was **"no longer available to new users"** — the actual root cause.
   A model being listed did not guarantee it worked for generation.
4. Kiro then probed the generation endpoint across the available models to find ones
   that actually returned HTTP 200, and selected the stable alias
   **`gemini-flash-lite-latest`** (verified working) as the new default, kept
   overridable via `GEMINI_MODEL`.
5. It improved error handling so a 404 now returns a typed `model_unavailable` error
   with an actionable message (and surfaces Gemini's own error text) instead of a bare
   "(404)", and updated the docs with a two-step verification (list, then confirm with a
   real call).

The fix was then verified with typecheck, lint, tests, and build before being committed.

### Feature iteration — calendar export after the MVP

Calendar export was added **after** the MVP was complete, as a deliberately isolated
enhancement. Kiro added a new pure module (`src/lib/ics.ts`) and its tests, and wired a
start-time picker and "Export to Calendar" button into the existing study-planner
component — **without refactoring unrelated components.** The existing test suite
continued to pass alongside the new tests, confirming nothing regressed.

### Testing and verification

The repository contains five Vitest unit-test files under `src/__tests__/`. The latest
verified run:

```
Test Files  5 passed (5)
      Tests  52 passed (52)
```

- `validate.test.ts` (11) — decoder response validation/normalization and request
  validation.
- `progress.test.ts` (12) — progress percentages, overdue detection, aggregate stats.
- `scheduler.test.ts` (8) — task distribution, due-today, past-due, tight-time,
  no-due-date, load balancing, and completion cases.
- `storage.test.ts` (5) — serialize/parse round-trip, corruption, version mismatch.
- `ics.test.ts` (16) — valid VCALENDAR structure, CRLF line endings, chosen start time,
  minimum event length, text escaping, and the graceful null results for unscheduled or
  empty plans.

Alongside the tests, `npm run typecheck`, `npm run lint` (zero-warnings policy), and
`npm run build` all pass.

**What the tests cover:** the pure business logic, where bugs are most likely and least
visible. **What they do not cover:** React component rendering and full end-to-end
flows, which were verified **manually** against the demo scenario (decode → save → track
→ plan → export, plus the sample fallback). This distinction is intentional for a
one-day MVP: automated coverage is concentrated on the logic that is hardest to check by
eye, and the UI is validated by hand.

### Why using Kiro throughout mattered

The value was not that Kiro typed the code faster. It was that the **same tool carried
the project through its entire lifecycle** — writing the spec that caught design
problems early, enforcing steering rules that kept security and architecture consistent,
implementing in verifiable stages, and then investigating a real production bug with
live API evidence rather than speculation. The spec and steering artifacts remain in the
repository as a record of *why* the code looks the way it does.

---

## 4. Learning Journey and Thinking Forward

### What building this taught

1. **Planning before implementation reduces rework and reveals edge cases.** Writing
   acceptance criteria first forced the hard questions up front. Overdue deadlines, a
   missing due date, corrupt storage, and a missing API key all became explicit,
   designed-for branches instead of bugs discovered later.

2. **AI should be used selectively, not everywhere.** The strongest architectural
   decision was choosing *not* to use AI for scheduling. Decoding prose is a genuine
   language task; distributing tasks across days is deterministic math. Keeping the
   planner conventional made it reliable, testable, and free of API dependence.

3. **External API integrations require real-world verification.** The Gemini 404 was the
   clearest lesson of the project: a model that appeared in ListModels still returned
   "no longer available to new users" on an actual generation call. Documentation and
   training data can lag reality; only a live request confirmed what worked.

4. **AI responses must be validated and treated as potentially imperfect.** Even in JSON
   mode, the backend strips code fences, parses defensively, coerces enums, clamps
   numeric estimates, and rejects empty results — and the UI separates explicit facts
   from AI suggestions so the student is never misled.

5. **A complete end-to-end workflow beats extra features.** The priority was a working
   path from pasted instructions all the way to a saved, trackable, exportable plan,
   before anything optional. Calendar export was added only once that core loop was
   solid.

6. **Hackathon deadlines demand scope discipline.** Authentication, databases, and a
   routing layer were consciously left out. Each omission was a tradeoff made in service
   of shipping a reliable core, and each is recorded as future work rather than pretended
   away.

### Future improvements

- **Multi-assignment scheduling** that balances workload across all active courses
  rather than planning one assignment in isolation.
- **Optional accounts and cloud sync** so plans follow a student across devices.
- **Interactive drag-and-drop planning** to let students move tasks between days and
  mark unavailable days.
- **Calendar reminders and optional live synchronization**, building on the current
  one-way `.ics` snapshot (for example, per-task alarms or a true two-way sync).
- **Rubric and grading-weight analysis** to help students invest effort where the most
  points are.
- **Component and end-to-end tests** to complement the current unit coverage of the pure
  logic.
- **Accessibility and internationalization** passes beyond the current semantic-HTML
  baseline.

### Closing

Deadline Decoder is a small, focused answer to a problem its author faces every
semester. It shows that AI-assisted development works best when the AI is applied with
judgment — Gemini for language, a plain algorithm for scheduling — and when every AI
output is validated rather than trusted. Built end to end inside Kiro, with a reviewed
spec, enforced steering, and verified iteration, it turns an overwhelming assignment
prompt into an actionable, exportable plan, and keeps the student in control the whole
way through.
