import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS, toKey } from './appConstants';

const QUICK_WATER_KEY = '@peakroutine/quick_water';

/**
 * A day is "active" if the user logged any meal, any water, or completed a workout.
 * Reads all three sources in a single batch.
 */
export async function loadStreak(): Promise<number> {
  const [workoutsRaw, waterRaw, mealsRaw] = await Promise.all([
    AsyncStorage.getItem(STORAGE_KEYS.WORKOUTS).catch(() => null),
    AsyncStorage.getItem(QUICK_WATER_KEY).catch(() => null),
    AsyncStorage.getItem(STORAGE_KEYS.MEAL_LOGS).catch(() => null),
  ]);

  const workouts: Record<string, boolean>    = workoutsRaw ? JSON.parse(workoutsRaw) : {};
  const water:    Record<string, number>     = waterRaw    ? JSON.parse(waterRaw)    : {};
  const meals:    Record<string, unknown[]>  = mealsRaw    ? JSON.parse(mealsRaw)    : {};

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
