import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { AppThemeType } from '@/constants/theme';
import { WeekStyles } from '@/app/(tabs)/week.styles';
import { WEEK_SCHEDULE, DaySchedule } from '@/constants/scheduleData';
import { useWeeklyPlan } from '@/context/WeeklyPlanContext';
import {
  getWeekDatesMonFirst, getTodayMonFirst, STORAGE_KEYS, toKey,
} from '@/utils/appConstants';
import { safeGetItem, safeParseJSON } from '@/utils/storage';
import {
  WORKOUT_FOCUS_OPTIONS, getFocusOption, getDefaultExercisesForFocus,
} from '@/constants/exerciseRegistry';

// ─── Constants ────────────────────────────────────────────────────────────────

const SHORT_DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const FULL_DAY_NAMES  = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_NAMES     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

// ─── WorkoutDayCard ───────────────────────────────────────────────────────────

function WorkoutDayCard({
  day, date, dayIndex, isToday, isPast, isCompleted, isNextWeek,
  onChangeFocus, theme,
}: {
  day:            DaySchedule;
  date:           Date;
  dayIndex:       number;
  isToday:        boolean;
  isPast:         boolean;
  isCompleted:    boolean;
  isNextWeek:     boolean;
  onChangeFocus?: (focus: string) => void;
  theme:          AppThemeType;
}) {
  const [expanded, setExpanded] = useState(isToday && !!day.isGymDay);
  const gymColor   = theme.gym;
  const gymEvent   = day.events.find(e => e.type === 'gym');
  const yogaEvent  = day.events.find(e => e.type === 'yoga');
  const isGymDay   = !!day.isGymDay;
  const isActiveRecovery = day.workoutType === 'Active Recovery';

  const activeOption = useMemo(
    () => day.workoutFocus ? getFocusOption(day.workoutFocus) : undefined,
    [day.workoutFocus],
  );

  // Top-3 exercises for preview
  const exercisePreview = useMemo(() => {
    if (!isGymDay || !day.workoutFocus) return null;
    const exs = getDefaultExercisesForFocus(day.workoutFocus).slice(0, 3);
    return exs.map(e => e.name).join(' · ');
  }, [isGymDay, day.workoutFocus]);

  const dateLabel = `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;

  // ── Rest day — compact row ────────────────────────────────────────────────
  if (!isGymDay && !isActiveRecovery) {
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 12,
        backgroundColor: theme.bgCard,
        borderRadius: 12, borderWidth: 1, borderColor: theme.border,
        marginBottom: 8, opacity: isPast ? 0.5 : 1,
        gap: 10,
      }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.textMuted, width: 30 }}>
          {SHORT_DAY_NAMES[dayIndex]}
        </Text>
        <Text style={{ fontSize: 12, color: theme.textMuted }}>{dateLabel}</Text>
        <Text style={{ flex: 1, fontSize: 12, color: theme.textMuted }}>😌 Rest</Text>
      </View>
    );
  }

  // ── Active recovery — compact row ─────────────────────────────────────────
  if (!isGymDay && isActiveRecovery) {
    return (
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 12,
        backgroundColor: theme.bgCard,
        borderRadius: 12, borderWidth: 1, borderColor: theme.border,
        marginBottom: 8, opacity: isPast ? 0.5 : 1,
        gap: 10,
      }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.success, width: 30 }}>
          {SHORT_DAY_NAMES[dayIndex]}
        </Text>
        <Text style={{ fontSize: 12, color: theme.textMuted }}>{dateLabel}</Text>
        <Text style={{ flex: 1, fontSize: 12, color: theme.success }}>
          🧘 Active Recovery
          {yogaEvent ? ` · ${yogaEvent.duration ?? ''}` : ''}
        </Text>
      </View>
    );
  }

  // ── Gym day — full card ───────────────────────────────────────────────────
  return (
    <View style={{
      backgroundColor: theme.bgCard,
      borderRadius: 16, borderWidth: 1,
      borderColor: isCompleted
        ? theme.success + '55'
        : isToday
          ? gymColor + '55'
          : theme.border,
      marginBottom: 10,
      overflow: 'hidden',
      opacity: isPast && !isCompleted ? 0.5 : 1,
    }}>
      {/* Header */}
      <TouchableOpacity
        onPress={() => setExpanded(e => !e)}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row', alignItems: 'center',
          padding: 14, gap: 10,
        }}>

        {/* Day + date */}
        <View style={{ minWidth: 42 }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: isToday ? gymColor : theme.textPrimary }}>
            {FULL_DAY_NAMES[dayIndex]}
          </Text>
          <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>{dateLabel}</Text>
        </View>

        {/* Workout info */}
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary }}>
              {activeOption?.emoji ?? '🏋️'} {day.workoutType ?? 'Gym'}
            </Text>
            {isToday && (
              <View style={{
                backgroundColor: gymColor, borderRadius: 5,
                paddingHorizontal: 6, paddingVertical: 1,
              }}>
                <Text style={{ fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 0.5 }}>TODAY</Text>
              </View>
            )}
            {isCompleted && (
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.success }}>✓ Done</Text>
            )}
          </View>
          <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }} numberOfLines={1}>
            {activeOption?.detail ?? day.workoutFocus ?? ''}
          </Text>
        </View>

        {/* Duration pill */}
        {gymEvent?.duration && (
          <View style={{
            borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
            backgroundColor: gymColor + '18', borderWidth: 1, borderColor: gymColor + '44',
          }}>
            <Text style={{ fontSize: 10, fontWeight: '700', color: gymColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>
              {gymEvent.duration}
            </Text>
          </View>
        )}

        <Text style={[{ fontSize: 14, color: expanded ? gymColor : theme.textMuted }, expanded && { transform: [{ rotate: '90deg' }] }]}>
          ›
        </Text>
      </TouchableOpacity>

      {/* Expanded content */}
      {expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14 }}>

          {/* Exercise preview */}
          {exercisePreview && (
            <Text style={{ fontSize: 12, color: theme.textSecondary, marginBottom: 12, lineHeight: 18 }}>
              {exercisePreview}
              <Text style={{ color: theme.textMuted }}> +more</Text>
            </Text>
          )}

          {/* Focus swap pills — only editable for current/future days */}
          {onChangeFocus ? (
            <View style={{ marginBottom: 12 }}>
              <Text style={{
                fontSize: 10, fontWeight: '700', color: theme.textMuted,
                textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
              }}>
                Change focus
              </Text>
              <ScrollView
                horizontal showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6 }}>
                {WORKOUT_FOCUS_OPTIONS.map(opt => {
                  const active = activeOption?.key === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      onPress={() => !active && onChangeFocus(opt.focusString)}
                      activeOpacity={active ? 1 : 0.7}
                      style={{
                        flexDirection: 'row', alignItems: 'center', gap: 4,
                        paddingHorizontal: 10, paddingVertical: 6,
                        borderRadius: 10, borderWidth: 1,
                        backgroundColor: active ? gymColor + '22' : theme.bgCardAlt,
                        borderColor:     active ? gymColor + '88' : theme.border,
                      }}>
                      <Text style={{ fontSize: 13 }}>{opt.emoji}</Text>
                      <Text style={{
                        fontSize: 12,
                        fontWeight: active ? '700' : '400',
                        color: active ? gymColor : theme.textSecondary,
                      }}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          ) : isPast ? (
            // Past day — show completion status, no editing
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 8,
              marginBottom: 12, paddingVertical: 10, paddingHorizontal: 12,
              backgroundColor: isCompleted ? theme.success + '12' : theme.bgCardAlt,
              borderRadius: 8, borderWidth: 1,
              borderColor: isCompleted ? theme.success + '33' : theme.border,
            }}>
              <Text style={{ fontSize: 13, fontWeight: '600', color: isCompleted ? theme.success : theme.textMuted }}>
                {isCompleted ? '✓ Completed' : '— Not logged'}
              </Text>
            </View>
          ) : (
            // Next week — read-only focus label
            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: 6,
              marginBottom: 12, padding: 8,
              backgroundColor: gymColor + '0e', borderRadius: 8,
            }}>
              <Text style={{ fontSize: 11, color: theme.textMuted, flex: 1 }}>
                Same split as this week · Focus adjustments apply week-by-week from Today
              </Text>
            </View>
          )}

          {/* Exercises from registry (structured, not text-parsed) */}
          {day.workoutFocus && (
            <View style={{ gap: 6 }}>
              <Text style={{
                fontSize: 10, fontWeight: '700', color: theme.textMuted,
                textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
              }}>
                Exercises
              </Text>
              {getDefaultExercisesForFocus(day.workoutFocus).map((ex, i) => (
                <View key={ex.id} style={{
                  flexDirection: 'row', alignItems: 'flex-start', gap: 8,
                  paddingVertical: 6,
                  borderBottomWidth: i < getDefaultExercisesForFocus(day.workoutFocus).length - 1 ? 1 : 0,
                  borderBottomColor: theme.border,
                }}>
                  <View style={{
                    width: 6, height: 6, borderRadius: 3,
                    backgroundColor: gymColor, marginTop: 5,
                  }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textPrimary }}>
                      {ex.name}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>
                      {ex.primaryMuscle} · {ex.equipment}
                    </Text>
                  </View>
                  {ex.isCompound && (
                    <View style={{
                      backgroundColor: gymColor + '18', borderRadius: 4,
                      paddingHorizontal: 5, paddingVertical: 1, alignSelf: 'center',
                    }}>
                      <Text style={{ fontSize: 9, fontWeight: '700', color: gymColor, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                        Compound
                      </Text>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── WorkoutContent ───────────────────────────────────────────────────────────

export function WorkoutContent({ theme, s }: { theme: AppThemeType; s: WeekStyles }) {
  const { weeklySchedule, setDayWorkoutFocus } = useWeeklyPlan();
  const schedule = weeklySchedule ?? WEEK_SCHEDULE;

  const { width: screenWidth } = useWindowDimensions();
  const stripWidth = screenWidth - 32;
  const stripRef   = useRef<ScrollView>(null);

  const [weekOffset, setWeekOffset] = useState<0 | 1>(0);

  const thisWeekDates = useMemo(getWeekDatesMonFirst, []);
  const nextWeekDates = useMemo(
    () => thisWeekDates.map(d => { const n = new Date(d); n.setDate(d.getDate() + 7); return n; }),
    [thisWeekDates],
  );
  const weekDates     = weekOffset === 0 ? thisWeekDates : nextWeekDates;
  const todayMonFirst = useMemo(getTodayMonFirst, []);

  // Completion state — refreshed every time this tab comes into focus
  // Reads from the same key that Today writes to when a gym event is checked
  const [completedDates, setCompletedDates] = useState<Record<string, boolean>>({});
  useFocusEffect(useCallback(() => {
    safeGetItem(STORAGE_KEYS.WORKOUTS).then(raw =>
      setCompletedDates(safeParseJSON(raw, {})),
    );
  }, []));

  // Stats
  const gymDays = useMemo(() => schedule.filter(d => d.isGymDay), [schedule]);
  const totalMinutes = useMemo(() => gymDays.reduce((acc, d) => {
    const dur   = d.events.find(e => e.type === 'gym')?.duration ?? '';
    const match = dur.match(/(\d+)/);
    return acc + (match ? parseInt(match[1]) : 0);
  }, 0), [gymDays]);

  // Date range label
  const dateRange = useMemo(() => {
    if (weekDates.length < 7) return '';
    const start = weekDates[0];
    const end   = weekDates[6];
    const sm = MONTH_NAMES[start.getMonth()];
    const em = MONTH_NAMES[end.getMonth()];
    const range = sm === em
      ? `${sm} ${start.getDate()}–${end.getDate()}`
      : `${sm} ${start.getDate()} – ${em} ${end.getDate()}`;
    return weekOffset === 1 ? `Next week · ${range}` : range;
  }, [weekDates, weekOffset]);

  function goToWeek(offset: 0 | 1) {
    setWeekOffset(offset);
    stripRef.current?.scrollTo({ x: offset * stripWidth, animated: true });
  }

  return (
    <>
      {/* ── Header ── */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 2 }}>
        <Text style={{ flex: 1, fontSize: 26, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.3 }}>
          {weekOffset === 0 ? 'This Week' : 'Next Week'}
        </Text>
      </View>

      <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 16 }}>
        {dateRange} · {gymDays.length} sessions · ~{(totalMinutes / 60).toFixed(1).replace('.0', '')} hrs
      </Text>

      {/* ── Week toggle ── */}
      <View style={s.weekNavRow}>
        <TouchableOpacity
          onPress={() => goToWeek(0)}
          style={[s.weekNavBtn, weekOffset === 0 && s.weekNavBtnActive]}>
          <Text style={[s.weekNavBtnText, weekOffset === 0 && s.weekNavBtnTextActive]}>This Week</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => goToWeek(1)}
          style={[s.weekNavBtn, weekOffset === 1 && s.weekNavBtnActive]}>
          <Text style={[s.weekNavBtnText, weekOffset === 1 && s.weekNavBtnTextActive]}>Next Week</Text>
        </TouchableOpacity>
      </View>

      {/* ── Calendar strip — identical pattern to MealsContent ── */}
      <ScrollView
        ref={stripRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={{ marginBottom: 20 }}
        onMomentumScrollEnd={e => {
          const page = Math.round(e.nativeEvent.contentOffset.x / stripWidth);
          setWeekOffset((Math.min(1, Math.max(0, page))) as 0 | 1);
        }}>
        {([thisWeekDates, nextWeekDates] as const).map((dates, wk) => (
          <View key={wk} style={{ width: stripWidth, flexDirection: 'row', gap: 5 }}>
            {dates.map((date, i) => {
              const isToday   = i === todayMonFirst && wk === 0;
              const isPast    = i < todayMonFirst && wk === 0;
              const isGym     = !!schedule[i]?.isGymDay;
              const gymColor  = theme.gym;
              return (
                <View
                  key={i}
                  style={[
                    s.weekDayPill,
                    isToday && { backgroundColor: gymColor, borderColor: gymColor },
                    isPast && s.weekDayPillPast,
                  ]}>
                  <Text style={[s.weekDayPillName, isToday && s.weekDayPillNameToday]}>
                    {SHORT_DAY_NAMES[i]}
                  </Text>
                  <Text style={[s.weekDayPillDate, isToday && s.weekDayPillDateToday]}>
                    {date.getDate()}
                  </Text>
                  {/* Gym day dot */}
                  {isGym && (
                    <View style={{
                      width: 4, height: 4, borderRadius: 2, marginTop: 3,
                      backgroundColor: isToday ? '#ffffff88' : gymColor + '88',
                    }} />
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <Text style={s.weekNavSwipeHint}>Swipe calendar to see next week →</Text>

      {/* ── Day cards ── */}
      {schedule.map((day, i) => {
        const date        = weekDates[i] ?? new Date();
        const isToday     = i === todayMonFirst && weekOffset === 0;
        const isPast      = weekOffset === 0 && i < todayMonFirst;
        const isCompleted = !!completedDates[toKey(date)];

        return (
          <WorkoutDayCard
            key={`${day.id}-${weekOffset}`}
            day={day}
            date={date}
            dayIndex={i}
            isToday={isToday}
            isPast={isPast}
            isCompleted={isCompleted}
            isNextWeek={weekOffset === 1}
            onChangeFocus={weekOffset === 0 && !isPast
              ? (focus) => setDayWorkoutFocus(i, focus)
              : undefined
            }
            theme={theme}
          />
        );
      })}
    </>
  );
}
