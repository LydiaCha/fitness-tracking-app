import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useOnboarding } from '@/context/OnboardingContext';
import { Gender } from '@/constants/userProfile';

const TOTAL_STEPS = 5;

export default function Step3() {
  const { theme } = useAppTheme();
  const { data, update } = useOnboarding();
  const router = useRouter();

  const [age,    setAge]    = useState(data.age);
  const [height, setHeight] = useState(data.heightCm);
  const [weight, setWeight] = useState(data.weightKg);

  const canContinue = data.gender && age && height && weight;

  const setGender = (g: Gender) => update({ gender: g });

  const s = styles(theme);

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
          {/* Progress */}
          <View style={s.progressRow}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <View key={i} style={[s.progressDot, i <= 2 && s.progressDotActive]} />
            ))}
          </View>

          <Text style={s.emoji}>📏</Text>
          <Text style={s.heading}>Body stats</Text>
          <Text style={s.sub}>Used to calculate your personalised targets.</Text>

          {/* Gender */}
          <Text style={s.fieldLabel}>Biological sex</Text>
          <View style={s.pillRow}>
            {(['female', 'male', 'other'] as Gender[]).map(g => (
              <TouchableOpacity
                key={g}
                style={[s.pill, data.gender === g && s.pillActive]}
                onPress={() => setGender(g)}
              >
                <Text style={[s.pillText, data.gender === g && s.pillTextActive]}>
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Age */}
          <Text style={s.fieldLabel}>Age</Text>
          <TextInput
            style={s.input}
            value={age}
            onChangeText={v => { setAge(v); update({ age: v }); }}
            placeholder="e.g. 28"
            placeholderTextColor={theme.textMuted}
            keyboardType="number-pad"
            maxLength={3}
          />

          {/* Height */}
          <Text style={s.fieldLabel}>Height (cm)</Text>
          <TextInput
            style={s.input}
            value={height}
            onChangeText={v => { setHeight(v); update({ heightCm: v }); }}
            placeholder="e.g. 165"
            placeholderTextColor={theme.textMuted}
            keyboardType="decimal-pad"
            maxLength={5}
          />

          {/* Weight */}
          <Text style={s.fieldLabel}>Weight (kg)</Text>
          <TextInput
            style={s.input}
            value={weight}
            onChangeText={v => { setWeight(v); update({ weightKg: v }); }}
            placeholder="e.g. 62"
            placeholderTextColor={theme.textMuted}
            keyboardType="decimal-pad"
            maxLength={5}
          />

          <View style={s.footer}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={s.backText}>← Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.nextBtn, !canContinue && s.nextBtnDisabled]}
              onPress={() => router.push('/(onboarding)/step-4')}
              disabled={!canContinue}
            >
              <Text style={s.nextBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: AppThemeType) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: theme.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },
  progressRow: { flexDirection: 'row', gap: 6, paddingTop: 20, paddingBottom: 8 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.border },
  progressDotActive: { backgroundColor: theme.primary },
  emoji:      { fontSize: 48, marginTop: 16 },
  heading:    { fontSize: 28, fontWeight: '700', color: theme.textPrimary, marginTop: 8 },
  sub:        { fontSize: 16, color: theme.textMuted, lineHeight: 22, marginBottom: 24 },
  fieldLabel: { fontSize: 14, fontWeight: '500', color: theme.textMuted, marginBottom: 8 },
  pillRow:    { flexDirection: 'row', gap: 10, marginBottom: 20 },
  pill: {
    flex: 1,
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  pillActive:     { borderColor: theme.primary },
  pillText:       { color: theme.textMuted, fontSize: 15, fontWeight: '500' },
  pillTextActive: { color: theme.primary, fontWeight: '700' },
  input: {
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    color: theme.textPrimary,
    borderWidth: 1,
    borderColor: theme.border,
    marginBottom: 16,
  },
  footer:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  backText:         { color: theme.textMuted, fontSize: 15 },
  nextBtn:          { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  nextBtnDisabled:  { opacity: 0.4 },
  nextBtnText:      { color: '#fff', fontSize: 16, fontWeight: '600' },
});
