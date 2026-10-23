# Technical Write-Up — Deadline Decoder

## Project overview

Deadline Decoder is an AI-powered academic productivity web app. College students
paste a long assignment prompt and get back three things: the extracted requirements
(clearly split into what the instructions actually say versus what the AI suggests), a
checklist of actionable tasks with time estimates, and a day-by-day study plan that
spreads the remaining work across the time before the deadline.

The problem it addresses is real and narrow: assignment prompts are dense, and
manually turning them into a plan is tedious and error-prone. Students miss buried
requirements and underestimate how long work will take. Deadline Decoder does the
parsing and the scheduling so the student can focus on the work itself.

The MVP has no accounts and no database — everything is stored in the browser's
localStorage — which keeps it private, simple, and fast to ship.

## Design decisions

**A serverless proxy, not direct AI calls.** The Gemini key must never reach the
browser, so every AI call goes through a single Vercel function, `POST /api/decode`.
It validates the request, builds the prompt, calls Gemini asking for strict JSON,
validates and normalizes the response, and returns a typed error on any failure. This
keeps the key server-side and gives the client a predictable contract.

**The planner is deterministic, not AI.** This was the most important architectural
call. Scheduling is an optimization problem, not a language problem. A pure local
function is instant, free, offline-capable, and — crucially — testable and
predictable on edge cases like a passed deadline or an impossible workload. Gemini is
reserved for the one task where language understanding genuinely adds value: decoding
the prompt. The scheduler uses a greedy longest-processing-time-first heuristic that
balances daily load and front-loads work.

**Honesty about AI output as an invariant.** Every requirement and task carries a
`source` of `explicit` or `suggested`, enforced by the prompt, re-validated on the
server, and shown with distinct badges in the UI. The app never fabricates a due
date. A study aid that blurs the line between what the professor required and what the
model guessed would be worse than no tool at all.

**Minimal dependencies.** React hooks over localStorage for state, simple view-state
instead of a router, and hand-built Tailwind components instead of a UI library.
Under a one-day deadline, fewer moving parts means fewer ways to fail.

**Pure logic, separated.** All domain math lives in `src/lib/` with no React imports,
which keeps components thin and the hard parts under unit test.

## How Kiro was used

The project was built with Kiro's spec-driven workflow. Requirements, design, and a
staged task list were authored and reviewed in `.kiro/` before any application code
was written, and always-on steering files enforced the security rules, conventions,
and architecture throughout. Kiro's web search verified a time-sensitive fact — the
current free-tier Gemini model — rather than assuming it. Each implementation stage
was verified with the project's own `typecheck`, `lint`, `test`, and `build`
commands before moving on. The full account is in
[`kiro-usage.md`](kiro-usage.md).

## Learning journey

- **Verify, don't assume, external facts.** The default model (`gemini-2.0-flash`)
  from older examples is now restricted for new projects. Checking current
  availability before committing to it avoided shipping a broken default, and the fix
  — documenting a `ListModels` check — makes the app robust for any user's key.
- **Deciding where *not* to use AI is a design skill.** The instinct in an "AI app" is
  to route everything through the model. Keeping the planner deterministic made the
  product more reliable and far easier to test and demo.
- **Specs front-load the hard questions.** Writing acceptance criteria surfaced edge
  cases (overdue deadlines, no due date, corrupt storage, missing key) early, so they
  became explicit scheduler branches and error states rather than afterthoughts.
- **Validate untrusted AI output defensively.** Even with a JSON-mode prompt, the
  backend assumes the model may misbehave — it strips stray code fences, clamps
  numbers, coerces unknown enums, and rejects empty results.

## Future improvements

- **Persist and edit the generated plan** (drag tasks between days), rather than
  always regenerating it from scratch.
- **Calendar export** (`.ics`) so plans land in the student's real calendar.
- **Multi-assignment planning** that balances workload across all active assignments,
  not just one at a time.
- **Optional accounts and cloud sync** for use across devices (deliberately out of
  scope for the MVP).
- **Richer decoding**: detect rubric weightings and suggest where to invest effort.
- **Component and end-to-end tests** to complement the unit tests on the pure logic.
- **Accessibility and i18n passes** beyond the current semantic-HTML baseline.
