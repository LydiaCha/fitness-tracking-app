/**
 * My Schedule — sleep, work, gym days, custom activities
 */
import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View, Text, ScrollView, TouchableOpacity, StatusBar,
  Alert, Switch, Platform, Modal, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { logger } from '@/utils/logger';
import {
  UserProfile, DaySchedule, saveUserProfile, gymDayLabel,
  DAY_SHORT, DAY_NAMES,
} from '@/constants/userProfile';
import { detectScheduleConflicts } from '@/utils/scheduleConflicts';
import { useUserProfile } from '@/context/UserProfileContext';
import { useWeeklyPlan } from '@/context/WeeklyPlanContext';
import { createProfileStyles, ProfileStyles } from '@/styles/profile.styles';
import { CustomActivity, loadCustomActivities, saveCustomActivities } from '@/utils/customActivities';
import { CustomActivitySheet, daysLabel } from '@/components/CustomActivitySheet';

// ─── TimePicker ───────────────────────────────────────────────────────────────
function timeStrToDate(str: string): Date {
  const match = str.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return new Date();
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const pm = match[3].toUpperCase() === 'PM';
  if (pm && h !== 12) h += 12;
  if (!pm && h === 12) h = 0;
  const d = new Date(); d.setHours(h, m, 0, 0);
  return d;
}
function dateToTimeStr(date: Date): string {
  const h24 = date.getHours(), m = date.getMinutes();
  const period: 'AM' | 'PM' = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}
function TimePicker({ label, value, onChange, theme, isDark }: {
  label: string; value: string; onChange: (v: string) => void; theme: AppThemeType; isDark: boolean;
}) {
  const [show, setShow] = useState(false);
  const date = timeStrToDate(value);
  const handleChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') setShow(false);
    if (selected) onChange(dateToTimeStr(selected));
  };
  return (
    <>
      <TouchableOpacity
        onPress={() => setShow(true)} activeOpacity={0.7}
        style={{
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 1,
          borderColor: theme.border, paddingHorizontal: 16, paddingVertical: 14, marginBottom: 8,
        }}>
        <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textSecondary }}>{label}</Text>
        <Text style={{ fontSize: 18, fontWeight: '800', color: theme.primary }}>{value}</Text>
      </TouchableOpacity>
      {show && Platform.OS === 'android' && (
        <DateTimePicker value={date} mode="time" is24Hour={false} onChange={handleChange} themeVariant={isDark ? 'dark' : 'light'} />
      )}
      {Platform.OS === 'ios' && show && (
        <Modal transparent animationType="slide" visible onRequestClose={() => setShow(false)}>
          <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }} activeOpacity={1} onPress={() => setShow(false)} />
          <View style={{ backgroundColor: theme.bgCard, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 32 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 4 }}>
              <TouchableOpacity onPress={() => setShow(false)} style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: theme.primary, borderRadius: 10 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>Done</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={date} mode="time" display="spinner" is24Hour={false} onChange={handleChange}
              style={{ height: 180 }}
              textColor={theme.textPrimary}
              themeVariant={isDark ? 'dark' : 'light'}
            />
          </View>
        </Modal>
      )}
    </>
  );
}
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

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function MyScheduleScreen() {
  const { theme, isDark } = useAppTheme();
  const router = useRouter();
  const s = useMemo(() => createProfileStyles(theme), [theme]);
  const { profile, updateProfile } = useUserProfile();
  const { rebuildSkeleton } = useWeeklyPlan();

  const [draft, setDraft] = useState<UserProfile>(() => profile);
  const [gymOpen,  setGymOpen]  = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  const [workOpen,  setWorkOpen]  = useState(false);
  const [sleepSameEveryDay, setSleepSameEveryDay] = useState(() =>
    profile.weekSchedule.every(d =>
      d.sleepTime === profile.weekSchedule[0].sleepTime &&
      d.wakeTime  === profile.weekSchedule[0].wakeTime,
    ),
  );
  const [sleepTab, setSleepTab] = useState<'weekday' | 'weekend'>('weekday');
  const [customActivities, setCustomActivities] = useState<CustomActivity[]>([]);
  const [customSheetOpen,  setCustomSheetOpen]  = useState(false);
  const [editingActivity,  setEditingActivity]  = useState<CustomActivity | undefined>(undefined);

  const bannerAnim   = useRef(new Animated.Value(0)).current;
  const bannerTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [bannerTitle,    setBannerTitle]    = useState('Schedule saved');
  const [bannerSubtitle, setBannerSubtitle] = useState('Your Today timeline has been updated.');
  const [bannerWarning,  setBannerWarning]  = useState(false);

  useEffect(() => () => { if (bannerTimer.current) clearTimeout(bannerTimer.current); }, []);

  const showSavedBanner = useCallback((
    title    = 'Schedule saved',
    subtitle = 'Your Today timeline has been updated.',
    warning  = false,
  ) => {
    setBannerTitle(title);
    setBannerSubtitle(subtitle);
    setBannerWarning(warning);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    Animated.spring(bannerAnim, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 6 }).start();
    bannerTimer.current = setTimeout(() => {
      Animated.timing(bannerAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start();
    }, 5000);
  }, [bannerAnim]);

  const showBannerWithConflictCheck = useCallback((savedProfile: UserProfile, defaultTitle?: string) => {
    const conflicts = detectScheduleConflicts(savedProfile);
    if (conflicts.length > 0) {
      const first = conflicts[0]!;
      showSavedBanner(
        'Saved — schedule conflict',
        first.description,
        true,
      );
    } else {
      showSavedBanner(defaultTitle);
    }
  }, [showSavedBanner]);

  useFocusEffect(useCallback(() => {
    setDraft(profile);
    loadCustomActivities().then(setCustomActivities).catch(() => {});
  }, [profile]));

  const updateDay = useCallback(<K extends keyof DaySchedule>(day: number, field: K, value: DaySchedule[K]) => {
    setDraft(prev => ({
      ...prev,
      weekSchedule: prev.weekSchedule.map((d, i) => i === day ? { ...d, [field]: value } : d),
    }));
  }, []);

  const sleepRepIdx = !sleepSameEveryDay && sleepTab === 'weekend' ? 0 : 1;
  const workDays = useMemo(
    () => ([0,1,2,3,4,5,6] as number[]).filter(i => draft.weekSchedule[i].isWorkDay),
    [draft.weekSchedule],
  );
  const workRepIdx = workDays[0] ?? 1;

  const sleepSummary = useMemo(() => {
    const ref = profile.weekSchedule[0];
    const allSame = profile.weekSchedule.every(d =>
      d.sleepTime === ref.sleepTime && d.wakeTime === ref.wakeTime);
    const src = allSame ? ref : profile.weekSchedule[1];
    const base = `${src.sleepTime} → ${src.wakeTime}`;
    return allSame ? base : `Weekdays ${base}`;
  }, [profile.weekSchedule]);

  const workSummary = useMemo(() => {
    const firstIdx = profile.weekSchedule.findIndex(d => d.isWorkDay);
    if (firstIdx === -1) return 'No work days set';
    const src = profile.weekSchedule[firstIdx];
    const days = ([0,1,2,3,4,5,6] as number[]).filter(i => profile.weekSchedule[i].isWorkDay);
    const isStdMF = days.length === 5 && days.every(d => d >= 1 && d <= 5);
    return `${src.workStart} – ${src.workEnd} · ${isStdMF ? 'Mon–Fri' : days.map(d => DAY_NAMES[d]).join(' ')}`;
  }, [profile.weekSchedule]);

  const restDays = useMemo(() => {
    const days = ([0,1,2,3,4,5,6] as number[]).filter(d => !profile.gymDays.includes(d));
    if (days.length === 0) return 'None';
    if (days.length === 7) return 'Every day';
    if (days.length === 2 && days[0] === 0 && days[1] === 6) return 'Weekends';
    if (days.length === 5 && days[0] === 1 && days[4] === 5) return 'Mon–Fri';
    return days.map(d => DAY_NAMES[d]).join(' ');
  }, [profile.gymDays]);

  const toggleGymDay = useCallback((day: number) => {
    setDraft(prev => {
      const next = prev.gymDays.includes(day)
        ? prev.gymDays.filter(d => d !== day)
        : [...prev.gymDays, day].sort((a, b) => a - b);
      return { ...prev, gymDays: next };
    });
  }, []);

  const handleGymSave = useCallback(async () => {
    const changed = JSON.stringify([...draft.gymDays].sort()) !== JSON.stringify([...profile.gymDays].sort());
    updateProfile(draft);
    setGymOpen(false);
    await saveUserProfile(draft);
    if (changed) {
      rebuildSkeleton(draft).catch(e => logger.error('storage', 'handleGymSave', 'rebuild failed', { error: String(e) }));
      showBannerWithConflictCheck(draft, 'Gym days updated');
    } else {
      showBannerWithConflictCheck(draft);
    }
  }, [draft, profile, updateProfile, rebuildSkeleton, showSavedBanner]);

  const handleGymCancel = useCallback(() => {
    setDraft(prev => ({ ...prev, gymDays: [...profile.gymDays] }));
    setGymOpen(false);
  }, [profile]);

  const handleSleepSave = useCallback(async () => {
    const weekdayDay = draft.weekSchedule[1];
    const weekendDay = draft.weekSchedule[0];
    const newSchedule = draft.weekSchedule.map((d, i) => {
      if (sleepSameEveryDay) return { ...d, sleepTime: weekdayDay.sleepTime, wakeTime: weekdayDay.wakeTime };
      const isWeekend = i === 0 || i === 6;
      const src = isWeekend ? weekendDay : weekdayDay;
      return { ...d, sleepTime: src.sleepTime, wakeTime: src.wakeTime };
    });
    const updated = { ...draft, weekSchedule: newSchedule };
    setDraft(updated); setSleepOpen(false); updateProfile(updated);
    await saveUserProfile(updated).catch(e => logger.error('storage', 'handleSleepSave', 'save failed', { error: String(e) }));
    rebuildSkeleton(updated).catch(e => logger.error('storage', 'handleSleepSave', 'rebuild failed', { error: String(e) }));
    showBannerWithConflictCheck(updated);
  }, [draft, sleepSameEveryDay, updateProfile, rebuildSkeleton, showSavedBanner]);

  const handleSleepCancel = useCallback(() => {
    setDraft(prev => ({ ...prev, weekSchedule: profile.weekSchedule.map(d => ({ ...d })) }));
    setSleepOpen(false);
  }, [profile]);

  const handleWorkSave = useCallback(async () => {
    const rep = draft.weekSchedule[workRepIdx];
    const newSchedule = draft.weekSchedule.map(d =>
      d.isWorkDay ? { ...d, workStart: rep.workStart, workEnd: rep.workEnd } : d);
    const updated = { ...draft, weekSchedule: newSchedule };
    setDraft(updated); setWorkOpen(false); updateProfile(updated);
    await saveUserProfile(updated).catch(e => logger.error('storage', 'handleWorkSave', 'save failed', { error: String(e) }));
    rebuildSkeleton(updated).catch(e => logger.error('storage', 'handleWorkSave', 'rebuild failed', { error: String(e) }));
    showBannerWithConflictCheck(updated);
  }, [draft, workRepIdx, updateProfile, rebuildSkeleton, showSavedBanner]);

  const handleWorkCancel = useCallback(() => {
    setDraft(prev => ({ ...prev, weekSchedule: profile.weekSchedule.map(d => ({ ...d })) }));
    setWorkOpen(false);
  }, [profile]);

  const handleSaveActivity = useCallback(async (data: Omit<CustomActivity, 'id'> & { id?: string }) => {
    const updated = data.id
      ? customActivities.map(a => a.id === data.id ? { ...data, id: data.id } as CustomActivity : a)
      : [...customActivities, { ...data, id: Date.now().toString() } as CustomActivity];
    setCustomActivities(updated); setCustomSheetOpen(false); setEditingActivity(undefined);
    showSavedBanner();
    await saveCustomActivities(updated);
  }, [customActivities, showSavedBanner]);

  const handleDeleteActivity = useCallback((id: string) => {
    Alert.alert('Remove Activity', 'Remove this custom activity from your schedule?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        const updated = customActivities.filter(a => a.id !== id);
        setCustomActivities(updated);
        await saveCustomActivities(updated);
      }},
    ]);
  }, [customActivities]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={[s.headerRow, { marginBottom: 20 }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginRight: 12, padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Schedule</Text>
        </View>

        {/* ── Sleep ── */}
        <Text style={s.sectionLabel}>Sleep</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={sleepOpen ? s.rowOpen : s.rowLast}
            onPress={() => {
              if (!sleepOpen) {
                setDraft(prev => ({ ...prev, weekSchedule: profile.weekSchedule.map(d => ({ ...d })) }));
                setSleepSameEveryDay(profile.weekSchedule.every(d =>
                  d.sleepTime === profile.weekSchedule[0].sleepTime && d.wakeTime === profile.weekSchedule[0].wakeTime));
                setSleepTab('weekday');
              }
              setSleepOpen(v => !v);
            }}
            activeOpacity={0.7}>
            <Text style={s.rowIcon}>😴</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Sleep schedule</Text>
              <Text style={[s.rowValue, { textAlign: 'left', fontSize: 12, marginTop: 2 }]}>{sleepSummary}</Text>
            </View>
            <Text style={[s.chevron, sleepOpen && s.chevronOpen]}>›</Text>
          </TouchableOpacity>
          {sleepOpen && (
            <View style={s.expandAreaLast}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Text style={[s.timeLabel, { marginBottom: 0 }]}>Same every day</Text>
                <Switch value={sleepSameEveryDay} onValueChange={setSleepSameEveryDay}
                  trackColor={{ false: theme.border, true: theme.primary }} thumbColor="#fff" />
              </View>
              {!sleepSameEveryDay && (
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                  {(['weekday', 'weekend'] as const).map(tab => (
                    <TouchableOpacity key={tab} onPress={() => setSleepTab(tab)}
                      style={[s.pill, sleepTab === tab && s.pillOn, { flex: 1, alignItems: 'center' }]} activeOpacity={0.7}>
                      <Text style={[s.pillText, sleepTab === tab && s.pillTextOn]}>
                        {tab === 'weekday' ? 'Weekdays' : 'Weekend'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              <TimePicker label="Bed time"  value={draft.weekSchedule[sleepRepIdx].sleepTime} onChange={v => updateDay(sleepRepIdx, 'sleepTime', v)} theme={theme} isDark={isDark} />
              <TimePicker label="Wake time" value={draft.weekSchedule[sleepRepIdx].wakeTime}  onChange={v => updateDay(sleepRepIdx, 'wakeTime',  v)} theme={theme} isDark={isDark} />
              <View style={{ height: 14 }} />
              <SaveRow onSave={handleSleepSave} onCancel={handleSleepCancel} s={s} />
            </View>
          )}
        </View>

        {/* ── Work ── */}
        <Text style={s.sectionLabel}>Work</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={workOpen ? s.rowOpen : s.rowLast}
            onPress={() => {
              if (!workOpen) setDraft(prev => ({ ...prev, weekSchedule: profile.weekSchedule.map(d => ({ ...d })) }));
              setWorkOpen(v => !v);
            }}
            activeOpacity={0.7}>
            <Text style={s.rowIcon}>💻</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Work schedule</Text>
              <Text style={[s.rowValue, { textAlign: 'left', fontSize: 12, marginTop: 2 }]} numberOfLines={1}>{workSummary}</Text>
            </View>
            <Text style={[s.chevron, workOpen && s.chevronOpen]}>›</Text>
          </TouchableOpacity>
          {workOpen && (
            <View style={s.expandAreaLast}>
              <Text style={[s.timeLabel, { marginBottom: 8 }]}>Work days</Text>
              <View style={[s.daysRow, { marginBottom: 16 }]}>
                {DAY_SHORT.map((d, i) => {
                  const on = draft.weekSchedule[i].isWorkDay;
                  return (
                    <TouchableOpacity key={i}
                      style={[s.dayBtn, on && { backgroundColor: theme.class + '22', borderColor: theme.class }]}
                      onPress={() => setDraft(prev => ({
                        ...prev,
                        weekSchedule: prev.weekSchedule.map((ds, idx) => idx === i ? { ...ds, isWorkDay: !ds.isWorkDay } : ds),
                      }))} activeOpacity={0.7}>
                      <Text style={[s.dayText, on && { color: theme.class }]}>{d}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {workDays.length > 0 && (
                <>
                  <TimePicker label="Work start" value={draft.weekSchedule[workRepIdx].workStart} onChange={v => updateDay(workRepIdx, 'workStart', v)} theme={theme} isDark={isDark} />
                  <TimePicker label="Work end"   value={draft.weekSchedule[workRepIdx].workEnd}   onChange={v => updateDay(workRepIdx, 'workEnd',   v)} theme={theme} isDark={isDark} />
                  {workDays.length > 1 && (
                    <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 10 }}>
                      Hours applied to all {workDays.length} work days on save
                    </Text>
                  )}
                  <View style={{ height: 14 }} />
                </>
              )}
              <SaveRow onSave={handleWorkSave} onCancel={handleWorkCancel} s={s} />
            </View>
          )}
        </View>

        {/* ── Training ── */}
        <Text style={s.sectionLabel}>Training</Text>
        <View style={s.card}>
          <TouchableOpacity
            style={gymOpen ? s.rowOpen : s.row}
            onPress={() => {
              if (!gymOpen) setDraft(prev => ({ ...prev, gymDays: [...profile.gymDays] }));
              setGymOpen(v => !v);
            }}
            activeOpacity={0.7}>
            <Text style={s.rowIcon}>🏋️</Text>
            <Text style={s.rowLabel}>Gym days</Text>
            <Text style={s.rowValue} numberOfLines={1}>{gymDayLabel(profile.gymDays)}</Text>
            <Text style={[s.chevron, gymOpen && s.chevronOpen]}>›</Text>
          </TouchableOpacity>
          {gymOpen && (
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
              <SaveRow onSave={handleGymSave} onCancel={handleGymCancel} s={s} />
            </View>
          )}
          <View style={s.rowLast}>
            <Text style={s.rowIcon}>🧘</Text>
            <Text style={s.rowLabel}>Rest days</Text>
            <Text style={s.rowValue} numberOfLines={1}>{restDays}</Text>
          </View>
        </View>

        {/* ── Custom Activities ── */}
        <Text style={s.sectionLabel}>Custom Activities</Text>
        <View style={s.card}>
          {customActivities.length === 0 ? (
            <View style={s.rowLast}>
              <Text style={[s.rowValue, { textAlign: 'left', color: theme.textMuted, fontSize: 13 }]}>No custom activities yet</Text>
            </View>
          ) : (
            customActivities.map((a, i) => (
              <TouchableOpacity
                key={a.id}
                style={i < customActivities.length - 1 ? s.row : s.rowLast}
                onPress={() => { setEditingActivity(a); setCustomSheetOpen(true); }}
                onLongPress={() => handleDeleteActivity(a.id)}
                activeOpacity={0.7}>
                <Text style={[s.rowIcon, { fontSize: 20 }]}>{a.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.rowLabel}>{a.label}</Text>
                  <Text style={[s.rowValue, { textAlign: 'left', fontSize: 12, marginTop: 2 }]}>
                    {a.time}{a.durationMin ? ` · ${a.durationMin} min` : ''} · {daysLabel(a.daysOfWeek)}
                  </Text>
                </View>
                <Text style={s.chevron}>›</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
        <TouchableOpacity
          style={[s.prefsCta, { marginBottom: 20 }]}
          onPress={() => { setEditingActivity(undefined); setCustomSheetOpen(true); }}
          activeOpacity={0.8}>
          <Text style={s.prefsCtaText}>+ Add Activity</Text>
        </TouchableOpacity>

        <CustomActivitySheet
          visible={customSheetOpen}
          onClose={() => { setCustomSheetOpen(false); setEditingActivity(undefined); }}
          onSave={handleSaveActivity}
          editing={editingActivity}
        />
      </ScrollView>

      {/* ── Saved banner ── */}
      <Animated.View
        pointerEvents={bannerAnim as unknown as 'none' | 'auto'}
        style={{
          position: 'absolute', bottom: 24, left: 16, right: 16,
          flexDirection: 'row', alignItems: 'center',
          backgroundColor: theme.bgCard,
          borderRadius: 16, borderWidth: 1,
          borderColor: (bannerWarning ? theme.warning : theme.primary) + '80',
          paddingVertical: 13, paddingHorizontal: 16, gap: 12,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.18, shadowRadius: 16, elevation: 8,
          opacity: bannerAnim,
          transform: [{ translateY: bannerAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
        }}>
        <View style={{
          width: 36, height: 36, borderRadius: 10,
          backgroundColor: (bannerWarning ? theme.warning : theme.primary) + '20',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <Ionicons
            name={bannerWarning ? 'warning-outline' : 'checkmark'}
            size={20}
            color={bannerWarning ? theme.warning : theme.primary}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: theme.textPrimary }}>{bannerTitle}</Text>
          <Text style={{ fontSize: 12, color: theme.textSecondary, marginTop: 1 }} numberOfLines={2}>{bannerSubtitle}</Text>
        </View>
        <TouchableOpacity
          onPress={() => router.replace(bannerWarning ? '/(tabs)' : '/(tabs)')}
          activeOpacity={0.7}
          style={{
            backgroundColor: bannerWarning ? theme.warning : theme.primary,
            borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
          }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#fff' }}>
            {bannerWarning ? 'Got it' : 'View Today'}
          </Text>
        </TouchableOpacity>
      </Animated.View>

    </SafeAreaView>
  );
}
