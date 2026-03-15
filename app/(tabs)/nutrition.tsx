import React, { useState, useCallback, useMemo, useRef } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppThemeType } from '@/constants/theme';
import { createNutritionStyles } from './nutrition.styles';
import { useAppTheme } from '@/context/ThemeContext';
import { STORAGE_KEYS, toKey, isGymDay, getWeekDates } from '@/utils/appConstants';
import { getPeriodScore, getDatesForPeriod, scoreColor, calcWorkoutStreak } from '@/utils/calculations';
import { loadUserProfile, DEFAULT_PROFILE } from '@/constants/userProfile';
import { WEEK_SCHEDULE } from '@/constants/scheduleData';
import { safeGetItem, safeSetItem, safeParseJSON } from '@/utils/storage';
import { logger } from '@/utils/logger';

// ─── Types ───────────────────────────────────────────────────────────────────
type DayLog = { [dateKey: string]: boolean };
interface WeightEntry { date: string; kg: number; }
type Period = 'today' | 'week' | 'month';

// ─── Constants ───────────────────────────────────────────────────────────────
const PERIODS: { value: Period; label: string }[] = [
  { value: 'today', label: 'Today' },
  { value: 'week',  label: 'This Week' },
  { value: 'month', label: 'This Month' },
];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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
  const [range, setRange]   = useState<ChartRange>('90d');
  const [width, setWidth]   = useState(0);
  const data = filterByRange(entries, range);

  const CHART_H = 160;
  const PAD_TOP = 12;
  const PAD_BOT = 24;  // room for x-axis labels
  const Y_AXIS  = 36;  // room for y-axis labels on left

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

  // Y-axis grid lines at nice round values
  const gridLines = useMemo(() => {
    const step = (rawMax - rawMin) < 2 ? 0.5 : (rawMax - rawMin) < 5 ? 1 : 2;
    const start = Math.ceil(minV / step) * step;
    const lines: number[] = [];
    for (let v = start; v <= maxV; v = Math.round((v + step) * 100) / 100) lines.push(v);
    return lines;
  }, [minV, maxV, rawMin, rawMax]);

  // X-axis: show up to 4 evenly spaced date labels
  const xLabelIdx = useMemo(() => {
    if (data.length === 0) return [];
    if (data.length <= 4) return data.map((_, i) => i);
    const step = (data.length - 1) / 3;
    return [0, Math.round(step), Math.round(step * 2), data.length - 1];
  }, [data.length]);

  const trendUp    = data.length >= 2 && data[data.length - 1].kg > data[0].kg;
  const totalDelta = data.length >= 2 ? data[data.length - 1].kg - data[0].kg : null;

  return (
    <View>
      {/* Range selector + trend */}
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

              {/* Y-axis grid lines + labels */}
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

              {/* Line segments */}
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

              {/* Dots */}
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

              {/* Latest value label */}
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

              {/* X-axis labels */}
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
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const [weights,  setWeights]  = useState<WeightEntry[]>([]);
  const [period,   setPeriod]   = useState<Period>('today');
  const [inputKg,  setInputKg]  = useState('');
  const [loading,  setLoading]  = useState(true);
  const [gymDays,  setGymDays]  = useState<number[]>(DEFAULT_PROFILE.gymDays);

  const todayKey  = toKey(new Date());
  const weekDates = useMemo(() => getWeekDates(), []);

  const weekSummary = useMemo(() => ({
    gymDayCount:   gymDays.length,
    classDayCount: WEEK_SCHEDULE.filter(d => d.isClassDay).length,
    restDayCount:  WEEK_SCHEDULE.filter(d => d.isRestDay).length,
  }), [gymDays]);

  // Reload whenever the tab is focused so home-screen toggles are reflected
  useFocusEffect(useCallback(() => {
    Promise.all([
      safeGetItem(STORAGE_KEYS.WORKOUTS),
      safeGetItem(STORAGE_KEYS.WATER),
      safeGetItem(STORAGE_KEYS.WEIGHTS),
      loadUserProfile(),
    ]).then(([wo, wa, wt, prof]) => {
      setWorkouts(safeParseJSON(wo, {} as DayLog));
      setWater(safeParseJSON(wa, {} as DayLog));
      setWeights(safeParseJSON(wt, [] as WeightEntry[]));
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
      // Revert optimistic state
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

  const todayIsGym = isGymDay(new Date(), gymDays);

  const score  = useMemo(() => getPeriodScore(period, workouts, water, gymDays), [period, workouts, water, gymDays]);
  const sColor = scoreColor(score.pct, theme);
  const streak = useMemo(() => calcWorkoutStreak(workouts, gymDays), [workouts, gymDays]);

  const latestW = weights.length > 0 ? weights[weights.length - 1] : null;
  const prevW   = weights.length > 1 ? weights[weights.length - 2] : null;
  const delta   = latestW && prevW ? latestW.kg - prevW.kg : null;
  const recentWeights = useMemo(() => weights.slice().reverse().slice(0, 8), [weights]);

  const breakdownLines = useMemo(() => {
    const lines: string[] = [];
    if (period === 'today') {
      if (todayIsGym) lines.push(workouts[todayKey] ? '💪 Gym ✓' : '💪 Gym pending');
      lines.push(water[todayKey] ? '💧 Water ✓' : '💧 Water pending');
    } else {
      const dates = getDatesForPeriod(period);
      const gymExpected = dates.filter(d => isGymDay(d, gymDays)).length;
      const gymDone = dates.filter(d => workouts[toKey(d)]).length;
      const waterDone = dates.filter(d => water[toKey(d)]).length;
      if (gymExpected > 0) lines.push(`💪 ${gymDone}/${gymExpected} workouts`);
      lines.push(`💧 ${waterDone}/${dates.length} water days`);
    }
    return lines;
  }, [period, workouts, water, todayKey, todayIsGym]);

  if (loading) return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={s.header}>
            <View style={s.headerText}>
              <Text style={s.title}>Progress</Text>
              <Text style={s.subtitle}>Workouts + water — the two that matter most</Text>
            </View>
          </View>

          {/* ── Score Card ── */}
          <View style={s.scoreCard}>
            {/* Period tabs */}
            <View style={s.periodRow}>
              {PERIODS.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[s.periodPill, period === value && { backgroundColor: theme.primary + '33', borderColor: theme.primary }]}
                  onPress={() => setPeriod(value)}>
                  <Text style={[s.periodText, period === value && { color: theme.primary }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Big score */}
            <View style={s.scoreMain}>
              <Text style={[s.scorePct, { color: sColor }]}>{score.pct}%</Text>
              <View style={s.scoreRight}>
                <View style={s.scoreBarBg}>
                  <View style={[s.scoreBarFill, { width: `${score.pct}%` as any, backgroundColor: sColor }]} />
                </View>
                <Text style={s.scoreCount}>{score.done} of {score.total} goals met</Text>
                {breakdownLines.map((line, i) => (
                  <Text key={i} style={s.scoreBreakdown}>{line}</Text>
                ))}
              </View>
            </View>

            {/* Streak chip */}
            {streak > 0 && (
              <View style={s.streakChip}>
                <Text style={s.streakChipText}>🔥 {streak}-session workout streak</Text>
              </View>
            )}
          </View>

          {/* ── Week Summary ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>📊 Week Summary</Text>
            <View style={s.summaryRow}>
              <View style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: theme.gym }]}>{weekSummary.gymDayCount}</Text>
                <Text style={s.summaryLabel}>Gym Days</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: theme.class }]}>{weekSummary.classDayCount}</Text>
                <Text style={s.summaryLabel}>Uni Classes</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: theme.rest }]}>{weekSummary.restDayCount}</Text>
                <Text style={s.summaryLabel}>Rest Days</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: theme.sleep }]}>52.5h</Text>
                <Text style={s.summaryLabel}>Sleep Target</Text>
              </View>
            </View>
          </View>

          {/* ── This Week Grid ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>This Week</Text>
            {/* Header row */}
            <View style={s.gridRow}>
              <View style={s.gridIcon} />
              {weekDates.map((d, i) => {
                const isToday = toKey(d) === todayKey;
                return (
                  <View key={i} style={s.gridCell}>
                    <Text style={[s.gridDayLetter, isToday && { color: theme.primary, fontWeight: '700' }]}>
                      {DAY_LABELS[d.getDay()]}
                    </Text>
                    <Text style={[s.gridDate, isToday && { color: theme.primary }]}>{d.getDate()}</Text>
                  </View>
                );
              })}
            </View>

            {/* Workout row */}
            <View style={s.gridRow}>
              <Text style={s.gridIcon}>💪</Text>
              {weekDates.map((d, i) => {
                const k = toKey(d);
                const gym = isGymDay(d, gymDays);
                const done = workouts[k] ?? false;
                const future = k > todayKey;
                if (!gym) return (
                  <View key={i} style={s.gridCell}>
                    <Text style={s.gridDash}>—</Text>
                  </View>
                );
                return (
                  <View key={i} style={s.gridCell}>
                    <View style={[
                      s.gridDot,
                      done && { backgroundColor: theme.gym },
                      !done && !future && { borderWidth: 1, borderColor: theme.border },
                      future && { opacity: 0.18, borderWidth: 1, borderColor: theme.border },
                    ]} />
                  </View>
                );
              })}
            </View>

            {/* Water row */}
            <View style={s.gridRow}>
              <Text style={s.gridIcon}>💧</Text>
              {weekDates.map((d, i) => {
                const k = toKey(d);
                const done = water[k] ?? false;
                const future = k > todayKey;
                return (
                  <View key={i} style={s.gridCell}>
                    <View style={[
                      s.gridDot,
                      done && { backgroundColor: theme.water },
                      !done && !future && { borderWidth: 1, borderColor: theme.border },
                      future && { opacity: 0.18, borderWidth: 1, borderColor: theme.border },
                    ]} />
                  </View>
                );
              })}
            </View>
          </View>

          {/* ── Weight Log ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>Weight Log</Text>

            {latestW && (
              <View style={s.weightSummary}>
                <Text style={[s.weightCurrent, { color: theme.primary }]}>{latestW.kg} kg</Text>
                {delta !== null && (
                  <Text style={[s.weightDelta, {
                    color: delta < 0 ? theme.meal : delta > 0 ? theme.gym : theme.textSecondary,
                  }]}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg
                  </Text>
                )}
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
                <Text style={s.weightBtnText}>Log today</Text>
              </TouchableOpacity>
            </View>

            {weights.length > 0 && (
              <View style={s.weightHistory}>
                <Text style={s.historyLabel}>Recent entries</Text>
                {recentWeights.map(entry => (
                  <TouchableOpacity key={entry.date} style={s.historyRow} onLongPress={() => deleteWeight(entry.date)}>
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

          <View style={{ height: 24 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
