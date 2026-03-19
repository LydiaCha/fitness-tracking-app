/**
 * Unit tests for utils/calculations.ts
 *
 * Tests pin "today" to Saturday 2026-03-14 (day-of-week = 6).
 * Calendar from today going back:
 *   daysAgo(0) = 2026-03-14 Sat (gym)
 *   daysAgo(1) = 2026-03-13 Fri (rest)
 *   daysAgo(2) = 2026-03-12 Thu (gym)
 *   daysAgo(3) = 2026-03-11 Wed (gym)
 *   daysAgo(4) = 2026-03-10 Tue (gym)
 *   daysAgo(5) = 2026-03-09 Mon (gym)
 *   daysAgo(6) = 2026-03-08 Sun (rest)
 *   daysAgo(7) = 2026-03-07 Sat (gym)
 */

import { calcWorkoutStreak } from '@/utils/streak';
import {
  calcHabitStreak,
  getPeriodScore,
} from '@/utils/calculations';

const TODAY = new Date('2026-03-14T12:00:00.000Z');

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(TODAY);
});

afterEach(() => {
  jest.useRealTimers();
});

const key = (d: Date) => d.toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() - n);
  return key(d);
};

// Mon(1) Tue(2) Wed(3) Thu(4) Sat(6)
const GYM_DAYS = [1, 2, 3, 4, 6];

// ─── calcWorkoutStreak ────────────────────────────────────────────────────────

describe('calcWorkoutStreak', () => {
  test('returns 0 when no workouts logged', () => {
    expect(calcWorkoutStreak({}, GYM_DAYS)).toBe(0);
  });

  test("today (Sat) not done yet doesn't break streak from Thu (daysAgo 2)", () => {
    // Only Thu done; today (Sat) undone uses the i===0 exception, Fri is skipped
    const workouts = { [daysAgo(2)]: true };
    expect(calcWorkoutStreak(workouts, GYM_DAYS)).toBe(1);
  });

  test('counts 3 consecutive gym days: Sat, Thu, Wed', () => {
    const workouts = {
      [daysAgo(0)]: true, // Sat
      [daysAgo(2)]: true, // Thu
      [daysAgo(3)]: true, // Wed
    };
    expect(calcWorkoutStreak(workouts, GYM_DAYS)).toBe(3);
  });

  test('streak breaks when Thu (daysAgo 2) is missing', () => {
    // Sat done, Thu missing → streak stops after Sat
    const workouts = {
      [daysAgo(0)]: true, // Sat
      [daysAgo(3)]: true, // Wed (unreachable through the break)
    };
    expect(calcWorkoutStreak(workouts, GYM_DAYS)).toBe(1);
  });

  test('non-gym days (Fri, Sun) are skipped and do not break streak', () => {
    // Sat and Thu done; Fri between them is a rest day and skipped
    const workouts = {
      [daysAgo(0)]: true, // Sat
      [daysAgo(2)]: true, // Thu
    };
    expect(calcWorkoutStreak(workouts, GYM_DAYS)).toBe(2);
  });
});

// ─── calcHabitStreak ─────────────────────────────────────────────────────────

describe('calcHabitStreak', () => {
  test('returns 0 when no completions', () => {
    expect(calcHabitStreak(() => false)).toBe(0);
  });

  test('counts streak starting from today when today is done', () => {
    const done = new Set([daysAgo(0), daysAgo(1), daysAgo(2)]);
    expect(calcHabitStreak(k => done.has(k))).toBe(3);
  });

  test('counts streak from yesterday when today is not done', () => {
    const done = new Set([daysAgo(1), daysAgo(2), daysAgo(3)]);
    expect(calcHabitStreak(k => done.has(k))).toBe(3);
  });

  test('breaks on first gap in the streak', () => {
    // Today and yesterday done, 2 days ago missing, 3 days ago done
    const done = new Set([daysAgo(0), daysAgo(1), daysAgo(3)]);
    expect(calcHabitStreak(k => done.has(k))).toBe(2);
  });

  test('returns 0 when only a non-consecutive past day is done', () => {
    const done = new Set([daysAgo(5)]);
    expect(calcHabitStreak(k => done.has(k))).toBe(0);
  });
});

// ─── getPeriodScore ───────────────────────────────────────────────────────────

describe('getPeriodScore', () => {
  const k = key(TODAY); // 2026-03-14 (Sat = gym day)

  test('gym day, all done → 2/2, 100%', () => {
    expect(getPeriodScore('today', { [k]: true }, { [k]: true }, GYM_DAYS))
      .toEqual({ done: 2, total: 2, pct: 100 });
  });

  test('gym day, only water done → 1/2, 50%', () => {
    expect(getPeriodScore('today', {}, { [k]: true }, GYM_DAYS))
      .toEqual({ done: 1, total: 2, pct: 50 });
  });

  test('gym day, nothing done → 0/2, 0%', () => {
    expect(getPeriodScore('today', {}, {}, GYM_DAYS))
      .toEqual({ done: 0, total: 2, pct: 0 });
  });

  test('rest day, only water possible → 1/1, 100%', () => {
    // Sun (daysAgo 6) is a rest day — no gym points
    const sun = daysAgo(6);
    jest.setSystemTime(new Date('2026-03-08T12:00:00.000Z'));
    expect(getPeriodScore('today', {}, { [sun]: true }, GYM_DAYS))
      .toEqual({ done: 1, total: 1, pct: 100 });
  });
});

