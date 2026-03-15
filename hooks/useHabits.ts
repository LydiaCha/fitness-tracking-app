import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppTheme } from '@/constants/theme';
import { STORAGE_KEYS, toKey, getWeekDates } from '@/utils/appConstants';
import { calcHabitStreak } from '@/utils/calculations';
import { safeGetItem, safeSetItem, safeParseJSON } from '@/utils/storage';
import { logger } from '@/utils/logger';

export interface HabitData {
  [dateKey: string]: { [habitId: string]: boolean };
}

export const HABITS = [
  { id: 'creatine',  label: 'Creatine (5g)',        emoji: '💊', color: AppTheme.primary },
  { id: 'protein',   label: 'Protein shake',         emoji: '🥤', color: AppTheme.secondary },
  { id: 'water',     label: 'Water goal (2.5L)',     emoji: '💧', color: AppTheme.water },
  { id: 'sleep',     label: 'Sleep before 9 AM',    emoji: '🌙', color: AppTheme.sleep },
  { id: 'vitamins',  label: 'Vitamins / Magnesium', emoji: '🫐', color: AppTheme.supplement },
  { id: 'mealprep',  label: 'Meal prepped / ready', emoji: '🍱', color: AppTheme.meal },
] as const;

export const HABIT_DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function useHabits() {
  const todayKey  = toKey(new Date());
  const weekDates = useMemo(getWeekDates, []);

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
      HABITS.map(h => [h.id, calcHabitStreak(k => !!habitData[k]?.[h.id])]),
    ),
    [habitData],
  );

  return { habitData, habitsLoaded, habitStreaks, toggleHabit, todayKey, weekDates };
}
