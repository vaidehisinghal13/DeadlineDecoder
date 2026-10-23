# Requirements Document

## Introduction

Deadline Decoder is an AI-powered academic productivity web application. College
students paste lengthy assignment instructions and receive extracted requirements,
a checklist of actionable tasks with time estimates, and a suggested study plan
leading up to the due date. The MVP has no authentication and no server database;
all user data persists in browser `localStorage`. AI analysis is performed by
Google's Gemini API, called exclusively through a Vercel serverless function so the
API key is never exposed to the browser. A clearly labeled sample assignment keeps
the app fully demonstrable even if the Gemini API is unavailable.

Acceptance criteria below use EARS-style phrasing (WHEN/IF ... THE SYSTEM SHALL ...).

---

## Glossary

- **Assignment:** A saved record containing the original instructions, extracted
  requirements, generated tasks, an optional course and due date, and progress.
- **Requirement:** A single obligation from the assignment. Tagged `explicit` when
  stated directly in the instructions, or `suggested` when recommended by the AI.
- **Task:** An actionable, checkable step with an estimated duration in minutes.
- **Decode:** The act of sending instructions to the Gemini-backed `/api/decode`
  endpoint and receiving a structured title, requirements, and tasks.
- **Study plan:** A deterministic, day-by-day schedule derived from incomplete tasks
  and the due date (not AI-generated).
- **Sample assignment:** A clearly labeled demo assignment that produces a full result
  without calling Gemini, so the app stays demonstrable offline.
- **EARS:** Easy Approach to Requirements Syntax — the WHEN/IF … THE SYSTEM SHALL …
  phrasing used for acceptance criteria.
- **MVP:** Minimum Viable Product — the core end-to-end feature set delivered first.

---

## Requirements

### Requirement 1 — AI Assignment Decoder

**User story:** As a student, I want to paste raw assignment instructions along with
a course and due date, so that the app extracts the requirements and generates tasks
for me.

#### Acceptance Criteria
1. WHEN the user opens the Decoder view THE SYSTEM SHALL present a multi-line input
   for instructions and optional inputs for course name and due date.
2. WHEN the user submits non-empty instructions THE SYSTEM SHALL send them to the
   serverless `/api/decode` endpoint and display a loading state until a response.
3. WHEN the decode succeeds THE SYSTEM SHALL display (a) a title, (b) a list of
   explicitly stated requirements/deliverables, and (c) a list of generated tasks,
   each with an estimated completion time.
4. THE SYSTEM SHALL visually distinguish requirements explicitly stated in the
   instructions from AI-suggested recommendations.
5. IF the user leaves the due date empty THE SYSTEM SHALL NOT fabricate one and
   SHALL label any AI-inferred timing as a suggestion, not a confirmed date.
6. WHEN a decode result is produced THE SYSTEM SHALL allow the user to save it as an
   assignment (persisted to localStorage) and then view it on the Dashboard.
7. IF the instructions input is empty THE SYSTEM SHALL disable submission and prompt
   the user to enter instructions or load the sample.
8. THE SYSTEM SHALL cap instruction length (e.g. ~12,000 characters) and inform the
   user when input exceeds the cap.

---

### Requirement 2 — Secure Gemini Backend

**User story:** As the project owner, I want all Gemini calls to go through a secure
serverless function, so that my API key is never exposed in the browser.

#### Acceptance Criteria
1. THE SYSTEM SHALL read the Gemini key only from the server-side `GEMINI_API_KEY`
   environment variable and SHALL NOT include it in any client bundle.
2. WHEN `/api/decode` receives a request THE SYSTEM SHALL validate the body
   (require non-empty `instructions`; accept optional `course`, `dueDate`) before
   calling Gemini and SHALL return `400 bad_request` for invalid input.
3. WHEN Gemini returns a response THE SYSTEM SHALL parse and schema-validate the
   JSON before returning it, and SHALL return `invalid_ai_response` if validation fails.
4. IF the Gemini API returns a rate-limit (429) THE SYSTEM SHALL return a typed
   `rate_limited` error and the client SHALL show a friendly retry message.
5. IF `GEMINI_API_KEY` is missing THE SYSTEM SHALL return `server_misconfigured`
   without crashing.
6. THE SYSTEM SHALL request strict JSON output from Gemini and instruct the model to
   separate explicit requirements from suggestions and to never fabricate due dates.

---

### Requirement 3 — Task Management

**User story:** As a student, I want to manage the generated tasks, so that I can
track exactly what I have completed.

#### Acceptance Criteria
1. WHEN the user toggles a task THE SYSTEM SHALL mark it complete/incomplete and
   persist the change to localStorage immediately.
2. THE SYSTEM SHALL allow the user to add a new task (title + estimated time), edit
   an existing task's title and estimate, and delete a task.
3. WHEN tasks change THE SYSTEM SHALL recalculate assignment progress as the
   percentage of completed tasks (0% when there are no tasks).
4. THE SYSTEM SHALL persist all task and assignment data across page reloads via
   localStorage, and SHALL load prior data on startup.
5. IF localStorage data is missing or corrupt THE SYSTEM SHALL start from an empty,
   valid state without crashing.

---

### Requirement 4 — Dashboard

**User story:** As a student, I want a dashboard of my assignments, so that I can see
progress and what is due soon at a glance.

#### Acceptance Criteria
1. WHEN the user opens the Dashboard THE SYSTEM SHALL list saved assignments with
   title, course, due date (if any), and completion progress.
2. THE SYSTEM SHALL surface upcoming deadlines and tasks ordered by due date.
3. IF an assignment's due date is in the past and it is incomplete THE SYSTEM SHALL
   visually flag it as overdue.
4. THE SYSTEM SHALL show an overall completion overview (e.g. counts and aggregate
   progress across assignments).
5. WHEN there are no saved assignments THE SYSTEM SHALL show an empty state that
   guides the user to the Decoder or the sample assignment.
6. WHEN the user selects an assignment THE SYSTEM SHALL open its detail (tasks +
   study plan) and allow deletion of the assignment.

---

### Requirement 5 — Smart Study Planner

**User story:** As a student, I want a suggested work schedule, so that I can spread
the assignment's tasks across the days before it is due.

#### Acceptance Criteria
1. WHEN an assignment has a due date and incomplete tasks THE SYSTEM SHALL generate a
   suggested schedule distributing tasks across the days remaining until the due date.
2. THE SYSTEM SHALL base the schedule on task time estimates and the number of days
   available, and SHALL display per-day groupings of tasks.
3. IF the due date is in the past THE SYSTEM SHALL clearly indicate the deadline has
   passed and suggest completing remaining tasks as soon as possible instead of
   producing an impossible schedule.
4. IF the total estimated time cannot fit comfortably in the days remaining THE
   SYSTEM SHALL warn that time is tight and still produce a best-effort plan.
5. THE SYSTEM SHALL allow the user to regenerate the plan after completing or editing
   tasks, and SHALL reflect only incomplete tasks in the active plan.
6. IF an assignment has no due date THE SYSTEM SHALL present the tasks as an unscheduled
   checklist and explain that a due date is needed for a day-by-day plan.

---

### Requirement 6 — User Interface & UX States

**User story:** As a student, I want a clean, responsive interface with clear states,
so that the app feels polished and never leaves me stuck.

#### Acceptance Criteria
1. THE SYSTEM SHALL provide a modern SaaS-style dashboard layout with cards, progress
   indicators, and clear typography.
2. THE SYSTEM SHALL be responsive and usable on both desktop and mobile viewports.
3. WHEN data is loading THE SYSTEM SHALL show a loading indicator; WHEN an operation
   fails THE SYSTEM SHALL show a readable error with a recovery action.
4. WHEN a view has no data THE SYSTEM SHALL show a helpful empty state.
5. THE SYSTEM SHALL provide intuitive navigation between Dashboard, Decoder, and
   assignment detail (tasks + planner).
6. THE SYSTEM SHALL apply subtle, non-distracting animations/transitions.

---

### Requirement 7 — Sample Assignment Fallback

**User story:** As a demoer, I want a labeled sample assignment, so that the app is
fully demonstrable even if the Gemini API is unavailable.

#### Acceptance Criteria
1. THE SYSTEM SHALL provide a clearly labeled "Load sample" action in the Decoder.
2. WHEN the user loads the sample THE SYSTEM SHALL populate realistic instructions and
   produce a complete decode result (requirements + tasks + estimates) without calling
   Gemini.
3. THE SYSTEM SHALL clearly label sample-generated content as a demo so it is not
   mistaken for live AI output.
4. IF a live decode fails THE SYSTEM SHALL offer the sample as a fallback path.

---

### Requirement 8 — Persistence, Privacy & Resilience

**User story:** As a student, I want my data to stay on my device and survive reloads,
so that the app is private and reliable without an account.

#### Acceptance Criteria
1. THE SYSTEM SHALL store all assignments, tasks, and plans in localStorage under a
   versioned key and SHALL migrate or safely reset on version mismatch.
2. THE SYSTEM SHALL NOT transmit user data to any third party except the instructions
   text sent to the serverless decode endpoint for analysis.
3. WHEN the app starts THE SYSTEM SHALL load persisted state; IF parsing fails THE
   SYSTEM SHALL fall back to empty state and not crash.
4. THE SYSTEM SHALL allow the user to delete an assignment, removing its tasks and
   plan from storage.

---

## Non-Functional Requirements
- **Security:** API key server-side only; no secrets in the client or in git.
- **Reliability:** No unhandled promise rejections in the main flows; typed error paths.
- **Performance:** Dashboard and views render quickly with up to ~50 assignments.
- **Simplicity:** Buildable and deployable within one day; minimal dependencies.
- **Accessibility:** Semantic HTML, labeled inputs, keyboard-usable controls, adequate
  color contrast.

## Assumptions
- Single-user, single-browser usage (no sync across devices).
- Gemini model returns JSON reliably when prompted; the backend still validates.
- Due dates are provided by the user; the app never invents them.
