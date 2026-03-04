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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppTheme } from '@/constants/theme';
import { STORAGE_KEYS, toKey, isGymDay, getWeekDates } from '@/utils/appConstants';

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDatesForPeriod(period: Period): Date[] {
  const today = new Date();
  if (period === 'today') return [today];

  if (period === 'week') {
    const weekDates = getWeekDates();
    const todayKey = toKey(today);
    return weekDates.filter(d => toKey(d) <= todayKey);
  }

  // month
  const dates: Date[] = [];
  for (let i = 1; i <= today.getDate(); i++) {
    dates.push(new Date(today.getFullYear(), today.getMonth(), i));
  }
  return dates;
}

function getPeriodScore(
  period: Period,
  workouts: DayLog,
  water: DayLog,
): { done: number; total: number; pct: number } {
  const dates = getDatesForPeriod(period);
  let done = 0, total = 0;
  for (const d of dates) {
    const k = toKey(d);
    const gym = isGymDay(d);
    total += gym ? 2 : 1;
    if (gym && workouts[k]) done++;
    if (water[k]) done++;
  }
  return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
}

function scoreColor(pct: number) {
  if (pct === 100) return AppTheme.meal;
  if (pct >= 80)  return AppTheme.warning;
  if (pct >= 50)  return AppTheme.primary;
  return AppTheme.textSecondary;
}

function calcWorkoutStreak(workouts: DayLog): number {
  const today = new Date();
  let streak = 0;
  for (let i = 0; i < 90; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (!isGymDay(d)) continue;
    const k = toKey(d);
    if (workouts[k]) {
      streak++;
    } else if (i === 0) {
      // today's gym not done yet — don't break streak
    } else {
      break;
    }
  }
  return streak;
}

// ─── Weight Chart ─────────────────────────────────────────────────────────────
function WeightChart({ entries }: { entries: WeightEntry[] }) {
  const last7 = entries.slice(-7);
  if (last7.length === 0) return null;
  const vals = last7.map(e => e.kg);
  const minV = Math.min(...vals) - 1;
  const range = (Math.max(...vals) + 1) - minV || 1;

  return (
    <View style={ch.wrap}>
      <View style={ch.bars}>
        {last7.map((entry, i) => {
          const hPct = ((entry.kg - minV) / range) * 100;
          const isLast = i === last7.length - 1;
          return (
            <View key={entry.date} style={ch.col}>
              <Text style={ch.label}>{entry.kg}</Text>
              <View style={ch.track}>
                <View style={[ch.fill, {
                  height: `${hPct}%` as any,
                  backgroundColor: isLast ? AppTheme.primary : AppTheme.primary + '55',
                }]} />
              </View>
              <Text style={ch.date}>{entry.date.slice(5).replace('-', '/')}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
const ch = StyleSheet.create({
  wrap: { marginTop: 12 },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 100 },
  col: { flex: 1, alignItems: 'center', height: '100%', justifyContent: 'flex-end' },
  track: { width: '100%', height: 76, justifyContent: 'flex-end', backgroundColor: AppTheme.bgCardAlt, borderRadius: 4, overflow: 'hidden' },
  fill: { width: '100%', borderRadius: 4 },
  label: { fontSize: 9, color: AppTheme.textSecondary, marginBottom: 2 },
  date: { fontSize: 8, color: AppTheme.textMuted, marginTop: 4 },
});

// ─── Check-in Row ─────────────────────────────────────────────────────────────
function CheckRow({
  emoji, label, sublabel, done, onToggle, color, disabled,
}: {
  emoji: string; label: string; sublabel?: string; done: boolean;
  onToggle: () => void; color: string; disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[s.checkRow, done && { borderColor: color + '66', backgroundColor: color + '12' }]}
      onPress={onToggle}
      disabled={disabled}
      activeOpacity={0.8}>
      <View style={[s.checkBox, done && { backgroundColor: color, borderColor: color }]}>
        {done && <Text style={s.checkMark}>✓</Text>}
      </View>
      <Text style={s.checkEmoji}>{emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={[s.checkLabel, done && { color: AppTheme.textPrimary }]}>{label}</Text>
        {sublabel ? <Text style={s.checkSub}>{sublabel}</Text> : null}
      </View>
      {done && <Text style={[s.checkDoneText, { color }]}>Done</Text>}
    </TouchableOpacity>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProgressScreen() {
  const [workouts, setWorkouts] = useState<DayLog>({});
  const [water,    setWater]    = useState<DayLog>({});
  const [weights,  setWeights]  = useState<WeightEntry[]>([]);
  const [period,   setPeriod]   = useState<Period>('today');
  const [inputKg,  setInputKg]  = useState('');
  const [loading,  setLoading]  = useState(true);

  const todayKey  = toKey(new Date());
  const weekDates = getWeekDates();

  // Reload whenever the tab is focused so home-screen toggles are reflected
  useFocusEffect(useCallback(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEYS.WORKOUTS),
      AsyncStorage.getItem(STORAGE_KEYS.WATER),
      AsyncStorage.getItem(STORAGE_KEYS.WEIGHTS),
    ]).then(([wo, wa, wt]) => {
      if (wo) setWorkouts(JSON.parse(wo));
      if (wa) setWater(JSON.parse(wa));
      if (wt) setWeights(JSON.parse(wt));
    }).catch(console.error).finally(() => setLoading(false));
  }, []));

  const saveWorkouts = useCallback(async (data: DayLog) => {
    setWorkouts(data);
    await AsyncStorage.setItem(STORAGE_KEYS.WORKOUTS, JSON.stringify(data));
  }, []);

  const saveWater = useCallback(async (data: DayLog) => {
    setWater(data);
    await AsyncStorage.setItem(STORAGE_KEYS.WATER, JSON.stringify(data));
  }, []);

  const saveWeights = useCallback(async (data: WeightEntry[]) => {
    setWeights(data);
    await AsyncStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(data));
  }, []);

  const toggleWorkout = useCallback(() =>
    saveWorkouts({ ...workouts, [todayKey]: !workouts[todayKey] }),
    [workouts, todayKey, saveWorkouts]);

  const toggleWater = useCallback(() =>
    saveWater({ ...water, [todayKey]: !water[todayKey] }),
    [water, todayKey, saveWater]);

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

  if (loading) return <SafeAreaView style={s.safe}><StatusBar barStyle="light-content" /></SafeAreaView>;

  const todayIsGym = isGymDay(new Date());

  const score  = useMemo(() => getPeriodScore(period, workouts, water), [period, workouts, water]);
  const sColor = scoreColor(score.pct);
  const streak = useMemo(() => calcWorkoutStreak(workouts), [workouts]);

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
      const gymExpected = dates.filter(isGymDay).length;
      const gymDone = dates.filter(d => workouts[toKey(d)]).length;
      const waterDone = dates.filter(d => water[toKey(d)]).length;
      if (gymExpected > 0) lines.push(`💪 ${gymDone}/${gymExpected} workouts`);
      lines.push(`💧 ${waterDone}/${dates.length} water days`);
    }
    return lines;
  }, [period, workouts, water, todayKey, todayIsGym]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={AppTheme.bg} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          <View style={s.header}>
            <Text style={s.title}>Progress</Text>
            <Text style={s.subtitle}>Workouts + water — the two that matter most</Text>
          </View>

          {/* ── Score Card ── */}
          <View style={s.scoreCard}>
            {/* Period tabs */}
            <View style={s.periodRow}>
              {PERIODS.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[s.periodPill, period === value && { backgroundColor: AppTheme.primary + '33', borderColor: AppTheme.primary }]}
                  onPress={() => setPeriod(value)}>
                  <Text style={[s.periodText, period === value && { color: AppTheme.primary }]}>
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
                <Text style={[s.summaryValue, { color: AppTheme.gym }]}>5</Text>
                <Text style={s.summaryLabel}>Gym Days</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: AppTheme.class }]}>3</Text>
                <Text style={s.summaryLabel}>Uni Classes</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: AppTheme.rest }]}>2</Text>
                <Text style={s.summaryLabel}>Rest Days</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={[s.summaryValue, { color: AppTheme.sleep }]}>52.5h</Text>
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
                    <Text style={[s.gridDayLetter, isToday && { color: AppTheme.primary, fontWeight: '700' }]}>
                      {DAY_LABELS[d.getDay()]}
                    </Text>
                    <Text style={[s.gridDate, isToday && { color: AppTheme.primary }]}>{d.getDate()}</Text>
                  </View>
                );
              })}
            </View>

            {/* Workout row */}
            <View style={s.gridRow}>
              <Text style={s.gridIcon}>💪</Text>
              {weekDates.map((d, i) => {
                const k = toKey(d);
                const gym = isGymDay(d);
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
                      done && { backgroundColor: AppTheme.gym },
                      !done && !future && { borderWidth: 1, borderColor: AppTheme.border },
                      future && { opacity: 0.18, borderWidth: 1, borderColor: AppTheme.border },
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
                      done && { backgroundColor: AppTheme.water },
                      !done && !future && { borderWidth: 1, borderColor: AppTheme.border },
                      future && { opacity: 0.18, borderWidth: 1, borderColor: AppTheme.border },
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
                <Text style={[s.weightCurrent, { color: AppTheme.primary }]}>{latestW.kg} kg</Text>
                {delta !== null && (
                  <Text style={[s.weightDelta, {
                    color: delta < 0 ? AppTheme.meal : delta > 0 ? AppTheme.gym : AppTheme.textSecondary,
                  }]}>
                    {delta > 0 ? '+' : ''}{delta.toFixed(1)} kg
                  </Text>
                )}
              </View>
            )}

            <WeightChart entries={weights} />

            <View style={s.weightInputRow}>
              <TextInput
                style={s.weightInput}
                value={inputKg}
                onChangeText={setInputKg}
                placeholder="e.g. 62.5"
                placeholderTextColor={AppTheme.textMuted}
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

// ─── Styles ──────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: AppTheme.bg },
  scroll:       { flex: 1 },
  scrollContent:{ paddingHorizontal: 16, paddingTop: 8 },
  header:       { marginBottom: 16 },
  title:        { fontSize: 24, fontWeight: '800', color: AppTheme.textPrimary, marginBottom: 4 },
  subtitle:     { fontSize: 13, color: AppTheme.textSecondary },

  // Score Card
  scoreCard:    { backgroundColor: AppTheme.bgCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: AppTheme.border },
  periodRow:    { flexDirection: 'row', gap: 8, marginBottom: 16 },
  periodPill:   { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: AppTheme.border },
  periodText:   { fontSize: 12, fontWeight: '600', color: AppTheme.textMuted },
  scoreMain:    { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  scorePct:     { fontSize: 48, fontWeight: '800', lineHeight: 54 },
  scoreRight:   { flex: 1 },
  scoreBarBg:   { height: 8, backgroundColor: AppTheme.bgCardAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  scoreBarFill: { height: 8, borderRadius: 4 },
  scoreCount:   { fontSize: 13, color: AppTheme.textSecondary, marginBottom: 6 },
  scoreBreakdown: { fontSize: 12, color: AppTheme.textMuted, lineHeight: 18 },
  streakChip:   { backgroundColor: AppTheme.gym + '20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: AppTheme.gym + '44' },
  streakChipText: { fontSize: 12, color: AppTheme.gym, fontWeight: '600' },

  // Card
  card:         { backgroundColor: AppTheme.bgCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: AppTheme.border },
  cardTitle:    { fontSize: 16, fontWeight: '700', color: AppTheme.textPrimary, marginBottom: 12 },

  // Check-in Row
  checkRow:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: AppTheme.border, backgroundColor: AppTheme.bgCardAlt, marginBottom: 8 },
  checkBox:     { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: AppTheme.border, alignItems: 'center', justifyContent: 'center' },
  checkMark:    { fontSize: 12, color: '#fff', fontWeight: '800' },
  checkEmoji:   { fontSize: 20 },
  checkLabel:   { fontSize: 14, color: AppTheme.textSecondary, fontWeight: '600' },
  checkSub:     { fontSize: 11, color: AppTheme.textMuted, marginTop: 1 },
  checkDoneText:{ fontSize: 12, fontWeight: '700' },

  // Rest day
  restDayRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1, borderColor: AppTheme.border + '44', backgroundColor: AppTheme.bgCardAlt, marginBottom: 8, opacity: 0.6 },
  restDayEmoji: { fontSize: 20 },
  restDayLabel: { fontSize: 14, color: AppTheme.textSecondary, fontWeight: '600' },
  restDaySub:   { fontSize: 11, color: AppTheme.textMuted, marginTop: 1 },

  // Grid
  gridRow:      { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  gridIcon:     { width: 28, fontSize: 16, textAlign: 'center' },
  gridCell:     { flex: 1, alignItems: 'center' },
  gridDayLetter:{ fontSize: 10, color: AppTheme.textMuted, fontWeight: '600' },
  gridDate:     { fontSize: 9, color: AppTheme.textMuted, marginTop: 1, marginBottom: 4 },
  gridDot:      { width: 18, height: 18, borderRadius: 9, backgroundColor: AppTheme.bgCardAlt },
  gridDash:     { fontSize: 12, color: AppTheme.border, marginTop: 5 },

  // Weight
  weightSummary:   { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 4 },
  weightCurrent:   { fontSize: 30, fontWeight: '800' },
  weightDelta:     { fontSize: 14, fontWeight: '600' },
  weightInputRow:  { flexDirection: 'row', gap: 10, marginTop: 14 },
  weightInput:     { flex: 1, backgroundColor: AppTheme.bgCardAlt, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: AppTheme.textPrimary, borderWidth: 1, borderColor: AppTheme.border },
  weightBtn:       { backgroundColor: AppTheme.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
  weightBtnText:   { fontSize: 14, fontWeight: '700', color: '#fff' },
  weightHistory:   { marginTop: 14, borderTopWidth: 1, borderTopColor: AppTheme.border, paddingTop: 12 },
  historyLabel:    { fontSize: 11, color: AppTheme.textMuted, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  historyRow:      { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: AppTheme.border + '55' },
  historyDate:     { fontSize: 13, color: AppTheme.textSecondary },
  historyKg:       { fontSize: 13, fontWeight: '700', color: AppTheme.textPrimary },
  historyHint:     { fontSize: 10, color: AppTheme.textMuted, marginTop: 8, textAlign: 'center' },
  emptyText:       { fontSize: 13, color: AppTheme.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 20 },

  summaryRow:   { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
  summaryItem:  { alignItems: 'center' },
  summaryValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  summaryLabel: { fontSize: 10, color: AppTheme.textSecondary, textAlign: 'center' },
});
