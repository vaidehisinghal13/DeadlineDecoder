# Implementation Plan — Deadline Decoder

Tasks are ordered to reach a working end-to-end MVP as early as possible, then layer
polish. Each task is small and testable. Requirement references point back to
`requirements.md`. Check off items as they are completed.

---

## Stage 0 — Project scaffold & tooling

- [ ] 0.1 Initialize project config: `package.json` with scripts (`dev`, `build`,
  `preview`, `test`, `lint`, `typecheck`) and dependencies (react, react-dom,
  vite, typescript, tailwindcss, postcss, autoprefixer, lucide-react, vitest,
  @vitejs/plugin-react, @types/*).
- [ ] 0.2 Add `vite.config.ts`, `tsconfig.json` (strict), `tailwind.config.js`,
  `postcss.config.js`, `index.html`, `src/main.tsx`, `src/index.css` (Tailwind
  directives + base theme), `vercel.json` (functions + SPA fallback).
- [ ] 0.3 Verify dev toolchain: `npm install`, `npm run typecheck`, `npm run build`
  succeed on an empty app shell.
  - _Requirements: NFR simplicity; Tech steering._

## Stage 1 — Shared types & pure domain logic (test-first where cheap)

- [ ] 1.1 `src/types/index.ts`: `Requirement`, `Task`, `Assignment`, `StudyPlan`,
  `PlanDayEntry`, `PersistedState`, `RequirementSource`, decode request/response types,
  typed `DecodeError`. _(Req 1,2,3,5,8)_
- [ ] 1.2 `src/lib/progress.ts`: `assignmentProgress`, aggregate totals, `isOverdue`.
  Add `progress.test.ts`. _(Req 3.3, 4.3, 4.4)_
- [ ] 1.3 `src/lib/scheduler.ts`: `generatePlan` with greedy LPT distribution, handling
  no-due-date, due-today, past-due, tight-time. Add `scheduler.test.ts`. _(Req 5.1–5.6)_
- [ ] 1.4 `src/lib/storage.ts`: versioned load/save, safe parse, CRUD helpers.
  Add `storage.test.ts`. _(Req 3.1,3.4,3.5, 8.1,8.3,8.4)_
- [ ] 1.5 `src/lib/validate.ts`: `validateDecodeResponse` (shape check + clamp/coerce),
  shared by server and tests. Add `validate.test.ts`. _(Req 2.3)_
- [ ] 1.6 `src/lib/sample.ts`: labeled sample instructions + precomputed decode result
  (`isSample: true`). _(Req 7.1–7.3)_
- [ ] 1.7 Run `npm run test` — all lib tests pass.

## Stage 2 — Serverless Gemini backend

- [ ] 2.1 `api/decode.ts`: method guard, body validation, missing-key guard, build
  prompt, call Gemini with JSON mime type, parse + `validateDecodeResponse`, normalize,
  typed error mapping (400/429/500/502). _(Req 2.1–2.6, 1.5)_
- [ ] 2.2 Confirm key is read from `process.env.GEMINI_API_KEY` only; no client exposure.
- [ ] 2.3 Manual test via `vercel dev`: valid request returns schema-valid JSON;
  empty instructions → 400; (simulate) missing key → `server_misconfigured`.
  _(Req 2.2, 2.5)_

## Stage 3 — App state & client API wrapper

- [ ] 3.1 `src/lib/api.ts`: `decodeAssignment(input)` → typed result or `DecodeError`;
  maps non-200 + network failures. _(Req 2.4, 6.3, 7.4)_
- [ ] 3.2 `src/hooks/useAssignments.ts`: load on mount, in-memory state, persist on
  change (debounced), expose assignment + task CRUD + toggle. _(Req 3.1–3.4, 8)_
- [ ] 3.3 `src/App.tsx`: view-state shell (`dashboard | decoder | detail`), wire hook.

## Stage 4 — UI primitives & layout

- [ ] 4.1 `src/components/ui/`: `Button`, `Card`, `Badge`, `ProgressBar`, `Spinner`,
  `EmptyState`, `ErrorState`, `Modal`. Tailwind-styled, accessible. _(Req 6.1,6.3,6.4)_
- [ ] 4.2 `src/components/layout/Shell.tsx`: responsive sidebar/topbar nav between
  Dashboard and Decoder. _(Req 6.2, 6.5)_

## Stage 5 — Decoder (first end-to-end slice)

- [ ] 5.1 `decoder/InstructionsForm`: textarea + course + dueDate + char cap + submit
  disabled when empty + "Load sample" action. _(Req 1.1,1.7,1.8, 7.1)_
- [ ] 5.2 `decoder/DecodeResult`: render title, requirements with explicit-vs-suggested
  badges, task preview with estimates; "Save assignment" action. _(Req 1.3,1.4,1.6)_
- [ ] 5.3 Loading + error states; on error offer sample fallback; sample path uses
  `lib/sample.ts` without calling Gemini. _(Req 6.3, 7.2–7.4)_
- [ ] 5.4 Manual check: paste → decode → save → appears in state. (MVP vertical slice.)

## Stage 6 — Assignment detail: tasks + progress

- [ ] 6.1 `detail/AssignmentDetail` with header (title/course/due/overdue badge) and
  `ProgressBar`. _(Req 4.6, 3.3)_
- [ ] 6.2 `tasks/TaskList` + `TaskItem`: toggle complete, edit title/estimate, delete.
  _(Req 3.1,3.2)_
- [ ] 6.3 `tasks/AddTaskForm`: add task (title + estimate). Progress recalcs live.
  _(Req 3.2,3.3)_
- [ ] 6.4 Delete assignment action removes it + its data. _(Req 4.6, 8.4)_

## Stage 7 — Dashboard

- [ ] 7.1 `dashboard/Dashboard`: assignment cards (title, course, due, progress).
  _(Req 4.1)_
- [ ] 7.2 `dashboard/StatsOverview` (aggregate progress/counts) +
  `UpcomingDeadlines` (sorted, overdue flagged). _(Req 4.2,4.3,4.4)_
- [ ] 7.3 Empty state guiding to Decoder/sample. _(Req 4.5, 6.4)_

## Stage 8 — Study Planner

- [ ] 8.1 `planner/StudyPlanner`: render `generatePlan` output as per-day groupings;
  show warnings (overdue / tight time); checklist mode when no due date. _(Req 5.1–5.6)_
- [ ] 8.2 "Regenerate plan" reflecting only incomplete tasks. _(Req 5.5)_

## Stage 9 — Polish & states

- [ ] 9.1 Subtle transitions/animations; responsive passes on mobile + desktop.
  _(Req 6.2, 6.6)_
- [ ] 9.2 Consistent empty/loading/error states across all views; accessibility pass
  (labels, focus, contrast). _(Req 6.3,6.4; NFR accessibility)_

## Stage 10 — Documentation

- [ ] 10.1 `README.md`: overview, setup, local dev (`vercel dev`), env vars, testing,
  build, Vercel deployment.
- [ ] 10.2 `docs/architecture.md`: components, data flow, models, API contract, decisions.
- [ ] 10.3 `docs/kiro-usage.md`: spec workflow, steering, chat-driven development.
- [ ] 10.4 `docs/writeup.md`: overview, design decisions, Kiro usage, learnings, future work.

## Stage 11 — Verification

- [ ] 11.1 `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all pass.
- [ ] 11.2 End-to-end manual demo: sample load → tasks → progress → plan; live decode
  (if key available); overdue + no-due-date cases behave gracefully.
- [ ] 11.3 Confirm `.kiro/` committed and `.env*` not committed; remove temp files.

---

### Priority note
Stages 0–5 deliver a working end-to-end MVP (scaffold → logic → backend → decode →
save). Stages 6–8 complete the core features. Stages 9–11 are polish, docs, and
verification. If time runs short, Stage 9 polish is the first place to trim.
