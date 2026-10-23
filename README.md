# Deadline Decoder

Turn long, overwhelming assignment instructions into an organized task list and a
personalized study plan. Paste your assignment, and Deadline Decoder uses Google's
Gemini API to extract the requirements, generate actionable tasks with time
estimates, and build a day-by-day schedule leading up to your deadline.

Built for the AWS Hackathon using **Kiro's spec-driven development workflow**.

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

# 2. Create your local env file and add your key
cp .env.example .env.local
# then edit .env.local and set GEMINI_API_KEY=...
```

Your `.env.local` is gitignored and never committed.

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

The unit tests cover the decoder response validation, progress math, the study-plan
scheduler, and storage resilience.

## Deployment (Vercel)

1. Push this repository to GitHub (the `.kiro/` directory is tracked; `.env*` is not).
2. In [Vercel](https://vercel.com), **Add New → Project** and import the repo.
3. Framework preset: **Vite**. Build command `npm run build`, output `dist`
   (already set in `vercel.json`).
4. Under **Settings → Environment Variables**, add `GEMINI_API_KEY` (and optionally
   `GEMINI_MODEL`). These are server-side only.
5. Deploy. The SPA is served statically and `/api/decode` runs as a serverless
   function.

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

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — architecture and design decisions
- [`docs/kiro-usage.md`](docs/kiro-usage.md) — how Kiro was used to build this
- [`docs/writeup.md`](docs/writeup.md) — the full technical write-up
