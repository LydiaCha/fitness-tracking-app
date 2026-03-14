/**
 * Centralized error-message mapping.
 *
 * Converts raw Supabase / network errors into user-friendly strings
 * without leaking stack traces or internal error codes.
 *
 * Usage:
 *   catch (e) { setError(getAuthErrorMessage(e)); }
 */

import { logger } from './logger';

// ─── Auth errors ─────────────────────────────────────────────────────────────

/**
 * Maps authentication errors to contextual user-facing messages.
 * Logs the raw error for developer diagnostics.
 */
export function getAuthErrorMessage(error: unknown): string {
  const raw    = error as Record<string, unknown> | null;
  const msg    = (typeof raw?.message === 'string' ? raw.message : String(error)).toLowerCase();
  const status = typeof raw?.status === 'number' ? raw.status : 0;
  const code   = typeof raw?.code   === 'string' ? raw.code   : '';

  // Log for diagnostics — no sensitive data (no passwords, tokens)
  logger.error('auth', 'error_received', 'Auth operation failed', {
    code, status, msgPreview: msg.slice(0, 80),
  });

  // ── Network ──────────────────────────────────────────────────────────────
  if (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('unable to resolve host') ||
    msg.includes('connection refused')
  ) {
    return 'No internet connection. Check your network and try again.';
  }

  // ── Rate limiting ─────────────────────────────────────────────────────────
  if (status === 429 || msg.includes('too many requests') || msg.includes('rate limit')) {
    return 'Too many attempts. Please wait a few minutes and try again.';
  }

  // ── Credentials ───────────────────────────────────────────────────────────
  if (msg.includes('invalid login credentials') || code === 'invalid_credentials') {
    return 'Incorrect email or password. Please try again.';
  }

  // ── Email confirmation ────────────────────────────────────────────────────
  if (msg.includes('email not confirmed')) {
    return 'Please verify your email first. Check your inbox for a confirmation link.';
  }

  // ── Duplicate account ─────────────────────────────────────────────────────
  if (
    msg.includes('user already registered') ||
    msg.includes('already been registered') ||
    msg.includes('email address is already')
  ) {
    return 'An account with this email already exists. Try signing in instead.';
  }

  // ── Password requirements ─────────────────────────────────────────────────
  if (msg.includes('password should be at least') || msg.includes('password is too short')) {
    return 'Password must be at least 8 characters.';
  }

  // ── Invalid email format ──────────────────────────────────────────────────
  if (msg.includes('unable to validate email') || msg.includes('invalid email')) {
    return 'Please enter a valid email address.';
  }

  // ── Expired links ─────────────────────────────────────────────────────────
  if (msg.includes('email link is invalid or has expired') || msg.includes('otp expired')) {
    return 'This link has expired. Please request a new one.';
  }

  // ── Session expiry ────────────────────────────────────────────────────────
  if (msg.includes('jwt expired') || msg.includes('session_not_found') || code === 'session_not_found') {
    return 'Your session has expired. Please sign in again.';
  }

  // ── Server errors ─────────────────────────────────────────────────────────
  if (status >= 500) {
    return 'A server error occurred. Please try again in a moment.';
  }

  // ── OAuth cancelled ───────────────────────────────────────────────────────
  if (msg.includes('cancelled') || msg.includes('canceled') || msg.includes('user_cancelled')) {
    return 'Sign-in was cancelled.';
  }

  // ── Fallback: use Supabase message if short and readable ─────────────────
  const original = typeof (error as any)?.message === 'string' ? (error as any).message as string : '';
  if (original && original.length < 120 && !original.includes('stacktrace')) {
    return original;
  }

  return 'Something went wrong. Please try again.';
}

// ─── Storage errors ───────────────────────────────────────────────────────────

/**
 * Returns a user-facing message when a storage operation fails.
 * `operation` should be a short verb phrase: "save your profile", "load data".
 */
export function getStorageErrorMessage(operation: string): string {
  return `Could not ${operation}. Your changes may not have been saved.`;
}

// ─── Network detection ────────────────────────────────────────────────────────

/**
 * Rough check for network-related errors that appear in fetch/Supabase errors.
 */
export function isNetworkError(error: unknown): boolean {
  const msg = String((error as any)?.message ?? error).toLowerCase();
  return (
    msg.includes('network request failed') ||
    msg.includes('failed to fetch') ||
    msg.includes('network error') ||
    msg.includes('unable to resolve host')
  );
}
