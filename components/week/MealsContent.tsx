import React, { useState, useEffect, useMemo, useRef } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { AppThemeType } from '@/constants/theme';
import { useMealPlan } from '@/context/MealPlanContext';
import { useWeeklyPlan } from '@/context/WeeklyPlanContext';
import { UserProfile } from '@/constants/userProfile';
import { WeekStyles } from '@/app/(tabs)/week.styles';
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
  s: WeekStyles;
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
    lastGeneratedAt,
    planIsStale,
    getMealById,
    getEntriesForDay,
    getNextWeekEntriesForDay,
    generateNextWeekPlan,
  } = useMealPlan();

  const { generateWeeklyPlan } = useWeeklyPlan();
  const [staleDismissed, setStaleDismissed] = useState(false);

  const updatedLabel = useMemo(() => {
    if (!lastGeneratedAt) return null;
    const diffMs = Date.now() - new Date(lastGeneratedAt).getTime();
    const mins   = Math.floor(diffMs / 60_000);
    const hours  = Math.floor(diffMs / 3_600_000);
    const days   = Math.floor(diffMs / 86_400_000);
    if (mins < 2)    return 'Updated just now';
    if (mins < 60)   return `Updated ${mins}m ago`;
    if (hours < 24)  return `Updated ${hours}h ago`;
    return `Updated ${days}d ago`;
  }, [lastGeneratedAt]);

  const hasPlan = weeklyPlan.length > 0;

  const [weekOffset, setWeekOffset] = useState<0 | 1>(0);

  const { width: screenWidth } = useWindowDimensions();
  const stripWidth = screenWidth - 32; // scrollContent paddingHorizontal: 16 × 2
  const stripRef = useRef<ScrollView>(null);

  function goToWeek(offset: 0 | 1) {
    setWeekOffset(offset);
    stripRef.current?.scrollTo({ x: offset * stripWidth, animated: true });
  }

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

  const thisWeekDates = useMemo(() => getWeekDatesMonFirst(), []);
  const nextWeekDates = useMemo(
    () => thisWeekDates.map(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; }),
    [thisWeekDates],
  );
  const weekDates = weekOffset === 0 ? thisWeekDates : nextWeekDates;

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
      </View>

      <View style={[s.adjustPrefsRow, { flexDirection: 'row', alignItems: 'center' }]}>
        <Text style={[s.adjustPrefsText, { flex: 1 }]} numberOfLines={1}>
          {dateRange} · {updatedLabel ?? 'Personalised to your profile'}
        </Text>
        {weekOffset === 0 && (
          <Text style={{ fontSize: 11, color: theme.textMuted }}>Next week →</Text>
        )}
      </View>
      <View style={s.adjustCtaRow}>
        <TouchableOpacity style={s.adjustCtaBtn} onPress={() => router.push('/my-health')} activeOpacity={0.7}>
          <Text style={s.adjustCtaText}>🎯 Edit targets</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.adjustCtaBtn} onPress={() => router.push('/food-preferences')} activeOpacity={0.7}>
          <Text style={s.adjustCtaText}>🥗 Food preferences</Text>
        </TouchableOpacity>
      </View>

      {/* ── Stale plan banner ── */}
      {planIsStale && !staleDismissed && weekOffset === 0 && !isGenerating && (
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 10,
          backgroundColor: theme.warning + '18',
          borderWidth: 1, borderColor: theme.warning + '55',
          borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
          marginBottom: 16,
        }}>
          <Text style={{ fontSize: 16 }}>⚠️</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.warning, marginBottom: 2 }}>
              Plan may not match your preferences
            </Text>
            <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 17 }}>
              Your dietary restrictions or goal changed since this plan was generated.
            </Text>
          </View>
          <View style={{ gap: 6, alignItems: 'flex-end' }}>
            <TouchableOpacity
              onPress={() => generateWeeklyPlan()}
              activeOpacity={0.8}
              style={{ backgroundColor: theme.warning, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>Regenerate</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setStaleDismissed(true)} activeOpacity={0.7}>
              <Text style={{ fontSize: 11, color: theme.textMuted }}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <ScrollView
        ref={stripRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 20 }}
        onMomentumScrollEnd={(e) => {
          const page = Math.round(e.nativeEvent.contentOffset.x / stripWidth);
          setWeekOffset((Math.min(1, Math.max(0, page))) as 0 | 1);
        }}>
        {([thisWeekDates, nextWeekDates] as const).map((dates, wk) => (
          <View key={wk} style={{ width: stripWidth, flexDirection: 'row', gap: 5 }}>
            {dates.map((date, i) => {
              const isToday = i === todayMonFirst && wk === 0;
              const isPast  = i < todayMonFirst && wk === 0;
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
        ))}
      </ScrollView>
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
                  isPast={day < todayMonFirst}
                  getEntriesForDay={getEntriesForDay}
                  getMealById={getMealById}
                  s={s}
                />
              ))}
            </>
          )}
          {isGenerating && (
            <View style={s.generatingState}>
              <ActivityIndicator size="large" color={theme.meal} />
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
              <ActivityIndicator size="large" color={theme.meal} />
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
