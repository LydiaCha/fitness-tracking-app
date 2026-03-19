import { STORAGE_KEYS, toKey, isGymDay } from './appConstants';
import { safeGetItem, safeParseJSON } from './storage';

type WorkoutLog = { [dateKey: string]: boolean };

/**
 * Returns how many consecutive gym days the user has completed.
 * Today's workout not yet being done does not break the streak.
 */
export function calcWorkoutStreak(workouts: WorkoutLog, gymDays: number[]): number {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (!isGymDay(d, gymDays)) continue;
    if (workouts[toKey(d)]) {
      streak++;
    } else if (i === 0) {
      // today's session not done yet — don't break streak
    } else {
      break;
    }
  }
  return streak;
}

/**
 * A day is "active" if the user logged any meal, any water, or completed a workout.
 * Reads all three sources in a single batch.
 */
export async function loadActivityStreak(): Promise<number> {
  const [workoutsRaw, waterRaw, mealsRaw] = await Promise.all([
    safeGetItem(STORAGE_KEYS.WORKOUTS),
    safeGetItem(STORAGE_KEYS.WATER_ML),
    safeGetItem(STORAGE_KEYS.MEAL_LOGS),
  ]);

  const workouts = safeParseJSON<Record<string, boolean>>(workoutsRaw, {});
  const water    = safeParseJSON<Record<string, number>>(waterRaw, {});
  const meals    = safeParseJSON<Record<string, unknown[]>>(mealsRaw, {});

  const isActive = (key: string) =>
    workouts[key] === true ||
    (water[key]  ?? 0) > 0 ||
    (meals[key]?.length ?? 0) > 0;

  const today = new Date();
  let streak = 0;

  for (let i = 0; i < 366; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toKey(d);

    if (isActive(key)) {
      streak++;
    } else if (i > 0) {
      // A gap in the past breaks the streak.
      // Today being inactive yet (i === 0) does not.
      break;
    }
  }

  return streak;
}
