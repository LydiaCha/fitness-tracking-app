import React, { useState, useCallback, useMemo } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Switch,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { STORAGE_KEYS } from '@/utils/appConstants';
import { calcWorkoutStreak } from '@/utils/calculations';
import { safeGetItem, safeSetItem, safeMultiRemove, safeParseJSON } from '@/utils/storage';
import { logger } from '@/utils/logger';
import {
  UserProfile, DaySchedule, ActivityLevel, FitnessGoal, Gender,
  DEFAULT_PROFILE, loadUserProfile, saveUserProfile, gymDayLabel,
  DAY_SHORT, DAY_NAMES, ACTIVITY_LABELS, GOAL_LABELS, calcMacroTargets,
} from '@/constants/userProfile';

const AI_ENABLED_KEY  = STORAGE_KEYS.AI_ENABLED;
const AVATAR_KEY      = STORAGE_KEYS.AVATAR;

const AVATAR_EMOJIS = [
  '💪','🏋️','🧘','🏃','🤸','⚡','🌙','🦋',
  '🌸','✨','🔥','🎯','🥗','💚','🌿','👑',
];
const MEAL_LOGS_KEY  = STORAGE_KEYS.MEAL_LOGS;
const AI_MEALS_KEY   = STORAGE_KEYS.AI_MEALS;
const BARCODE_CACHE  = STORAGE_KEYS.BARCODE_CACHE;

type Section = 'gym' | 'goals' | 'metrics' | number | null; // number = day 0–6

// ─── Time Picker ─────────────────────────────────────────────────────────────
function parseTime(str: string): { h: number; m: number; period: 'AM' | 'PM' } {
  const [time, p] = str.split(' ');
  const [h, m] = time.split(':').map(Number);
  return { h: h || 12, m: m ?? 0, period: (p ?? 'AM') as 'AM' | 'PM' };
}
function formatTime(h: number, m: number, period: 'AM' | 'PM'): string {
  return `${h}:${String(m).padStart(2, '0')} ${period}`;
}

function useTimePickerStyles(theme: AppThemeType) {
  return useMemo(() => StyleSheet.create({
    row:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
    stepBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
    stepText:  { fontSize: 18, color: theme.textPrimary, lineHeight: 22 },
    hourText:  { fontSize: 22, fontWeight: '800', color: theme.textPrimary, minWidth: 28, textAlign: 'center' },
    colon:     { fontSize: 20, fontWeight: '700', color: theme.textMuted, marginHorizontal: 2 },
    minBtn:    { height: 36, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    minText:   { fontSize: 13, fontWeight: '700' },
    periodBtn: { height: 36, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, marginLeft: 2 },
    periodText:{ fontSize: 13, fontWeight: '700' },
  }), [theme]);
}

function TimePicker({ value, onChange, theme }: {
  value: string;
  onChange: (v: string) => void;
  theme: AppThemeType;
}) {
  const tp = useTimePickerStyles(theme);
  const { h, m, period } = parseTime(value);
  const stepH = (dir: 1 | -1) => onChange(formatTime(((h - 1 + dir + 12) % 12) + 1, m, period));

  return (
    <View style={tp.row}>
      {/* Hour stepper */}
      <TouchableOpacity style={tp.stepBtn} onPress={() => stepH(-1)} activeOpacity={0.7}>
        <Text style={tp.stepText}>−</Text>
      </TouchableOpacity>
      <Text style={tp.hourText}>{h}</Text>
      <TouchableOpacity style={tp.stepBtn} onPress={() => stepH(1)} activeOpacity={0.7}>
        <Text style={tp.stepText}>+</Text>
      </TouchableOpacity>

      <Text style={tp.colon}>:</Text>

      {/* Minute — 4 tap options */}
      {[0, 15, 30, 45].map(min => {
        const active = min === m;
        return (
          <TouchableOpacity
            key={min}
            onPress={() => onChange(formatTime(h, min, period))}
            style={[tp.minBtn, { backgroundColor: active ? theme.primary : theme.bgCard, borderColor: active ? theme.primary : theme.border }]}
            activeOpacity={0.7}>
            <Text style={[tp.minText, { color: active ? '#fff' : theme.textSecondary }]}>
              {String(min).padStart(2, '0')}
            </Text>
          </TouchableOpacity>
        );
      })}

      {/* AM / PM */}
      <TouchableOpacity
        onPress={() => onChange(formatTime(h, m, period === 'AM' ? 'PM' : 'AM'))}
        style={[tp.periodBtn, { backgroundColor: theme.primary + '22', borderColor: theme.primary + '66' }]}
        activeOpacity={0.7}>
        <Text style={[tp.periodText, { color: theme.primary }]}>{period}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Save/Cancel Row ──────────────────────────────────────────────────────────
function SaveRow({ onSave, onCancel, s }: { onSave: () => void; onCancel: () => void; s: ReturnType<typeof useStyles> }) {
  return (
    <View style={s.saveRow}>
      <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.7}>
        <Text style={s.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.saveBtn} onPress={onSave} activeOpacity={0.8}>
        <Text style={s.saveBtnText}>Save</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
function useStyles(theme: AppThemeType) {
  return useMemo(() => StyleSheet.create({
    safe:         { flex: 1, backgroundColor: theme.bg },
    scroll:       { flex: 1 },
    content:      { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 },

    avatarRow:    { alignItems: 'center', paddingVertical: 24 },
    avatar:       { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primary + '33', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: theme.primary + '55' },
    avatarEmoji:  { fontSize: 38 },
    name:         { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
    tagline:      { fontSize: 13, color: theme.textSecondary },

    statsRow:     { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statChip:     { flex: 1, backgroundColor: theme.bgCard, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    statValue:    { fontSize: 20, fontWeight: '800', marginBottom: 2 },
    statLabel:    { fontSize: 10, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

    sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 8 },
    card:         { backgroundColor: theme.bgCard, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },

    row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border + '55' },
    rowLast:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    rowOpen:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
    rowIcon:      { fontSize: 18, width: 32 },
    rowLabel:     { flex: 1, fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
    rowValue:     { fontSize: 13, color: theme.textMuted, maxWidth: 180, textAlign: 'right' },
    chevron:      { fontSize: 12, color: theme.textMuted, marginLeft: 8 },

    expandArea:     { backgroundColor: theme.bgCardAlt, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: theme.border + '55' },
    expandAreaLast: { backgroundColor: theme.bgCardAlt, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },

    timeLabel:    { fontSize: 10, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },

    // Day toggles (gym days)
    daysRow:      { flexDirection: 'row', gap: 6, marginBottom: 12 },
    dayBtn:       { flex: 1, aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.bgCard },
    dayBtnOn:     { backgroundColor: theme.primary + '22', borderColor: theme.primary },
    dayText:      { fontSize: 12, fontWeight: '700', color: theme.textMuted },
    dayTextOn:    { color: theme.primary },

    // Macro display
    macroDisplayGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 14, gap: 8 },
    macroDisplayItem: { width: '47%', backgroundColor: theme.bgCardAlt, borderRadius: 10, padding: 12 },
    macroDisplayVal:  { fontSize: 22, fontWeight: '800', marginBottom: 2 },
    macroDisplayLbl:  { fontSize: 11, color: theme.textMuted },

    macroGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    macroField:   { width: '47%' },
    macroInput:   { backgroundColor: theme.bgCard, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, fontSize: 18, fontWeight: '700', color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },

    // Save row
    saveRow:      { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
    saveBtn:      { backgroundColor: theme.primary, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8 },
    saveBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
    cancelBtn:    { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: theme.border },
    cancelBtnText:{ fontSize: 13, color: theme.textMuted },

    // Pill options
    pillRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    pill:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgCard },
    pillOn:       { backgroundColor: theme.primary + '22', borderColor: theme.primary },
    pillText:     { fontSize: 13, color: theme.textMuted, fontWeight: '500' },
    pillTextOn:   { color: theme.primary, fontWeight: '700' },

    // Metric inputs
    metricGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    metricField:  { width: '47%' },
    metricInput:  { backgroundColor: theme.bgCard, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, fontSize: 16, fontWeight: '700', color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },

    calcBtn:      { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 4 },
    calcBtnText:  { fontSize: 14, fontWeight: '700', color: '#fff' },

    // Weekly schedule day rows
    dayRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border + '55' },
    dayRowOpen:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
    dayRowLast:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
    dayName:      { fontSize: 13, fontWeight: '700', color: theme.textPrimary, width: 36 },
    todayBadge:   { backgroundColor: theme.primary + '33', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, marginRight: 6 },
    todayText:    { fontSize: 9, fontWeight: '800', color: theme.primary, textTransform: 'uppercase' },
    dayTags:      { flex: 1, flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
    dayTag:       { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: theme.bgCardAlt },
    dayTagText:   { fontSize: 10, fontWeight: '600', color: theme.textMuted },
    daySleep:     { fontSize: 11, color: theme.textMuted, marginLeft: 4 },

    workToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    workToggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgCard },
    workToggleBtnOn: { backgroundColor: theme.primary + '22', borderColor: theme.primary },
    workToggleText:  { fontSize: 13, fontWeight: '600', color: theme.textMuted },
    workToggleTextOn:{ color: theme.primary },

    // Switch rows
    rowSwitch:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.border + '55' },
    rowSwitchLast:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
    switchSub:    { fontSize: 12, color: theme.textMuted, marginTop: 1 },

    dangerText:   { fontSize: 15, color: theme.error, fontWeight: '500' },
    versionText:  { fontSize: 12, color: theme.textMuted, textAlign: 'center', marginTop: 16 },
  }), [theme]);
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { theme, isDark, toggleTheme } = useAppTheme();
  const router = useRouter();
  const s = useStyles(theme);

  const [profile,   setProfile]   = useState<UserProfile>(DEFAULT_PROFILE);
  const [draft,     setDraft]     = useState<UserProfile>(DEFAULT_PROFILE);
  const [expanded,  setExpanded]  = useState<Section>(null);
  const [streak,    setStreak]    = useState(0);
  const [weightKg,  setWeightKg]  = useState<number | null>(null);
  const [aiEnabled,    setAiEnabled]    = useState(true);
  const [avatarEmoji,  setAvatarEmoji]  = useState('💪');
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    Promise.all([
      loadUserProfile(),
      safeGetItem(STORAGE_KEYS.WORKOUTS),
      safeGetItem(STORAGE_KEYS.WEIGHTS),
      safeGetItem(AI_ENABLED_KEY),
      safeGetItem(AVATAR_KEY),
    ]).then(([prof, wo, wt, ai, av]) => {
      setProfile(prof);
      setDraft(prof);
      const workoutLog = safeParseJSON<Record<string, boolean>>(wo, {});
      setStreak(calcWorkoutStreak(workoutLog, prof.gymDays));
      const entries = safeParseJSON<{ date: string; kg: number }[]>(wt, []);
      if (entries.length > 0) setWeightKg(entries[entries.length - 1].kg);
      if (ai !== null) setAiEnabled(safeParseJSON(ai, true));
      if (av) setAvatarEmoji(av);
    }).catch(e => {
      logger.error('storage', 'profile_load', 'Failed to load profile data', { error: String(e) });
    });
  }, []));

  const pickEmoji = useCallback(async (emoji: string) => {
    setAvatarEmoji(emoji);
    setEmojiPickerOpen(false);
    const ok = await safeSetItem(AVATAR_KEY, emoji);
    if (!ok) logger.warn('storage', 'pickEmoji', 'Failed to persist avatar emoji');
  }, []);

  const openSection = useCallback((section: Section) => {
    setDraft({ ...profile, weekSchedule: profile.weekSchedule.map(d => ({ ...d })) });
    setExpanded(prev => prev === section ? null : section);
  }, [profile]);

  const handleSave = useCallback(async () => {
    const previous = profile;
    setProfile(draft);
    setExpanded(null);
    try {
      await saveUserProfile(draft);
    } catch (e) {
      logger.error('storage', 'handleSave', 'Failed to save profile', { error: String(e) });
      // Revert optimistic update
      setProfile(previous);
      setDraft(previous);
      Alert.alert('Save failed', 'Could not save your changes. Please try again.');
    }
  }, [draft, profile]);

  const handleCancel = useCallback(() => {
    setDraft({ ...profile, weekSchedule: profile.weekSchedule.map(d => ({ ...d })) });
    setExpanded(null);
  }, [profile]);

  const toggleGymDay = useCallback((day: number) => {
    setDraft(prev => {
      const next = prev.gymDays.includes(day)
        ? prev.gymDays.filter(d => d !== day)
        : [...prev.gymDays, day].sort((a, b) => a - b);
      return { ...prev, gymDays: next };
    });
  }, []);

  const updateDay = useCallback(<K extends keyof DaySchedule>(day: number, field: K, value: DaySchedule[K]) => {
    setDraft(prev => ({
      ...prev,
      weekSchedule: prev.weekSchedule.map((d, i) => i === day ? { ...d, [field]: value } : d),
    }));
  }, []);

  const autoCalcMacros = useCallback(() => {
    const macros = calcMacroTargets(draft);
    setDraft(prev => ({ ...prev, ...macros }));
  }, [draft]);

  const toggleAI = useCallback(async (val: boolean) => {
    setAiEnabled(val);
    const ok = await safeSetItem(AI_ENABLED_KEY, JSON.stringify(val));
    if (!ok) {
      logger.warn('storage', 'toggleAI', 'Failed to persist AI setting');
      setAiEnabled(!val); // revert
    }
  }, []);

  const clearData = useCallback((label: string, keys: string[], onDone?: () => void) => {
    Alert.alert(`Clear ${label}?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        const removed = await safeMultiRemove(keys);
        if (removed < keys.length) {
          Alert.alert('Partial clear', 'Some data could not be removed. Please try again.');
        }
        onDone?.();
      }},
    ]);
  }, []);

  const sendFeedback = useCallback(() => {
    router.push('/feedback');
  }, [router]);

  const restDays = useMemo(() =>
    ([0,1,2,3,4,5,6] as number[])
      .filter(d => !profile.gymDays.includes(d))
      .map(d => DAY_NAMES[d])
      .join(' · '),
    [profile.gymDays]);

  const todayDayIndex = new Date().getDay();

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Avatar ── */}
        <View style={s.avatarRow}>
          <TouchableOpacity onPress={() => setEmojiPickerOpen(p => !p)} activeOpacity={0.8}>
            <View style={s.avatar}>
              <Text style={s.avatarEmoji}>{avatarEmoji}</Text>
            </View>
            <Text style={{ fontSize: 11, color: theme.primary, textAlign: 'center', marginTop: -6, marginBottom: 8 }}>
              {emojiPickerOpen ? 'Close' : 'Change'}
            </Text>
          </TouchableOpacity>

          {emojiPickerOpen && (
            <View style={{
              flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
              backgroundColor: theme.bgCard, borderRadius: 16, padding: 14,
              marginBottom: 12, borderWidth: 1, borderColor: theme.border,
            }}>
              {AVATAR_EMOJIS.map(emoji => (
                <TouchableOpacity
                  key={emoji}
                  onPress={() => pickEmoji(emoji)}
                  style={{
                    width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
                    backgroundColor: emoji === avatarEmoji ? theme.primary + '33' : theme.bgCardAlt,
                    borderWidth: emoji === avatarEmoji ? 2 : 1,
                    borderColor: emoji === avatarEmoji ? theme.primary : theme.border,
                  }}
                  activeOpacity={0.7}>
                  <Text style={{ fontSize: 24 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <Text style={s.name}>Lydia</Text>
          <Text style={s.tagline}>Night shift tech · {GOAL_LABELS[profile.fitnessGoal]}</Text>
        </View>

        {/* ── Quick stats ── */}
        <View style={s.statsRow}>
          <View style={s.statChip}>
            <Text style={[s.statValue, { color: theme.gym }]}>{streak > 0 ? `${streak}🔥` : '—'}</Text>
            <Text style={s.statLabel}>Streak</Text>
          </View>
          <View style={s.statChip}>
            <Text style={[s.statValue, { color: theme.primary }]}>{weightKg ?? '—'}</Text>
            <Text style={s.statLabel}>kg</Text>
          </View>
          <View style={s.statChip}>
            <Text style={[s.statValue, { color: theme.water }]}>2.5L</Text>
            <Text style={s.statLabel}>Water</Text>
          </View>
        </View>

        {/* ── Weekly Schedule ── */}
        <Text style={s.sectionLabel}>Weekly Schedule</Text>
        <View style={s.card}>
          {([0,1,2,3,4,5,6] as number[]).map((day, idx, arr) => {
            const dayData  = profile.weekSchedule[day];
            const isToday  = day === todayDayIndex;
            const isGym    = profile.gymDays.includes(day);
            const isOpen   = expanded === day;
            const draftDay = draft.weekSchedule[day];
            const isLast   = idx === arr.length - 1;
            const rowStyle = isOpen ? s.dayRowOpen : isLast ? s.dayRowLast : s.dayRow;

            return (
              <React.Fragment key={day}>
                <TouchableOpacity style={rowStyle} onPress={() => openSection(day)} activeOpacity={0.7}>
                  <Text style={[s.dayName, isToday && { color: theme.primary }]}>{DAY_NAMES[day]}</Text>
                  {isToday && <View style={s.todayBadge}><Text style={s.todayText}>Today</Text></View>}
                  <View style={s.dayTags}>
                    {dayData.isWorkDay && (
                      <View style={[s.dayTag, { backgroundColor: theme.class + '22' }]}>
                        <Text style={[s.dayTagText, { color: theme.class }]}>Work</Text>
                      </View>
                    )}
                    {isGym && (
                      <View style={[s.dayTag, { backgroundColor: theme.gym + '22' }]}>
                        <Text style={[s.dayTagText, { color: theme.gym }]}>Gym</Text>
                      </View>
                    )}
                    {!dayData.isWorkDay && !isGym && (
                      <View style={s.dayTag}><Text style={s.dayTagText}>Rest</Text></View>
                    )}
                  </View>
                  <Text style={s.daySleep}>{dayData.wakeTime.replace(':00', '')}</Text>
                  <Text style={s.chevron}>{isOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isOpen && (
                  <View style={[s.expandArea, isLast && { borderBottomWidth: 0 }]}>
                    <Text style={s.timeLabel}>😴 Bed time</Text>
                    <TimePicker value={draftDay.sleepTime} onChange={v => updateDay(day, 'sleepTime', v)} theme={theme} />
                    <View style={{ height: 16 }} />
                    <Text style={s.timeLabel}>☀️ Wake time</Text>
                    <TimePicker value={draftDay.wakeTime} onChange={v => updateDay(day, 'wakeTime', v)} theme={theme} />
                    <View style={{ height: 16 }} />

                    <Text style={s.timeLabel}>💻 Work day?</Text>
                    <View style={s.workToggleRow}>
                      {(['Yes', 'No'] as const).map(opt => {
                        const active = opt === 'Yes' ? draftDay.isWorkDay : !draftDay.isWorkDay;
                        return (
                          <TouchableOpacity
                            key={opt}
                            style={[s.workToggleBtn, active && s.workToggleBtnOn]}
                            onPress={() => updateDay(day, 'isWorkDay', opt === 'Yes')}
                            activeOpacity={0.7}>
                            <Text style={[s.workToggleText, active && s.workToggleTextOn]}>{opt}</Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {draftDay.isWorkDay && (
                      <>
                        <Text style={s.timeLabel}>Work start</Text>
                        <TimePicker value={draftDay.workStart} onChange={v => updateDay(day, 'workStart', v)} theme={theme} />
                        <View style={{ height: 16 }} />
                        <Text style={s.timeLabel}>Work end</Text>
                        <TimePicker value={draftDay.workEnd} onChange={v => updateDay(day, 'workEnd', v)} theme={theme} />
                        <View style={{ height: 16 }} />
                      </>
                    )}

                    <SaveRow onSave={handleSave} onCancel={handleCancel} s={s} />
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* ── Gym Days ── */}
        <Text style={s.sectionLabel}>Gym Days</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={expanded === 'gym' ? s.rowOpen : s.row}
            onPress={() => openSection('gym')}
            activeOpacity={0.7}>
            <Text style={s.rowIcon}>🏋️</Text>
            <Text style={s.rowLabel}>Gym days</Text>
            <Text style={s.rowValue}>{gymDayLabel(profile.gymDays)}</Text>
            <Text style={s.chevron}>{expanded === 'gym' ? '▲' : '▼'}</Text>
          </TouchableOpacity>
          {expanded === 'gym' && (
            <View style={s.expandArea}>
              <View style={s.daysRow}>
                {DAY_SHORT.map((d, i) => {
                  const on = draft.gymDays.includes(i);
                  return (
                    <TouchableOpacity key={i} style={[s.dayBtn, on && s.dayBtnOn]} onPress={() => toggleGymDay(i)} activeOpacity={0.7}>
                      <Text style={[s.dayText, on && s.dayTextOn]}>{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <SaveRow onSave={handleSave} onCancel={handleCancel} s={s} />
            </View>
          )}
          <View style={s.rowLast}>
            <Text style={s.rowIcon}>🧘</Text>
            <Text style={s.rowLabel}>Rest days</Text>
            <Text style={s.rowValue}>{restDays || 'None'}</Text>
          </View>
        </View>

        {/* ── Body Metrics ── */}
        <Text style={s.sectionLabel}>Body Metrics</Text>
        <View style={s.card}>
          {expanded !== 'metrics' ? (
            <TouchableOpacity style={s.rowLast} onPress={() => openSection('metrics')} activeOpacity={0.7}>
              <Text style={s.rowIcon}>📏</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>{profile.age} yrs · {profile.heightCm} cm · {profile.weightKg} kg</Text>
                <Text style={[s.rowValue, { textAlign: 'left', fontSize: 12, marginTop: 2 }]}>
                  {profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1)} · {ACTIVITY_LABELS[profile.activityLevel]} · {GOAL_LABELS[profile.fitnessGoal]}
                </Text>
              </View>
              <Text style={s.chevron}>▼</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.expandAreaLast}>
              <View style={s.metricGrid}>
                {([
                  { key: 'age'      as const, label: 'Age (yrs)',   kbType: 'number-pad'  as const },
                  { key: 'heightCm' as const, label: 'Height (cm)', kbType: 'number-pad'  as const },
                  { key: 'weightKg' as const, label: 'Weight (kg)', kbType: 'decimal-pad' as const },
                ]).map(({ key, label, kbType }) => (
                  <View key={key} style={s.metricField}>
                    <Text style={s.timeLabel}>{label}</Text>
                    <TextInput
                      style={s.metricInput}
                      value={String(draft[key])}
                      onChangeText={v => setDraft(p => ({ ...p, [key]: parseFloat(v) || 0 }))}
                      keyboardType={kbType}
                      selectTextOnFocus
                      returnKeyType="done"
                    />
                  </View>
                ))}
              </View>

              <Text style={s.timeLabel}>Gender</Text>
              <View style={s.pillRow}>
                {(['female', 'male', 'other'] as Gender[]).map(g => (
                  <TouchableOpacity key={g} style={[s.pill, draft.gender === g && s.pillOn]} onPress={() => setDraft(p => ({ ...p, gender: g }))} activeOpacity={0.7}>
                    <Text style={[s.pillText, draft.gender === g && s.pillTextOn]}>
                      {g.charAt(0).toUpperCase() + g.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.timeLabel}>Activity level</Text>
              <View style={s.pillRow}>
                {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map(a => (
                  <TouchableOpacity key={a} style={[s.pill, draft.activityLevel === a && s.pillOn]} onPress={() => setDraft(p => ({ ...p, activityLevel: a }))} activeOpacity={0.7}>
                    <Text style={[s.pillText, draft.activityLevel === a && s.pillTextOn]}>{ACTIVITY_LABELS[a]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={s.timeLabel}>Fitness goal</Text>
              <View style={s.pillRow}>
                {(Object.keys(GOAL_LABELS) as FitnessGoal[]).map(g => (
                  <TouchableOpacity key={g} style={[s.pill, draft.fitnessGoal === g && s.pillOn]} onPress={() => setDraft(p => ({ ...p, fitnessGoal: g }))} activeOpacity={0.7}>
                    <Text style={[s.pillText, draft.fitnessGoal === g && s.pillTextOn]}>{GOAL_LABELS[g]}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <SaveRow onSave={handleSave} onCancel={handleCancel} s={s} />
            </View>
          )}
        </View>

        {/* ── Daily Goals ── */}
        <Text style={s.sectionLabel}>Daily Goals</Text>
        <View style={s.card}>
          {expanded !== 'goals' ? (
            <>
              <View style={s.macroDisplayGrid}>
                {[
                  { label: 'Calories', value: `${profile.calories}`, color: theme.primary },
                  { label: 'Protein',  value: `${profile.protein}g`, color: theme.gym },
                  { label: 'Carbs',    value: `${profile.carbs}g`,   color: theme.class },
                  { label: 'Fat',      value: `${profile.fat}g`,     color: theme.warning },
                ].map(({ label, value, color }) => (
                  <View key={label} style={s.macroDisplayItem}>
                    <Text style={[s.macroDisplayVal, { color }]}>{value}</Text>
                    <Text style={s.macroDisplayLbl}>{label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[s.rowLast, { borderTopWidth: 1, borderTopColor: theme.border + '55' }]}
                onPress={() => openSection('goals')}
                activeOpacity={0.7}>
                <Text style={[s.rowLabel, { color: theme.primary, fontSize: 14 }]}>Edit goals</Text>
                <Text style={s.chevron}>▼</Text>
              </TouchableOpacity>
            </>
          ) : (
            <View style={s.expandAreaLast}>
              <TouchableOpacity style={s.calcBtn} onPress={autoCalcMacros} activeOpacity={0.8}>
                <Text style={s.calcBtnText}>⚡ Auto-calculate from my metrics</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 11, color: theme.textMuted, textAlign: 'center', marginTop: 6, marginBottom: 14 }}>
                Mifflin-St Jeor · {draft.weightKg}kg · {GOAL_LABELS[draft.fitnessGoal]}
              </Text>
              <View style={s.macroGrid}>
                {([
                  { key: 'calories' as const, label: 'Calories (kcal)', color: theme.primary },
                  { key: 'protein'  as const, label: 'Protein (g)',      color: theme.gym },
                  { key: 'carbs'    as const, label: 'Carbs (g)',         color: theme.class },
                  { key: 'fat'      as const, label: 'Fat (g)',           color: theme.warning },
                ]).map(({ key, label, color }) => (
                  <View key={key} style={s.macroField}>
                    <Text style={s.timeLabel}>{label}</Text>
                    <TextInput
                      style={[s.macroInput, { borderColor: color + '88' }]}
                      value={String(draft[key])}
                      onChangeText={v => setDraft(p => ({ ...p, [key]: parseInt(v) || 0 }))}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      returnKeyType="done"
                    />
                  </View>
                ))}
              </View>
              <SaveRow onSave={handleSave} onCancel={handleCancel} s={s} />
            </View>
          )}
        </View>

        {/* ── Appearance ── */}
        <Text style={s.sectionLabel}>Appearance</Text>
        <View style={s.card}>
          <View style={s.rowSwitchLast}>
            <Text style={s.rowIcon}>{isDark ? '🌙' : '☀️'}</Text>
            <Text style={s.rowLabel}>{isDark ? 'Dark mode' : 'Light mode'}</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.primary + '88' }}
              thumbColor={isDark ? theme.primary : theme.textMuted}
            />
          </View>
        </View>

        {/* ── AI Features ── */}
        <Text style={s.sectionLabel}>AI Features</Text>
        <View style={s.card}>
          <View style={s.rowSwitch}>
            <Text style={s.rowIcon}>✨</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>AI Meal Suggestions</Text>
              <Text style={s.switchSub}>Uses your schedule for personalised ideas</Text>
            </View>
            <Switch
              value={aiEnabled}
              onValueChange={toggleAI}
              trackColor={{ false: theme.border, true: theme.primary + '88' }}
              thumbColor={aiEnabled ? theme.primary : theme.textMuted}
            />
          </View>
          <View style={s.rowSwitchLast}>
            <Text style={s.rowIcon}>🤖</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>AI Food Photo</Text>
              <Text style={s.switchSub}>Identify food from your camera</Text>
            </View>
            <Text style={{ fontSize: 13, color: aiEnabled ? theme.meal : theme.textMuted, fontWeight: '600' }}>
              {aiEnabled ? 'On' : 'Off'}
            </Text>
          </View>
        </View>

        {/* ── Data & Privacy ── */}
        <Text style={s.sectionLabel}>Data & Privacy</Text>
        <View style={s.card}>
          {[
            { icon: '🍽️', label: 'Clear meal logs',           keys: [MEAL_LOGS_KEY] },
            { icon: '⚖️', label: 'Clear weight log',           keys: [STORAGE_KEYS.WEIGHTS], onDone: () => setWeightKg(null) },
            { icon: '💪', label: 'Clear workout & water logs', keys: [STORAGE_KEYS.WORKOUTS, STORAGE_KEYS.WATER], onDone: () => setStreak(0) },
            { icon: '🗄️', label: 'Clear AI & barcode cache',   keys: [AI_MEALS_KEY, BARCODE_CACHE] },
          ].map(({ icon, label, keys, onDone }, i, arr) => (
            <TouchableOpacity
              key={label}
              style={i < arr.length - 1 ? s.row : s.rowLast}
              onPress={() => clearData(label.replace('Clear ', ''), keys, onDone)}>
              <Text style={s.rowIcon}>{icon}</Text>
              <Text style={[s.rowLabel, s.dangerText]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Feedback ── */}
        <Text style={s.sectionLabel}>Feedback</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.rowLast} onPress={sendFeedback} activeOpacity={0.7}>
            <Text style={s.rowIcon}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Send feedback</Text>
              <Text style={s.switchSub}>Share a rating and message</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.versionText}>PeakRoutine v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
