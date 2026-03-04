import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTheme } from '@/constants/theme';
import { WEEK_SCHEDULE, ScheduleEvent } from '@/constants/scheduleData';
import { MACRO_TARGETS, SHAKE_RECIPES, MEAL_IDEAS } from '@/constants/nutritionData';
import { getTodayId, STORAGE_KEYS, toKey, getWeekDates } from '@/utils/appConstants';
import { ChecklistItem } from '@/components/ChecklistItem';

// Returns ml of water this event represents (water + wake events only)
function getEventWaterMl(event: ScheduleEvent): number {
  if (event.type !== 'water' && event.type !== 'wake') return 0;
  const d = event.detail ?? '';
  const mlMatch = d.match(/(\d+(?:,\d+)?)\s*ml/i);
  const lMatch = d.match(/(\d+(?:\.\d+)?)\s*L\b/);
  if (mlMatch) return parseInt(mlMatch[1].replace(',', ''), 10);
  if (lMatch) return Math.round(parseFloat(lMatch[1]) * 1000);
  return event.type === 'water' ? 250 : 0;
}

// Returns macros for a meal/shake event (recipe data or parsed from detail text)
function getEventMacros(event: ScheduleEvent): { calories: number; protein: number; carbs: number; fat: number } {
  if (event.recipeId) {
    const recipe = event.recipeType === 'shake'
      ? SHAKE_RECIPES.find(r => r.id === event.recipeId)
      : MEAL_IDEAS.find(r => r.id === event.recipeId);
    if (recipe) return { calories: recipe.calories, protein: recipe.protein, carbs: recipe.carbs, fat: recipe.fat };
  }
  if (event.type !== 'meal' && event.type !== 'shake') return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const d = event.detail ?? '';
  const calMatch  = d.match(/~?(\d+)\s*kcal/i);
  const protMatch = d.match(/(\d+)g\s*protein/i);
  const carbMatch = d.match(/(\d+)g\s*carbs?/i);
  const fatMatch  = d.match(/(\d+)g\s*fat/i);
  return {
    calories: calMatch  ? parseInt(calMatch[1],  10) : 0,
    protein:  protMatch ? parseInt(protMatch[1], 10) : 0,
    carbs:    carbMatch ? parseInt(carbMatch[1], 10) : 0,
    fat:      fatMatch  ? parseInt(fatMatch[1],  10) : 0,
  };
}

function getWeekLabel(dates: Date[]): string {
  const fmt = (d: Date) => d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  const start = fmt(dates[0]);
  const end = fmt(dates[6]);
  // If same month, show "2–8 Mar"; if different, show "30 Mar – 5 Apr"
  const sameMonth = dates[0].getMonth() === dates[6].getMonth();
  if (sameMonth) {
    const month = dates[0].toLocaleDateString('en-AU', { month: 'short' });
    return `${dates[0].getDate()}–${dates[6].getDate()} ${month}`;
  }
  return `${start} – ${end}`;
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 4 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Late night hustle';
}

function getMotivation() {
  const phrases = [
    'Every rep counts. Every meal matters.',
    "Your future self is watching. Make her proud.",
    'Night shift strength. Day off gains.',
    'Consistency beats perfection.',
    'Strong body, sharp mind.',
    'Fuel the work. Earn the rest.',
    "You showed up. That's already a win.",
  ];
  return phrases[new Date().getDay()];
}


// ─── Main screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [allCheckedEvents, setAllCheckedEvents] = useState<Record<string, Set<number>>>({});
  const todayId = getTodayId();
  const [selectedDayId, setSelectedDayId] = useState(todayId);
  const today = WEEK_SCHEDULE.find(d => d.id === todayId) ?? WEEK_SCHEDULE[0];
  const selectedDay = WEEK_SCHEDULE.find(d => d.id === selectedDayId) ?? today;
  const checkedEvents = allCheckedEvents[selectedDayId] ?? new Set<number>();
  const total = selectedDay.events.length;
  const done = checkedEvents.size;
  const weekDates = useMemo(getWeekDates, []);
  const weekLabel = useMemo(() => getWeekLabel(weekDates), [weekDates]);
  const isViewingToday = selectedDayId === todayId;

  const consumed = useMemo(() => selectedDay.events.reduce(
    (acc, e, i) => {
      if (!checkedEvents.has(i)) return acc;
      const m = getEventMacros(e);
      return {
        water:    acc.water    + getEventWaterMl(e),
        calories: acc.calories + m.calories,
        protein:  acc.protein  + m.protein,
        carbs:    acc.carbs    + m.carbs,
        fat:      acc.fat      + m.fat,
      };
    },
    { water: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
  ), [selectedDay.events, checkedEvents]);

  const toggleEvent = useCallback((idx: number) => {
    const daySet = new Set(allCheckedEvents[selectedDayId] ?? []);
    daySet.has(idx) ? daySet.delete(idx) : daySet.add(idx);
    setAllCheckedEvents(prev => ({ ...prev, [selectedDayId]: daySet }));

    // Sync gym + water to Progress tab (today only)
    if (selectedDayId === todayId) {
      const todayKey = toKey(new Date());
      const event = selectedDay.events[idx];

      if (event.type === 'gym') {
        AsyncStorage.mergeItem(STORAGE_KEYS.WORKOUTS, JSON.stringify({ [todayKey]: daySet.has(idx) }));
      }

      // Recompute total water ml from updated checked set
      const totalWaterMl = selectedDay.events.reduce(
        (sum, e, i) => sum + (daySet.has(i) ? getEventWaterMl(e) : 0), 0
      );
      AsyncStorage.mergeItem(STORAGE_KEYS.WATER, JSON.stringify({ [todayKey]: totalWaterMl >= 2500 }));
    }
  }, [allCheckedEvents, selectedDayId, todayId, selectedDay.events]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={AppTheme.bg} />
      <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.greeting}>{getGreeting()}, Lydia 👋</Text>
            <Text style={s.motivation}>{getMotivation()}</Text>
          </View>
          <View style={s.weekBadge}><Text style={s.weekBadgeText}>{weekLabel}</Text></View>
        </View>

        {/* ── Day title + badges ── */}
        <View style={s.dayHeader}>
          <View style={s.dayNameRow}>
            <Text style={s.dayName}>{selectedDay.name}</Text>
            {!isViewingToday && (
              <TouchableOpacity onPress={() => setSelectedDayId(todayId)} style={s.backToTodayBtn}>
                <Text style={s.backToTodayText}>Back to Today</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={s.dayBadges}>
            {selectedDay.isGymDay && (
              <View style={[s.badge, { backgroundColor: AppTheme.gym + '25', borderColor: AppTheme.gym }]}>
                <Text style={[s.badgeText, { color: AppTheme.gym }]}>🏋️ Gym</Text>
              </View>
            )}
            {selectedDay.isRestDay && (
              <View style={[s.badge, { backgroundColor: AppTheme.rest + '25', borderColor: AppTheme.rest }]}>
                <Text style={[s.badgeText, { color: AppTheme.rest }]}>😌 Rest</Text>
              </View>
            )}
            {selectedDay.isClassDay && (
              <View style={[s.badge, { backgroundColor: AppTheme.class + '25', borderColor: AppTheme.class }]}>
                <Text style={[s.badgeText, { color: AppTheme.class }]}>📚 Class {selectedDay.classTime}</Text>
              </View>
            )}
          </View>
          {selectedDay.workoutFocus && (
            <Text style={s.workoutFocus}>Focus: {selectedDay.workoutFocus}</Text>
          )}
        </View>


        {/* ── This Week mini calendar ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📅 This Week</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.weekRow}>
            {WEEK_SCHEDULE.map((day, i) => {
              const date = weekDates[i];
              const dateNum = date.getDate();
              const isToday = day.id === todayId;
              const isSelected = day.id === selectedDayId;
              return (
                <TouchableOpacity
                  key={day.id}
                  onPress={() => setSelectedDayId(day.id)}
                  style={[s.dayPill, isSelected && s.dayPillActive]}>
                  {isToday && <View style={s.todayDot} />}
                  <Text style={[s.dayPillName, isSelected && { color: AppTheme.primary }]}>{day.shortName}</Text>
                  <Text style={[s.dayPillDate, isSelected && { color: AppTheme.primary }]}>{dateNum}</Text>
                  <View style={[s.dayPillTypeDot, {
                    backgroundColor: day.isGymDay ? AppTheme.gym : day.isRestDay ? AppTheme.rest : AppTheme.class
                  }]} />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Daily Targets ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📊 Daily Targets</Text>
          <View style={s.targetsCard}>
            {[
              { label: 'Calories', emoji: '🔥', color: AppTheme.meal,
                consumed: consumed.calories, target: MACRO_TARGETS.calories,
                valueStr: `${consumed.calories}`, targetStr: `${MACRO_TARGETS.calories} kcal` },
              { label: 'Protein',  emoji: '💪', color: AppTheme.primary,
                consumed: consumed.protein,  target: MACRO_TARGETS.protein,
                valueStr: `${consumed.protein}g`, targetStr: `${MACRO_TARGETS.protein}g` },
              { label: 'Carbs',    emoji: '🌾', color: AppTheme.water,
                consumed: consumed.carbs,    target: MACRO_TARGETS.carbs,
                valueStr: `${consumed.carbs}g`, targetStr: `${MACRO_TARGETS.carbs}g` },
              { label: 'Fat',      emoji: '🧈', color: AppTheme.supplement,
                consumed: consumed.fat,      target: MACRO_TARGETS.fat,
                valueStr: `${consumed.fat}g`, targetStr: `${MACRO_TARGETS.fat}g` },
              { label: 'Water',    emoji: '💧', color: AppTheme.secondary,
                consumed: consumed.water,    target: MACRO_TARGETS.water,
                valueStr: `${(consumed.water / 1000).toFixed(1)}L`, targetStr: `${MACRO_TARGETS.water / 1000}L` },
            ].map((item, idx, arr) => {
              const pct = Math.min((item.consumed / item.target) * 100, 100);
              const isLast = idx === arr.length - 1;
              return (
                <View key={item.label} style={[s.targetRow, !isLast && s.targetRowBorder]}>
                  <Text style={s.targetRowEmoji}>{item.emoji}</Text>
                  <Text style={s.targetRowLabel}>{item.label}</Text>
                  <View style={s.targetRowBar}>
                    <View style={[s.targetRowFill, { width: `${pct}%` as any, backgroundColor: item.color }]} />
                  </View>
                  <Text style={[s.targetRowValue, { color: item.consumed > 0 ? item.color : AppTheme.textSecondary }]}>
                    {item.valueStr}
                    <Text style={s.targetRowSep}> / </Text>
                    <Text style={s.targetRowTotal}>{item.targetStr}</Text>
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Schedule checklist ── */}
        <View style={s.section}>
          <View style={s.checklistTitleRow}>
            <Text style={s.sectionTitle}>
              📋 {isViewingToday ? "Today's Schedule" : `${selectedDay.name}'s Schedule`}
            </Text>
            <Text style={s.checklistProgress}>{done}/{total} done</Text>
          </View>

          {/* Progress bar */}
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${total > 0 ? (done / total) * 100 : 0}%` as any }]} />
          </View>

          {done === total && total > 0 && (
            <View style={s.allDone}>
              <Text style={s.allDoneText}>
                {isViewingToday ? '🎉 You crushed it today, Lydia!' : `🎉 All done for ${selectedDay.name}!`}
              </Text>
            </View>
          )}

          <View style={s.timeline}>
            {selectedDay.events.map((event, idx) => (
              <ChecklistItem
                key={`${selectedDayId}-${idx}`}
                event={event}
                done={checkedEvents.has(idx)}
                isLast={idx === total - 1}
                onToggle={() => toggleEvent(idx)}
              />
            ))}
          </View>
        </View>

        <View style={s.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: AppTheme.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8 },

  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 22, fontWeight: '700', color: AppTheme.textPrimary, marginBottom: 3 },
  motivation: { fontSize: 13, color: AppTheme.textSecondary },
  weekBadge: { backgroundColor: AppTheme.primary + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: AppTheme.primary + '55' },
  weekBadgeText: { color: AppTheme.primary, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  // Day header
  dayHeader: { marginBottom: 14 },
  dayNameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  dayName: { fontSize: 30, fontWeight: '800', color: AppTheme.textPrimary },
  backToTodayBtn: { backgroundColor: AppTheme.primary + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1, borderColor: AppTheme.primary + '55' },
  backToTodayText: { fontSize: 11, fontWeight: '700', color: AppTheme.primary },
  dayBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  badge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  workoutFocus: { fontSize: 13, color: AppTheme.textSecondary },

  // Daily Targets card
  targetsCard: { backgroundColor: AppTheme.bgCard, borderRadius: 16, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, borderWidth: 1, borderColor: AppTheme.border },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10 },
  targetRowBorder: { borderBottomWidth: 1, borderBottomColor: AppTheme.border },
  targetRowEmoji: { fontSize: 15, width: 22, textAlign: 'center' },
  targetRowLabel: { fontSize: 12, color: AppTheme.textSecondary, width: 58 },
  targetRowBar: { flex: 1, height: 4, backgroundColor: AppTheme.bgCardAlt, borderRadius: 2, overflow: 'hidden' },
  targetRowFill: { height: 4, borderRadius: 2 },
  targetRowValue: { fontSize: 12, fontWeight: '700', textAlign: 'right', minWidth: 42 },
  targetRowSep: { fontSize: 11, color: AppTheme.textMuted, fontWeight: '400' },
  targetRowTotal: { fontSize: 11, color: AppTheme.textMuted, fontWeight: '400' },

  // Section
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: AppTheme.textPrimary, marginBottom: 10 },

  // Checklist header
  checklistTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  checklistProgress: { fontSize: 13, fontWeight: '700', color: AppTheme.primary },
  progressBg: { height: 4, backgroundColor: AppTheme.bgCardAlt, borderRadius: 2, marginBottom: 12, overflow: 'hidden' },
  progressFill: { height: 4, backgroundColor: AppTheme.primary, borderRadius: 2 },
  allDone: { backgroundColor: AppTheme.success + '22', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: AppTheme.success + '44', marginBottom: 10 },
  allDoneText: { fontSize: 13, color: AppTheme.success, textAlign: 'center', fontWeight: '600' },
  timeline: { paddingLeft: 2 },

  // Weekly calendar
  weekRow: { gap: 10, paddingRight: 16 },
  dayPill: { backgroundColor: AppTheme.bgCard, borderRadius: 12, padding: 12, alignItems: 'center', minWidth: 68, borderWidth: 1, borderColor: AppTheme.border },
  dayPillActive: { borderColor: AppTheme.primary, backgroundColor: AppTheme.primary + '15' },
  todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: AppTheme.primary, marginBottom: 4 },
  dayPillName: { fontSize: 11, fontWeight: '700', color: AppTheme.textSecondary, letterSpacing: 0.5, marginBottom: 2 },
  dayPillDate: { fontSize: 18, fontWeight: '800', color: AppTheme.textPrimary, marginBottom: 6 },
  dayPillTypeDot: { width: 6, height: 6, borderRadius: 3 },

  bottomPad: { height: 24 },
});
