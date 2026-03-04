import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTheme } from '@/constants/theme';

// ─── Types ───────────────────────────────────────────────────────────────────
interface HabitData {
  [dateKey: string]: { [habitId: string]: boolean };
}

// ─── Habit Definitions ───────────────────────────────────────────────────────
const HABITS = [
  { id: 'creatine',   label: 'Creatine (5g)',       emoji: '💊', color: AppTheme.primary },
  { id: 'protein',    label: 'Protein shake',        emoji: '🥤', color: AppTheme.secondary },
  { id: 'water',      label: 'Water goal (2.5L)',    emoji: '💧', color: AppTheme.water },
  { id: 'sleep',      label: 'Sleep before 9 AM',   emoji: '🌙', color: AppTheme.sleep },
  { id: 'vitamins',   label: 'Vitamins / Magnesium', emoji: '🫐', color: AppTheme.supplement },
  { id: 'mealprep',   label: 'Meal prepped / ready', emoji: '🍱', color: AppTheme.meal },
] as const;

// ─── Storage ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = '@lydia/habits';

function toDateKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function getWeekDates(): Date[] {
  const today = new Date();
  const dow = today.getDay();
  const sunday = new Date(today);
  sunday.setDate(today.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    return d;
  });
}

function calcHabitStreak(habitId: string, data: HabitData): number {
  const today = new Date();
  const todayKey = toDateKey(today);
  const todayDone = data[todayKey]?.[habitId];
  const startOffset = todayDone ? 0 : 1;
  let streak = 0;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toDateKey(d);
    if (data[key]?.[habitId]) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ─── Habit Row Component ─────────────────────────────────────────────────────
function HabitRow({
  habit,
  done,
  streak,
  onToggle,
}: {
  habit: typeof HABITS[number];
  done: boolean;
  streak: number;
  onToggle: () => void;
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
      <Text style={[s.habitLabel, done && { color: AppTheme.textPrimary }]}>{habit.label}</Text>
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
  const [habitData, setHabitData] = useState<HabitData>({});
  const [loading, setLoading] = useState(true);

  const todayKey = toDateKey(new Date());
  const weekDates = getWeekDates();
  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (raw) setHabitData(JSON.parse(raw));
      setLoading(false);
    });
  }, []);

  const saveData = useCallback(async (data: HabitData) => {
    setHabitData(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const toggleHabit = useCallback((habitId: string) => {
    const dayData = habitData[todayKey] ?? {};
    const updated: HabitData = {
      ...habitData,
      [todayKey]: { ...dayData, [habitId]: !dayData[habitId] },
    };
    saveData(updated);
  }, [habitData, todayKey, saveData]);

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle="light-content" backgroundColor={AppTheme.bg} />
      </SafeAreaView>
    );
  }

  const todayDoneCount = HABITS.filter(h => habitData[todayKey]?.[h.id]).length;
  const totalHabits = HABITS.length;
  const completionPct = Math.round((todayDoneCount / totalHabits) * 100);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={AppTheme.bg} />
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
            <Text style={[s.progressPct, { color: completionPct === 100 ? AppTheme.meal : AppTheme.primary }]}>
              {completionPct}%
            </Text>
          </View>
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, {
              width: `${completionPct}%` as any,
              backgroundColor: completionPct === 100 ? AppTheme.meal : AppTheme.primary,
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
              streak={calcHabitStreak(habit.id, habitData)}
              onToggle={() => toggleHabit(habit.id)}
            />
          ))}
        </View>

        {/* ── This Week Grid ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>This Week</Text>
          <View style={s.gridHeader}>
            <View style={s.gridHabitLabel} />
            {weekDates.map((d, i) => {
              const isToday = toDateKey(d) === todayKey;
              return (
                <View key={i} style={s.gridDayCell}>
                  <Text style={[s.gridDayText, isToday && { color: AppTheme.primary, fontWeight: '700' }]}>
                    {dayLabels[d.getDay()]}
                  </Text>
                  <Text style={[s.gridDateText, isToday && { color: AppTheme.primary }]}>
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
                const key = toDateKey(d);
                const done = habitData[key]?.[habit.id] ?? false;
                const isFuture = key > todayKey;
                return (
                  <View key={i} style={s.gridDayCell}>
                    <View style={[
                      s.gridDot,
                      done && { backgroundColor: habit.color },
                      !done && !isFuture && { borderWidth: 1, borderColor: AppTheme.border },
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
            const streak = calcHabitStreak(habit.id, habitData);
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
                <Text style={[s.streakDays, { color: streak > 0 ? habit.color : AppTheme.textMuted }]}>
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

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.bg },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 8 },

  header: { marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: AppTheme.textPrimary, marginBottom: 4 },
  subtitle: { fontSize: 13, color: AppTheme.textSecondary },

  progressCard: { backgroundColor: AppTheme.bgCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: AppTheme.border },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  progressTitle: { fontSize: 16, fontWeight: '700', color: AppTheme.textPrimary },
  progressDate: { fontSize: 12, color: AppTheme.textMuted, marginTop: 2 },
  progressPct: { fontSize: 36, fontWeight: '800' },
  progressBarBg: { height: 8, backgroundColor: AppTheme.bgCardAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressBarFill: { height: 8, borderRadius: 4 },
  progressCount: { fontSize: 12, color: AppTheme.textSecondary },
  perfectText: { fontSize: 13, color: AppTheme.meal, fontWeight: '600', marginTop: 6 },

  card: { backgroundColor: AppTheme.bgCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: AppTheme.border },
  cardTitle: { fontSize: 16, fontWeight: '700', color: AppTheme.textPrimary, marginBottom: 10 },
  cardSubtitle: { fontSize: 12, color: AppTheme.textMuted, marginBottom: 14, marginTop: -6 },

  habitRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, paddingHorizontal: 12,
    borderRadius: 12, borderWidth: 1, borderColor: AppTheme.border, marginBottom: 8,
    backgroundColor: AppTheme.bgCardAlt,
  },
  habitCheck: {
    width: 22, height: 22, borderRadius: 11, borderWidth: 2,
    borderColor: AppTheme.border, alignItems: 'center', justifyContent: 'center',
  },
  habitCheckMark: { fontSize: 12, color: '#fff', fontWeight: '800' },
  habitEmoji: { fontSize: 18 },
  habitLabel: { flex: 1, fontSize: 14, color: AppTheme.textSecondary, fontWeight: '500' },
  streakBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1 },
  streakText: { fontSize: 11, fontWeight: '700' },

  gridHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  gridHabitLabel: { width: 32 },
  gridDayCell: { flex: 1, alignItems: 'center' },
  gridDayText: { fontSize: 10, color: AppTheme.textMuted, fontWeight: '600' },
  gridDateText: { fontSize: 9, color: AppTheme.textMuted, marginTop: 1 },
  gridRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  gridHabitEmoji: { fontSize: 16 },
  gridDot: { width: 18, height: 18, borderRadius: 9, backgroundColor: AppTheme.bgCardAlt },

  streakRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  streakEmoji: { fontSize: 16, width: 24 },
  streakHabitLabel: { fontSize: 12, color: AppTheme.textSecondary, width: 130 },
  streakBarBg: { flex: 1, height: 6, backgroundColor: AppTheme.bgCardAlt, borderRadius: 3, overflow: 'hidden' },
  streakBarFill: { height: 6, borderRadius: 3 },
  streakDays: { fontSize: 12, fontWeight: '700', width: 28, textAlign: 'right' },

  bottomPad: { height: 24 },
});
