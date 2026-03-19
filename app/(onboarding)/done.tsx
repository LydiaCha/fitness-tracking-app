import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  SafeAreaView, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useOnboarding } from '@/context/OnboardingContext';
import { useAuth } from '@/context/AuthContext';
import {
  calcMacroTargets, DEFAULT_PROFILE, saveUserProfile,
  UserProfile, ActivityLevel, FitnessGoal, Gender,
  GOAL_LABELS, ACTIVITY_LABELS, DAY_NAMES,
} from '@/constants/userProfile';
import { logger } from '@/utils/logger';
import { STORAGE_KEYS, toKey } from '@/utils/appConstants';
import { safeGetItem, safeSetItem } from '@/utils/storage';

// Auto-assign gym days based on count
function buildGymDays(count: number): number[] {
  switch (count) {
    case 2: return [1, 4];                // Mon, Thu
    case 3: return [1, 3, 5];            // Mon, Wed, Fri
    case 4: return [1, 2, 4, 5];         // Mon, Tue, Thu, Fri
    case 5: return [1, 2, 3, 4, 6];      // Mon–Thu, Sat
    default: return [1, 3, 5];
  }
}

export default function OnboardingDone() {
  const { theme }                   = useAppTheme();
  const { data }                    = useOnboarding();
  const { completeOnboarding, user } = useAuth();
  const [saving, setSaving]         = useState(false);

  const age      = parseInt(data.age)      || 25;
  const heightCm = parseFloat(data.heightCm) || 165;
  const weightKg = parseFloat(data.weightKg) || 65;
  const gender   = data.gender   ?? 'female';
  const activity = data.activityLevel ?? 'moderate';
  const goal     = data.goal     ?? 'maintain';

  const macros = calcMacroTargets({
    age, gender, heightCm, weightKg,
    activityLevel: activity as ActivityLevel,
    fitnessGoal:   goal     as FitnessGoal,
  });

  const gymDays = buildGymDays(data.gymDaysPerWeek);

  const handleStart = async () => {
    setSaving(true);
    try {
      // Idempotency guard: if the user force-quits after saveUserProfile but
      // before completeOnboarding, re-tapping "Start" must not re-save and
      // overwrite any changes made in a retry. Raw storage (not loadUserProfile)
      // is null only on a true first install — non-null means save already ran.
      const existingRaw = await safeGetItem(STORAGE_KEYS.PROFILE);
      if (existingRaw) {
        await completeOnboarding();
        return;
      }

      const profile: UserProfile = {
        ...DEFAULT_PROFILE,
        name:          data.name,
        age,
        gender:        gender  as Gender,
        heightCm,
        weightKg,
        activityLevel: activity as ActivityLevel,
        fitnessGoal:   goal    as FitnessGoal,
        gymDays,
        caloriesTarget: null,
        proteinTarget:  null,
        carbsTarget:    null,
        fatTarget:      null,
        dietaryRestrictions:   data.dietaryRestrictions,
        cuisinePreferences:    data.cuisinePreferences,
        dislikedIngredientIds: [],
        maxPrepMins:           data.maxPrepMins,
      };
      await saveUserProfile(profile);
      // Seed weight log with the onboarding weight as the first entry
      await safeSetItem(STORAGE_KEYS.WEIGHTS, JSON.stringify([{ date: toKey(new Date()), kg: weightKg }]));
      await completeOnboarding();
    } catch (e) {
      logger.error('storage', 'onboarding_save', 'Failed to save onboarding profile', { error: String(e) });
      Alert.alert(
        'Could not save your profile',
        'Please check your connection and try again.',
        [{ text: 'OK' }],
      );
    } finally {
      setSaving(false);
    }
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.header}>
          <Text style={s.wave}>🎉</Text>
          <Text style={s.heading}>
            Your plan is ready{data.name ? `, ${data.name}` : ''}!
          </Text>
          <Text style={s.sub}>Based on your profile, here's what we calculated:</Text>
        </View>

        {/* Goal card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Goal</Text>
          <Text style={s.cardValue}>{GOAL_LABELS[goal as FitnessGoal]}</Text>
        </View>

        {/* Macros card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Daily targets</Text>
          <View style={s.macroRow}>
            {[
              { label: 'Calories', value: macros.calories, unit: 'kcal', color: theme.primary },
              { label: 'Protein',  value: macros.protein,  unit: 'g',    color: '#22c55e' },
              { label: 'Carbs',    value: macros.carbs,    unit: 'g',    color: '#f59e0b' },
              { label: 'Fat',      value: macros.fat,      unit: 'g',    color: '#ef4444' },
            ].map(m => (
              <View key={m.label} style={s.macroItem}>
                <Text style={[s.macroValue, { color: m.color }]}>{m.value}</Text>
                <Text style={s.macroUnit}>{m.unit}</Text>
                <Text style={s.macroLabel}>{m.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Gym days card */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Gym days ({gymDays.length}/wk)</Text>
          <View style={s.gymRow}>
            {[0,1,2,3,4,5,6].map(d => (
              <View key={d} style={[s.dayPill, gymDays.includes(d) && s.dayPillActive]}>
                <Text style={[s.dayText, gymDays.includes(d) && s.dayTextActive]}>
                  {DAY_NAMES[d].charAt(0)}
                </Text>
              </View>
            ))}
          </View>
          <Text style={s.gymNote}>
            {gymDays.map(d => DAY_NAMES[d]).join(' · ')}
          </Text>
        </View>

        {/* Dietary preferences summary — only shown if non-default */}
        {(data.dietaryRestrictions.length > 0 || data.cuisinePreferences.length > 0 || data.maxPrepMins !== 30) && (
          <View style={s.card}>
            <Text style={s.cardTitle}>Food preferences</Text>
            {data.dietaryRestrictions.length > 0 && (
              <Text style={s.cardValue}>{data.dietaryRestrictions.join(', ')}</Text>
            )}
            {data.cuisinePreferences.length > 0 && (
              <Text style={s.gymNote}>Cuisines: {data.cuisinePreferences.join(', ')}</Text>
            )}
            <Text style={s.gymNote}>Max prep: {data.maxPrepMins === 60 ? '60+ min' : `${data.maxPrepMins} min`}</Text>
          </View>
        )}

        <Text style={s.editNote}>
          You can adjust all of this in your Profile at any time.
        </Text>

        <TouchableOpacity style={s.startBtn} onPress={handleStart} disabled={saving}>
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text style={s.startBtnText}>Start tracking →</Text>
          }
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: AppThemeType) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: theme.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },
  header: { alignItems: 'center', paddingTop: 32, paddingBottom: 24, gap: 8 },
  wave:    { fontSize: 56 },
  heading: { fontSize: 26, fontWeight: '700', color: theme.textPrimary, textAlign: 'center' },
  sub:     { fontSize: 15, color: theme.textMuted, textAlign: 'center', lineHeight: 22 },
  card: {
    backgroundColor: theme.bgCard,
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 10,
  },
  cardTitle: { fontSize: 12, fontWeight: '600', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  cardValue: { fontSize: 20, fontWeight: '700', color: theme.textPrimary },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  macroItem: { alignItems: 'center', gap: 2 },
  macroValue: { fontSize: 22, fontWeight: '700' },
  macroUnit:  { fontSize: 11, color: theme.textMuted, marginTop: -2 },
  macroLabel: { fontSize: 11, color: theme.textMuted },
  gymRow: { flexDirection: 'row', gap: 8 },
  dayPill: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.bg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.border,
  },
  dayPillActive: { backgroundColor: theme.primary, borderColor: theme.primary },
  dayText:       { fontSize: 13, color: theme.textMuted, fontWeight: '600' },
  dayTextActive: { color: '#fff' },
  gymNote:       { fontSize: 13, color: theme.textMuted },
  editNote:      { fontSize: 13, color: theme.textMuted, textAlign: 'center', marginBottom: 24, marginTop: 8 },
  startBtn: {
    backgroundColor: theme.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  startBtnText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
