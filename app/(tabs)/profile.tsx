import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
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
import { ACHIEVEMENTS, AchievementData } from '@/constants/achievements';
import { createProfileStyles, ProfileStyles } from './profile.styles';

const AI_ENABLED_KEY  = STORAGE_KEYS.AI_ENABLED;
const AVATAR_KEY      = STORAGE_KEYS.AVATAR;

const AVATAR_EMOJIS = [
  '💪','🥊','🏆','🏅','⚡','🔥','🎯',
  '🥗','🥤','🍎','💧','👟','🧠',
  '🦋','💚',
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
function SaveRow({ onSave, onCancel, s }: { onSave: () => void; onCancel: () => void; s: ProfileStyles }) {
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

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const { theme, isDark, toggleTheme } = useAppTheme();
  const router = useRouter();
  const s = useMemo(() => createProfileStyles(theme), [theme]);

  const [profile,   setProfile]   = useState<UserProfile>(DEFAULT_PROFILE);
  const [draft,     setDraft]     = useState<UserProfile>(DEFAULT_PROFILE);
  const [expanded,     setExpanded]     = useState<Section>(null);
  const [expandedWork, setExpandedWork] = useState<number | null>(null);
  const [streak,    setStreak]    = useState(0);
  const [weightKg,  setWeightKg]  = useState<number | null>(null);
  const [aiEnabled,    setAiEnabled]    = useState(true);
  const [avatarEmoji,  setAvatarEmoji]  = useState('💪');
  const [profileEditing, setProfileEditing] = useState(false);
  const [nameDraft,      setNameDraft]      = useState('');
  const [emojiDraft,     setEmojiDraft]     = useState('💪');
  const [achievementData, setAchievementData] = useState<AchievementData | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  useFocusEffect(useCallback(() => {
    Promise.all([
      loadUserProfile(),
      safeGetItem(STORAGE_KEYS.WORKOUTS),
      safeGetItem(STORAGE_KEYS.WEIGHTS),
      safeGetItem(AI_ENABLED_KEY),
      safeGetItem(AVATAR_KEY),
      safeGetItem(STORAGE_KEYS.WATER),
      safeGetItem(STORAGE_KEYS.MEAL_LOGS),
      safeGetItem(STORAGE_KEYS.HABITS),
    ]).then(([prof, wo, wt, ai, av, wa, ml, hab]) => {
      setProfile(prof);
      setDraft(prof);
      const workoutLog = safeParseJSON<Record<string, boolean>>(wo, {});
      setStreak(calcWorkoutStreak(workoutLog, prof.gymDays));
      const entries = safeParseJSON<{ date: string; kg: number }[]>(wt, []);
      if (entries.length > 0) setWeightKg(entries[entries.length - 1].kg);
      if (ai !== null) setAiEnabled(safeParseJSON(ai, true));
      if (av) setAvatarEmoji(av);

      const waterLog  = safeParseJSON<Record<string, boolean>>(wa, {});
      const mealLog   = safeParseJSON<Record<string, unknown[]>>(ml, {});
      const habitLog  = safeParseJSON<Record<string, unknown>>(hab, {});
      setAchievementData({
        workoutStreak:   calcWorkoutStreak(workoutLog, prof.gymDays),
        totalWorkouts:   Object.values(workoutLog).filter(Boolean).length,
        mealLogDays:     Object.values(mealLog).filter(v => Array.isArray(v) && v.length > 0).length,
        waterLogDays:    Object.values(waterLog).filter(Boolean).length,
        supplementDays:  Object.keys(habitLog).length,
        weightEntries:   entries.length,
        profileComplete: !!prof.heightCm && !!prof.weightKg && !!prof.fitnessGoal,
      });
    }).catch(e => {
      logger.error('storage', 'profile_load', 'Failed to load profile data', { error: String(e) });
    });
  }, []));

  const saveProfileCard = useCallback(async () => {
    const trimmed = nameDraft.trim();
    const newName = trimmed || profile.name;
    const updated = { ...profile, name: newName };
    setProfile(updated);
    setDraft(updated);
    setAvatarEmoji(emojiDraft);
    setProfileEditing(false);
    await saveUserProfile(updated);
    await safeSetItem(AVATAR_KEY, emojiDraft);
  }, [nameDraft, emojiDraft, profile]);

  const openSection = useCallback((section: Section) => {
    setDraft({ ...profile, weekSchedule: profile.weekSchedule.map(d => ({ ...d })) });
    setExpanded(prev => prev === section ? null : section);
  }, [profile]);

  const handleSave = useCallback(async () => {
    const previous = profile;
    setProfile(draft);
    setExpanded(null);
    setExpandedWork(null);
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
    setExpandedWork(null);
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
      <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ── */}
        <View style={s.headerRow}>
          <Text style={s.headerTitle}>Profile</Text>
          <TouchableOpacity onPress={() => router.push('/settings')} activeOpacity={0.7}>
            <Ionicons name="settings-outline" size={24} color={theme.textMuted} />
          </TouchableOpacity>
        </View>

        {/* ── Avatar ── */}
        <View style={s.avatarRow}>
          {profileEditing ? (
            <>
              {/* Live emoji preview */}
              <View style={s.avatar}>
                <Text style={s.avatarEmoji}>{emojiDraft}</Text>
              </View>

              {/* Name input */}
              <TextInput
                style={[s.metricInput, { textAlign: 'center', fontSize: 20, fontWeight: '700', marginBottom: 16, minWidth: 200 }]}
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Your name"
                placeholderTextColor={theme.textMuted}
                autoFocus
                returnKeyType="done"
              />

              {/* Emoji picker */}
              <View style={{
                flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center',
                backgroundColor: theme.bgCardAlt, borderRadius: 16, padding: 14,
                marginBottom: 16, borderWidth: 1, borderColor: theme.border,
              }}>
                {AVATAR_EMOJIS.map(emoji => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => setEmojiDraft(emoji)}
                    style={{
                      width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center',
                      backgroundColor: emoji === emojiDraft ? theme.primary + '33' : theme.bgCard,
                      borderWidth: emoji === emojiDraft ? 2 : 1,
                      borderColor: emoji === emojiDraft ? theme.primary : theme.border,
                    }}
                    activeOpacity={0.7}>
                    <Text style={{ fontSize: 24 }}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Save / Cancel */}
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={() => setProfileEditing(false)}
                  style={{ flex: 1, paddingVertical: 11, borderRadius: 12, borderWidth: 1, borderColor: theme.border, alignItems: 'center' }}
                  activeOpacity={0.7}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textMuted }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveProfileCard}
                  style={{ flex: 2, paddingVertical: 11, borderRadius: 12, backgroundColor: theme.primary, alignItems: 'center' }}
                  activeOpacity={0.8}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>Save</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={s.avatar}>
                <Text style={s.avatarEmoji}>{avatarEmoji}</Text>
              </View>
              <Text style={s.name}>{profile.name || 'Add your name'}</Text>
              <Text style={s.tagline}>{GOAL_LABELS[profile.fitnessGoal]}</Text>
              <TouchableOpacity
                onPress={() => { setNameDraft(profile.name); setEmojiDraft(avatarEmoji); setProfileEditing(true); }}
                activeOpacity={0.7}
                style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>✎ Edit profile</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── Rest of screen (dimmed while editing profile card) ── */}
        <View style={{ opacity: profileEditing ? 0.1 : 1 }} pointerEvents={profileEditing ? 'none' : 'auto'}>

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

        {/* ── Achievements ── */}
        <Text style={s.sectionLabel}>Achievements</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.badgeScroll} contentContainerStyle={s.badgeScrollContent}>
          {ACHIEVEMENTS.map(a => {
            const earned = achievementData ? a.unlocked(achievementData) : false;
            return (
              <View key={a.id} style={[s.badgeCard, earned && s.badgeCardEarned]}>
                <Text style={[s.badgeEmoji, !earned && s.badgeLocked]}>{a.emoji}</Text>
                <Text style={[s.badgeName, earned ? s.badgeNameEarned : s.badgeNameLocked]} numberOfLines={2}>{a.name}</Text>
                {earned && <View style={s.badgeDot} />}
              </View>
            );
          })}
        </ScrollView>

        {/* ── Sleep Schedule ── */}
        <Text style={s.sectionLabel}>Sleep Schedule</Text>
        <View style={s.card}>
          {([0,1,2,3,4,5,6] as number[]).map((day, idx, arr) => {
            const dayData  = profile.weekSchedule[day];
            const isToday  = day === todayDayIndex;
            const isOpen   = expanded === day;
            const draftDay = draft.weekSchedule[day];
            const isLast   = idx === arr.length - 1;
            const rowStyle = isOpen ? s.dayRowOpen : isLast ? s.dayRowLast : s.dayRow;

            return (
              <React.Fragment key={day}>
                <TouchableOpacity style={rowStyle} onPress={() => openSection(day)} activeOpacity={0.7}>
                  <Text style={[s.dayName, isToday && { color: theme.primary }]}>{DAY_NAMES[day]}</Text>
                  {isToday && <View style={s.todayBadge}><Text style={s.todayText}>Today</Text></View>}
                  <View style={{ flex: 1 }} />
                  <Text style={s.daySleep}>
                    {dayData.sleepTime.replace(':00', '')} → {dayData.wakeTime.replace(':00', '')}
                  </Text>
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
                    <SaveRow onSave={handleSave} onCancel={handleCancel} s={s} />
                  </View>
                )}
              </React.Fragment>
            );
          })}
        </View>

        {/* ── Work Schedule ── */}
        <Text style={s.sectionLabel}>Work Schedule</Text>
        <View style={s.card}>
          {/* Work day toggles */}
          <View style={[s.expandArea, { borderBottomWidth: 1, borderBottomColor: theme.border + '55' }]}>
            <Text style={s.timeLabel}>💻 Work days</Text>
            <View style={s.daysRow}>
              {DAY_SHORT.map((d, i) => {
                const on = draft.weekSchedule[i].isWorkDay;
                return (
                  <TouchableOpacity
                    key={i}
                    style={[s.dayBtn, on && { backgroundColor: theme.class + '22', borderColor: theme.class }]}
                    onPress={() => {
                      setDraft(prev => ({
                        ...prev,
                        weekSchedule: prev.weekSchedule.map((ds, idx) =>
                          idx === i ? { ...ds, isWorkDay: !ds.isWorkDay } : ds
                        ),
                      }));
                    }}
                    activeOpacity={0.7}>
                    <Text style={[s.dayText, on && { color: theme.class }]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <SaveRow onSave={handleSave} onCancel={handleCancel} s={s} />
          </View>

          {/* Per-work-day hours */}
          {([0,1,2,3,4,5,6] as number[]).map((day, idx, arr) => {
            const draftDay = draft.weekSchedule[day];
            if (!draftDay.isWorkDay) return null;
            const isOpen = expandedWork === day;
            const isLast = idx === arr.length - 1 || arr.slice(idx + 1).every(d => !draft.weekSchedule[d].isWorkDay);
            const rowStyle = isOpen ? s.dayRowOpen : isLast ? s.dayRowLast : s.dayRow;

            return (
              <React.Fragment key={day}>
                <TouchableOpacity
                  style={rowStyle}
                  onPress={() => {
                    setDraft({ ...profile, weekSchedule: profile.weekSchedule.map(d => ({ ...d })) });
                    setExpandedWork(prev => prev === day ? null : day);
                  }}
                  activeOpacity={0.7}>
                  <Text style={[s.dayName, day === todayDayIndex && { color: theme.primary }]}>{DAY_NAMES[day]}</Text>
                  {day === todayDayIndex && <View style={s.todayBadge}><Text style={s.todayText}>Today</Text></View>}
                  <View style={{ flex: 1 }} />
                  <Text style={s.daySleep}>
                    {draftDay.workStart.replace(':00', '')} → {draftDay.workEnd.replace(':00', '')}
                  </Text>
                  <Text style={s.chevron}>{isOpen ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isOpen && (
                  <View style={[s.expandArea, isLast && { borderBottomWidth: 0 }]}>
                    <Text style={s.timeLabel}>Work start</Text>
                    <TimePicker value={draftDay.workStart} onChange={v => updateDay(day, 'workStart', v)} theme={theme} />
                    <View style={{ height: 16 }} />
                    <Text style={s.timeLabel}>Work end</Text>
                    <TimePicker value={draftDay.workEnd} onChange={v => updateDay(day, 'workEnd', v)} theme={theme} />
                    <View style={{ height: 16 }} />
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

        {/* ── Plan ── */}
        <Text style={s.sectionLabel}>Plan</Text>
        <View style={s.card}>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 }}>🛒 Weekly Grocery List</Text>
            <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: 14 }}>Auto-generated from your 7-day meal plan</Text>
            <TouchableOpacity style={s.groceryCta} onPress={() => router.push('/(tabs)/plan')} activeOpacity={0.8}>
              <Text style={s.groceryCtaText}>Generate List →</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={s.versionText}>PeakRoutine v1.0.0</Text>
        </View>{/* end dimmed wrapper */}
      </ScrollView>
    </SafeAreaView>
  );
}
