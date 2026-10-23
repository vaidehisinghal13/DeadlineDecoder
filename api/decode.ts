// Vercel serverless function: POST /api/decode
//
// Brokers calls to the Google Gemini API so the API key stays server-side only.
// This file is intentionally self-contained (its own small validation + types)
// so it bundles independently of the Vite SPA. The browser never sees the key.

type RequirementSource = 'explicit' | 'suggested';

interface DecodedRequirement {
  text: string;
  source: RequirementSource;
}
interface DecodedTask {
  title: string;
  estimateMinutes: number;
  source: RequirementSource;
}
interface DecodeResponse {
  title: string;
  requirements: DecodedRequirement[];
  tasks: DecodedTask[];
}

type ErrorCode =
  | 'bad_request'
  | 'rate_limited'
  | 'upstream_error'
  | 'invalid_ai_response'
  | 'server_misconfigured'
  | 'model_unavailable';

const MAX_INSTRUCTIONS_LENGTH = 12_000;
const MIN_ESTIMATE = 5;
const MAX_ESTIMATE = 1_440;
const MAX_LIST = 30;
// Stable, non-dated alias so it won't be retired the way a pinned version is.
// Verified against the live ListModels + generateContent API (returns 200).
// Older pinned models like `gemini-2.5-flash` now return 404 ("no longer
// available to new users") for new API keys. Override with GEMINI_MODEL if needed.
const DEFAULT_MODEL = 'gemini-flash-lite-latest';

// Minimal request/response shapes for the Node serverless runtime. Using `any`
// here avoids a hard dependency on @vercel/node types for the MVP; the logic
// below is still fully typed.
interface VercelLikeRequest {
  method?: string;
  body?: unknown;
}
interface VercelLikeResponse {
  status(code: number): VercelLikeResponse;
  json(body: unknown): void;
  setHeader(name: string, value: string): void;
}

function fail(res: VercelLikeResponse, status: number, error: ErrorCode, message: string) {
  res.status(status).json({ error, message });
}

function coerceSource(value: unknown): RequirementSource {
  return value === 'explicit' ? 'explicit' : 'suggested';
}

function clampEstimate(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 30;
  return Math.min(MAX_ESTIMATE, Math.max(MIN_ESTIMATE, Math.round(n)));
}

/** Validate + normalize the untrusted JSON Gemini returned. Throws on bad shape. */
function normalizeDecoded(raw: unknown): DecodeResponse {
  if (typeof raw !== 'object' || raw === null) throw new Error('not an object');
  const obj = raw as Record<string, unknown>;

  const title = typeof obj.title === 'string' ? obj.title.trim() : '';
  if (!title) throw new Error('missing title');
  if (!Array.isArray(obj.requirements) || !Array.isArray(obj.tasks)) {
    throw new Error('requirements/tasks must be arrays');
  }

  const requirements: DecodedRequirement[] = obj.requirements
    .filter((r): r is Record<string, unknown> => typeof r === 'object' && r !== null)
    .map((r) => ({
      text: typeof r.text === 'string' ? r.text.trim() : '',
      source: coerceSource(r.source),
    }))
    .filter((r) => r.text.length > 0)
    .slice(0, MAX_LIST);

  const tasks: DecodedTask[] = obj.tasks
    .filter((t): t is Record<string, unknown> => typeof t === 'object' && t !== null)
    .map((t) => ({
      title: typeof t.title === 'string' ? t.title.trim() : '',
      estimateMinutes: clampEstimate(t.estimateMinutes),
      source: coerceSource(t.source),
    }))
    .filter((t) => t.title.length > 0)
    .slice(0, MAX_LIST);

  if (tasks.length === 0) throw new Error('no usable tasks');

  return { title, requirements, tasks };
}

function buildPrompt(instructions: string, course?: string, dueDate?: string): string {
  const context: string[] = [];
  if (course) context.push(`Course: ${course}`);
  if (dueDate) context.push(`Due date (provided by the student, for context only): ${dueDate}`);

  return [
    'You are an assistant that helps college students break down assignment instructions.',
    'Analyze the assignment instructions below and return ONLY JSON (no markdown, no prose) matching this schema:',
    '{',
    '  "title": string,',
    '  "requirements": [{ "text": string, "source": "explicit" | "suggested" }],',
    '  "tasks": [{ "title": string, "estimateMinutes": number, "source": "explicit" | "suggested" }]',
    '}',
    '',
    'Rules:',
    '- "source" MUST be "explicit" only when the item is directly stated in the instructions. Otherwise use "suggested".',
    '- Generate concrete, actionable tasks a student can check off, each with a realistic estimateMinutes (integer).',
    '- Do NOT invent or output any due date. Do NOT claim inferred details are confirmed facts.',
    '- If the instructions are vague, prefer fewer "explicit" items and clearly-marked "suggested" ones over guessing.',
    '',
    context.length ? context.join('\n') : '',
    '',
    'Assignment instructions:',
    '"""',
    instructions,
    '"""',
  ]
    .filter(Boolean)
    .join('\n');
}

export default async function handler(req: VercelLikeRequest, res: VercelLikeResponse) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return fail(res, 405, 'bad_request', 'Method not allowed. Use POST.');
  }

  // Parse body (Vercel usually parses JSON automatically; handle strings too).
  let body: unknown = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return fail(res, 400, 'bad_request', 'Request body must be valid JSON.');
    }
  }
  if (typeof body !== 'object' || body === null) {
    return fail(res, 400, 'bad_request', 'Request body must be a JSON object.');
  }

  const { instructions, course, dueDate } = body as Record<string, unknown>;
  if (typeof instructions !== 'string' || instructions.trim().length === 0) {
    return fail(res, 400, 'bad_request', 'Field "instructions" is required.');
  }
  if (instructions.length > MAX_INSTRUCTIONS_LENGTH) {
    return fail(
      res,
      400,
      'bad_request',
      `Field "instructions" exceeds the ${MAX_INSTRUCTIONS_LENGTH} character limit.`,
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return fail(
      res,
      500,
      'server_misconfigured',
      'The server is missing its GEMINI_API_KEY. Load the sample assignment to continue.',
    );
  }

  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model,
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const prompt = buildPrompt(
    instructions,
    typeof course === 'string' ? course : undefined,
    typeof dueDate === 'string' ? dueDate : undefined,
  );

  let upstream: Response;
  try {
    upstream = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.4,
        },
      }),
    });
  } catch {
    return fail(res, 502, 'upstream_error', 'Could not reach the AI service. Please try again.');
  }

  if (upstream.status === 429) {
    return fail(res, 429, 'rate_limited', 'The AI service is rate limited. Please wait and retry.');
  }
  if (!upstream.ok) {
    // Try to surface Gemini's own error message (e.g. a retired/invalid model).
    const detail = await readUpstreamError(upstream);

    // A 404 almost always means the configured model name is wrong, retired, or
    // not available to this API key. Give an actionable message instead of a bare 404.
    if (upstream.status === 404) {
      const hint =
        `The configured Gemini model "${model}" is not available for this API key. ` +
        'It may be retired or misspelled. Verify available models with the ListModels ' +
        'endpoint and set a valid GEMINI_MODEL (the app default is ' +
        `"${DEFAULT_MODEL}").` +
        (detail ? ` Gemini said: ${detail}` : '');
      return fail(res, 502, 'model_unavailable', hint);
    }

    return fail(
      res,
      502,
      'upstream_error',
      `The AI service returned an error (${upstream.status}).` + (detail ? ` ${detail}` : ''),
    );
  }

  let payload: unknown;
  try {
    payload = await upstream.json();
  } catch {
    return fail(res, 502, 'invalid_ai_response', 'The AI response could not be read.');
  }

  // Extract the model's text (first candidate, first text part).
  const text = extractText(payload);
  if (!text) {
    return fail(res, 502, 'invalid_ai_response', 'The AI returned no usable content.');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(text));
  } catch {
    return fail(res, 502, 'invalid_ai_response', 'The AI did not return valid JSON.');
  }

  try {
    const normalized = normalizeDecoded(parsed);
    return res.status(200).json(normalized);
  } catch {
    return fail(res, 502, 'invalid_ai_response', 'The AI response did not match the expected format.');
  }
}

/**
 * Best-effort extraction of Gemini's error message from a non-OK response.
 * Returns a short string, or null. Never throws; never includes the API key.
 */
async function readUpstreamError(upstream: Response): Promise<string | null> {
  try {
    const data = (await upstream.json()) as { error?: { message?: unknown } };
    const message = data?.error?.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return message.trim().slice(0, 300);
    }
  } catch {
    // Non-JSON or empty body — nothing to surface.
  }
  return null;
}

function extractText(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const candidates = (payload as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const content = (candidates[0] as Record<string, unknown>)?.content;
  const parts = (content as Record<string, unknown>)?.parts;
  if (!Array.isArray(parts)) return null;
  const texts = parts
    .map((p) => (typeof p === 'object' && p !== null ? (p as Record<string, unknown>).text : null))
    .filter((t): t is string => typeof t === 'string');
  return texts.length ? texts.join('') : null;
}

/** Remove ```json ... ``` fences the model may add despite instructions. */
function stripCodeFences(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}
