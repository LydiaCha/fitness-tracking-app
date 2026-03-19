/**
 * My Goals — body metrics, daily targets, supplements, food preferences
 */
import React, { useState, useCallback, useMemo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  View, Text, ScrollView, TouchableOpacity, StatusBar,
  Alert, TextInput, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { logger } from '@/utils/logger';
import { STORAGE_KEYS, toKey } from '@/utils/appConstants';
import { safeGetItem, safeSetItem, safeParseJSON } from '@/utils/storage';
import {
  UserProfile, ActivityLevel, FitnessGoal, Gender,
  saveUserProfile,
  ACTIVITY_LABELS, GOAL_LABELS, FITNESS_LEVEL_OPTIONS, EQUIPMENT_OPTIONS,
} from '@/constants/userProfile';
import { useUserProfile } from '@/context/UserProfileContext';
import { useWeeklyPlan } from '@/context/WeeklyPlanContext';
import { createProfileStyles, ProfileStyles } from '@/styles/profile.styles';

type Section = 'metrics' | 'goals' | 'training' | null;

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

export default function MyHealthScreen() {
  const { theme, isDark } = useAppTheme();
  const router = useRouter();
  const s = useMemo(() => createProfileStyles(theme), [theme]);
  const { profile, effectiveMacros, updateProfile } = useUserProfile();
  const { rebuildSkeleton } = useWeeklyPlan();

  const [draft, setDraft] = useState<UserProfile>(() => profile);
  const [expanded, setExpanded] = useState<Section>(null);

  useFocusEffect(useCallback(() => {
    setDraft(profile);
    setExpanded(null);
  }, [profile]));

  const openSection = useCallback((section: Section) => {
    setDraft({ ...profile });
    setExpanded(prev => prev === section ? null : section);
  }, [profile]);

  const autoCalcMacros = useCallback(() => {
    setDraft(prev => ({ ...prev, caloriesTarget: null, proteinTarget: null, carbsTarget: null, fatTarget: null }));
  }, []);

  const handleSave = useCallback(async () => {
    const previous = profile;
    const weightChanged = draft.weightKg !== profile.weightKg && draft.weightKg > 0;

    updateProfile(draft);
    setExpanded(null);

    try {
      await saveUserProfile(draft);
      // Rebuild after a successful save so schedule reflects the new profile.
      // Must come after save: if save fails we revert the profile, so rebuilding
      // from draft before that would leave the schedule in an inconsistent state.
      rebuildSkeleton(draft).catch(() => {});

      // Sync weight entry when weight changes
      if (weightChanged) {
        const raw = await safeGetItem(STORAGE_KEYS.WEIGHTS);
        const entries: { date: string; kg: number }[] = safeParseJSON(raw, []);
        const todayStr = toKey(new Date());
        const updated = entries
          .filter(e => e.date !== todayStr)
          .concat({ date: todayStr, kg: draft.weightKg })
          .sort((a, b) => a.date.localeCompare(b.date));
        await safeSetItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(updated));
      }

    } catch (e) {
      logger.error('storage', 'my-goals:handleSave', 'Failed to save profile', { error: String(e) });
      updateProfile(previous);
      setDraft(previous);
      Alert.alert('Save failed', 'Could not save your changes. Please try again.');
    }
  }, [draft, profile, updateProfile, rebuildSkeleton]);

  const handleCancel = useCallback(() => {
    setDraft({ ...profile });
    setExpanded(null);
  }, [profile]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        <View style={[s.headerRow, { marginBottom: 20 }]}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={{ marginRight: 12, padding: 4 }}>
            <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>My Health</Text>
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
                  {GOAL_LABELS[profile.fitnessGoal]} · {ACTIVITY_LABELS[profile.activityLevel]}
                </Text>
              </View>
              <Text style={s.chevron}>›</Text>
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

        {/* ── Training ── */}
        <Text style={s.sectionLabel}>Training</Text>
        <View style={s.card}>
          {expanded !== 'training' ? (
            <TouchableOpacity style={s.rowLast} onPress={() => openSection('training')} activeOpacity={0.7}>
              <Text style={s.rowIcon}>🏋️</Text>
              <View style={{ flex: 1 }}>
                <Text style={s.rowLabel}>
                  {FITNESS_LEVEL_OPTIONS.find(o => o.value === profile.fitnessLevel)?.label ?? 'Intermediate'}
                  {' · '}
                  {EQUIPMENT_OPTIONS.find(o => o.value === profile.equipment)?.label ?? 'Gym'}
                </Text>
                <Text style={[s.rowValue, { textAlign: 'left', fontSize: 12, marginTop: 2 }]}>
                  {FITNESS_LEVEL_OPTIONS.find(o => o.value === profile.fitnessLevel)?.desc}
                </Text>
              </View>
              <Text style={s.chevron}>›</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.expandAreaLast}>
              <Text style={s.timeLabel}>Fitness level</Text>
              <View style={s.pillRow}>
                {FITNESS_LEVEL_OPTIONS.map(o => (
                  <TouchableOpacity
                    key={o.value}
                    style={[s.pill, draft.fitnessLevel === o.value && s.pillOn]}
                    onPress={() => setDraft(p => ({ ...p, fitnessLevel: o.value }))}
                    activeOpacity={0.7}>
                    <Text style={[s.pillText, draft.fitnessLevel === o.value && s.pillTextOn]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.timeLabel}>Equipment</Text>
              <View style={s.pillRow}>
                {EQUIPMENT_OPTIONS.map(o => (
                  <TouchableOpacity
                    key={o.value}
                    style={[s.pill, draft.equipment === o.value && s.pillOn]}
                    onPress={() => setDraft(p => ({ ...p, equipment: o.value }))}
                    activeOpacity={0.7}>
                    <Text style={[s.pillText, draft.equipment === o.value && s.pillTextOn]}>{o.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <SaveRow onSave={handleSave} onCancel={handleCancel} s={s} />
            </View>
          )}
        </View>

        {/* ── Food Preferences ── */}
        <Text style={s.sectionLabel}>Food Preferences</Text>
        <View style={s.card}>
          <View style={s.rowOpen}>
            <Text style={s.rowIcon}>🥗</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Dietary & cuisine</Text>
              <Text style={[s.rowValue, { textAlign: 'left', fontSize: 12, marginTop: 2 }]}>
                {(() => {
                  const parts: string[] = [];
                  const prep = profile.maxPrepMins ?? 30;
                  parts.push(`${prep === 60 ? '60+' : prep} min meals`);
                  const restrictions = profile.dietaryRestrictions ?? [];
                  if (restrictions.length > 0) parts.push(restrictions.join(', '));
                  return parts.join(' · ');
                })()}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={s.rowLast} onPress={() => router.push('/food-preferences')} activeOpacity={0.7}>
            <Text style={[s.rowLabel, { color: theme.primary, fontSize: 14 }]}>Update preferences</Text>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Daily Targets ── */}
        <Text style={s.sectionLabel}>Daily Targets</Text>
        <View style={s.card}>
          {expanded !== 'goals' ? (
            <>
              <View style={s.macroDisplayGrid}>
                {[
                  { label: 'Calories', value: `${effectiveMacros.calories}`,  color: theme.primary },
                  { label: 'Protein',  value: `${effectiveMacros.protein}g`,  color: theme.gym },
                  { label: 'Carbs',    value: `${effectiveMacros.carbs}g`,    color: theme.class },
                  { label: 'Fat',      value: `${effectiveMacros.fat}g`,      color: theme.warning },
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
                <Text style={[s.rowLabel, { color: theme.primary, fontSize: 14 }]}>Edit targets</Text>
                <Text style={s.chevron}>›</Text>
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
                  { key: 'caloriesTarget' as const, effectiveKey: 'calories' as const, label: 'Calories (kcal)', color: theme.primary },
                  { key: 'proteinTarget'  as const, effectiveKey: 'protein'  as const, label: 'Protein (g)',      color: theme.gym },
                  { key: 'carbsTarget'    as const, effectiveKey: 'carbs'    as const, label: 'Carbs (g)',        color: theme.class },
                  { key: 'fatTarget'      as const, effectiveKey: 'fat'      as const, label: 'Fat (g)',          color: theme.warning },
                ]).map(({ key, effectiveKey, label, color }) => {
                  // Show the effective (formula-derived or user-set) value in the input
                  const { [effectiveKey]: effectiveVal } = effectiveMacros;
                  return (
                  <View key={key} style={s.macroField}>
                    <Text style={s.timeLabel}>{label}</Text>
                    <TextInput
                      style={[s.macroInput, { borderColor: color + '88' }]}
                      value={draft[key] !== null ? String(draft[key]) : String(effectiveVal)}
                      onChangeText={v => setDraft(p => ({ ...p, [key]: parseInt(v) || null }))}
                      keyboardType="number-pad"
                      selectTextOnFocus
                      returnKeyType="done"
                    />
                  </View>
                  );
                })}
              </View>
              <SaveRow onSave={handleSave} onCancel={handleCancel} s={s} />
            </View>
          )}
        </View>

        {/* ── Supplements ── */}
        <Text style={s.sectionLabel}>Supplements</Text>
        <View style={s.card}>
          <View style={s.rowOpen}>
            <Text style={s.rowIcon}>💊</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Supplement reminders</Text>
              <Text style={[s.rowValue, { textAlign: 'left', fontSize: 12, marginTop: 2 }]}>
                {profile.supplementsEnabled ? "Shown in Today\u2019s schedule" : "Hidden from Today\u2019s schedule"}
              </Text>
            </View>
            <Switch
              value={profile.supplementsEnabled ?? true}
              onValueChange={async (val) => {
                const updated = { ...profile, supplementsEnabled: val };
                updateProfile(updated);
                await saveUserProfile(updated).catch(e =>
                  logger.error('storage', 'supplementsEnabled', 'save failed', { error: String(e) }),
                );
              }}
              trackColor={{ false: theme.border, true: theme.primary + '88' }}
              thumbColor={profile.supplementsEnabled ? theme.primary : theme.textMuted}
            />
          </View>
          <View style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 16 }}>
            <Text style={{ fontSize: 12, color: theme.textMuted, lineHeight: 18 }}>
              Recommendations are personalised to your goal, dietary restrictions, and training days — e.g. creatine is only suggested for muscle-building, and whey/casein are hidden if you're dairy-free.
            </Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
