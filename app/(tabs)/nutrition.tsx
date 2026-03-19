import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Easing,
  useWindowDimensions,
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
import { createNutritionStyles } from '@/styles/nutrition.styles';
import { useAppTheme } from '@/context/ThemeContext';
import { STORAGE_KEYS, toKey, isGymDay } from '@/utils/appConstants';
import { loadWaterGoalLog } from '@/utils/waterLog';
import {
  getPeriodScore,
  getDatesForPeriod,
  calcHabitStreak,
  getWeeklyScores,
  Period,
} from '@/utils/calculations';
import { calcWorkoutStreak } from '@/utils/streak';
import { useUserProfile } from '@/context/UserProfileContext';
import { saveUserProfile } from '@/constants/userProfile';
import { safeGetItem, safeSetItem, safeParseJSON } from '@/utils/storage';
import { logger } from '@/utils/logger';
import {
  analyzeTrend, getWeightBadge, getTrendStatsLine,
  getPostLogMessage, getNudgeMessage, WeightEntry,
} from '@/utils/weightTrend';
import { useSteps, DEFAULT_STEP_GOAL } from '@/hooks/useSteps';
import { getCoachInsights, CoachInsight } from '@/utils/coach';
import { MACRO_TARGETS } from '@/constants/nutritionData';
import {
  loadWorkoutLogs, computeStrengthSnapshots,
  getE1RMHistory, getLoggedExerciseIds, WorkoutLog,
} from '@/utils/strengthLog';
import { calcEMA } from '@/utils/weightTrend';
import { getExerciseById } from '@/constants/exerciseRegistry';

// ─── Types ────────────────────────────────────────────────────────────────────
type DayLog   = { [dateKey: string]: boolean };
type DotState = 'full' | 'partial' | 'missed' | 'future';

// ─── Constants ────────────────────────────────────────────────────────────────
const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today'      },
  { value: 'week',  label: 'This Week'  },
  { value: 'month', label: 'This Month' },
];

const MON_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Consistent dark palette for the hero card
const HERO_GRADIENT = ['#1a0533', '#0d0220', '#050110'] as const;

// BMI scale zones — flex proportional to range within 15–40 display window
const BMI_ZONES = [
  { label: 'Underweight', flex: 7,  color: '#38bdf8' }, // 15–18.5
  { label: 'Healthy',     flex: 13, color: '#4ade80' }, // 18.5–25
  { label: 'Overweight',  flex: 10, color: '#fbbf24' }, // 25–30
  { label: 'Obese',       flex: 20, color: '#f87171' }, // 30–40
] as const;

type BmiLabel = 'Underweight' | 'Healthy' | 'Overweight' | 'Obese';

function getBmiCoachLine(val: number, label: BmiLabel): string {
  if (label === 'Underweight')
    return `At ${val}, you're below the healthy range. Focus on nourishing, protein-rich meals — your plan is already built to support you.`;
  if (label === 'Healthy')
    return `At ${val}, you're right in the healthy range. This is the goal — now it's about staying consistent and building on it.`;
  if (label === 'Overweight')
    return `At ${val}, you're just above the healthy range. Small, consistent changes to nutrition and activity add up faster than you think.`;
  return `At ${val}, your BMI is in the obese range. The most important step is already done — you're here and you're tracking. Every log counts.`;
}

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

function filterByRange(
  entries: WeightEntry[],
  emaHistory: number[],
  range: ChartRange,
): { data: WeightEntry[]; emas: number[] } {
  if (range === 'all') return { data: entries, emas: emaHistory };
  const days = range === '30d' ? 30 : 90;
  const cutoffStr = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  const paired = entries
    .map((e, i) => ({ entry: e, ema: emaHistory[i] }))
    .filter(p => p.entry.date >= cutoffStr);
  return { data: paired.map(p => p.entry), emas: paired.map(p => p.ema) };
}

function WeightChart({
  entries,
  emaHistory,
  theme,
}: {
  entries:    WeightEntry[];
  emaHistory: number[];
  theme:      AppThemeType;
}) {
  const hasExtendedHistory = useMemo(() => {
    if (entries.length < 2) return false;
    const span = new Date(entries[entries.length - 1].date).getTime()
               - new Date(entries[0].date).getTime();
    return span / 86_400_000 > 30;
  }, [entries]);

  const [range, setRange] = useState<ChartRange>('30d');
  const [width, setWidth] = useState(0);

  const { data, emas } = useMemo(
    () => hasExtendedHistory ? filterByRange(entries, emaHistory, range) : { data: entries, emas: emaHistory },
    [entries, emaHistory, range, hasExtendedHistory],
  );

  const CHART_H = 148;
  const PAD_TOP = 12;
  const PAD_BOT = 24;
  const Y_AXIS  = 36;

  const vals   = data.map(e => e.kg);
  const rawMin = data.length ? Math.min(...vals) : 0;
  const rawMax = data.length ? Math.max(...vals) : 1;
  const pad    = Math.max((rawMax - rawMin) * 0.2, 0.5);
  const minV   = rawMin - pad;
  const maxV   = rawMax + pad;
  const rangeV = maxV - minV || 1;
  const usableW = Math.max(width - Y_AXIS, 1);

  const xAt = (i: number) =>
    Y_AXIS + (data.length === 1 ? usableW / 2 : (i / (data.length - 1)) * usableW);
  const yAt = (kg: number) =>
    PAD_TOP + (1 - (kg - minV) / rangeV) * CHART_H;

  // Raw dot positions (de-emphasised)
  const rawPts  = data.map((e, i) => ({ x: xAt(i), y: yAt(e.kg),  entry: e }));
  // EMA line positions (smooth, prominent)
  const emaPts  = emas.map((v, i) => ({ x: xAt(i), y: yAt(v) }));

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

  return (
    <View>
      {hasExtendedHistory && (
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
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
      )}

      {data.length === 0 ? (
        <View style={{ height: 72, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 13, color: theme.textMuted }}>No entries in this range</Text>
        </View>
      ) : (
        <View onLayout={e => setWidth(e.nativeEvent.layout.width)}>
          {width > 0 && (
            <View style={{ height: CHART_H + PAD_TOP + PAD_BOT, position: 'relative' }}>
              {/* Grid lines */}
              {gridLines.map(v => {
                const yPos = yAt(v);
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
                      backgroundColor: theme.border + '33',
                    }} />
                  </React.Fragment>
                );
              })}

              {/* Raw dots — small, de-emphasised */}
              {rawPts.map((p, i) => (
                <View key={i} style={{
                  position: 'absolute',
                  left: p.x - 3, top: p.y - 3,
                  width: 6, height: 6, borderRadius: 3,
                  backgroundColor: theme.primary + '44',
                }} />
              ))}

              {/* EMA smooth line — prominent */}
              {emaPts.slice(0, -1).map((p1, i) => {
                const p2  = emaPts[i + 1];
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

              {/* EMA endpoint dot + label */}
              {emaPts.length > 0 && (() => {
                const p   = emaPts[emaPts.length - 1];
                const ema = emas[emas.length - 1];
                return (
                  <>
                    <View style={{
                      position: 'absolute',
                      left: p.x - 5, top: p.y - 5,
                      width: 10, height: 10, borderRadius: 5,
                      backgroundColor: theme.primary,
                      borderWidth: 2, borderColor: theme.bgCard,
                    }} />
                    <Text style={{
                      position: 'absolute', left: p.x - 26, top: p.y - 20,
                      width: 52, textAlign: 'center',
                      fontSize: 10, fontWeight: '800', color: theme.primary,
                    }}>
                      {ema.toFixed(1)} kg
                    </Text>
                  </>
                );
              })()}

              {/* X-axis date labels */}
              {xLabelIdx.map(i => (
                <Text key={i} style={{
                  position: 'absolute',
                  left: rawPts[i].x - 20, top: CHART_H + PAD_TOP + 6,
                  width: 40, textAlign: 'center',
                  fontSize: 9, color: theme.textMuted,
                }}>
                  {rawPts[i].entry.date.slice(5).replace('-', '/')}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── Strength Chart ───────────────────────────────────────────────────────────
type StrengthRange = '30d' | '90d' | 'all';

function filterStrengthByRange(
  history: { date: string; e1rm: number }[],
  range: StrengthRange,
): { date: string; e1rm: number }[] {
  if (range === 'all') return history;
  const days = range === '30d' ? 30 : 90;
  const cutoff = new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
  return history.filter(p => p.date >= cutoff);
}

function StrengthChart({
  history,
  theme,
}: {
  history:  { date: string; e1rm: number }[];
  theme:    AppThemeType;
}) {
  const hasHistory30d = useMemo(() => {
    if (history.length < 2) return false;
    const span = new Date(history[history.length - 1].date).getTime()
               - new Date(history[0].date).getTime();
    return span / 86_400_000 > 30;
  }, [history]);

  const [range, setRange]  = useState<StrengthRange>('30d');
  const [width, setWidth]  = useState(0);

  const data = useMemo(
    () => hasHistory30d ? filterStrengthByRange(history, range) : history,
    [history, range, hasHistory30d],
  );

  const emas = useMemo(() => calcEMA(data.map(p => p.e1rm), 0.3), [data]);

  const CHART_H = 120;
  const PAD     = { top: 10, bottom: 28, left: 4, right: 4 };

  const minV = useMemo(() => Math.min(...data.map(p => p.e1rm), ...emas) * 0.97, [data, emas]);
  const maxV = useMemo(() => Math.max(...data.map(p => p.e1rm), ...emas) * 1.03, [data, emas]);
  const range_ = maxV - minV || 1;

  const xAt = (i: number) =>
    width <= 0 || data.length <= 1
      ? (i / Math.max(1, data.length - 1)) * width
      : PAD.left + (i / (data.length - 1)) * (width - PAD.left - PAD.right);
  const yAt = (v: number) => PAD.top + ((maxV - v) / range_) * CHART_H;

  const color = theme.gym ?? '#a855f7';

  if (data.length < 2) {
    return (
      <View style={{ paddingHorizontal: 16, paddingVertical: 20, alignItems: 'center' }}>
        <Text style={{ fontSize: 13, color: theme.textMuted, textAlign: 'center' }}>
          Log 3 sessions to unlock your strength trend
        </Text>
      </View>
    );
  }

  const emaPts  = emas.map((v, i) => ({ x: xAt(i), y: yAt(v) }));
  const rawPts  = data.map((p, i) => ({ x: xAt(i), y: yAt(p.e1rm) }));

  // Sparse x-axis labels
  const totalPts = data.length;
  const labelStep = Math.max(1, Math.floor(totalPts / 4));
  const xLabelIdx = Array.from({ length: totalPts }, (_, i) => i)
    .filter(i => i === 0 || i === totalPts - 1 || i % labelStep === 0);

  return (
    <View style={{ marginHorizontal: 16, marginBottom: 4 }}>
      {hasHistory30d && (
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 8 }}>
          {(['30d', '90d', 'all'] as StrengthRange[]).map(r => (
            <TouchableOpacity
              key={r}
              onPress={() => setRange(r)}
              style={{
                paddingHorizontal: 10, paddingVertical: 4,
                borderRadius: 8,
                backgroundColor: range === r ? color + '30' : 'transparent',
                borderWidth: 1,
                borderColor: range === r ? color + '88' : theme.border,
              }}>
              <Text style={{ fontSize: 11, fontWeight: '600', color: range === r ? color : theme.textMuted }}>
                {r.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View
        style={{ height: CHART_H + PAD.top + PAD.bottom }}
        onLayout={e => setWidth(e.nativeEvent.layout.width)}
      >
        {width > 0 && (
          <View style={{ position: 'absolute', width, height: CHART_H + PAD.top + PAD.bottom }}>
            {/* Raw dots */}
            {rawPts.map((p, i) => (
              <View key={i} style={{
                position: 'absolute',
                left: p.x - 3, top: p.y - 3,
                width: 6, height: 6, borderRadius: 3,
                backgroundColor: color + '55',
              }} />
            ))}

            {/* EMA line segments */}
            {emaPts.slice(0, -1).map((p1, i) => {
              const p2  = emaPts[i + 1];
              const dx  = p2.x - p1.x;
              const dy  = p2.y - p1.y;
              const len = Math.sqrt(dx * dx + dy * dy);
              const ang = Math.atan2(dy, dx) * (180 / Math.PI);
              return (
                <View key={i} style={{
                  position:  'absolute',
                  left:       (p1.x + p2.x) / 2 - len / 2,
                  top:        (p1.y + p2.y) / 2 - 1.5,
                  width:      len,
                  height:     3,
                  borderRadius: 1.5,
                  backgroundColor: color,
                  transform: [{ rotate: `${ang}deg` }],
                }} />
              );
            })}

            {/* EMA endpoint dot + label */}
            {emaPts.length > 0 && (() => {
              const p   = emaPts[emaPts.length - 1];
              const val = emas[emas.length - 1];
              return (
                <View key="end" style={{ position: 'absolute', left: p.x - 5, top: p.y - 5 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
                  <Text style={{
                    position: 'absolute', left: -18, top: -18,
                    fontSize: 11, fontWeight: '700', color,
                    width: 46, textAlign: 'center',
                  }}>
                    {val.toFixed(1)} kg
                  </Text>
                </View>
              );
            })()}

            {/* X-axis labels */}
            {xLabelIdx.map(i => (
              <Text key={i} style={{
                position: 'absolute',
                left: rawPts[i].x - 20, top: CHART_H + PAD.top + 6,
                width: 40, textAlign: 'center',
                fontSize: 9, color: theme.textMuted,
              }}>
                {data[i].date.slice(5).replace('-', '/')}
              </Text>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const { theme, isDark } = useAppTheme();
  const s = useMemo(() => createNutritionStyles(theme), [theme]);
  const { profile, effectiveMacros, updateProfile, refreshProfile } = useUserProfile();

  const [workouts, setWorkouts] = useState<DayLog>({});
  const [water,    setWater]    = useState<DayLog>({});
  const [weights,  setWeights]  = useState<WeightEntry[]>([]);
  const [mealLogs, setMealLogs] = useState<Record<string, unknown[]>>({});
  const [period,   setPeriod]   = useState<Period>('today');
  const [inputKg,  setInputKg]  = useState('');
  const [loading,  setLoading]  = useState(true);
  const gymDays = profile.gymDays;
  const [showAllHistory,   setShowAllHistory]   = useState(false);
  const [carouselPage,     setCarouselPage]     = useState(0);
  const [postLogMsg,       setPostLogMsg]       = useState<string | null>(null);
  const [stepsSheet,       setStepsSheet]       = useState<'closed' | 'menu' | 'manual'>('closed');
  const [stepsInput,       setStepsInput]       = useState('');
  const [workoutLogs,      setWorkoutLogs]      = useState<WorkoutLog[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const carouselRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useWindowDimensions();
  const cardWidth = windowWidth - 32; // matches scrollContent paddingHorizontal: 16

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  // Auto-dismiss post-log banner after 6 s
  useEffect(() => {
    if (!postLogMsg) return;
    const id = setTimeout(() => setPostLogMsg(null), 6000);
    return () => clearTimeout(id);
  }, [postLogMsg]);

  const todayKey = toKey(new Date());

  // Animated score count-up (JS-driven, updates React state for display)
  const animVal      = useRef(new Animated.Value(0)).current;
  const [displayPct, setDisplayPct] = useState(0);

  useFocusEffect(useCallback(() => {
    refreshProfile();
    Promise.all([
      safeGetItem(STORAGE_KEYS.WORKOUTS),
      loadWaterGoalLog(MACRO_TARGETS.water),
      safeGetItem(STORAGE_KEYS.WEIGHTS),
      safeGetItem(STORAGE_KEYS.MEAL_LOGS),
      loadWorkoutLogs(),
    ]).then(([wo, wa, wt, ml, wl]) => {
      setWorkouts(safeParseJSON(wo, {} as DayLog));
      setWater(wa as DayLog);
      setWeights(safeParseJSON(wt, [] as WeightEntry[]));
      setMealLogs(safeParseJSON(ml, {} as Record<string, unknown[]>));
      setWorkoutLogs(wl as WorkoutLog[]);
    }).catch(e => {
      logger.error('storage', 'nutrition_load', 'Failed to load progress data', { error: String(e) });
    }).finally(() => setLoading(false));
  }, [refreshProfile, effectiveMacros.calories]));

  const saveWeights = useCallback(async (data: WeightEntry[]) => {
    setWeights(data);
    const ok = await safeSetItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(data));
    if (!ok) {
      Alert.alert('Save failed', 'Could not save your weight entry. Please try again.');
      setWeights(weights);
    }
  }, [weights]);

  const addWeight = useCallback(() => {
    Keyboard.dismiss();
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
    // Compute post-log message from the updated data immediately (not from stale state)
    setPostLogMsg(getPostLogMessage(analyzeTrend(updated), profile.fitnessGoal));
    // Keep profile.weightKg in sync with the weight log
    const syncedProfile = { ...profile, weightKg: val };
    updateProfile(syncedProfile);
    saveUserProfile(syncedProfile).catch(e =>
      logger.error('storage', 'weight_sync', 'Failed to sync weight to profile', { error: String(e) }),
    );
  }, [inputKg, weights, todayKey, saveWeights, profile, updateProfile]);

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
  const HISTORY_PAGE   = 5;
  const reversedWeights = useMemo(() => weights.slice().reverse(), [weights]);
  const visibleWeights  = showAllHistory ? reversedWeights : reversedWeights.slice(0, HISTORY_PAGE);
  const hiddenCount     = reversedWeights.length - HISTORY_PAGE;

  const daysSinceLastWeighIn = useMemo(() => {
    if (!latestW) return null;
    return Math.floor((Date.now() - new Date(latestW.date).getTime()) / 86_400_000);
  }, [latestW]);

  const trend = useMemo(() => analyzeTrend(weights), [weights]);

  const strengthSnapshots  = useMemo(() => computeStrengthSnapshots(workoutLogs), [workoutLogs]);
  const loggedExerciseIds  = useMemo(() => getLoggedExerciseIds(strengthSnapshots), [strengthSnapshots]);
  const activeExercise     = selectedExercise ?? loggedExerciseIds[0] ?? null;
  const e1rmHistory        = useMemo(
    () => activeExercise ? getE1RMHistory(strengthSnapshots, activeExercise) : [],
    [strengthSnapshots, activeExercise],
  );

  const weightNudge = useMemo(
    () => getNudgeMessage(weights, daysSinceLastWeighIn),
    [weights, daysSinceLastWeighIn],
  );

  const weightBadge = getWeightBadge(trend);
  const trendStats  = getTrendStatsLine(trend);

  const steps = useSteps();

  const coachInsights = useMemo(
    () => getCoachInsights(trend, weights, workoutStreak, waterStreak, steps.weeklySteps, DEFAULT_STEP_GOAL, profile.fitnessGoal, profile.gymDays.length),
    [trend, workoutStreak, waterStreak, steps.weeklySteps, profile.fitnessGoal, profile.gymDays.length],
  );

  const bmiData = useMemo(() => {
    const kg = latestW?.kg ?? profile.weightKg;
    const h  = profile.heightCm;
    if (!kg || !h) return null;
    const val = Math.round(kg / Math.pow(h / 100, 2) * 10) / 10;
    if (val < 10 || val > 60) return null; // sanity check
    if (val < 18.5) return { val, label: 'Underweight', color: theme.warning };
    if (val < 25)   return { val, label: 'Healthy',     color: theme.success };
    if (val < 30)   return { val, label: 'Overweight',  color: theme.warning };
    return               { val, label: 'Obese',         color: theme.gym };
  }, [latestW, profile.weightKg, profile.heightCm, theme]);

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

          {/* ── Coach Insights ── */}
          {coachInsights.length > 0 && (
            <View style={s.coachSection}>
              <Text style={s.coachSectionTitle}>Coach</Text>
              {coachInsights.map((insight: CoachInsight) => {
                const accentColor = (theme as Record<string, string>)[insight.colorKey] ?? theme.primary;
                return (
                  <View key={insight.id} style={s.coachInsightCard}>
                    <View style={[s.coachInsightIconWrap, { backgroundColor: accentColor + '18' }]}>
                      <Text style={s.coachInsightEmoji}>{insight.icon}</Text>
                    </View>
                    <View style={s.coachInsightBody}>
                      <Text style={s.coachInsightTitle}>{insight.title}</Text>
                      <Text style={s.coachInsightText}>{insight.body}</Text>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

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

          {/* ── Strength Trend ── */}
          {loggedExerciseIds.length > 0 && (
            <View style={[s.carouselOuter, { marginBottom: 16 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 }}>
                <View>
                  <Text style={s.weightTitle}>Strength Trend</Text>
                  <Text style={s.weightSubtitle}>Estimated 1RM · EMA smoothed</Text>
                </View>
              </View>

              {/* Exercise picker */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}>
                {loggedExerciseIds.map(id => {
                  const ex     = getExerciseById(id);
                  const active = id === activeExercise;
                  const color  = theme.gym ?? '#a855f7';
                  return (
                    <TouchableOpacity
                      key={id}
                      onPress={() => setSelectedExercise(id)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 6,
                        borderRadius: 10,
                        backgroundColor: active ? color + '25' : theme.bgCard,
                        borderWidth: 1,
                        borderColor: active ? color + '88' : theme.border,
                      }}>
                      <Text style={{ fontSize: 12, fontWeight: active ? '700' : '400', color: active ? color : theme.textSecondary }}>
                        {ex?.name ?? id}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <StrengthChart history={e1rmHistory} theme={theme} />
            </View>
          )}

          {/* ── Weight & BMI Carousel ── */}
          <View style={s.carouselOuter}>
            {/* Tab pills */}
            <View style={s.carouselTabs}>
              {(['Weight Log', 'BMI', 'Steps'] as const).map((label, i) => (
                <TouchableOpacity
                  key={label}
                  style={[s.carouselTab, carouselPage === i && s.carouselTabActive]}
                  onPress={() => {
                    carouselRef.current?.scrollTo({ x: i * cardWidth, animated: true });
                    setCarouselPage(i);
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={[s.carouselTabText, carouselPage === i && s.carouselTabTextActive]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <ScrollView
              ref={carouselRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              contentContainerStyle={{ alignItems: 'stretch' }}
              onMomentumScrollEnd={e =>
                setCarouselPage(Math.round(e.nativeEvent.contentOffset.x / cardWidth))
              }
            >
              {/* Slide 1 — Weight Log */}
              <View style={{ width: cardWidth, paddingRight: 6, flex: 1 }}>
                <View style={s.carouselCard}>
                  <View style={s.weightHeader}>
                    <View style={s.weightHeaderLeft}>
                      <Text style={s.weightTitle}>Weight Log</Text>
                      <Text style={s.weightSubtitle}>Weekly check-ins · EMA smoothed</Text>
                    </View>
                    <View style={[s.bmiBadge, { backgroundColor: weightBadge.color + '22', borderColor: weightBadge.color + '55' }]}>
                      <Text style={[s.bmiCategoryText, { color: weightBadge.color }]}>{weightBadge.label}</Text>
                    </View>
                  </View>

                  {latestW ? (
                    <>
                      <View style={s.weightHero}>
                        <Text style={[s.weightCurrent, { color: theme.textPrimary }]}>{latestW.kg} kg</Text>
                        {weightDelta !== null && (
                          <Text style={[s.weightDelta, {
                            color: weightDelta < 0 ? theme.success : weightDelta > 0 ? theme.gym : theme.textMuted,
                          }]}>
                            {weightDelta > 0 ? '+' : ''}{weightDelta.toFixed(1)} kg vs last
                          </Text>
                        )}
                      </View>
                      <Text style={s.weightHeroTrend}>{trendStats}</Text>
                    </>
                  ) : (
                    <Text style={[s.weightHeroTrend, { paddingTop: 4 }]}>Log your first entry below to start tracking.</Text>
                  )}

                  <View style={s.weightBody}>
                    <WeightChart entries={weights} emaHistory={trend.emaHistory} theme={theme} />

                    {postLogMsg ? (
                      <TouchableOpacity
                        style={s.postLogBanner}
                        onPress={() => setPostLogMsg(null)}
                        activeOpacity={0.8}
                      >
                        <Text style={s.postLogBannerText}>{postLogMsg}</Text>
                        <Text style={[s.postLogBannerText, { opacity: 0.5, marginTop: 6, fontSize: 11 }]}>
                          Tap to dismiss
                        </Text>
                      </TouchableOpacity>
                    ) : weightNudge.show ? (
                      <View style={s.weightNudge}>
                        <Text style={s.weightNudgeText}>💪 {weightNudge.msg}</Text>
                      </View>
                    ) : null}

                    <View style={s.weightInputRow}>
                      <TextInput
                        style={s.weightInput}
                        value={inputKg}
                        onChangeText={setInputKg}
                        placeholder="e.g. 72.5"
                        placeholderTextColor={theme.textMuted}
                        keyboardType="decimal-pad"
                        returnKeyType="done"
                        onSubmitEditing={addWeight}
                        onFocus={() => {
                          setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
                        }}
                      />
                      <TouchableOpacity style={s.weightBtn} onPress={addWeight} activeOpacity={0.8}>
                        <Text style={s.weightBtnText}>Log weight</Text>
                      </TouchableOpacity>
                    </View>

                    {weights.length > 0 && (
                      <View style={s.weightHistory}>
                        <Text style={s.historyLabel}>Recent entries</Text>
                        {visibleWeights.map(entry => (
                          <TouchableOpacity
                            key={entry.date}
                            style={s.historyRow}
                            onLongPress={() => deleteWeight(entry.date)}
                          >
                            <Text style={s.historyDate}>{entry.date}</Text>
                            <Text style={s.historyKg}>{entry.kg} kg</Text>
                          </TouchableOpacity>
                        ))}
                        {hiddenCount > 0 && !showAllHistory && (
                          <TouchableOpacity onPress={() => setShowAllHistory(true)} activeOpacity={0.7}>
                            <Text style={s.historyShowMore}>Show {hiddenCount} more ↓</Text>
                          </TouchableOpacity>
                        )}
                        {showAllHistory && reversedWeights.length > HISTORY_PAGE && (
                          <TouchableOpacity onPress={() => setShowAllHistory(false)} activeOpacity={0.7}>
                            <Text style={s.historyShowMore}>Show less ↑</Text>
                          </TouchableOpacity>
                        )}
                        <Text style={s.historyHint}>Long-press to delete an entry</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Slide 2 — BMI */}
              <View style={{ width: cardWidth, paddingLeft: 6, flex: 1 }}>
                {bmiData ? (() => {
                  const indicatorPct = Math.max(1, Math.min(99, Math.round((bmiData.val - 15) / 25 * 100)));
                  return (
                    <View style={s.carouselCard}>
                      {/* Header with subtle category color wash */}
                      <View style={[s.weightHeader, { backgroundColor: bmiData.color + '0f' }]}>
                        <View style={s.weightHeaderLeft}>
                          <Text style={s.weightTitle}>Body Mass Index</Text>
                          <Text style={s.weightSubtitle}>Weight ÷ height² · snapshot metric</Text>
                        </View>
                        <View style={[s.bmiBadge, { backgroundColor: bmiData.color + '22', borderColor: bmiData.color + '55' }]}>
                          <Text style={[s.bmiCategoryText, { color: bmiData.color }]}>{bmiData.label}</Text>
                        </View>
                      </View>

                      {/* Centred hero number */}
                      <View style={[s.bmiHero, { backgroundColor: bmiData.color + '07' }]}>
                        <Text style={[s.bmiHeroNumber, { color: bmiData.color }]}>{bmiData.val}</Text>
                        <Text style={[s.bmiHeroLabel, { color: bmiData.color }]}>Body Mass Index</Text>
                      </View>

                      <View style={s.weightBody}>
                        {/* Segmented scale with white position marker */}
                        <View style={{ position: 'relative' }}>
                          <View style={{ flexDirection: 'row', gap: 3, height: 10 }}>
                            {BMI_ZONES.map(zone => {
                              const isActive = bmiData.label === zone.label;
                              return (
                                <View key={zone.label} style={[
                                  { flex: zone.flex, borderRadius: 4, backgroundColor: zone.color + (isActive ? 'ff' : '28') },
                                  isActive && { shadowColor: zone.color, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.65, shadowRadius: 7, elevation: 4 },
                                ]} />
                              );
                            })}
                          </View>
                          <View style={{
                            position: 'absolute',
                            left: `${indicatorPct}%` as any,
                            top: -4,
                            width: 3,
                            height: 18,
                            borderRadius: 2,
                            backgroundColor: '#ffffff',
                            transform: [{ translateX: -1.5 }],
                            shadowColor: '#000',
                            shadowOffset: { width: 0, height: 1 },
                            shadowOpacity: 0.4,
                            shadowRadius: 3,
                            elevation: 4,
                          }} />
                        </View>
                        <View style={s.bmiScaleLabels}>
                          {BMI_ZONES.map(zone => (
                            <Text key={zone.label} style={[s.bmiScaleLabelText, { flex: zone.flex, color: bmiData.label === zone.label ? zone.color : theme.textMuted }]}>
                              {zone.label === 'Underweight' ? 'Under' : zone.label === 'Overweight' ? 'Over' : zone.label}
                            </Text>
                          ))}
                        </View>
                        <View style={[s.bmiCoachBox, { backgroundColor: bmiData.color + '14', borderLeftColor: bmiData.color }]}>
                          <Text style={s.bmiCoachText}>{getBmiCoachLine(bmiData.val, bmiData.label as BmiLabel)}</Text>
                        </View>
                        <View style={s.bmiTip}>
                          <Text style={s.bmiTipText}>💡 BMI = weight ÷ height². Useful context, but doesn't distinguish muscle from fat. Pair it with your weight trend for the real picture.</Text>
                        </View>
                      </View>
                    </View>
                  );
                })() : (
                  <View style={[s.carouselCard, { padding: 20 }]}>
                    <Text style={s.weightTitle}>Body Mass Index</Text>
                    <Text style={[s.emptyText, { marginTop: 8 }]}>Add your height in Profile to see your BMI.</Text>
                  </View>
                )}
              </View>

              {/* Slide 3 — Steps */}
              <View style={{ width: cardWidth, paddingLeft: 6, flex: 1 }}>
                <View style={s.carouselCard}>
                  {steps.source !== null && steps.todaySteps !== null ? (() => {
                    const pct       = Math.min(1, steps.todaySteps / steps.goal);
                    const pctInt    = Math.round(pct * 100);
                    const stepColor = pct >= 1 ? theme.success : pct >= 0.6 ? theme.primary : theme.gym;
                    const maxW      = steps.weeklySteps.length > 0 ? Math.max(...steps.weeklySteps.map(d => d.steps), 1) : 1;
                    const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
                    const sourceLabel = steps.source === 'sensor' ? '📱 Device' : '✏️ Manual';
                    return (
                      <>
                        <View style={s.stepsHeader}>
                          <View style={s.stepsHeaderLeft}>
                            <Text style={s.stepsTitle}>Steps</Text>
                            <Text style={s.stepsSubtitle}>Today's progress</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <View style={s.stepsConnectedBadge}>
                              <View style={s.stepsConnectedDot} />
                              <Text style={s.stepsConnectedText}>{sourceLabel}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setStepsSheet('menu')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                              <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>Update</Text>
                            </TouchableOpacity>
                          </View>
                        </View>

                        <View style={s.stepsHero}>
                          <Text style={[s.stepsHeroNumber, { color: stepColor }]}>
                            {steps.todaySteps.toLocaleString()}
                          </Text>
                          <Text style={s.stepsHeroGoal}>of {steps.goal.toLocaleString()} goal</Text>
                        </View>

                        <View style={s.stepsProgressTrack}>
                          <View style={[s.stepsProgressFill, { width: `${pctInt}%` as any, backgroundColor: stepColor }]} />
                        </View>
                        <View style={s.stepsProgressLabel}>
                          <Text style={[s.stepsProgressPct, { color: stepColor }]}>{pctInt}%</Text>
                          <Text style={s.stepsProgressGoalText}>{steps.goal.toLocaleString()} goal</Text>
                        </View>

                        {steps.weeklySteps.length > 0 && (
                          <View style={s.stepsBars}>
                            {steps.weeklySteps.map((d, i) => {
                              const barPct  = d.steps / maxW;
                              const isToday = i === steps.weeklySteps.length - 1;
                              return (
                                <View key={d.dateKey} style={s.stepsBarCol}>
                                  <View style={[s.stepsBarTrack, { height: 40 }]}>
                                    <View style={[s.stepsBarFill, { height: `${Math.max(4, Math.round(barPct * 100))}%` as any, backgroundColor: isToday ? stepColor : (theme.primary + '55') }]} />
                                  </View>
                                  <Text style={s.stepsBarLabel}>{DAY_LABELS[i]}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}

                        <View style={s.stepsTip}>
                          <Text style={s.stepsTipText}>💡 Aim for 8,000+ steps daily. Research links consistent daily walking to lower cardiovascular risk, better sleep, and improved mood.</Text>
                        </View>
                      </>
                    );
                  })() : (
                    <View style={s.stepsEmptyCard}>
                      <Text style={s.stepsEmptyIcon}>👟</Text>
                      <Text style={s.stepsEmptyTitle}>Track Your Steps</Text>
                      <Text style={s.stepsEmptyBody}>
                        See daily step counts, weekly trends, and progress toward your activity goal.
                      </Text>
                      <TouchableOpacity style={s.stepsConnectBtn} onPress={() => setStepsSheet('menu')} activeOpacity={0.85}>
                        <Text style={s.stepsConnectBtnText}>Add Steps</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            </ScrollView>

            {/* Carousel dots */}
            <View style={s.carouselDots}>
              {[0, 1, 2].map(i => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    carouselRef.current?.scrollTo({ x: i * cardWidth, animated: true });
                    setCarouselPage(i);
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <View style={[s.carouselDot, carouselPage === i && s.carouselDotActive]} />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Steps bottom sheet ── */}
      <Modal
        visible={stepsSheet !== 'closed'}
        transparent
        animationType="slide"
        onRequestClose={() => setStepsSheet('closed')}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.stepsSheetScrim} activeOpacity={1} onPress={() => setStepsSheet('closed')} />
          <View style={s.stepsSheet}>
            <View style={s.stepsSheetHandle} />

            {stepsSheet === 'menu' && (
              <>
                <Text style={s.stepsSheetTitle}>Track Your Steps</Text>
                <Text style={s.stepsSheetSub}>Choose how you'd like to log your daily steps.</Text>

                <TouchableOpacity
                  style={s.stepsSheetRow}
                  activeOpacity={0.7}
                  onPress={async () => {
                    setStepsSheet('closed');
                    await steps.connectSensor();
                  }}>
                  <View style={[s.stepsSheetIcon, { backgroundColor: theme.primary + '20' }]}>
                    <Text style={s.stepsSheetIconEmoji}>📱</Text>
                  </View>
                  <View style={s.stepsSheetRowText}>
                    <Text style={s.stepsSheetRowLabel}>Connect device</Text>
                    <Text style={s.stepsSheetRowSub}>Use your phone's built-in step counter</Text>
                  </View>
                  <Text style={s.stepsSheetChevron}>›</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={s.stepsSheetRow}
                  activeOpacity={0.7}
                  onPress={() => {
                    setStepsInput('');
                    setStepsSheet('manual');
                  }}>
                  <View style={[s.stepsSheetIcon, { backgroundColor: theme.gym + '20' }]}>
                    <Text style={s.stepsSheetIconEmoji}>✏️</Text>
                  </View>
                  <View style={s.stepsSheetRowText}>
                    <Text style={s.stepsSheetRowLabel}>Enter manually</Text>
                    <Text style={s.stepsSheetRowSub}>Type in today's step count</Text>
                  </View>
                  <Text style={s.stepsSheetChevron}>›</Text>
                </TouchableOpacity>

                <Text style={s.stepsSheetSoonLabel}>Coming soon</Text>
                <View style={s.stepsSheetSoonGrid}>
                  {[
                    { icon: '❤️', name: 'Apple Health' },
                    { icon: '🤖', name: 'Health Connect' },
                    { icon: '🏃', name: 'Strava' },
                    { icon: '⌚', name: 'Garmin' },
                    { icon: '⚖️', name: 'Withings' },
                    { icon: '💪', name: 'Fitbit' },
                  ].map(item => (
                    <View key={item.name} style={s.stepsSheetSoonPill}>
                      <Text style={{ fontSize: 13 }}>{item.icon}</Text>
                      <Text style={s.stepsSheetSoonPillText}>{item.name}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {stepsSheet === 'manual' && (
              <>
                <TouchableOpacity style={s.stepsSheetBack} onPress={() => setStepsSheet('menu')}>
                  <Text style={{ fontSize: 18, color: theme.primary }}>‹</Text>
                  <Text style={s.stepsSheetBackText}>Back</Text>
                </TouchableOpacity>
                <Text style={s.stepsSheetTitle}>Log Steps</Text>
                {steps.todaySteps !== null && steps.source === 'manual' ? (
                  <Text style={s.stepsSheetSub}>
                    Total so far: <Text style={{ color: theme.primary, fontWeight: '700' }}>{steps.todaySteps.toLocaleString()}</Text> steps
                  </Text>
                ) : (
                  <Text style={s.stepsSheetSub}>Add or remove steps for today.</Text>
                )}
                <TextInput
                  style={s.stepsSheetInput}
                  value={stepsInput}
                  onChangeText={setStepsInput}
                  keyboardType="number-pad"
                  placeholder="Number of steps"
                  placeholderTextColor={theme.textMuted}
                  autoFocus
                />
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    style={[s.stepsSheetSaveBtn, { flex: 1 }, !stepsInput && { opacity: 0.4 }]}
                    activeOpacity={0.85}
                    disabled={!stepsInput}
                    onPress={async () => {
                      const val = parseInt(stepsInput.replace(/[^0-9]/g, ''));
                      if (!isNaN(val) && val > 0) {
                        await steps.logManual(val);
                        setStepsSheet('closed');
                        setStepsInput('');
                      }
                    }}>
                    <Text style={s.stepsSheetSaveBtnText}>+ Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[s.stepsSheetSaveBtn, { flex: 1, backgroundColor: theme.error + '22', borderWidth: 1, borderColor: theme.error + '50' }, !stepsInput && { opacity: 0.4 }]}
                    activeOpacity={0.85}
                    disabled={!stepsInput}
                    onPress={async () => {
                      const val = parseInt(stepsInput.replace(/[^0-9]/g, ''));
                      if (!isNaN(val) && val > 0) {
                        await steps.logManual(-val);
                        setStepsSheet('closed');
                        setStepsInput('');
                      }
                    }}>
                    <Text style={[s.stepsSheetSaveBtnText, { color: theme.error }]}>− Remove</Text>
                  </TouchableOpacity>
                </View>
                {steps.todaySteps !== null && steps.source === 'manual' && (
                  <TouchableOpacity
                    style={{ alignSelf: 'center', marginTop: 14, paddingVertical: 6 }}
                    activeOpacity={0.7}
                    onPress={async () => {
                      await steps.resetManual();
                      setStepsSheet('closed');
                      setStepsInput('');
                    }}>
                    <Text style={{ fontSize: 13, color: theme.error, fontWeight: '500' }}>Reset to 0</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
