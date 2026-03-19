import { STORAGE_KEYS, toKey } from './appConstants';
import { safeGetItem, safeSetItem, safeParseJSON } from './storage';
import { logger } from './logger';

const PRUNE_MARKER_KEY = '@peakroutine/last_pruned';
const PRUNE_DAYS       = 90; // keep 90 days — covers the full streak window

/**
 * Trims date-keyed log blobs to the last PRUNE_DAYS entries.
 * Runs at most once per calendar day (guarded by PRUNE_MARKER_KEY).
 * Weight entries are intentionally excluded — users want long-term history.
 */
export async function pruneOldLogs(): Promise<void> {
  try {
    const today      = toKey(new Date());
    const lastPruned = await safeGetItem(PRUNE_MARKER_KEY);
    if (lastPruned === today) return; // already ran today

    const cutoff = toKey(new Date(Date.now() - PRUNE_DAYS * 86_400_000));

    const keys = [
      STORAGE_KEYS.WATER_ML,
      STORAGE_KEYS.WATER_GOAL,
      STORAGE_KEYS.MEAL_LOGS,
      STORAGE_KEYS.HABITS,
      STORAGE_KEYS.WORKOUTS,
    ];

    // Strength logs are an array (not a date-keyed object) — prune by date field
    const strengthRaw = await safeGetItem(STORAGE_KEYS.STRENGTH_LOGS);
    if (strengthRaw) {
      const logs = safeParseJSON<{ date: string }[]>(strengthRaw, []);
      const trimmed = logs.filter(l => l.date >= cutoff);
      if (trimmed.length < logs.length) {
        await safeSetItem(STORAGE_KEYS.STRENGTH_LOGS, JSON.stringify(trimmed));
        pruned += logs.length - trimmed.length;
      }
    }

    let pruned = 0;
    for (const key of keys) {
      const raw = await safeGetItem(key);
      if (!raw) continue;
      const data    = safeParseJSON<Record<string, unknown>>(raw, {});
      const before  = Object.keys(data).length;
      const trimmed = Object.fromEntries(
        Object.entries(data).filter(([k]) => k >= cutoff),
      );
      const after = Object.keys(trimmed).length;
      if (after < before) {
        await safeSetItem(key, JSON.stringify(trimmed));
        pruned += before - after;
      }
    }

    await safeSetItem(PRUNE_MARKER_KEY, today);
    if (pruned > 0) {
      logger.info('storage', 'pruneOldLogs', `Pruned ${pruned} stale entries`, { cutoff });
    }
  } catch (e) {
    // Non-fatal — log and continue
    logger.warn('storage', 'pruneOldLogs', 'Prune failed', { error: String(e) });
  }
}
