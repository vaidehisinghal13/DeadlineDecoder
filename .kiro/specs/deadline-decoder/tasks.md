# Implementation Plan

Tasks are ordered to reach a working end-to-end MVP as early as possible, then layer
polish. Each task is small and testable. Requirement references point back to
`requirements.md`. Check off items as they are completed.

---

## Stage 0 — Project scaffold & tooling

- [x] 0.1 Initialize project config: `package.json` with scripts (`dev`, `build`,
  `preview`, `test`, `lint`, `typecheck`) and dependencies (react, react-dom,
  vite, typescript, tailwindcss, postcss, autoprefixer, lucide-react, vitest,
  @vitejs/plugin-react, @types/*).
- [x] 0.2 Add `vite.config.ts`, `tsconfig.json` (strict), `tailwind.config.js`,
  `postcss.config.js`, `index.html`, `src/main.tsx`, `src/index.css` (Tailwind
  directives + base theme), `vercel.json` (functions + SPA fallback).
- [x] 0.3 Verify dev toolchain: `npm install`, `npm run typecheck`, `npm run build`
  succeed on an empty app shell.
  - _Requirements: NFR simplicity; Tech steering._

## Stage 1 — Shared types & pure domain logic (test-first where cheap)

- [x] 1.1 `src/types/index.ts`: `Requirement`, `Task`, `Assignment`, `StudyPlan`,
  `PlanDayEntry`, `PersistedState`, `RequirementSource`, decode request/response types,
  typed `DecodeError`. _(Req 1,2,3,5,8)_
- [x] 1.2 `src/lib/progress.ts`: `assignmentProgress`, aggregate totals, `isOverdue`.
  Add `progress.test.ts`. _(Req 3.3, 4.3, 4.4)_
- [x] 1.3 `src/lib/scheduler.ts`: `generatePlan` with greedy LPT distribution, handling
  no-due-date, due-today, past-due, tight-time. Add `scheduler.test.ts`. _(Req 5.1–5.6)_
- [x] 1.4 `src/lib/storage.ts`: versioned load/save, safe parse, CRUD helpers.
  Add `storage.test.ts`. _(Req 3.1,3.4,3.5, 8.1,8.3,8.4)_
- [x] 1.5 `src/lib/validate.ts`: `validateDecodeResponse` (shape check + clamp/coerce),
  shared by server and tests. Add `validate.test.ts`. _(Req 2.3)_
- [x] 1.6 `src/lib/sample.ts`: labeled sample instructions + precomputed decode result
  (`isSample: true`). _(Req 7.1–7.3)_
- [x] 1.7 Run `npm run test` — all lib tests pass.

## Stage 2 — Serverless Gemini backend

- [x] 2.1 `api/decode.ts`: method guard, body validation, missing-key guard, build
  prompt, call Gemini with JSON mime type, parse + `validateDecodeResponse`, normalize,
  typed error mapping (400/429/500/502). _(Req 2.1–2.6, 1.5)_
- [x] 2.2 Confirm key is read from `process.env.GEMINI_API_KEY` only; no client exposure.
- [x] 2.3 Manual test via `vercel dev`: valid request returns schema-valid JSON;
  empty instructions → 400; (simulate) missing key → `server_misconfigured`.
  _(Req 2.2, 2.5)_

## Stage 3 — App state & client API wrapper

- [x] 3.1 `src/lib/api.ts`: `decodeAssignment(input)` → typed result or `DecodeError`;
  maps non-200 + network failures. _(Req 2.4, 6.3, 7.4)_
- [x] 3.2 `src/hooks/useAssignments.ts`: load on mount, in-memory state, persist on
  change (debounced), expose assignment + task CRUD + toggle. _(Req 3.1–3.4, 8)_
- [x] 3.3 `src/App.tsx`: view-state shell (`dashboard | decoder | detail`), wire hook.

## Stage 4 — UI primitives & layout

- [x] 4.1 `src/components/ui/`: `Button`, `Card`, `Badge`, `ProgressBar`, `Spinner`,
  `EmptyState`, `ErrorState`, `Modal`. Tailwind-styled, accessible. _(Req 6.1,6.3,6.4)_
- [x] 4.2 `src/components/layout/Shell.tsx`: responsive sidebar/topbar nav between
  Dashboard and Decoder. _(Req 6.2, 6.5)_

## Stage 5 — Decoder (first end-to-end slice)

- [x] 5.1 `decoder/InstructionsForm`: textarea + course + dueDate + char cap + submit
  disabled when empty + "Load sample" action. _(Req 1.1,1.7,1.8, 7.1)_
- [x] 5.2 `decoder/DecodeResult`: render title, requirements with explicit-vs-suggested
  badges, task preview with estimates; "Save assignment" action. _(Req 1.3,1.4,1.6)_
- [x] 5.3 Loading + error states; on error offer sample fallback; sample path uses
  `lib/sample.ts` without calling Gemini. _(Req 6.3, 7.2–7.4)_
- [x] 5.4 Manual check: paste → decode → save → appears in state. (MVP vertical slice.)

## Stage 6 — Assignment detail: tasks + progress

- [x] 6.1 `detail/AssignmentDetail` with header (title/course/due/overdue badge) and
  `ProgressBar`. _(Req 4.6, 3.3)_
- [x] 6.2 `tasks/TaskList` + `TaskItem`: toggle complete, edit title/estimate, delete.
  _(Req 3.1,3.2)_
- [x] 6.3 `tasks/AddTaskForm`: add task (title + estimate). Progress recalcs live.
  _(Req 3.2,3.3)_
- [x] 6.4 Delete assignment action removes it + its data. _(Req 4.6, 8.4)_

## Stage 7 — Dashboard

- [x] 7.1 `dashboard/Dashboard`: assignment cards (title, course, due, progress).
  _(Req 4.1)_
- [x] 7.2 `dashboard/StatsOverview` (aggregate progress/counts) +
  `UpcomingDeadlines` (sorted, overdue flagged). _(Req 4.2,4.3,4.4)_
- [x] 7.3 Empty state guiding to Decoder/sample. _(Req 4.5, 6.4)_

## Stage 8 — Study Planner

- [x] 8.1 `planner/StudyPlanner`: render `generatePlan` output as per-day groupings;
  show warnings (overdue / tight time); checklist mode when no due date. _(Req 5.1–5.6)_
- [x] 8.2 "Regenerate plan" reflecting only incomplete tasks. _(Req 5.5)_

## Stage 9 — Polish & states

- [x] 9.1 Subtle transitions/animations; responsive passes on mobile + desktop.
  _(Req 6.2, 6.6)_
- [x] 9.2 Consistent empty/loading/error states across all views; accessibility pass
  (labels, focus, contrast). _(Req 6.3,6.4; NFR accessibility)_

## Stage 10 — Documentation

- [x] 10.1 `README.md`: overview, setup, local dev (`vercel dev`), env vars, testing,
  build, Vercel deployment.
- [x] 10.2 `docs/architecture.md`: components, data flow, models, API contract, decisions.
- [x] 10.3 `docs/kiro-usage.md`: spec workflow, steering, chat-driven development.
- [x] 10.4 `docs/writeup.md`: overview, design decisions, Kiro usage, learnings, future work.

## Stage 11 — Verification

- [x] 11.1 `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all pass.
- [x] 11.2 End-to-end manual demo: sample load → tasks → progress → plan; live decode
  (if key available); overdue + no-due-date cases behave gracefully.
- [x] 11.3 Confirm `.kiro/` committed and `.env*` not committed; remove temp files.

## Stage 12 — Calendar export (post-MVP enhancement)

Added after the MVP was complete and verified, as an isolated feature without
refactoring unrelated components.

- [x] 12.1 `src/lib/ics.ts`: pure, client-side RFC 5545 `.ics` generator from a study
  plan + user-chosen daily start time (default 18:00); never invents times; handles
  no-due-date and no-scheduled-tasks by returning a typed "nothing to export" reason.
  No OAuth, no external API. _(extends Req 5)_
- [x] 12.2 `src/__tests__/ics.test.ts`: VCALENDAR structure, CRLF endings, chosen start
  time, minimum event length, text escaping, and the null-result paths.
- [x] 12.3 Wire a start-time picker + "Export to Calendar" button into
  `planner/StudyPlanner.tsx`; download via Blob. Existing functionality preserved.

---

### Priority note
Stages 0–5 deliver a working end-to-end MVP (scaffold → logic → backend → decode →
save). Stages 6–8 complete the core features. Stages 9–11 are polish, docs, and
verification. Stage 12 (calendar export) was added after the MVP shipped. If time runs
short, Stage 9 polish is the first place to trim.

---

### Status
All tasks above are complete. The application was built, verified (typecheck, lint,
52 passing unit tests, and a production build), and deployed to Vercel. A later fix
also replaced the default Gemini model with the stable alias `gemini-flash-lite-latest`
after a live 404 was traced to a retired model (see `docs/kiro-usage.md`).
