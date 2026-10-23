---
inclusion: always
---

# Project Structure Steering — Deadline Decoder

## Directory layout
```
deadline_decoder/
├── api/
│   └── decode.ts            # Vercel serverless function: POST /api/decode
├── src/
│   ├── main.tsx             # React entry
│   ├── App.tsx              # Router/shell + view switching
│   ├── index.css            # Tailwind directives + base styles
│   ├── components/          # Presentational + container components
│   │   ├── layout/          # Shell, Sidebar/Nav, Header
│   │   ├── dashboard/       # Dashboard + cards + stats
│   │   ├── decoder/         # Paste form, decode results, requirement lists
│   │   ├── tasks/           # Task list, task item, add/edit forms
│   │   ├── planner/         # Study plan view + schedule editing
│   │   └── ui/              # Reusable primitives: Button, Card, Progress, etc.
│   ├── lib/                 # Pure logic (no React): storage, scheduling, progress
│   │   ├── storage.ts
│   │   ├── scheduler.ts
│   │   ├── progress.ts
│   │   ├── sample.ts        # Labeled sample assignment + sample decode result
│   │   └── api.ts           # Client wrapper for POST /api/decode
│   ├── hooks/               # React hooks (useAssignments, etc.)
│   ├── types/               # Shared TypeScript types
│   └── __tests__/           # Vitest unit tests for lib/
├── .kiro/
│   ├── steering/            # These steering docs
│   └── specs/
│       └── deadline-decoder/  # requirements.md, design.md, tasks.md
├── docs/                    # architecture.md, kiro-usage.md, writeup.md
├── public/
├── index.html
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── tsconfig.json
├── vercel.json
└── README.md
```

## Layering rules
- `components/` may import from `lib/`, `hooks/`, `types/`, and `ui/`.
- `lib/` is pure: no React, no DOM beyond `localStorage`, no network except `api.ts`.
- `api/` (serverless) is self-contained; if it needs shared shapes, keep a minimal
  local copy of request/response types to avoid cross-bundle import issues.
- Keep view state in `App.tsx` / hooks; keep domain math in `lib/`.

## Naming & imports
- Components: `PascalCase.tsx`. Libs/hooks/types: `camelCase.ts`.
- Use relative imports within `src/`. No deep import chains past 2–3 levels.
- One exported component per file (plus small private subcomponents if needed).

## Documentation expectations
- `README.md`: overview, setup, local dev (Vite + vercel dev), env vars, testing,
  build, and deployment to Vercel.
- `docs/architecture.md`: components, data flow, data models, API contract, key decisions.
- `docs/kiro-usage.md`: how Kiro's spec workflow, steering, and chat were used.
- `docs/writeup.md`: overview, design decisions, Kiro usage, learnings, future work.
