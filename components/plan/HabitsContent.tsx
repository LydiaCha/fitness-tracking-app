import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AppThemeType } from '@/constants/theme';
import { HabitData, HABITS, HABIT_DAY_LABELS } from '@/hooks/useHabits';
import { toKey } from '@/utils/appConstants';
import { PlanStyles } from '@/app/(tabs)/plan.styles';

function HabitRow({
  habit, done, streak, onToggle, theme, s,
}: {
  habit: typeof HABITS[number];
  done: boolean;
  streak: number;
  onToggle: () => void;
  theme: AppThemeType;
  s: PlanStyles;
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

export function HabitsContent({
  habitData,
  toggleHabit,
  habitStreaks,
  weekDates,
  todayKey,
  theme,
  s,
}: {
  habitData: HabitData;
  toggleHabit: (id: string) => void;
  habitStreaks: Record<string, number>;
  weekDates: Date[];
  todayKey: string;
  theme: AppThemeType;
  s: PlanStyles;
}) {
  const todayDoneCount = HABITS.filter(h => habitData[todayKey]?.[h.id]).length;
  const totalHabits    = HABITS.length;
  const completionPct  = Math.round((todayDoneCount / totalHabits) * 100);

  return (
    <>
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
        <View style={s.habitProgressBarBg}>
          <View style={[s.habitProgressBarFill, {
            width: `${completionPct}%` as any,
            backgroundColor: completionPct === 100 ? theme.meal : theme.primary,
          }]} />
        </View>
        <Text style={s.progressCount}>{todayDoneCount} of {totalHabits} habits done</Text>
        {completionPct === 100 && (
          <Text style={s.perfectText}>Perfect day! You crushed it 💪</Text>
        )}
      </View>

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

      <View style={s.card}>
        <Text style={s.cardTitle}>This Week</Text>
        <View style={s.gridHeader}>
          <View style={s.gridHabitLabel} />
          {weekDates.map((d, i) => {
            const isToday = toKey(d) === todayKey;
            return (
              <View key={i} style={s.gridDayCell}>
                <Text style={[s.gridDayText, isToday && { color: theme.primary, fontWeight: '700' }]}>
                  {HABIT_DAY_LABELS[d.getDay()]}
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
              const key      = toKey(d);
              const done     = habitData[key]?.[habit.id] ?? false;
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
    </>
  );
}
