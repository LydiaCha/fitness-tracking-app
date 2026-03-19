import { STORAGE_KEYS, toKey } from './appConstants';
import { safeGetItem, safeSetItem, safeParseJSON } from './storage';

/** Returns the total ml logged for today, or 0. */
export async function loadWaterMl(): Promise<number> {
  const key = toKey(new Date());
  const raw = await safeGetItem(STORAGE_KEYS.WATER_ML);
  const data = safeParseJSON<Record<string, number>>(raw, {});
  return data[key] ?? 0;
}

/**
 * Persists the new running total for today.
 * Single source of truth: WATER_ML stores the ml count.
 * WATER_GOAL boolean is derived on-the-fly via loadWaterGoalLog — not stored separately.
 */
export async function logWater(newTotalMl: number): Promise<void> {
  const key = toKey(new Date());
  const raw = await safeGetItem(STORAGE_KEYS.WATER_ML);
  const data = safeParseJSON<Record<string, number>>(raw, {});
  data[key] = newTotalMl;
  await safeSetItem(STORAGE_KEYS.WATER_ML, JSON.stringify(data));
}

/**
 * Returns a boolean DayLog derived from WATER_ML + a target threshold.
 * Replaces direct reads of WATER_GOAL so callers always reflect the live ml values.
 */
export async function loadWaterGoalLog(targetMl: number): Promise<Record<string, boolean>> {
  const raw  = await safeGetItem(STORAGE_KEYS.WATER_ML);
  const data = safeParseJSON<Record<string, number>>(raw, {});
  return Object.fromEntries(Object.entries(data).map(([k, ml]) => [k, ml >= targetMl]));
}
