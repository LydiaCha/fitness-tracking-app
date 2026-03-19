import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppTheme } from '@/constants/theme';
import { STORAGE_KEYS, toKey, getWeekDates } from '@/utils/appConstants';
import { calcHabitStreak } from '@/utils/calculations';
import { safeGetItem, safeSetItem, safeParseJSON } from '@/utils/storage';
import { logger } from '@/utils/logger';
import { useUserProfile } from '@/context/UserProfileContext';
import { MACRO_TARGETS } from '@/constants/nutritionData';

export interface HabitData {
  [dateKey: string]: { [habitId: string]: boolean };
}

// Static base — ids/emojis/colors never change; labels are dynamic via makeHabits()
export const HABITS = [
  { id: 'creatine',  label: 'Creatine (5g)',        emoji: '💊', color: AppTheme.primary },
  { id: 'protein',   label: 'Protein shake',         emoji: '🥤', color: AppTheme.secondary },
  { id: 'water',     label: 'Water goal (2.5L)',     emoji: '💧', color: AppTheme.water },
  { id: 'sleep',     label: 'Sleep on time',         emoji: '🌙', color: AppTheme.sleep },
  { id: 'vitamins',  label: 'Vitamins / Magnesium', emoji: '🫐', color: AppTheme.supplement },
  { id: 'mealprep',  label: 'Meal prepped / ready', emoji: '🍱', color: AppTheme.meal },
] as const;

/** Builds the habits array with labels that reflect the user's actual targets. */
function makeHabits(waterTargetMl: number, sleepByTime: string) {
  const waterL = (waterTargetMl / 1000).toFixed(1);
  return HABITS.map(h => {
    if (h.id === 'water') return { ...h, label: `Water goal (${waterL}L)` };
    if (h.id === 'sleep') return { ...h, label: `Sleep by ${sleepByTime}` };
    return h;
  });
}

export const HABIT_DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function useHabits() {
  const todayKey  = toKey(new Date());
  const weekDates = useMemo(getWeekDates, []);
  const { profile } = useUserProfile();

  // Derive dynamic labels from profile
  const todayDayIdx = new Date().getDay();
  const sleepByTime = profile.weekSchedule[todayDayIdx]?.sleepTime ?? '10:00 PM';
  const waterTarget = MACRO_TARGETS.water;
  const habits = useMemo(
    () => makeHabits(waterTarget, sleepByTime),
    [waterTarget, sleepByTime],
  );

  const [habitData,    setHabitData]    = useState<HabitData>({});
  const [habitsLoaded, setHabitsLoaded] = useState(false);

  useEffect(() => {
    safeGetItem(STORAGE_KEYS.HABITS).then(raw => {
      setHabitData(safeParseJSON(raw, {} as HabitData));
      setHabitsLoaded(true);
    });
  }, []);

  const saveHabitData = useCallback(async (data: HabitData) => {
    setHabitData(data);
    const ok = await safeSetItem(STORAGE_KEYS.HABITS, JSON.stringify(data));
    if (!ok) logger.warn('storage', 'habits_save', 'Failed to persist habit data');
  }, []);

  const toggleHabit = useCallback((habitId: string) => {
    setHabitData(prev => {
      const dayData = prev[todayKey] ?? {};
      const updated = { ...prev, [todayKey]: { ...dayData, [habitId]: !dayData[habitId] } };
      saveHabitData(updated);
      return updated;
    });
  }, [todayKey, saveHabitData]);

  const habitStreaks = useMemo<Record<string, number>>(
    () => Object.fromEntries(
      habits.map(h => [h.id, calcHabitStreak(k => !!habitData[k]?.[h.id])]),
    ),
    [habitData, habits],
  );

  return { habits, habitData, habitsLoaded, habitStreaks, toggleHabit, todayKey, weekDates };
}
