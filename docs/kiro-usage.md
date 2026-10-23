# How Kiro Was Used

Deadline Decoder was built entirely inside **Kiro**, using its spec-driven
development workflow. This document describes how Kiro shaped the project.

## 1. Spec-driven development

Rather than jumping straight to code, the project began as a spec in
`.kiro/specs/deadline-decoder/`, authored and reviewed in Kiro before any
application code existed:

1. **`requirements.md`** — eight requirements written as user stories with EARS-style
   acceptance criteria (WHEN/IF … THE SYSTEM SHALL …). These pinned down exactly what
   "done" meant for the decoder, task management, dashboard, planner, UI states,
   sample fallback, and persistence.
2. **`design.md`** — the technical design: architecture diagram, data models, the
   `/api/decode` contract, the Gemini prompt rules, the deterministic scheduler
   algorithm, the storage strategy, the component tree, and a
   requirements → design traceability table.
3. **`tasks.md`** — a prioritized, stage-by-stage implementation plan where each task
   references the requirements it satisfies, sequenced so a working end-to-end MVP
   lands as early as possible.

Implementation did not begin until these documents were reviewed and approved. This
caught design questions early — for example, confirming that the study planner should
be deterministic and local rather than AI-generated, and that the Gemini model choice
needed to be verified against current free-tier availability rather than assumed.

## 2. Steering files

`.kiro/steering/` holds always-included guidance that kept the implementation
consistent with the plan:

- **`product.md`** — the product's purpose, MVP priority order, and non-negotiable
  principles (honest AI output, always-demoable, graceful degradation).
- **`tech.md`** — the stack, the hard security rules for the API key, error-handling
  conventions, code conventions, and the testing approach.
- **`structure.md`** — the directory layout, layering rules (pure `lib/` vs React
  components vs the self-contained serverless function), and naming conventions.

Because steering is always in context, decisions like "keep the Gemini key
server-side only" and "keep domain logic in pure, testable functions" were applied
uniformly across every file instead of being re-litigated per component.

## 3. Research with web tools

Kiro's web search was used to verify a time-sensitive fact that a model's training
data could get wrong: which Gemini Flash models are currently available on the free
tier. This confirmed that `gemini-2.0-flash` is restricted to existing customers for
new projects and that `gemini-2.5-flash` is the right free-tier default — a decision
then recorded in the design and steering docs, with a documented `ListModels` command
so any user can verify their own key.

## 4. Iterative, verified implementation

The build proceeded through the spec's stages:

- Scaffold and tooling, verified with `typecheck` and `build`.
- Shared types and the pure `lib/` modules, written alongside their Vitest tests.
- The serverless Gemini function.
- Client API wrapper, state hook, UI primitives, and the four feature areas.

At each checkpoint Kiro ran the project's own commands (`typecheck`, `lint`, `test`,
`build`) and fixed any failures before moving on, so "it builds and the tests pass"
was continuously true rather than asserted at the end.

## 5. What this workflow produced

- A committed `.kiro/` directory documenting the requirements, design, and tasks that
  drove the build.
- Code that maps back to specific acceptance criteria via the traceability table in
  the design.
- A consistent architecture because the steering rules were enforced throughout.
