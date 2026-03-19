/**
 * Shared calculation utilities used across Progress and Profile screens.
 */

import { toKey, isGymDay } from '@/utils/appConstants';

type DayLog = { [dateKey: string]: boolean };
export type Period  = 'today' | 'week' | 'month';

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

/**
 * Returns weekly consistency scores for the last N weeks (Mon–Sun, newest last).
 */
export function getWeeklyScores(
  workouts: DayLog,
  water: DayLog,
  gymDays: number[],
  numWeeks: number = 8,
): { label: string; pct: number; isCurrent: boolean }[] {
  const today    = new Date();
  const todayKey = toKey(today);
  const jsDay    = today.getDay();
  const mondayDiff = jsDay === 0 ? -6 : 1 - jsDay;
  const MONTHS   = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return Array.from({ length: numWeeks }, (_, idx) => {
    const w      = numWeeks - 1 - idx; // 0 = current week
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayDiff - w * 7);
    monday.setHours(0, 0, 0, 0);

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d;
    }).filter(d => toKey(d) <= todayKey);

    let done = 0, total = 0;
    for (const d of days) {
      const k   = toKey(d);
      const gym = isGymDay(d, gymDays);
      total += gym ? 2 : 1;
      if (gym && workouts[k]) done++;
      if (water[k]) done++;
    }

    return {
      label:     w === 0 ? 'Now' : `${MONTHS[monday.getMonth()]} ${monday.getDate()}`,
      pct:       total > 0 ? Math.round((done / total) * 100) : 0,
      isCurrent: w === 0,
    };
  });
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
