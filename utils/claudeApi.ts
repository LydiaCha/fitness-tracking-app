/**
 * PeakRoutine — Claude API Client
 *
 * Thin wrapper around the Anthropic Messages API.
 * Uses a single request for the entire weekly meal plan (fastest + cheapest).
 *
 * Setup: add EXPO_PUBLIC_ANTHROPIC_API_KEY=sk-ant-... to your .env file.
 *
 * Security note: in a production app, proxy this through a Supabase Edge
 * Function so the API key is never shipped in the app bundle. For development
 * and prototyping the env var approach is fine.
 */

const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL   = 'claude-haiku-4-5-20251001';   // fast + cheap for structured selection tasks
const TIMEOUT_MS = 20_000;

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

export class ClaudeApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRateLimit = false,
    public isAuthError = false,
  ) {
    super(message);
    this.name = 'ClaudeApiError';
  }
}

/**
 * Calls the Claude API with a system prompt and one user message.
 * Returns the raw text content of the first response block.
 * Throws ClaudeApiError on any failure.
 */
export async function callClaude(params: {
  systemPrompt: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';

  if (!apiKey) {
    throw new ClaudeApiError(
      'EXPO_PUBLIC_ANTHROPIC_API_KEY is not set. Add it to your .env file.',
      undefined,
      false,
      true,
    );
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(API_URL, {
      method:  'POST',
      signal:  controller.signal,
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:       MODEL,
        max_tokens:  params.maxTokens ?? 2048,
        temperature: 0.3,  // low temperature for deterministic, debuggable selections
        system:      params.systemPrompt,
        messages:    [{ role: 'user', content: params.userMessage }],
      }),
    });

    clearTimeout(timer);

    if (!response.ok) {
      const isRateLimit  = response.status === 429;
      const isAuthError  = response.status === 401;
      const body = await response.text().catch(() => '');
      throw new ClaudeApiError(
        `Claude API error ${response.status}: ${body.slice(0, 200)}`,
        response.status,
        isRateLimit,
        isAuthError,
      );
    }

    const data: ClaudeResponse = await response.json();
    const text = data.content.find(c => c.type === 'text')?.text ?? '';
    if (!text) throw new ClaudeApiError('Claude returned an empty response.');

    return text;

  } catch (err) {
    clearTimeout(timer);
    if (err instanceof ClaudeApiError) throw err;
    if ((err as Error).name === 'AbortError') {
      throw new ClaudeApiError(`Claude API timed out after ${TIMEOUT_MS / 1000}s`);
    }
    throw new ClaudeApiError(`Network error: ${String(err)}`);
  }
}

/**
 * Extracts a JSON value from a Claude response that may contain prose or
 * markdown code fences around the JSON. Returns null if nothing parseable found.
 */
export function extractJSON<T>(text: string): T | null {
  // Try code fence first: ```json ... ``` or ``` ... ```
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) as T; } catch { /* fall through */ }
  }

  // Try to find the first [ or { and parse from there
  const arrayStart  = text.indexOf('[');
  const objectStart = text.indexOf('{');
  const start = arrayStart === -1 ? objectStart
              : objectStart === -1 ? arrayStart
              : Math.min(arrayStart, objectStart);

  if (start === -1) return null;

  // Find the matching closing bracket
  const openChar  = text[start];
  const closeChar = openChar === '[' ? ']' : '}';
  let depth = 0;
  let end   = -1;

  for (let i = start; i < text.length; i++) {
    if (text[i] === openChar)  depth++;
    if (text[i] === closeChar) depth--;
    if (depth === 0) { end = i; break; }
  }

  if (end === -1) {
    console.warn('[claudeApi] extractJSON: no matching closing bracket found in response');
    return null;
  }

  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch (e) {
    console.warn('[claudeApi] extractJSON: JSON.parse failed —', String(e), '— raw text slice:', text.slice(start, end + 1).slice(0, 200));
    return null;
  }
}
