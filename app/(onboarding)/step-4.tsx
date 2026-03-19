import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useOnboarding } from '@/context/OnboardingContext';
import { ActivityLevel, ACTIVITY_LABELS } from '@/constants/userProfile';

const TOTAL_STEPS = 7;

const ACTIVITY_OPTIONS: { value: ActivityLevel; emoji: string; desc: string }[] = [
  { value: 'sedentary',  emoji: '🛋️', desc: 'Little or no exercise, desk job' },
  { value: 'light',      emoji: '🚶', desc: '1–3 days/week of light activity' },
  { value: 'moderate',   emoji: '🏃', desc: '3–5 days/week of moderate exercise' },
  { value: 'active',     emoji: '🏋️', desc: '6–7 days/week of hard training' },
  { value: 'very_active',emoji: '⚡', desc: 'Twice daily or very intense training' },
];

export default function Step4() {
  const { theme } = useAppTheme();
  const { data, update } = useOnboarding();
  const router = useRouter();

  const s = styles(theme);

  return (
    <SafeAreaView style={s.root}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Progress */}
        <View style={s.progressRow}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[s.progressDot, i <= 3 && s.progressDotActive]} />
          ))}
        </View>

        <Text style={s.emoji}>🏃‍♀️</Text>
        <Text style={s.heading}>Activity level</Text>
        <Text style={s.sub}>How active are you on a typical week?</Text>

        <View style={s.options}>
          {ACTIVITY_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.value}
              style={[s.option, data.activityLevel === opt.value && s.optionSelected]}
              onPress={() => {
                update({ activityLevel: opt.value });
                setTimeout(() => router.push('/(onboarding)/step-5'), 150);
              }}
            >
              <Text style={s.optionEmoji}>{opt.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[s.optionLabel, data.activityLevel === opt.value && s.optionLabelSelected]}>
                  {ACTIVITY_LABELS[opt.value]}
                </Text>
                <Text style={s.optionDesc}>{opt.desc}</Text>
              </View>
              {data.activityLevel === opt.value && <Text style={s.check}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.footer}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.nextBtn, !data.activityLevel && s.nextBtnDisabled]}
            onPress={() => router.push('/(onboarding)/step-5')}
            disabled={!data.activityLevel}
          >
            <Text style={s.nextBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = (theme: AppThemeType) => StyleSheet.create({
  root:   { flex: 1, backgroundColor: theme.bg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 48 },
  progressRow: { flexDirection: 'row', gap: 6, paddingTop: 20, paddingBottom: 8 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.border },
  progressDotActive: { backgroundColor: theme.primary },
  emoji:   { fontSize: 48, marginTop: 16 },
  heading: { fontSize: 26, fontWeight: '700', color: theme.textPrimary, marginTop: 8 },
  sub:     { fontSize: 16, color: theme.textMuted, lineHeight: 22, marginBottom: 20 },
  options: { gap: 10, marginBottom: 24 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgCard,
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected:      { borderColor: theme.primary },
  optionEmoji:         { fontSize: 26 },
  optionLabel:         { fontSize: 16, fontWeight: '600', color: theme.textPrimary },
  optionLabelSelected: { color: theme.primary },
  optionDesc:          { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  check:               { color: theme.primary, fontSize: 18, fontWeight: '700' },
  footer:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backText:         { color: theme.textMuted, fontSize: 15 },
  nextBtn:          { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  nextBtnDisabled:  { opacity: 0.4 },
  nextBtnText:      { color: '#fff', fontSize: 16, fontWeight: '600' },
});
