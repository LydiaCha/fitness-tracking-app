import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  Easing as REasing,
} from 'react-native-reanimated';
import { AppThemeType } from '@/constants/theme';
import { createNutritionStyles } from './nutrition.styles';
import { useAppTheme } from '@/context/ThemeContext';
import { STORAGE_KEYS, toKey, isGymDay } from '@/utils/appConstants';
import {
  getPeriodScore,
  getDatesForPeriod,
  calcWorkoutStreak,
  calcHabitStreak,
  getWeeklyScores,
} from '@/utils/calculations';
import { loadUserProfile, DEFAULT_PROFILE } from '@/constants/userProfile';
import { safeGetItem, safeSetItem, safeParseJSON } from '@/utils/storage';
import { logger } from '@/utils/logger';

// ─── Types ────────────────────────────────────────────────────────────────────
type DayLog      = { [dateKey: string]: boolean };
interface WeightEntry { date: string; kg: number; }
type Period      = 'today' | 'week' | 'month';
type DotState    = 'full' | 'partial' | 'missed' | 'future';

// ─── Constants ────────────────────────────────────────────────────────────────
const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today'      },
  { value: 'week',  label: 'This Week'  },
  { value: 'month', label: 'This Month' },
];

const MON_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Consistent dark palette for the hero card
const HERO_GRADIENT = ['#1a0533', '#0d0220', '#050110'] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ringColor(pct: number, theme: AppThemeType): string {
  if (pct >= 90) return theme.success;
  if (pct >= 75) return '#c084fc';   // vivid violet
  if (pct >= 50) return theme.primary;
  return theme.warning;
}

function qualityLabel(pct: number): string {
  if (pct >= 90) return 'ELITE';
  if (pct >= 75) return 'GREAT';
  if (pct >= 50) return 'SOLID';
  if (pct >= 25) return 'BUILDING';
  return 'STARTING';
}

function getWeekMonFirst(): Date[] {
  const today  = new Date();
  const jsDay  = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() + (jsDay === 0 ? -6 : 1 - jsDay));
  monday.setHours(0, 0, 0, 0);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function getDotState(
  date: Date,
  todayKey: string,
  workouts: DayLog,
  water: DayLog,
  gymDays: number[],
): DotState {
  const k = toKey(date);
  if (k > todayKey) return 'future';
  const gym   = isGymDay(date, gymDays);
  const wDone = !!water[k];
  if (gym) {
    const gDone = !!workouts[k];
    if (gDone && wDone) return 'full';
    if (gDone || wDone) return 'partial';
    return 'missed';
  }
  return wDone ? 'full' : 'missed';
}

// "Perfect day" = gym done (if gym day) + water goal + at least 1 meal logged
function isPerfectDay(
  todayKey: string,
  workouts: DayLog,
  water: DayLog,
  gymDays: number[],
  mealCount: number,
): boolean {
  const gymToday = isGymDay(new Date(), gymDays);
  const gymOk    = !gymToday || !!workouts[todayKey];
  return gymOk && !!water[todayKey] && mealCount >= 1;
}

function getCoachLine(
  period: Period,
  pct: number,
  gymToday: boolean,
  perfectDay: boolean,
): string {
  if (period === 'today') {
    if (perfectDay) return 'Perfect day — gym, water, and meals all done. Outstanding execution.';
    if (pct >= 100)  return 'Gym + water targets hit. Log a meal to complete your perfect day.';
    if (pct >= 50)   return 'Halfway there. One more habit and the day is locked in.';
    if (gymToday)    return 'Gym and water both waiting. Start with water — takes 30 seconds.';
    return 'Fresh slate. Drink your water and the day is already a win.';
  }
  if (period === 'week') {
    if (pct >= 90) return 'Elite week. This is what consistent effort looks like up close.';
    if (pct >= 70) return 'Strong week. Push the last sessions and set a new high.';
    if (pct >= 50) return 'More than half done. The week is still fully recoverable.';
    return 'Slow week so far. Two strong days can still turn the score around.';
  }
  if (pct >= 85) return 'Outstanding month. Your habits are running on autopilot.';
  if (pct >= 65) return 'Solid month. Find the one habit that keeps slipping and lock it in.';
  if (pct >= 40) return 'Inconsistent month. Look for the pattern in what you missed.';
  return 'Tough month — happens to everyone. One good week from here changes the story.';
}

// ─── ProgressRing (Reanimated) ────────────────────────────────────────────────
function ProgressRing({
  pct,
  color,
  children,
}: { pct: number; color: string; children?: React.ReactNode }) {
  const SIZE      = 150;
  const THICKNESS = 14;
  const HALF      = SIZE / 2;

  const animPct = useSharedValue(0);

  useEffect(() => {
    animPct.value = withTiming(Math.max(0, Math.min(100, pct)), {
      duration: 1100,
      easing:   REasing.out(REasing.cubic),
    });
  }, [pct]);

  const rightStyle = useAnimatedStyle(() => {
    const p   = animPct.value;
    const deg = p <= 50 ? (p / 50) * 180 - 180 : 0;
    return { transform: [{ rotate: `${deg}deg` }] };
  });

  const leftStyle = useAnimatedStyle(() => {
    const p   = animPct.value;
    const deg = p > 50 ? ((p - 50) / 50) * 180 - 180 : -180;
    return { transform: [{ rotate: `${deg}deg` }] };
  });

  const circle = {
    width: SIZE, height: SIZE, borderRadius: HALF,
    borderWidth: THICKNESS, borderColor: color,
    position: 'absolute' as const,
  };

  return (
    <View style={{ width: SIZE, height: SIZE }}>
      {/* Outer glow */}
      <View style={{
        position: 'absolute', width: SIZE + 24, height: SIZE + 24,
        borderRadius: (SIZE + 24) / 2,
        top: -12, left: -12,
        backgroundColor: 'transparent',
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 24,
        elevation: 12,
      }} />

      {/* Track */}
      <View style={{ ...circle, borderColor: color + '1a' }} />

      {/* Right half (0→50%) */}
      <View style={{ position: 'absolute', width: HALF, height: SIZE, right: 0, overflow: 'hidden' }}>
        <Reanimated.View style={[{ ...circle, left: -HALF }, rightStyle]} />
      </View>

      {/* Left half (50→100%) */}
      <View style={{ position: 'absolute', width: HALF, height: SIZE, left: 0, overflow: 'hidden' }}>
        <Reanimated.View style={[{ ...circle, left: 0 }, leftStyle]} />
      </View>

      {/* Center content */}
      <View style={{
        position: 'absolute', width: SIZE, height: SIZE,
        alignItems: 'center', justifyContent: 'center',
      }}>
        {children}
      </View>
    </View>
  );
}

// ─── Animated momentum bar ────────────────────────────────────────────────────
function MomentumBar({
  targetH, color, label, isCurrent, labelColor, s, delay,
}: {
  targetH: number; color: string; label: string;
  isCurrent: boolean; labelColor: string;
  s: ReturnType<typeof createNutritionStyles>; delay: number;
}) {
  const h = useSharedValue(0);

  useEffect(() => {
    h.value = withDelay(delay, withSpring(targetH, { damping: 16, stiffness: 100 }));
  }, [targetH]);

  const barStyle = useAnimatedStyle(() => ({ height: h.value }));

  return (
    <View style={s.momentumBarCol}>
      <View style={[s.momentumTrack, { height: 62 }]}>
        <Reanimated.View style={[s.momentumFill, barStyle, { backgroundColor: color }]} />
      </View>
      <Text style={[s.momentumLabel, isCurrent && { color: labelColor, fontWeight: '700' }]}>
        {label}
      </Text>
    </View>
  );
}

// ─── Weight Chart ─────────────────────────────────────────────────────────────
type ChartRange = '30d' | '90d' | 'all';
const CHART_RANGES: { value: ChartRange; label: string }[] = [
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'all', label: 'All' },
];

function filterByRange(entries: WeightEntry[], range: ChartRange): WeightEntry[] {
  if (range === 'all') return entries;
  const days = range === '30d' ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  return entries.filter(e => e.date >= cutoffStr);
}

function WeightChart({ entries, theme }: { entries: WeightEntry[]; theme: AppThemeType }) {
  const [range, setRange] = useState<ChartRange>('90d');
  const [width, setWidth] = useState(0);
  const data = filterByRange(entries, range);

  const CHART_H = 160;
  const PAD_TOP = 12;
  const PAD_BOT = 24;
  const Y_AXIS  = 36;

  const vals   = data.map(e => e.kg);
  const rawMin = data.length ? Math.min(...vals) : 0;
  const rawMax = data.length ? Math.max(...vals) : 1;
  const padding = Math.max((rawMax - rawMin) * 0.15, 0.5);
  const minV   = rawMin - padding;
  const maxV   = rawMax + padding;
  const range_ = maxV - minV || 1;
  const usableW = Math.max(width - Y_AXIS, 1);

  const pts = data.map((e, i) => ({
    x: Y_AXIS + (data.length === 1 ? usableW / 2 : (i / (data.length - 1)) * usableW),
    y: PAD_TOP + (1 - (e.kg - minV) / range_) * CHART_H,
    entry: e,
  }));

  const gridLines = useMemo(() => {
    const step  = (rawMax - rawMin) < 2 ? 0.5 : (rawMax - rawMin) < 5 ? 1 : 2;
    const start = Math.ceil(minV / step) * step;
    const lines: number[] = [];
    for (let v = start; v <= maxV; v = Math.round((v + step) * 100) / 100) lines.push(v);
    return lines;
  }, [minV, maxV, rawMin, rawMax]);

  const xLabelIdx = useMemo(() => {
    if (data.length === 0) return [];
    if (data.length <= 4)  return data.map((_, i) => i);
    const step = (data.length - 1) / 3;
    return [0, Math.round(step), Math.round(step * 2), data.length - 1];
  }, [data.length]);

  const trendUp    = data.length >= 2 && data[data.length - 1].kg > data[0].kg;
  const totalDelta = data.length >= 2 ? data[data.length - 1].kg - data[0].kg : null;

  return (
    <View>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
        <View style={{ flexDirection: 'row', gap: 6, flex: 1 }}>
          {CHART_RANGES.map(r => (
            <TouchableOpacity
              key={r.value}
              onPress={() => setRange(r.value)}
              style={{
                paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
                backgroundColor: range === r.value ? theme.primary : theme.bgCardAlt,
                borderWidth: 1,
                borderColor: range === r.value ? theme.primary : theme.border,
              }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: range === r.value ? '#fff' : theme.textMuted }}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {totalDelta !== null && (
          <Text style={{ fontSize: 12, fontWeight: '700', color: trendUp ? theme.gym : theme.meal }}>
            {trendUp ? '+' : ''}{totalDelta.toFixed(1)} kg
          </Text>
        )}
      </View>

      {data.length === 0 ? (
        <View style={{ height: 80, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>No entries in this range</Text>
        </View>
      ) : (
        <View onLayout={e => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && (
            <View style={{ height: CHART_H + PAD_TOP + PAD_BOT, position: 'relative' }}>
              {gridLines.map(v => {
                const yPos = PAD_TOP + (1 - (v - minV) / range_) * CHART_H;
                return (
                  <React.Fragment key={v}>
                    <Text style={{
                      position: 'absolute', left: 0, top: yPos - 7, width: Y_AXIS - 6,
                      textAlign: 'right', fontSize: 9, color: theme.textMuted, fontWeight: '600',
                    }}>
                      {v % 1 === 0 ? v : v.toFixed(1)}
                    </Text>
                    <View style={{
                      position: 'absolute', left: Y_AXIS, right: 0, top: yPos, height: 1,
                      backgroundColor: theme.border + '44',
                    }} />
                  </React.Fragment>
                );
              })}

              {pts.slice(0, -1).map((p1, i) => {
                const p2  = pts[i + 1];
                const dx  = p2.x - p1.x;
                const dy  = p2.y - p1.y;
                const len = Math.sqrt(dx * dx + dy * dy);
                const ang = Math.atan2(dy, dx) * (180 / Math.PI);
                return (
                  <View key={i} style={{
                    position: 'absolute',
                    left:  (p1.x + p2.x) / 2 - len / 2,
                    top:   (p1.y + p2.y) / 2 - 1.5,
                    width: len, height: 3, borderRadius: 1.5,
                    backgroundColor: theme.primary,
                    transform: [{ rotate: `${ang}deg` }],
                  }} />
                );
              })}

              {pts.map((p, i) => {
                const isLatest = i === pts.length - 1;
                const size = isLatest ? 12 : 6;
                return (
                  <View key={i} style={{
                    position: 'absolute',
                    left: p.x - size / 2, top: p.y - size / 2,
                    width: size, height: size, borderRadius: size / 2,
                    backgroundColor: isLatest ? theme.primary : theme.primary + '66',
                    borderWidth: isLatest ? 2 : 0,
                    borderColor: theme.bgCard,
                  }} />
                );
              })}

              {pts.length > 0 && (() => {
                const p = pts[pts.length - 1];
                return (
                  <Text style={{
                    position: 'absolute', left: p.x - 26, top: p.y - 20,
                    width: 52, textAlign: 'center',
                    fontSize: 10, fontWeight: '800', color: theme.primary,
                  }}>
                    {data[data.length - 1].kg} kg
                  </Text>
                );
              })()}

              {xLabelIdx.map(i => (
                <Text key={i} style={{
                  position: 'absolute',
                  left: pts[i].x - 20, top: CHART_H + PAD_TOP + 6,
                  width: 40, textAlign: 'center',
                  fontSize: 9, color: theme.textMuted,
                }}>
                  {pts[i].entry.date.slice(5).replace('-', '/')}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const { theme, isDark } = useAppTheme();
  const s = useMemo(() => createNutritionStyles(theme), [theme]);

  const [workouts, setWorkouts] = useState<DayLog>({});
  const [water,    setWater]    = useState<DayLog>({});
  const [weights,  setWeights]  = useState<WeightEntry[]>([]);
  const [mealLogs, setMealLogs] = useState<Record<string, unknown[]>>({});
  const [period,   setPeriod]   = useState<Period>('today');
  const [inputKg,  setInputKg]  = useState('');
  const [loading,  setLoading]  = useState(true);
  const [gymDays,  setGymDays]  = useState<number[]>(DEFAULT_PROFILE.gymDays);
  const [weightExpanded, setWeightExpanded] = useState(false);

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const todayKey = toKey(new Date());

  // Animated score count-up (JS-driven, updates React state for display)
  const animVal      = useRef(new Animated.Value(0)).current;
  const [displayPct, setDisplayPct] = useState(0);

  useFocusEffect(useCallback(() => {
    Promise.all([
      safeGetItem(STORAGE_KEYS.WORKOUTS),
      safeGetItem(STORAGE_KEYS.WATER),
      safeGetItem(STORAGE_KEYS.WEIGHTS),
      safeGetItem(STORAGE_KEYS.MEAL_LOGS),
      loadUserProfile(),
    ]).then(([wo, wa, wt, ml, prof]) => {
      setWorkouts(safeParseJSON(wo, {} as DayLog));
      setWater(safeParseJSON(wa, {} as DayLog));
      setWeights(safeParseJSON(wt, [] as WeightEntry[]));
      setMealLogs(safeParseJSON(ml, {} as Record<string, unknown[]>));
      setGymDays(prof.gymDays);
    }).catch(e => {
      logger.error('storage', 'nutrition_load', 'Failed to load progress data', { error: String(e) });
    }).finally(() => setLoading(false));
  }, []));

  const saveWeights = useCallback(async (data: WeightEntry[]) => {
    setWeights(data);
    const ok = await safeSetItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(data));
    if (!ok) {
      Alert.alert('Save failed', 'Could not save your weight entry. Please try again.');
      setWeights(weights);
    }
  }, [weights]);

  const addWeight = useCallback(() => {
    const val = parseFloat(inputKg.replace(',', '.'));
    if (isNaN(val) || val < 30 || val > 200) {
      Alert.alert('Invalid weight', 'Enter a value between 30–200 kg.');
      return;
    }
    const updated = weights
      .filter(e => e.date !== todayKey)
      .concat({ date: todayKey, kg: val })
      .sort((a, b) => a.date.localeCompare(b.date));
    saveWeights(updated);
    setInputKg('');
  }, [inputKg, weights, todayKey, saveWeights]);

  const deleteWeight = useCallback((date: string) => {
    Alert.alert('Delete entry', `Remove weight entry for ${date}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => saveWeights(weights.filter(e => e.date !== date)) },
    ]);
  }, [weights, saveWeights]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const score          = useMemo(() => getPeriodScore(period, workouts, water, gymDays), [period, workouts, water, gymDays]);
  const rColor         = useMemo(() => ringColor(score.pct, theme), [score.pct, theme]);
  const workoutStreak  = useMemo(() => calcWorkoutStreak(workouts, gymDays), [workouts, gymDays]);
  const waterStreak    = useMemo(() => calcHabitStreak(k => !!water[k]), [water]);
  const weekDates      = useMemo(() => getWeekMonFirst(), []);
  const todayIsGym     = isGymDay(new Date(), gymDays);
  const todayMealCount = (mealLogs[todayKey] ?? []).length;
  const perfectToday   = isPerfectDay(todayKey, workouts, water, gymDays, todayMealCount);

  const dotStates = useMemo(
    () => weekDates.map(d => getDotState(d, todayKey, workouts, water, gymDays)),
    [weekDates, todayKey, workouts, water, gymDays],
  );
  const weekOnTrack = dotStates.filter(s => s === 'full' || s === 'partial').length;
  const weekPast    = dotStates.filter(s => s !== 'future').length;

  const weeklyScores  = useMemo(() => getWeeklyScores(workouts, water, gymDays, 8), [workouts, water, gymDays]);
  const currentWeek   = weeklyScores[weeklyScores.length - 1];
  const prevWeek      = weeklyScores[weeklyScores.length - 2];
  const weekDelta     = currentWeek && prevWeek ? currentWeek.pct - prevWeek.pct : null;

  const latestW       = weights.length > 0 ? weights[weights.length - 1] : null;
  const prevW         = weights.length > 1 ? weights[weights.length - 2] : null;
  const weightDelta   = latestW && prevW ? latestW.kg - prevW.kg : null;
  const recentWeights = useMemo(() => weights.slice().reverse().slice(0, 8), [weights]);

  const periodDates  = useMemo(() => getDatesForPeriod(period), [period]);
  const gymExpected  = useMemo(() => periodDates.filter(d => isGymDay(d, gymDays)).length, [periodDates, gymDays]);
  const gymDone      = useMemo(() => periodDates.filter(d => !!workouts[toKey(d)]).length, [periodDates, workouts]);
  const waterDone    = useMemo(() => periodDates.filter(d => !!water[toKey(d)]).length, [periodDates, water]);

  const momentumTrend = useMemo(() => {
    if (weeklyScores.length < 4) return null;
    const prior = weeklyScores.slice(-4, -1);
    const avg   = prior.reduce((s, w) => s + w.pct, 0) / prior.length;
    const diff  = (currentWeek?.pct ?? 0) - avg;
    if (diff >= 5)  return { label: '↑ Trending up',    color: theme.success };
    if (diff <= -5) return { label: '↓ Trending down',  color: theme.gym };
    return               { label: '→ Holding steady',  color: theme.textMuted };
  }, [weeklyScores, currentWeek, theme]);

  // Score count-up animation
  useEffect(() => {
    const id = animVal.addListener(({ value }) => setDisplayPct(Math.round(value)));
    Animated.timing(animVal, {
      toValue:         score.pct,
      duration:        950,
      easing:          Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
    return () => animVal.removeListener(id);
  }, [score.pct]);

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Header ── */}
          <View style={s.header}>
            <Text style={s.title}>Progress</Text>
            <Text style={s.subtitle}>Workouts + water — the two that matter most</Text>
          </View>

          {/* ── Hero Card (dark gradient) ── */}
          <LinearGradient
            colors={HERO_GRADIENT}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={s.heroCard}
          >
            {/* Subtle ambient light in top-right corner */}
            <View style={{
              position: 'absolute', top: -60, right: -60,
              width: 180, height: 180, borderRadius: 90,
              backgroundColor: rColor + '12',
            }} />

            <Text style={s.heroScoreLabel}>Consistency Score</Text>

            <ProgressRing pct={score.pct} color={rColor}>
              <Text style={[s.heroScoreNum, {
                color: rColor,
                textShadowColor: rColor + '55',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 12,
              }]}>
                {displayPct}
              </Text>
              <Text style={s.heroScoreDenom}>/ 100</Text>
              <Text style={[s.heroQualityLabel, { color: rColor + 'cc' }]}>
                {qualityLabel(score.pct)}
              </Text>
            </ProgressRing>

            <Text style={s.heroMotivation}>
              {getCoachLine(period, score.pct, todayIsGym, perfectToday)}
            </Text>
          </LinearGradient>

          {/* ── Week Dot Strip ── */}
          <View style={s.weekStripCard}>
            <View style={s.weekStripHeader}>
              <Text style={s.weekStripTitle}>This Week</Text>
              <Text style={s.weekStripCount}>{weekOnTrack} / {weekPast} days on track</Text>
            </View>
            <View style={s.weekDotRow}>
              {weekDates.map((date, i) => {
                const state   = dotStates[i];
                const isToday = toKey(date) === todayKey;
                return (
                  <View key={i} style={s.weekDayCol}>
                    <Text style={[s.weekDayLabel, isToday && s.weekDayLabelToday]}>
                      {MON_LABELS[i]}
                    </Text>
                    <View style={[
                      s.weekDot,
                      state === 'full'    && s.weekDotFull,
                      state === 'partial' && s.weekDotPartial,
                      state === 'missed'  && s.weekDotMissed,
                      state === 'future'  && s.weekDotFuture,
                      isToday             && s.weekDotToday,
                    ]} />
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Streak Pills ── */}
          <View style={s.streakRow}>
            {/* Gym streak */}
            <LinearGradient
              colors={workoutStreak > 0 ? ['#2a0a14', '#1a0610', '#0e0308'] : [theme.bgCard, theme.bgCard]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.streakPill, {
                borderColor: workoutStreak > 0 ? theme.gym + '44' : theme.border,
              }]}
            >
              <Text style={s.streakEmoji}>💪</Text>
              <View style={s.streakTextCol}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                  <Text style={[s.streakCount, { color: workoutStreak > 0 ? theme.gym : theme.textMuted }]}>
                    {workoutStreak}
                  </Text>
                  <Text style={s.streakDaysLabel}>sessions</Text>
                </View>
                <Text style={s.streakLabel}>Workout streak</Text>
              </View>
            </LinearGradient>

            {/* Water streak */}
            <LinearGradient
              colors={waterStreak > 0 ? ['#071a2d', '#040e1a', '#020610'] : [theme.bgCard, theme.bgCard]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[s.streakPill, {
                borderColor: waterStreak > 0 ? theme.water + '44' : theme.border,
              }]}
            >
              <Text style={s.streakEmoji}>💧</Text>
              <View style={s.streakTextCol}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 3 }}>
                  <Text style={[s.streakCount, { color: waterStreak > 0 ? theme.water : theme.textMuted }]}>
                    {waterStreak}
                  </Text>
                  <Text style={s.streakDaysLabel}>days</Text>
                </View>
                <Text style={s.streakLabel}>Water streak</Text>
              </View>
            </LinearGradient>
          </View>

          {/* ── Period Tabs ── */}
          <View style={s.periodTabRow}>
            {PERIODS.map(({ value, label }) => {
              const active = period === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[s.periodTab, active && s.periodTabActive]}
                  onPress={() => setPeriod(value)}
                  activeOpacity={0.75}
                >
                  {active && (
                    <LinearGradient
                      colors={['#7c3aed', '#6d28d9', '#5b21b6']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 11 }}
                    />
                  )}
                  <Text style={[s.periodTabText, active && s.periodTabTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Period Content ── */}
          <View style={s.statsCard}>

            {/* TODAY */}
            {period === 'today' && (
              <>
                <View style={s.todayStatusRow}>
                  {/* Gym status */}
                  {todayIsGym ? (
                    <LinearGradient
                      colors={workouts[todayKey] ? ['#2a0a14', '#1a0610'] : [theme.bgCardAlt, theme.bgCardAlt]}
                      style={s.todayStatusPill}
                    >
                      <Text style={s.todayStatusEmoji}>{workouts[todayKey] ? '💪' : '🏋️'}</Text>
                      <Text style={s.todayStatusLabel}>Gym</Text>
                      <Text style={[s.todayStatusValue, { color: workouts[todayKey] ? theme.gym : theme.textMuted }]}>
                        {workouts[todayKey] ? 'Done ✓' : 'Pending'}
                      </Text>
                    </LinearGradient>
                  ) : (
                    <View style={[s.todayStatusPill, { backgroundColor: theme.bgCardAlt }]}>
                      <Text style={s.todayStatusEmoji}>🛌</Text>
                      <Text style={s.todayStatusLabel}>Gym</Text>
                      <Text style={[s.todayStatusValue, { color: theme.textMuted }]}>Rest day</Text>
                    </View>
                  )}

                  {/* Water status */}
                  <LinearGradient
                    colors={water[todayKey] ? ['#071a2d', '#040e1a'] : [theme.bgCardAlt, theme.bgCardAlt]}
                    style={s.todayStatusPill}
                  >
                    <Text style={s.todayStatusEmoji}>{water[todayKey] ? '💧' : '🫗'}</Text>
                    <Text style={s.todayStatusLabel}>Water</Text>
                    <Text style={[s.todayStatusValue, { color: water[todayKey] ? theme.water : theme.textMuted }]}>
                      {water[todayKey] ? 'Done ✓' : 'Pending'}
                    </Text>
                  </LinearGradient>

                  {/* Meals status */}
                  <LinearGradient
                    colors={todayMealCount > 0 ? ['#0e1a0a', '#071208'] : [theme.bgCardAlt, theme.bgCardAlt]}
                    style={s.todayStatusPill}
                  >
                    <Text style={s.todayStatusEmoji}>{todayMealCount > 0 ? '🍽️' : '🍴'}</Text>
                    <Text style={s.todayStatusLabel}>Meals</Text>
                    <Text style={[s.todayStatusValue, { color: todayMealCount > 0 ? theme.meal : theme.textMuted }]}>
                      {todayMealCount > 0 ? `${todayMealCount} logged` : 'None'}
                    </Text>
                  </LinearGradient>
                </View>
                <Text style={s.coachLine}>{getCoachLine('today', score.pct, todayIsGym, perfectToday)}</Text>
              </>
            )}

            {/* THIS WEEK */}
            {period === 'week' && (
              <>
                {gymExpected > 0 && (
                  <View style={s.statRow}>
                    <Text style={s.statEmoji}>💪</Text>
                    <Text style={s.statLabel}>Workouts</Text>
                    <View style={s.statTrack}>
                      <View style={[s.statFill, {
                        width: `${Math.round((gymDone / gymExpected) * 100)}%` as any,
                        backgroundColor: theme.gym,
                      }]} />
                    </View>
                    <Text style={s.statValue}>{gymDone}/{gymExpected}</Text>
                  </View>
                )}
                <View style={s.statRow}>
                  <Text style={s.statEmoji}>💧</Text>
                  <Text style={s.statLabel}>Water days</Text>
                  <View style={s.statTrack}>
                    <View style={[s.statFill, {
                      width: `${periodDates.length > 0 ? Math.round((waterDone / periodDates.length) * 100) : 0}%` as any,
                      backgroundColor: theme.water,
                    }]} />
                  </View>
                  <Text style={s.statValue}>{waterDone}/{periodDates.length}</Text>
                </View>
                <View style={s.statDivider} />
                {weekDelta !== null && (
                  <View style={[s.compareBadge, {
                    backgroundColor: weekDelta >= 0 ? theme.success + '22' : theme.gym + '22',
                  }]}>
                    <Text style={[s.compareBadgeText, {
                      color: weekDelta >= 0 ? theme.success : theme.gym,
                    }]}>
                      {weekDelta >= 0 ? '↑' : '↓'} {Math.abs(weekDelta)}% vs last week
                    </Text>
                  </View>
                )}
                <Text style={s.coachLine}>{getCoachLine('week', score.pct, todayIsGym, perfectToday)}</Text>
              </>
            )}

            {/* THIS MONTH */}
            {period === 'month' && (
              <>
                {gymExpected > 0 && (
                  <View style={s.statRow}>
                    <Text style={s.statEmoji}>💪</Text>
                    <Text style={s.statLabel}>Workouts</Text>
                    <View style={s.statTrack}>
                      <View style={[s.statFill, {
                        width: `${Math.round((gymDone / gymExpected) * 100)}%` as any,
                        backgroundColor: theme.gym,
                      }]} />
                    </View>
                    <Text style={s.statValue}>{gymDone}/{gymExpected}</Text>
                  </View>
                )}
                <View style={s.statRow}>
                  <Text style={s.statEmoji}>💧</Text>
                  <Text style={s.statLabel}>Water days</Text>
                  <View style={s.statTrack}>
                    <View style={[s.statFill, {
                      width: `${periodDates.length > 0 ? Math.round((waterDone / periodDates.length) * 100) : 0}%` as any,
                      backgroundColor: theme.water,
                    }]} />
                  </View>
                  <Text style={s.statValue}>{waterDone}/{periodDates.length}</Text>
                </View>
                <View style={s.statDivider} />
                <View style={s.statHighlight}>
                  <Text style={s.statHighlightLabel}>Best week score</Text>
                  <Text style={s.statHighlightValue}>
                    {weeklyScores.length > 0 ? Math.max(...weeklyScores.map(w => w.pct)) : 0}%
                  </Text>
                </View>
                <Text style={s.coachLine}>{getCoachLine('month', score.pct, todayIsGym, perfectToday)}</Text>
              </>
            )}
          </View>

          {/* ── Momentum Chart (spring-animated bars) ── */}
          <View style={s.momentumCard}>
            <View style={s.momentumHeader}>
              <Text style={s.momentumTitle}>8-Week Momentum</Text>
              {momentumTrend && (
                <Text style={[s.momentumTrend, { color: momentumTrend.color }]}>
                  {momentumTrend.label}
                </Text>
              )}
            </View>
            <View style={s.momentumBars}>
              {weeklyScores.map((w, i) => (
                <MomentumBar
                  key={i}
                  targetH={Math.max(2, Math.round(w.pct * 0.62))}
                  color={w.isCurrent ? rColor : theme.primary + '55'}
                  label={w.label}
                  isCurrent={w.isCurrent}
                  labelColor={rColor}
                  s={s}
                  delay={i * 60}
                />
              ))}
            </View>
          </View>

          {/* ── Weight Card (collapsible) ── */}
          <View style={s.weightCard}>
            <TouchableOpacity
              style={s.weightHeader}
              onPress={() => setWeightExpanded(v => !v)}
              activeOpacity={0.7}
            >
              <View style={s.weightHeaderLeft}>
                <Text style={s.weightTitle}>Weight Log</Text>
                <Text style={s.weightSubtitle}>
                  {latestW ? `Latest: ${latestW.kg} kg` : 'No entries yet'}
                </Text>
              </View>
              {weightDelta !== null && (
                <Text style={[s.weightDelta, {
                  color: weightDelta < 0 ? theme.meal : weightDelta > 0 ? theme.gym : theme.textMuted,
                }]}>
                  {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg
                </Text>
              )}
              <Text style={s.weightExpandBtn}>{weightExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {weightExpanded && (
              <View style={s.weightBody}>
                {latestW && (
                  <View style={s.weightSummary}>
                    <Text style={[s.weightCurrent, { color: theme.primary }]}>{latestW.kg} kg</Text>
                    {weightDelta !== null && (
                      <Text style={[s.weightDelta, {
                        color: weightDelta < 0 ? theme.meal : weightDelta > 0 ? theme.gym : theme.textSecondary,
                      }]}>
                        {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg
                      </Text>
                    )}
                    <Text style={s.weightTrendText}>vs previous entry</Text>
                  </View>
                )}

                <WeightChart entries={weights} theme={theme} />

                <View style={s.weightInputRow}>
                  <TextInput
                    style={s.weightInput}
                    value={inputKg}
                    onChangeText={setInputKg}
                    placeholder="e.g. 62.5"
                    placeholderTextColor={theme.textMuted}
                    keyboardType="decimal-pad"
                    returnKeyType="done"
                    onSubmitEditing={addWeight}
                  />
                  <TouchableOpacity style={s.weightBtn} onPress={addWeight} activeOpacity={0.8}>
                    <Text style={s.weightBtnText}>Log weight</Text>
                  </TouchableOpacity>
                </View>

                {weights.length > 0 && (
                  <View style={s.weightHistory}>
                    <Text style={s.historyLabel}>Recent entries</Text>
                    {recentWeights.map(entry => (
                      <TouchableOpacity
                        key={entry.date}
                        style={s.historyRow}
                        onLongPress={() => deleteWeight(entry.date)}
                      >
                        <Text style={s.historyDate}>{entry.date}</Text>
                        <Text style={s.historyKg}>{entry.kg} kg</Text>
                      </TouchableOpacity>
                    ))}
                    <Text style={s.historyHint}>Long-press to delete an entry</Text>
                  </View>
                )}

                {weights.length === 0 && (
                  <Text style={s.emptyText}>No weight entries yet. Log your first one above!</Text>
                )}
              </View>
            )}
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
