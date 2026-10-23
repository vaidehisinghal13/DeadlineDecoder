# Deadline Decoder

**From Overwhelming Assignments to Actionable Plans.**

College assignment prompts bury technical requirements, deliverables, grading criteria,
and deadlines inside dense paragraphs. Translating that into a plan is slow, important
requirements get missed, and students underestimate how long the work will take.

Deadline Decoder fixes the gap between *receiving* an assignment and *starting* it.
Paste your instructions and Google's Gemini model extracts the requirements and
generates actionable tasks with time estimates. Save the assignment, track your
progress, generate a day-by-day study plan, and export it to your calendar — all with
no account required.

Built for the "Solve What Is Closest to You" hackathon using **Kiro's spec-driven
development workflow** (Kiro was the only IDE used). See the
[technical write-up](docs/writeup.md) for the full story.

## Live Demo & Links

- **Live Application:** [Deadline Decoder](https://deadline-decoder.vercel.app/)
- **Source Code:** [GitHub Repository](https://github.com/vaidehisinghal13/DeadlineDecoder)
- **Demo Video:** [Watch the demo](https://youtu.be/PWU0adct9Z4)

## Features

- **AI Assignment Decoder** — paste instructions (plus optional course and due date)
  and get back extracted requirements and a task checklist with time estimates.
- **Honest AI output** — requirements explicitly stated in your instructions are
  visually separated from AI-generated suggestions. The app never invents due dates.
- **Task management** — complete, add, edit, and delete tasks. Progress recalculates
  automatically.
- **Smart study planner** — a deterministic local algorithm distributes your
  remaining tasks across the days before the deadline, with warnings for overdue or
  time-tight situations.
- **Export to Calendar** — download the study plan as a standard `.ics` file
  (Google / Apple / Outlook). You pick the daily start time; the app never invents
  one. Entirely client-side, no OAuth or external API.
- **Dashboard** — assignment cards, aggregate progress stats, and upcoming deadlines
  with overdue highlighting.
- **Sample assignment** — load a realistic sample with one click; the full flow works
  even without a Gemini key.
- **Local-first** — all data lives in your browser's localStorage. No account, no
  database.

## Tech stack

| Layer | Choice |
|---|---|
| Frontend | React 18, Vite, TypeScript |
| Styling | Tailwind CSS, lucide-react icons |
| AI | Google Gemini API (via a serverless function) |
| Backend | Vercel serverless function (`/api/decode`) |
| Persistence | Browser localStorage |
| Testing | Vitest (unit tests for pure logic) |

See [`docs/architecture.md`](docs/architecture.md) for the full design.

## Prerequisites

- **Node.js 18+** (the serverless function uses the global `fetch`).
- A **Google Gemini API key** — create one free in
  [Google AI Studio](https://aistudio.google.com/app/apikey).
- The **Vercel CLI** for local full-stack development (frontend + API together):
  ```bash
  npm install -g vercel
  ```

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your local env file from the template and add your key
cp .env.example .env.local
# then edit .env.local and set GEMINI_API_KEY=...
```

`.env.example` is a committed template that documents the required variables with
placeholder values (no real secrets). Your `.env.local` holds the real key and is
gitignored, so it is never committed.

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `GEMINI_API_KEY` | Yes | Your Google Gemini API key. Server-side only. |
| `GEMINI_MODEL` | No | Override the model. Defaults to `gemini-flash-lite-latest`. |

### Checking which Gemini models your key can use

Google retires older pinned models for new API keys. For example, `gemini-2.5-flash`
now returns a 404 ("no longer available to new users") even though it still appears in
ListModels. This app therefore defaults to **`gemini-flash-lite-latest`**, a stable,
non-dated alias verified to return `200` from the live API.

To see exactly what your key can access and confirm a model actually works:

```bash
# 1. List models your key can see
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY"

# 2. Confirm a specific model actually responds (not just listed). Expect HTTP 200.
curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST "https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=$GEMINI_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"contents":[{"role":"user","parts":[{"text":"ok"}]}]}'
```

A model appearing in ListModels does **not** guarantee it works for `generateContent`,
so always confirm with step 2. If your preferred model returns 200, set `GEMINI_MODEL`
to it; otherwise leave it unset to use the default.

## Local development

**Full stack (recommended)** — runs the React app and the `/api/decode` serverless
function together, so live AI decoding works locally:

```bash
vercel dev
```

The first run of `vercel dev` will prompt you to link the project; accept the
defaults. It reads `GEMINI_API_KEY` from `.env.local`. The app opens on the port
Vercel prints (typically http://localhost:3000).

**Frontend only** — fast Vite dev server without the API. Live decoding will fail,
but you can use **Load sample assignment** to exercise the entire UI:

```bash
npm run dev
```

## Testing, linting, and type checking

```bash
npm run test       # run unit tests (Vitest) once
npm run test:watch # watch mode
npm run typecheck  # TypeScript, no emit
npm run lint       # ESLint, zero-warnings policy
npm run build      # type-check + production build
```

The unit tests (52 across 5 suites, as of the latest run) cover the decoder response
validation, progress math, the study-plan scheduler, storage resilience, and `.ics`
calendar generation. They cover the pure business logic; React components and full
end-to-end flows are verified manually against the demo scenario.

## Deployment (Vercel)

The live application is deployed at
**[https://deadline-decoder.vercel.app/](https://deadline-decoder.vercel.app/)**.

To deploy your own instance:

1. Push this repository to GitHub (the `.kiro/` directory is tracked; `.env*` is not).
2. In [Vercel](https://vercel.com), **Add New → Project** and import the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output `dist`
   (already set in `vercel.json`).
4. Under **Settings → Environment Variables**, add `GEMINI_API_KEY` (and optionally
   `GEMINI_MODEL`). These are server-side only.
5. Deploy. The SPA is served statically and `/api/decode` runs as a serverless
   function. Vercel auto-deploys on every push to the default branch.

## Security notes

- The Gemini key is read only on the server (`process.env.GEMINI_API_KEY`). It is
  never bundled into client code or exposed to the browser.
- The serverless function validates the request body before calling Gemini and
  validates Gemini's JSON before returning it.
- If the key is missing, the API returns a clear `server_misconfigured` error and the
  UI offers the sample assignment so the app stays demonstrable.

## Project layout

```
api/decode.ts          Serverless function (Gemini proxy)
src/lib/               Pure logic: scheduler, progress, storage, validation, sample, ics
src/hooks/             useAssignments (state + localStorage)
src/components/        UI: dashboard, decoder, tasks, planner, layout, primitives
.kiro/                 Steering docs + the spec (requirements, design, tasks)
docs/                  Architecture, Kiro usage, and the technical write-up
```

## Sample / demo fallback

The Decoder includes a clearly labeled **"Load sample assignment"** action. It fills in
realistic instructions and produces a complete decode result — requirements and tasks —
**without calling Gemini**. Sample-generated content is labeled as a demo in the UI so
it is never mistaken for live AI output. If a live decode fails (for example, a missing
key or an unavailable model), the error state also offers the sample result as a
fallback. This keeps the full flow — decode → save → track → plan → export —
demonstrable even without a working API key, which matters for a reliable live demo.

## Limitations and known constraints

- **Single device / browser.** Data lives in `localStorage`, so assignments do not sync
  across devices or browsers and are cleared if browser storage is cleared.
- **No accounts or authentication.** Intentional for the MVP; there is no multi-user
  support.
- **Calendar export is a snapshot, not live sync.** Re-export after changing the plan;
  previously imported events do not update themselves.
- **AI output should be verified.** Extracted requirements and time estimates are an aid,
  not ground truth — confirm them against the original instructions.
- **Model availability varies by key.** Some Gemini models are unavailable to newer
  keys; see the model-check section above if decoding returns a model error.
- **Automated tests cover logic, not UI.** Component and end-to-end tests are future
  work; the UI is verified manually.

## Documentation

- [`docs/writeup.md`](docs/writeup.md) — the full technical write-up (overview, design
  decisions, Kiro usage, learning journey)
- [`docs/architecture.md`](docs/architecture.md) — architecture and design decisions
- [`docs/kiro-usage.md`](docs/kiro-usage.md) — how Kiro was used to build this
- [`.kiro/specs/deadline-decoder/`](.kiro/specs/deadline-decoder/) — the reviewed spec:
  `requirements.md`, `design.md`, `tasks.md`
