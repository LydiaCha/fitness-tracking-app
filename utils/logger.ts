/**
 * Structured logger for PeakRoutine.
 *
 * Every log entry captures:
 *   - level    : debug | info | warn | error
 *   - category : the subsystem (auth, storage, network, …)
 *   - op       : the specific operation being attempted
 *   - message  : what happened
 *   - meta     : optional context (never include sensitive data)
 *
 * In development: colorised console output.
 * In production:  structured JSON lines ready for an external sink
 *                 (e.g. Sentry, Datadog, or a log-drain). Swap
 *                 `prodOutput` below to forward entries to your service.
 */

export type LogLevel    = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'auth' | 'storage' | 'network' | 'notifications' | 'biometric' | 'general';

export interface LogEntry {
  level:     LogLevel;
  category:  LogCategory;
  op:        string;
  message:   string;
  meta?:     Record<string, unknown>;
  timestamp: string;
}

// ─── Output ──────────────────────────────────────────────────────────────────

const EMOJI: Record<LogLevel, string> = {
  debug: '🔍',
  info:  'ℹ️ ',
  warn:  '⚠️ ',
  error: '❌',
};

function devOutput(entry: LogEntry): void {
  const prefix = `${EMOJI[entry.level]} [${entry.category.toUpperCase()}] ${entry.op}`;
  const detail = entry.meta ? JSON.stringify(entry.meta) : '';
  const line   = detail ? `${prefix}: ${entry.message} — ${detail}` : `${prefix}: ${entry.message}`;

  switch (entry.level) {
    case 'debug':
    case 'info':  console.log(line);   break;
    case 'warn':  console.warn(line);  break;
    case 'error': console.error(line); break;
  }
}

function prodOutput(entry: LogEntry): void {
  // In production only log warn and error to avoid PII exposure.
  if (entry.level === 'debug' || entry.level === 'info') return;
  // Replace this with your error-reporting SDK (e.g. Sentry.captureMessage).
  console.warn(JSON.stringify(entry));
}

// ─── Core ─────────────────────────────────────────────────────────────────────

function emit(
  level:    LogLevel,
  category: LogCategory,
  op:       string,
  message:  string,
  meta?:    Record<string, unknown>,
): void {
  const entry: LogEntry = { level, category, op, message, meta, timestamp: new Date().toISOString() };
  if (__DEV__) {
    devOutput(entry);
  } else {
    prodOutput(entry);
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  debug: (category: LogCategory, op: string, message: string, meta?: Record<string, unknown>) =>
    emit('debug', category, op, message, meta),

  info: (category: LogCategory, op: string, message: string, meta?: Record<string, unknown>) =>
    emit('info', category, op, message, meta),

  warn: (category: LogCategory, op: string, message: string, meta?: Record<string, unknown>) =>
    emit('warn', category, op, message, meta),

  error: (category: LogCategory, op: string, message: string, meta?: Record<string, unknown>) =>
    emit('error', category, op, message, meta),
};
