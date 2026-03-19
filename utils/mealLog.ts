import { STORAGE_KEYS, toKey } from './appConstants';
import { safeGetItem, safeSetItem, safeParseJSON } from './storage';

export interface MealLogEntry {
  id:            string;
  name:          string;
  emoji:         string;
  calories:      number;
  protein:       number;
  carbs:         number;
  fat:           number;
  servingLabel?: string;
}

/** Appends a single entry to today's meal log in storage. */
export async function logMeal(entry: MealLogEntry): Promise<void> {
  const key  = toKey(new Date());
  const raw  = await safeGetItem(STORAGE_KEYS.MEAL_LOGS);
  const data = safeParseJSON<Record<string, MealLogEntry[]>>(raw, {});
  data[key]  = [...(data[key] ?? []), entry];
  await safeSetItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(data));
}
