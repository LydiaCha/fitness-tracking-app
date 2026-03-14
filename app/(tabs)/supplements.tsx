import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppTheme, AppThemeType } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { STORAGE_KEYS, toKey, getWeekDates } from '@/utils/appConstants';
import { calcHabitStreak } from '@/utils/calculations';
import { safeGetItem, safeSetItem, safeParseJSON } from '@/utils/storage';
import { logger } from '@/utils/logger';

// ─── Types ───────────────────────────────────────────────────────────────────
interface HabitData {
  [dateKey: string]: { [habitId: string]: boolean };
}

// ─── Habit Definitions ───────────────────────────────────────────────────────
// Accent colours are identical in both themes — safe to use AppTheme at module level
const HABITS = [
  { id: 'creatine',  label: 'Creatine (5g)',        emoji: '💊', color: AppTheme.primary },
  { id: 'protein',   label: 'Protein shake',         emoji: '🥤', color: AppTheme.secondary },
  { id: 'water',     label: 'Water goal (2.5L)',     emoji: '💧', color: AppTheme.water },
  { id: 'sleep',     label: 'Sleep before 9 AM',    emoji: '🌙', color: AppTheme.sleep },
  { id: 'vitamins',  label: 'Vitamins / Magnesium', emoji: '🫐', color: AppTheme.supplement },
  { id: 'mealprep',  label: 'Meal prepped / ready', emoji: '🍱', color: AppTheme.meal },
] as const;

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

// ─── Styles ──────────────────────────────────────────────────────────────────
function useStyles(theme: AppThemeType) {
  return useMemo(() => StyleSheet.create({
    safe:         { flex: 1, backgroundColor: theme.bg },
    scroll:       { flex: 1 },
    scrollContent:{ paddingHorizontal: 16, paddingTop: 8 },

    header:   { marginBottom: 16 },
    title:    { fontSize: 24, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
    subtitle: { fontSize: 13, color: theme.textSecondary },

    progressCard:   { backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
    progressTitle:  { fontSize: 16, fontWeight: '700', color: theme.textPrimary },
    progressDate:   { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    progressPct:    { fontSize: 36, fontWeight: '800' },
    progressBarBg:  { height: 8, backgroundColor: theme.bgCardAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    progressBarFill:{ height: 8, borderRadius: 4 },
    progressCount:  { fontSize: 12, color: theme.textSecondary },
    perfectText:    { fontSize: 13, color: theme.meal, fontWeight: '600', marginTop: 6 },

    card:        { backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    cardTitle:   { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 10 },
    cardSubtitle:{ fontSize: 12, color: theme.textMuted, marginBottom: 14, marginTop: -6 },

    habitRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, marginBottom: 8, backgroundColor: theme.bgCardAlt },
    habitCheck:    { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
    habitCheckMark:{ fontSize: 12, color: '#fff', fontWeight: '800' },
    habitEmoji:    { fontSize: 18 },
    habitLabel:    { flex: 1, fontSize: 14, color: theme.textSecondary, fontWeight: '500' },
    streakBadge:   { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
    streakText:    { fontSize: 11, fontWeight: '700' },

    gridHeader:     { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    gridHabitLabel: { width: 32 },
    gridDayCell:    { flex: 1, alignItems: 'center' },
    gridDayText:    { fontSize: 10, color: theme.textMuted, fontWeight: '600' },
    gridDateText:   { fontSize: 9, color: theme.textMuted, marginTop: 1 },
    gridRow:        { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    gridHabitEmoji: { fontSize: 16 },
    gridDot:        { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.bgCardAlt },

    streakRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    streakEmoji:     { fontSize: 16, width: 24 },
    streakHabitLabel:{ fontSize: 12, color: theme.textSecondary, width: 130 },
    streakBarBg:     { flex: 1, height: 6, backgroundColor: theme.bgCardAlt, borderRadius: 3, overflow: 'hidden' },
    streakBarFill:   { height: 6, borderRadius: 3 },
    streakDays:      { fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right' },

    bottomPad: { height: 24 },
  }), [theme]);
}

// ─── Habit Row Component ─────────────────────────────────────────────────────
function HabitRow({
  habit, done, streak, onToggle, theme, s,
}: {
  habit: typeof HABITS[number];
  done: boolean;
  streak: number;
  onToggle: () => void;
  theme: AppThemeType;
  s: ReturnType<typeof useStyles>;
}) {
  return (
    <TouchableOpacity
      style={[s.habitRow, done && { borderColor: habit.color + '66', backgroundColor: habit.color + '10' }]}
      onPress={onToggle}
      activeOpacity={0.8}>
      <View style={[s.habitCheck, done && { backgroundColor: habit.color, borderColor: habit.color }]}>
        {done && <Text style={s.habitCheckMark}>✓</Text>}
      </View>
      <Text style={s.habitEmoji}>{habit.emoji}</Text>
      <Text style={[s.habitLabel, done && { color: theme.textPrimary }]}>{habit.label}</Text>
      {streak > 0 && (
        <View style={[s.streakBadge, { backgroundColor: habit.color + '22', borderColor: habit.color + '55' }]}>
          <Text style={[s.streakText, { color: habit.color }]}>{streak} 🔥</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function HabitsScreen() {
  const { theme, isDark } = useAppTheme();
  const s = useStyles(theme);

  const [habitData, setHabitData] = useState<HabitData>({});
  const [loading, setLoading] = useState(true);

  const todayKey = toKey(new Date());
  const weekDates = useMemo(getWeekDates, []);

  useEffect(() => {
    safeGetItem(STORAGE_KEYS.HABITS).then(raw => {
      setHabitData(safeParseJSON(raw, {} as HabitData));
      setLoading(false);
    });
  }, []);

  const saveData = useCallback(async (data: HabitData) => {
    setHabitData(data);
    const ok = await safeSetItem(STORAGE_KEYS.HABITS, JSON.stringify(data));
    if (!ok) logger.warn('storage', 'habits_save', 'Failed to persist habit data');
  }, []);

  const toggleHabit = useCallback((habitId: string) => {
    const dayData = habitData[todayKey] ?? {};
    saveData({
      ...habitData,
      [todayKey]: { ...dayData, [habitId]: !dayData[habitId] },
    });
  }, [habitData, todayKey, saveData]);

  // Compute each habit's streak once — reused in both the checklist and streak chart
  const habitStreaks = useMemo<Record<string, number>>(
    () => Object.fromEntries(
      HABITS.map(h => [h.id, calcHabitStreak(k => !!habitData[k]?.[h.id])])
    ),
    [habitData],
  );

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      </SafeAreaView>
    );
  }

  const todayDoneCount = HABITS.filter(h => habitData[todayKey]?.[h.id]).length;
  const totalHabits = HABITS.length;
  const completionPct = Math.round((todayDoneCount / totalHabits) * 100);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={s.header}>
          <Text style={s.title}>Habits</Text>
          <Text style={s.subtitle}>Daily consistency builds long-term results</Text>
        </View>

        {/* ── Today's Progress ── */}
        <View style={s.progressCard}>
          <View style={s.progressHeader}>
            <View>
              <Text style={s.progressTitle}>Today's Score</Text>
              <Text style={s.progressDate}>{new Date().toDateString()}</Text>
            </View>
            <Text style={[s.progressPct, { color: completionPct === 100 ? theme.meal : theme.primary }]}>
              {completionPct}%
            </Text>
          </View>
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, {
              width: `${completionPct}%` as any,
              backgroundColor: completionPct === 100 ? theme.meal : theme.primary,
            }]} />
          </View>
          <Text style={s.progressCount}>{todayDoneCount} of {totalHabits} habits done</Text>
          {completionPct === 100 && (
            <Text style={s.perfectText}>Perfect day! You crushed it 💪</Text>
          )}
        </View>

        {/* ── Today's Checklist ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Today's Habits</Text>
          {HABITS.map(habit => (
            <HabitRow
              key={habit.id}
              habit={habit}
              done={habitData[todayKey]?.[habit.id] ?? false}
              streak={habitStreaks[habit.id] ?? 0}
              onToggle={() => toggleHabit(habit.id)}
              theme={theme}
              s={s}
            />
          ))}
        </View>

        {/* ── This Week Grid ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>This Week</Text>
          <View style={s.gridHeader}>
            <View style={s.gridHabitLabel} />
            {weekDates.map((d, i) => {
              const isToday = toKey(d) === todayKey;
              return (
                <View key={i} style={s.gridDayCell}>
                  <Text style={[s.gridDayText, isToday && { color: theme.primary, fontWeight: '700' }]}>
                    {DAY_LABELS[d.getDay()]}
                  </Text>
                  <Text style={[s.gridDateText, isToday && { color: theme.primary }]}>
                    {d.getDate()}
                  </Text>
                </View>
              );
            })}
          </View>

          {HABITS.map(habit => (
            <View key={habit.id} style={s.gridRow}>
              <View style={s.gridHabitLabel}>
                <Text style={s.gridHabitEmoji}>{habit.emoji}</Text>
              </View>
              {weekDates.map((d, i) => {
                const key = toKey(d);
                const done = habitData[key]?.[habit.id] ?? false;
                const isFuture = key > todayKey;
                return (
                  <View key={i} style={s.gridDayCell}>
                    <View style={[
                      s.gridDot,
                      done && { backgroundColor: habit.color },
                      !done && !isFuture && { borderWidth: 1, borderColor: theme.border },
                      isFuture && { opacity: 0.2 },
                    ]} />
                  </View>
                );
              })}
            </View>
          ))}
        </View>

        {/* ── Streak Summary ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Habit Streaks</Text>
          <Text style={s.cardSubtitle}>Consecutive days each habit was completed</Text>
          {HABITS.map(habit => {
            const streak = habitStreaks[habit.id] ?? 0;
            return (
              <View key={habit.id} style={s.streakRow}>
                <Text style={s.streakEmoji}>{habit.emoji}</Text>
                <Text style={s.streakHabitLabel}>{habit.label}</Text>
                <View style={s.streakBarBg}>
                  <View style={[s.streakBarFill, {
                    width: streak > 0 ? `${Math.min((streak / 30) * 100, 100)}%` as any : 0,
                    backgroundColor: habit.color,
                  }]} />
                </View>
                <Text style={[s.streakDays, { color: streak > 0 ? habit.color : theme.textMuted }]}>
                  {streak}d
                </Text>
              </View>
            );
          })}
        </View>

        <View style={s.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}
