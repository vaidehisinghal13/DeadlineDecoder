# How Kiro Was Used

Deadline Decoder was built **entirely inside Kiro**, which was the only IDE used for
the project — specification, steering, implementation, debugging, feature iteration,
and verification all happened through Kiro. This document describes how, with evidence
from the committed `.kiro/` directory and the project's git history.

## 1. Spec-driven development

Rather than jumping straight to code, the project began as a spec in
`.kiro/specs/deadline-decoder/`, authored and **reviewed before any application code
existed**:

1. **`requirements.md`** — eight requirements written as user stories with EARS-style
   acceptance criteria (WHEN/IF … THE SYSTEM SHALL …). They pinned down what "done"
   meant for the decoder, secure backend, task management, dashboard, study planner,
   UI/UX states, the sample fallback, and persistence/privacy, plus non-functional
   requirements.
2. **`design.md`** — the technical design: an architecture diagram, data models, the
   `/api/decode` contract and its typed error codes, the Gemini prompt rules, the
   deterministic scheduler algorithm, the storage strategy, the component tree, a
   testing plan, and a requirements → design traceability table.
3. **`tasks.md`** — a staged implementation plan (Stage 0 scaffold through Stage 11
   verification) where each task references the requirements it satisfies, sequenced so
   a working end-to-end MVP lands as early as possible.

Implementation did not begin until these documents were reviewed and approved. This
caught design questions early — most importantly, confirming that the study planner
should be deterministic and local rather than AI-generated, and that the Gemini model
choice needed real verification rather than an assumed default.

## 2. Steering files

`.kiro/steering/` holds always-included guidance that kept the implementation
consistent as it grew:

- **`product.md`** — the product's purpose, MVP priority order, and non-negotiable
  principles (honest AI output, always-demoable, graceful degradation).
- **`tech.md`** — the stack, the hard security rule that the Gemini key is server-side
  only and must never appear in the client bundle, error-handling conventions, code
  conventions, and the testing approach.
- **`structure.md`** — the directory layout, the layering rule (pure `src/lib/` vs.
  React components vs. the self-contained serverless function), and naming conventions.

Because steering is always in context, decisions like "keep the Gemini key server-side
only" and "keep domain logic in pure, testable functions" were applied uniformly across
every file instead of being re-litigated per component.

## 3. Research with web tools

Kiro's web search was used to verify a time-sensitive fact that a model's training data
can get wrong: which Gemini Flash models are currently available. This research informed
the model choice and is reflected in the design and steering docs, along with a
documented `ListModels` command so any user can check their own key. (As described in
section 5, the first chosen default later proved unavailable for new keys in a live
test, which is exactly why the docs now stress verifying with a real request.)

## 4. Iterative, verified implementation

The build proceeded through the spec's stages, each verified before moving on:

- Scaffold and tooling, verified with `typecheck` and `build`.
- Shared types and the pure `src/lib/` modules (scheduler, progress, storage,
  validation, sample), written alongside their Vitest tests.
- The serverless Gemini function (`api/decode.ts`).
- The client API wrapper, the `useAssignments` state hook, the UI primitives, and the
  four feature areas (dashboard, decoder, task management, study planner).

At each checkpoint Kiro ran the project's own commands (`typecheck`, `lint`, `test`,
`build`) and fixed any failures before continuing, so "it builds and the tests pass"
was continuously true rather than asserted only at the end.

## 5. Debugging and iteration — the Gemini 404

After deployment, live decoding on Vercel failed with **"The AI service returned an
error (404)."** Kiro was used to investigate methodically rather than guess:

1. Inspected `api/decode.ts` to confirm the endpoint, API version (`v1beta`), and model
   name, and reasoned that the 404 originated from **Gemini** — the message only appears
   on a non-OK upstream response — not from the Vercel route.
2. Called the Gemini **ListModels** API with the project's key (never printed) and found
   the then-default model still appeared in the list.
3. Found the true cause: a real `generateContent` call returned a structured 404 stating
   the model was **"no longer available to new users."** Being listed did not mean it
   worked for generation.
4. Probed the generation endpoint across available models to find ones returning HTTP
   200, and chose the stable alias **`gemini-flash-lite-latest`** (verified working) as
   the new default, kept overridable via the `GEMINI_MODEL` environment variable.
5. Improved error handling so a 404 now returns a typed `model_unavailable` error with an
   actionable message (surfacing Gemini's own text) instead of a bare "(404)", and
   updated the README/steering/design docs with a two-step check: list models, then
   confirm one actually works with a real request.

The fix was verified with typecheck, lint, tests, and build before being committed.

## 6. Feature iteration — calendar export

Calendar export was added **after** the MVP was complete, as a deliberately isolated
enhancement. Working through Kiro, the change:

- Added a new pure module, `src/lib/ics.ts`, that builds a valid RFC 5545 `.ics` file
  client-side (no OAuth, no external API), plus `src/__tests__/ics.test.ts`.
- Wired a start-time picker and an "Export to Calendar" button into the existing study
  planner component **without refactoring unrelated components**.
- Preserved existing behavior: the prior test suite continued to pass alongside the 16
  new calendar tests, confirming no regression.

## 7. Testing and verification

The repository has five Vitest suites under `src/__tests__/`. The latest verified run
reported **52 tests passing across 5 files**:

- `validate.test.ts` — decoder response validation/normalization and request validation.
- `progress.test.ts` — progress percentages, overdue detection, aggregate stats.
- `scheduler.test.ts` — distribution, due-today, past-due, tight-time, no-due-date,
  load balancing, completion.
- `storage.test.ts` — serialize/parse round-trip, corruption, version mismatch.
- `ics.test.ts` — VCALENDAR structure, CRLF endings, chosen start time, minimum event
  length, text escaping, and graceful null results.

`npm run typecheck`, `npm run lint`, and `npm run build` also pass. These automated
checks cover the pure logic; **React components and full end-to-end flows were verified
manually** against the demo scenario (decode → save → track → plan → export, plus the
sample fallback). That boundary between automated and manual verification is intentional
for a one-day MVP.

## 8. What this workflow produced

- A committed `.kiro/` directory documenting the requirements, design, and tasks that
  drove the build, so the *why* behind the code is preserved.
- Code that maps back to specific acceptance criteria via the design's traceability
  table.
- A consistent architecture, because the steering rules were enforced throughout rather
  than applied ad hoc.

The point is not that Kiro generated code quickly — it is that one tool carried the
project across its entire lifecycle, from the spec that prevented design mistakes to the
live-evidence debugging that fixed a real production error.
