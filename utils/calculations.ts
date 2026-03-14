/**
 * Shared calculation utilities used across Progress and Profile screens.
 */

import { AppThemeType } from '@/constants/theme';
import { toKey, isGymDay } from '@/utils/appConstants';

type DayLog = { [dateKey: string]: boolean };
type Period  = 'today' | 'week' | 'month';

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function getDatesForPeriod(period: Period): Date[] {
  const today = new Date();
  if (period === 'today') return [today];

  if (period === 'week') {
    // Current week, up to and including today
    const sun = new Date(today);
    sun.setDate(today.getDate() - today.getDay());
    const todayKey = toKey(today);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sun);
      d.setDate(sun.getDate() + i);
      return d;
    }).filter(d => toKey(d) <= todayKey);
  }

  // month — all days from the 1st up to today
  const dates: Date[] = [];
  for (let i = 1; i <= today.getDate(); i++) {
    dates.push(new Date(today.getFullYear(), today.getMonth(), i));
  }
  return dates;
}

// ─── Score ────────────────────────────────────────────────────────────────────

export function getPeriodScore(
  period: Period,
  workouts: DayLog,
  water: DayLog,
  gymDays: number[],
): { done: number; total: number; pct: number } {
  const dates = getDatesForPeriod(period);
  let done = 0, total = 0;
  for (const d of dates) {
    const k   = toKey(d);
    const gym = isGymDay(d, gymDays);
    total += gym ? 2 : 1;
    if (gym && workouts[k]) done++;
    if (water[k]) done++;
  }
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export function scoreColor(pct: number, theme: AppThemeType): string {
  if (pct === 100) return theme.meal;
  if (pct >= 80)   return theme.warning;
  if (pct >= 50)   return theme.primary;
  return theme.textSecondary;
}

// ─── Streaks ─────────────────────────────────────────────────────────────────

/**
 * Returns how many consecutive gym days the user has completed.
 * Today's workout not yet being done does not break the streak.
 */
export function calcWorkoutStreak(workouts: DayLog, gymDays: number[]): number {
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
 * Returns how many consecutive days a given daily habit has been completed.
 * If today is already done, counting starts from today; otherwise from yesterday.
 */
export function calcHabitStreak(
  isCompleted: (dateKey: string) => boolean,
): number {
  const today    = new Date();
  const todayKey = toKey(today);
  const start    = isCompleted(todayKey) ? 0 : 1;
  let streak     = 0;
  for (let i = start; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (isCompleted(toKey(d))) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
