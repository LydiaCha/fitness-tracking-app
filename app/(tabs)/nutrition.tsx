import React, { useState, useCallback, useMemo } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppThemeType } from '@/constants/theme';
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

// ─── Weight Chart styles ──────────────────────────────────────────────────────
function useChartStyles(theme: AppThemeType) {
  return useMemo(() => StyleSheet.create({
    trendRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
    trendLabel: { fontSize: 12, color: theme.textMuted },
    trendRange: { fontSize: 12, color: theme.textMuted },
    trendBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
    trendText:  { fontSize: 12, fontWeight: '700' },
    chartWrap:  { position: 'relative' },
    guideLine:  { position: 'absolute', left: 0, right: 0, height: 1 },
    segment:    { position: 'absolute', height: 3, borderRadius: 1.5 },
    dot:        { position: 'absolute', borderRadius: 99 },
    latestLabel:{ position: 'absolute', width: 48, textAlign: 'center', fontSize: 10, fontWeight: '700' },
    axisLabel:  { position: 'absolute', width: 36, textAlign: 'center', fontSize: 8 },
  }), [theme]);
}

// ─── Weight Chart (line chart) ────────────────────────────────────────────────
function WeightChart({ entries, theme }: { entries: WeightEntry[]; theme: AppThemeType }) {
  const cs = useChartStyles(theme);
  const [width, setWidth] = useState(0);
  const data = entries.slice(-14);

  if (data.length === 0) return null;

  const CHART_H  = 90;
  const PAD_X    = 8;
  const PAD_Y    = 10;
  const vals     = data.map(e => e.kg);
  const minV     = Math.min(...vals) - 0.5;
  const maxV     = Math.max(...vals) + 0.5;
  const range    = maxV - minV || 1;
  const usableW  = Math.max(width - PAD_X * 2, 1);

  const pts = data.map((e, i) => ({
    x: PAD_X + (data.length === 1 ? usableW / 2 : (i / (data.length - 1)) * usableW),
    y: PAD_Y + (1 - (e.kg - minV) / range) * CHART_H,
    entry: e,
  }));

  const trendUp    = data.length >= 2 && data[data.length - 1].kg > data[data.length - 2].kg;
  const trendColor = trendUp ? theme.gym : theme.meal;
  const trendText  = data.length >= 2
    ? `${trendUp ? '+' : ''}${(data[data.length - 1].kg - data[data.length - 2].kg).toFixed(1)} kg`
    : null;

  // Label indices: first, mid, last
  const labelIdx = [...new Set([0, Math.floor((data.length - 1) / 2), data.length - 1])];

  return (
    <View onLayout={e => setWidth(e.nativeEvent.layout.width)}>
      {/* Trend badge row */}
      <View style={cs.trendRow}>
        <Text style={cs.trendLabel}>Last {data.length} entries</Text>
        {trendText && (
          <View style={[cs.trendBadge, { backgroundColor: trendColor + '22' }]}>
            <Text style={[cs.trendText, { color: trendColor }]}>{trendText}</Text>
          </View>
        )}
        <Text style={[cs.trendRange, { marginLeft: 'auto' as any }]}>
          {minV.toFixed(1)}–{maxV.toFixed(1)} kg
        </Text>
      </View>

      {/* Chart canvas */}
      {width > 0 && (
        <View style={[cs.chartWrap, { height: CHART_H + PAD_Y * 2 + 16 }]}>
          {/* Horizontal guide lines */}
          {[0, 0.5, 1].map(pct => (
            <View
              key={pct}
              style={[cs.guideLine, {
                top: PAD_Y + (1 - pct) * CHART_H,
                backgroundColor: theme.border + '33',
              }]}
            />
          ))}

          {/* Line segments */}
          {pts.slice(0, -1).map((p1, i) => {
            const p2  = pts[i + 1];
            const dx  = p2.x - p1.x;
            const dy  = p2.y - p1.y;
            const len = Math.sqrt(dx * dx + dy * dy);
            const ang = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View
                key={i}
                style={[cs.segment, {
                  left:  (p1.x + p2.x) / 2 - len / 2,
                  top:   (p1.y + p2.y) / 2 - 1.5,
                  width: len,
                  backgroundColor: theme.primary + '99',
                  transform: [{ rotate: `${ang}deg` }],
                }]}
              />
            );
          })}

          {/* Dots */}
          {pts.map((p, i) => {
            const isLatest = i === pts.length - 1;
            const size = isLatest ? 12 : 7;
            return (
              <View
                key={i}
                style={[cs.dot, {
                  left: p.x - size / 2, top: p.y - size / 2,
                  width: size, height: size,
                  backgroundColor: isLatest ? theme.primary : theme.primary + '77',
                  borderWidth: isLatest ? 2 : 0,
                  borderColor: theme.bg,
                }]}
              />
            );
          })}

          {/* Value label on latest dot */}
          {pts.length > 0 && (() => {
            const p = pts[pts.length - 1];
            return (
              <Text style={[cs.latestLabel, { left: p.x - 24, top: p.y - 20, color: theme.primary }]}>
                {data[data.length - 1].kg} kg
              </Text>
            );
          })()}

          {/* X-axis date labels */}
          {labelIdx.map(i => (
            <Text
              key={i}
              style={[cs.axisLabel, {
                left: pts[i].x - 18,
                top: CHART_H + PAD_Y * 2 - 2,
                color: theme.textMuted,
              }]}>
              {pts[i].entry.date.slice(5).replace('-', '/')}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function useStyles(theme: AppThemeType) {
  return useMemo(() => StyleSheet.create({
    safe:         { flex: 1, backgroundColor: theme.bg },
    scroll:       { flex: 1 },
    scrollContent:{ paddingHorizontal: 16, paddingTop: 8 },
    header:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
    headerText:   { flex: 1 },
    title:        { fontSize: 24, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
    subtitle:     { fontSize: 13, color: theme.textSecondary },
    themeBtn:     { padding: 6, marginTop: 2 },
    themeBtnText: { fontSize: 20 },

    // Score Card
    scoreCard:      { backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    periodRow:      { flexDirection: 'row', gap: 8, marginBottom: 16 },
    periodPill:     { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    periodText:     { fontSize: 12, fontWeight: '600', color: theme.textMuted },
    scoreMain:      { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
    scorePct:       { fontSize: 48, fontWeight: '800', lineHeight: 54 },
    scoreRight:     { flex: 1 },
    scoreBarBg:     { height: 8, backgroundColor: theme.bgCardAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    scoreBarFill:   { height: 8, borderRadius: 4 },
    scoreCount:     { fontSize: 13, color: theme.textSecondary, marginBottom: 6 },
    scoreBreakdown: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },
    streakChip:     { backgroundColor: theme.gym + '20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.gym + '44' },
    streakChipText: { fontSize: 12, color: theme.gym, fontWeight: '600' },

    // Card
    card:         { backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    cardTitle:    { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 12 },

    // Grid
    gridRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    gridIcon:      { width: 28, fontSize: 16, textAlign: 'center' },
    gridCell:      { flex: 1, alignItems: 'center' },
    gridDayLetter: { fontSize: 10, color: theme.textMuted, fontWeight: '600' },
    gridDate:      { fontSize: 9, color: theme.textMuted, marginTop: 1, marginBottom: 4 },
    gridDot:       { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.bgCardAlt },
    gridDash:      { fontSize: 12, color: theme.border, marginTop: 5 },

    // Weight
    weightSummary:  { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 4 },
    weightCurrent:  { fontSize: 30, fontWeight: '800' },
    weightDelta:    { fontSize: 14, fontWeight: '600' },
    weightInputRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    weightInput:    { flex: 1, backgroundColor: theme.bgCardAlt, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
    weightBtn:      { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
    weightBtnText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
    weightHistory:  { marginTop: 14, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
    historyLabel:   { fontSize: 11, color: theme.textMuted, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    historyRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.border + '55' },
    historyDate:    { fontSize: 13, color: theme.textSecondary },
    historyKg:      { fontSize: 13, fontWeight: '700', color: theme.textPrimary },
    historyHint:    { fontSize: 10, color: theme.textMuted, marginTop: 8, textAlign: 'center' },
    emptyText:      { fontSize: 13, color: theme.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 20 },

    summaryRow:   { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
    summaryItem:  { alignItems: 'center' },
    summaryValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    summaryLabel: { fontSize: 10, color: theme.textSecondary, textAlign: 'center' },
  }), [theme]);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const { theme, isDark } = useAppTheme();
  const s = useStyles(theme);

  const [workouts, setWorkouts] = useState<DayLog>({});
  const [water,    setWater]    = useState<DayLog>({});
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
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

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
