---
inclusion: always
---

# Technology Steering — Deadline Decoder

## Stack
- **Build/Framework:** React 18 + Vite + TypeScript.
- **Styling:** Tailwind CSS. No component library required; hand-build cards,
  buttons, progress bars.
- **Icons:** `lucide-react`.
- **AI:** Google Gemini API, called **only** from a serverless function. Default model
  `gemini-2.5-flash` (free-tier eligible as of 2026; `gemini-2.0-flash` is restricted
  to existing customers). Overridable via the `GEMINI_MODEL` env var. Verify what your
  key can access with the ListModels endpoint:
  `GET https://generativelanguage.googleapis.com/v1beta/models?key=$GEMINI_API_KEY`.
- **Serverless:** Vercel functions in `/api` (Node runtime). Local dev via `vercel dev`.
- **Persistence:** Browser `localStorage` behind a small typed storage module.

## Security rules (hard requirements)
- The Gemini key lives in `GEMINI_API_KEY` as a **server-side** env var only.
- The key MUST NOT appear in any client bundle, `VITE_`-prefixed var, or committed file.
- `.env`, `.env.*`, and `.env.local` are gitignored and never committed.
- The serverless function validates the incoming request body before calling Gemini,
  and validates/parses Gemini's JSON response before returning it to the client.

## API & error handling
- Single backend endpoint: `POST /api/decode`.
- Validate request: require `instructions` (non-empty string, reasonable length cap).
  `course` and `dueDate` optional; never fabricate a `dueDate`.
- Gemini is asked to return strict JSON; the function parses and schema-checks it.
  On malformed output, retry-free fallback to a clear error response.
- Map failures to typed errors: `bad_request`, `rate_limited` (429), `upstream_error`,
  `invalid_ai_response`, `server_misconfigured` (missing key). The client shows a
  friendly message and offers the sample assignment as a fallback.

## Code conventions
- TypeScript `strict` mode on. No `any` in exported signatures; prefer explicit types.
- Shared types live in `src/types/` and are imported by both UI and API via a
  path that works in both bundles (duplicate-free: keep API-facing types minimal
  and co-located in `api/` if import boundaries get awkward).
- Functional React components with hooks. No class components.
- Keep business logic (scheduling, progress math, storage) in `src/lib/` as pure,
  unit-testable functions separate from components.
- Name files: components `PascalCase.tsx`, libs/hooks `camelCase.ts`.
- Prefer small components; co-locate component-only subcomponents.

## Testing
- Use **Vitest** for unit tests of pure logic (`src/lib/`): progress calc,
  study-plan scheduling, storage serialization, AI-response validation.
- Do not block the MVP on exhaustive tests; cover the scheduling and progress math.

## Commands (document in README)
- `npm install`
- `npm run dev` (Vite only) / `vercel dev` (full stack incl. `/api`)
- `npm run build`, `npm run preview`
- `npm run test` (vitest run), `npm run lint`, `npm run typecheck`
