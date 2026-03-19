/**
 * PeakRoutine — DayLoad
 *
 * A lightweight signal representing how much accumulated demand is on the user.
 * Used as shared context across workout generation and meal planning.
 *
 * v1: based on workout completion log only (no sleep data yet).
 * Future: add sleepDebt, scheduleLoad once those data sources exist.
 *
 * High load = less capacity. Signal drives adaptation rules (Tier 2)
 * and Claude context (Tier 3). It does NOT directly modify user data.
 */

import { STORAGE_KEYS, toKey } from '@/utils/appConstants';
import { safeGetItem, safeParseJSON } from '@/utils/storage';

export type DayLoadSignal = 'fresh' | 'normal' | 'loaded' | 'depleted';

export interface DayLoad {
  /** 0 = fully depleted, 10 = fully fresh */
  score:      number;
  /** Human-readable signal for prompts and UI */
  signal:     DayLoadSignal;
  /**
   * How trustworthy the score is.
   * 'estimated' = workout log only (current state)
   * 'partial'   = workout log + schedule load
   * 'full'      = all signals including sleep
   */
  confidence: 'estimated' | 'partial' | 'full';
  /** The raw inputs used — for debugging and future expansion */
  factors: {
    consecutiveGymDays:   number;
    weeklyCompletionRate: number;  // 0.0–1.0
  };
}

/**
 * Computes today's DayLoad from the workout completion log.
 * Async because it reads from AsyncStorage.
 */
export async function computeDayLoad(gymDays: number[]): Promise<DayLoad> {
  const raw = await safeGetItem(STORAGE_KEYS.WORKOUTS);
  const log = safeParseJSON<Record<string, boolean>>(raw, {});

  const today = new Date();

  // Single pass over the last 7 days: compute consecutive streak and total count together
  let consecutiveGymDays = 0;
  let loggedThisWeek     = 0;
  let streakBroken       = false;

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const logged = !!log[toKey(d)];
    if (logged) {
      loggedThisWeek++;
      if (!streakBroken) consecutiveGymDays++;
    } else {
      streakBroken = true;
    }
  }

  const expectedPerWeek    = Math.max(gymDays.length, 1);
  const weeklyCompletionRate = Math.min(loggedThisWeek / expectedPerWeek, 1.0);

  // Score: start at 8, deduct for high consecutive load or high completion rate
  // (high completion + consecutive days = fatigue signal)
  let score = 8;
  if (consecutiveGymDays >= 4) score -= 3;
  else if (consecutiveGymDays === 3) score -= 2;
  else if (consecutiveGymDays === 2) score -= 1;

  // Very low completion could mean fatigue/illness (not just laziness at this layer)
  if (weeklyCompletionRate < 0.3 && loggedThisWeek > 0) score -= 1;

  // High volume week on top of consecutive days
  if (weeklyCompletionRate >= 0.9 && consecutiveGymDays >= 2) score -= 1;

  score = Math.max(0, Math.min(10, score));

  const signal: DayLoadSignal =
    score >= 8 ? 'fresh'    :
    score >= 5 ? 'normal'   :
    score >= 3 ? 'loaded'   :
                 'depleted';

  return {
    score,
    signal,
    confidence: 'estimated',
    factors: { consecutiveGymDays, weeklyCompletionRate },
  };
}

/** Returns a compact string for use in Claude prompts. */
export function dayLoadToPromptString(load: DayLoad): string {
  const pct = Math.round(load.factors.weeklyCompletionRate * 100);
  return `${load.signal} (score ${load.score}/10, ${load.factors.consecutiveGymDays} consecutive gym days, ${pct}% weekly completion)`;
}
