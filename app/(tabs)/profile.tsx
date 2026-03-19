import React, { useState, useCallback, useMemo, useRef } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import {
  View, Text, ScrollView, TouchableOpacity,
  StatusBar, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { STORAGE_KEYS } from '@/utils/appConstants';
import { safeGetItem, safeSetItem, safeParseJSON } from '@/utils/storage';
import { logger } from '@/utils/logger';
import { calcWorkoutStreak } from '@/utils/streak';
import {
  saveUserProfile,
  GOAL_LABELS,
} from '@/constants/userProfile';
import { useUserProfile } from '@/context/UserProfileContext';
import { MACRO_TARGETS } from '@/constants/nutritionData';
import { ACHIEVEMENTS, AchievementData } from '@/constants/achievements';
import { createProfileStyles } from '@/styles/profile.styles';

const AVATAR_KEY = STORAGE_KEYS.AVATAR;

const AVATAR_EMOJIS = [
  '💪', '🥊', '🏆', '🏅', '⚡', '🔥', '🎯',
  '🥗', '🥤', '🍎', '💧', '👟', '🧠',
  '🦋', '💚',
];

export default function ProfileScreen() {
  const { theme, isDark } = useAppTheme();
  const router = useRouter();
  const s = useMemo(() => createProfileStyles(theme), [theme]);

  const { profile, updateProfile } = useUserProfile();
  const [streak, setStreak] = useState(0);
  const [weightKg, setWeightKg] = useState<number | null>(null);
  const [avatarEmoji, setAvatarEmoji] = useState('💪');
  const [profileEditing, setProfileEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [emojiDraft, setEmojiDraft] = useState('💪');
  const [achievementData, setAchievementData] = useState<AchievementData | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  useFocusEffect(useCallback(() => {
    Promise.all([
      safeGetItem(STORAGE_KEYS.WORKOUTS),
      safeGetItem(STORAGE_KEYS.WEIGHTS),
      safeGetItem(AVATAR_KEY),
      safeGetItem(STORAGE_KEYS.WATER_GOAL),
      safeGetItem(STORAGE_KEYS.MEAL_LOGS),
      safeGetItem(STORAGE_KEYS.HABITS),
    ]).then(([wo, wt, av, wa, ml, hab]) => {
      const workoutLog    = safeParseJSON<Record<string, boolean>>(wo, {});
      const workoutStreak = calcWorkoutStreak(workoutLog, profile.gymDays);
      setStreak(workoutStreak);
      const entries = safeParseJSON<{ date: string; kg: number }[]>(wt, []);
      if (entries.length > 0) setWeightKg(entries[entries.length - 1].kg);
      if (av) setAvatarEmoji(av);
      const waterLog = safeParseJSON<Record<string, boolean>>(wa, {});
      const mealLog  = safeParseJSON<Record<string, unknown[]>>(ml, {});
      const habitLog = safeParseJSON<Record<string, unknown>>(hab, {});
      setAchievementData({
        workoutStreak,
        totalWorkouts:   Object.values(workoutLog).filter(Boolean).length,
        mealLogDays:     Object.values(mealLog).filter(v => Array.isArray(v) && v.length > 0).length,
        waterLogDays:    Object.values(waterLog).filter(Boolean).length,
        supplementDays:  Object.keys(habitLog).length,
        weightEntries:   entries.length,
        profileComplete: !!profile.heightCm && !!profile.weightKg && !!profile.fitnessGoal,
      });
    }).catch(e => {
      logger.error('storage', 'profile_load', 'Failed to load profile data', { error: String(e) });
    });
  }, [profile]));

  const saveProfileCard = useCallback(async () => {
    const trimmed = nameDraft.trim();
    const newName = trimmed || profile.name;
    const updated = { ...profile, name: newName };
    updateProfile(updated);
    setAvatarEmoji(emojiDraft);
    setProfileEditing(false);
    await saveUserProfile(updated);
    await safeSetItem(AVATAR_KEY, emojiDraft);
  }, [nameDraft, emojiDraft, profile, updateProfile]);

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

        {/* ── Avatar / Identity ── */}
        <View style={s.avatarRow}>
          {profileEditing ? (
            <>
              <View style={s.avatar}>
                <Text style={s.avatarEmoji}>{emojiDraft}</Text>
              </View>
              <TextInput
                style={[s.metricInput, { textAlign: 'center', fontSize: 20, fontWeight: '700', marginBottom: 16, minWidth: 200 }]}
                value={nameDraft}
                onChangeText={setNameDraft}
                placeholder="Your name"
                placeholderTextColor={theme.textMuted}
                autoFocus
                returnKeyType="done"
              />
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

        {/* ── Rest (dimmed during edit) ── */}
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
              <Text style={[s.statValue, { color: theme.water }]}>{(MACRO_TARGETS.water / 1000).toFixed(1)}L</Text>
              <Text style={s.statLabel}>Water</Text>
            </View>
          </View>

          {/* ── Profile completeness nudge ── */}
          {(() => {
            const missing: string[] = [];
            if (!profile.heightCm) missing.push('height');
            if (!profile.weightKg) missing.push('weight');
            if (!profile.fitnessGoal) missing.push('fitness goal');
            if (missing.length === 0) return null;
            return (
              <TouchableOpacity
                style={{
                  backgroundColor: theme.primary + '18', borderWidth: 1,
                  borderColor: theme.primary + '55', borderRadius: 14,
                  padding: 14, marginBottom: 20,
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                }}
                onPress={() => router.push('/my-health')}
                activeOpacity={0.8}>
                <Text style={{ fontSize: 20 }}>📋</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: theme.primary, marginBottom: 2 }}>
                    Complete your profile
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    Add your {missing.join(' & ')} so your macros and plan are accurate.
                  </Text>
                </View>
                <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>Fix →</Text>
              </TouchableOpacity>
            );
          })()}

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

          {/* ── Navigation Cards ── */}
          <Text style={s.sectionLabel}>My Profile</Text>
          <View style={s.card}>
            <TouchableOpacity
              style={s.row}
              onPress={() => router.push('/my-schedule')}
              activeOpacity={0.7}>
              <Text style={s.rowIcon}>🗓️</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>My Schedule</Text>
                <Text style={[s.rowValue, { textAlign: 'left', fontSize: 12, marginTop: 2 }]} numberOfLines={1}>Sleep, work, gym days, custom activities</Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.rowLast}
              onPress={() => router.push('/my-health')}
              activeOpacity={0.7}>
              <Text style={s.rowIcon}>❤️</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>My Health</Text>
                <Text style={[s.rowValue, { textAlign: 'left', fontSize: 12, marginTop: 2 }]} numberOfLines={1}>Body metrics, targets, supplements, food prefs</Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          </View>

          {/* ── Feedback ── */}
          <Text style={s.sectionLabel}>Have your say</Text>
          <TouchableOpacity
            style={[s.card, { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16 }]}
            onPress={() => router.push('/feedback')}
            activeOpacity={0.8}>
            <Text style={{ fontSize: 22, marginRight: 14 }}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary, marginBottom: 2 }}>
                Share feedback or request a feature
              </Text>
              <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 17 }}>
                Tell us what's working, what's missing, or what you'd love to see next.
              </Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>

          <Text style={s.versionText}>PeakRoutine v1.0.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
