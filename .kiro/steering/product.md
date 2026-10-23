---
inclusion: always
---

# Product Steering — Deadline Decoder

## What it is
Deadline Decoder is an AI-powered academic productivity web app that turns long,
overwhelming assignment instructions into an organized set of actionable tasks and
a personalized study plan. The target user is a college student who pastes raw
assignment instructions and gets back: extracted requirements, a checklist of
tasks with time estimates, and a suggested work schedule leading up to the due date.

## Core value
- Reduce the cognitive load of parsing dense assignment prompts.
- Prevent missed requirements and deliverables.
- Help students plan work across the days they have before a deadline.

## MVP feature set (build these first, in this priority order)
1. **AI Assignment Decoder** — paste instructions + course + due date, get
   structured requirements and tasks back from Gemini.
2. **Task Management** — complete / add / edit / delete tasks; auto progress.
3. **Dashboard** — saved assignments, progress, upcoming + overdue deadlines.
4. **Smart Study Planner** — schedule derived from tasks, durations, days remaining.
5. **Polished UI** — SaaS-style, responsive, with empty/loading/error states.

## Product principles (non-negotiable)
- **Honesty about AI output.** Clearly separate *explicitly stated* requirements
  (found in the text) from *AI-suggested* recommendations. Never invent due dates
  or present inferred details as confirmed facts.
- **Always demonstrable.** A clearly labeled sample assignment must let the app
  show its full flow even when the Gemini API is unavailable.
- **Graceful degradation.** Overdue deadlines, too little time, and API failures
  must produce helpful UI, never crashes or dead ends.
- **No accounts, no database.** Persistence is browser localStorage only for the MVP.

## Out of scope for MVP
Authentication, multi-user sync, server-side databases, calendar integrations,
notifications/email, mobile native apps.

## Success criteria
A judge can, in three minutes: paste a prompt (or load the sample), see decoded
tasks, check some off, watch progress update, and view a generated study plan —
all on a clean, responsive interface.
