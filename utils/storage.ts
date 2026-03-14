/**
 * Safe AsyncStorage wrappers.
 *
 * Every operation:
 *   - Never throws — errors are caught and logged
 *   - Returns a typed result so callers can respond to failure
 *   - Logs structured context for diagnostics
 *
 * Usage:
 *   const raw  = await safeGetItem(STORAGE_KEYS.PROFILE);
 *   const data = safeParseJSON(raw, DEFAULT_PROFILE);
 *   const ok   = await safeSetItem(STORAGE_KEYS.PROFILE, JSON.stringify(data));
 *   if (!ok) toast('Changes may not have been saved.');
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

/** Returns the stored string, or null if missing or on any error. */
export async function safeGetItem(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch (e) {
    logger.error('storage', 'getItem', 'Read failed', { key, error: String(e) });
    return null;
  }
}

/** Writes the value. Returns true on success, false on failure. */
export async function safeSetItem(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, value);
    logger.debug('storage', 'setItem', 'Written', { key });
    return true;
  } catch (e) {
    logger.error('storage', 'setItem', 'Write failed', { key, error: String(e) });
    return false;
  }
}

/** Removes the key. Returns true on success, false on failure. */
export async function safeRemoveItem(key: string): Promise<boolean> {
  try {
    await AsyncStorage.removeItem(key);
    logger.debug('storage', 'removeItem', 'Removed', { key });
    return true;
  } catch (e) {
    logger.error('storage', 'removeItem', 'Remove failed', { key, error: String(e) });
    return false;
  }
}

/**
 * Shallow-merges a JSON object into an existing stored object.
 * Returns true on success, false on failure.
 */
export async function safeMergeItem(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.mergeItem(key, value);
    return true;
  } catch (e) {
    logger.error('storage', 'mergeItem', 'Merge failed', { key, error: String(e) });
    return false;
  }
}

/**
 * Removes multiple keys in one pass.
 * Returns the count of successfully removed keys.
 */
export async function safeMultiRemove(keys: string[]): Promise<number> {
  const results = await Promise.allSettled(
    keys.map(k => AsyncStorage.removeItem(k)),
  );
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length > 0) {
    logger.error('storage', 'multiRemove', 'Some keys failed to remove', {
      total: keys.length, failed: failed.length,
    });
  }
  return keys.length - failed.length;
}

/**
 * Safely parses a JSON string.
 * Returns `fallback` if `raw` is null or the string is malformed.
 * Never throws.
 */
export function safeParseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (raw === null || raw === undefined || raw === '') return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    logger.warn('storage', 'parseJSON', 'JSON parse failed, using fallback', {
      preview: raw.slice(0, 40), error: String(e),
    });
    return fallback;
  }
}
