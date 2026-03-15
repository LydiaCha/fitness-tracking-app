import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { AppThemeType } from '@/constants/theme';
import { useMealPlan } from '@/context/MealPlanContext';
import { UserProfile } from '@/constants/userProfile';
import { PlanStyles } from '@/app/(tabs)/plan.styles';
import { getWeekDatesMonFirst, getTodayMonFirst } from '@/utils/appConstants';
import { DayCard } from './DayCard';
import { ShoppingPreviewCard } from './ShoppingPreviewCard';

const SHORT_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];


export function MealsContent({
  theme,
  s,
  profile,
  onViewGrocery,
}: {
  theme: AppThemeType;
  s: PlanStyles;
  profile: UserProfile | null;
  onViewGrocery: () => void;
}) {
  const router = useRouter();

  const {
    weeklyPlan,
    nextWeekPlan,
    groceryList,
    nextGroceryList,
    isGenerating,
    isGeneratingNext,
    progress,
    error,
    getMealById,
    getEntriesForDay,
    getNextWeekEntriesForDay,
    generateNextWeekPlan,
  } = useMealPlan();

  const hasPlan = weeklyPlan.length > 0;

  const [weekOffset, setWeekOffset] = useState<0 | 1>(0);

  // Generate next week in the background as soon as this week's plan is ready —
  // don't wait for the user to tap "Next Week"
  useEffect(() => {
    if (weeklyPlan.length > 0 && nextWeekPlan.length === 0 && !isGeneratingNext && profile) {
      generateNextWeekPlan(profile);
    }
  }, [weeklyPlan.length, nextWeekPlan.length, isGeneratingNext, profile]);

  const progressLabel = useMemo(() => {
    if (progress <= 1)  return 'Filtering & scoring meals…';
    if (progress <= 10) return 'Asking Claude to plan your week…';
    return `Building plan… ${progress}%`;
  }, [progress]);

  const weekDates = useMemo(() => {
    const base = getWeekDatesMonFirst();
    if (weekOffset === 0) return base;
    return base.map(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; });
  }, [weekOffset]);

  const todayMonFirst = useMemo(getTodayMonFirst, []);

  const dateRange = useMemo(() => {
    if (weekDates.length < 7) return '';
    const start = weekDates[0];
    const end   = weekDates[6];
    const startMonth = MONTH_NAMES[start.getMonth()];
    const endMonth   = MONTH_NAMES[end.getMonth()];
    const range = startMonth === endMonth
      ? `${startMonth} ${start.getDate()}–${end.getDate()}`
      : `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}`;
    return weekOffset === 1 ? `Next week · ${range}` : range;
  }, [weekDates, weekOffset]);

  return (
    <>
      <View style={s.mealsHeaderRow}>
        <Text style={s.mealsTitle}>{weekOffset === 0 ? 'This Week' : 'Next Week'}</Text>
        <View style={s.weekNavRow}>
          <TouchableOpacity
            style={[s.weekNavBtn, weekOffset === 0 && s.weekNavBtnActive]}
            onPress={() => setWeekOffset(0)}
            activeOpacity={0.8}>
            <Text style={[s.weekNavBtnText, weekOffset === 0 && s.weekNavBtnTextActive]}>This Week</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.weekNavBtn, weekOffset === 1 && s.weekNavBtnActive]}
            onPress={() => setWeekOffset(1)}
            activeOpacity={0.8}>
            <Text style={[s.weekNavBtnText, weekOffset === 1 && s.weekNavBtnTextActive]}>Next Week</Text>
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity style={s.adjustPrefsRow} onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.7}>
        <Text style={s.adjustPrefsText}>{dateRange} · Personalised to your profile</Text>
        <Text style={s.adjustPrefsLink}> · Adjust →</Text>
      </TouchableOpacity>

      <View style={s.weekStrip}>
        {weekDates.map((date, i) => {
          const isToday = i === todayMonFirst && weekOffset === 0;
          const isPast  = i < todayMonFirst && weekOffset === 0;
          return (
            <View key={i} style={[s.weekDayPill, isToday && s.weekDayPillToday, isPast && s.weekDayPillPast]}>
              <Text style={[s.weekDayPillName, isToday && s.weekDayPillNameToday]}>
                {SHORT_DAY_NAMES[i]}
              </Text>
              <Text style={[s.weekDayPillDate, isToday && s.weekDayPillDateToday]}>
                {date.getDate()}
              </Text>
            </View>
          );
        })}
      </View>

      {isGenerating && (
        <View style={s.progressBarWrapper}>
          <Text style={s.progressLabel}>{progressLabel}</Text>
          <View style={s.progressBarBg}>
            <View style={[s.progressBarFill, { width: `${Math.max(progress, 3)}%` as any }]} />
          </View>
        </View>
      )}

      {!!error && !isGenerating && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>{error}</Text>
        </View>
      )}

      {weekOffset === 0 ? (
        <>
          {hasPlan && !isGenerating && (
            <>
              <ShoppingPreviewCard groceryList={groceryList} onPress={onViewGrocery} s={s} />
              {[0, 1, 2, 3, 4, 5, 6].map(day => (
                <DayCard
                  key={day}
                  day={day}
                  date={weekDates[day]}
                  isToday={day === todayMonFirst}
                  getEntriesForDay={getEntriesForDay}
                  getMealById={getMealById}
                  s={s}
                />
              ))}
            </>
          )}
          {isGenerating && (
            <View style={s.generatingState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={s.generatingText}>Building your weekly meal plan…</Text>
            </View>
          )}
          {!hasPlan && !isGenerating && (
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>🍽️</Text>
              <Text style={s.emptyTitle}>Generating your plan…</Text>
              <Text style={s.emptyBody}>Your personalised AI meal plan is being prepared. It will be ready shortly.</Text>
            </View>
          )}
        </>
      ) : (
        <>
          {nextWeekPlan.length > 0 && !isGeneratingNext && (
            <>
              <ShoppingPreviewCard groceryList={nextGroceryList} onPress={onViewGrocery} s={s} />
              {[0, 1, 2, 3, 4, 5, 6].map(day => (
                <DayCard
                  key={day}
                  day={day}
                  date={weekDates[day]}
                  isToday={false}
                  getEntriesForDay={getNextWeekEntriesForDay}
                  getMealById={getMealById}
                  s={s}
                />
              ))}
            </>
          )}
          {isGeneratingNext && (
            <View style={s.generatingState}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={s.generatingText}>Building next week's plan…</Text>
            </View>
          )}
          {nextWeekPlan.length === 0 && !isGeneratingNext && (
            <View style={s.emptyCard}>
              <Text style={s.emptyEmoji}>📅</Text>
              <Text style={s.emptyTitle}>Next week is loading…</Text>
              <Text style={s.emptyBody}>Your plan for next week is being prepared in the background.</Text>
            </View>
          )}
        </>
      )}
    </>
  );
}
