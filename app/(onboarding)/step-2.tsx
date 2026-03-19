import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useOnboarding } from '@/context/OnboardingContext';
import { FitnessGoal, GOAL_LABELS } from '@/constants/userProfile';

const TOTAL_STEPS = 7;

const GOALS: { value: FitnessGoal; emoji: string; desc: string }[] = [
  { value: 'lose',     emoji: '🔥', desc: 'Reduce body fat while keeping muscle' },
  { value: 'maintain', emoji: '⚖️',  desc: 'Stay fit and build healthy habits' },
  { value: 'gain',     emoji: '💪', desc: 'Build strength and muscle mass' },
];

export default function Step2() {
  const { theme } = useAppTheme();
  const { data, update } = useOnboarding();
  const router = useRouter();

  const s = styles(theme);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.inner}>
        {/* Progress */}
        <View style={s.progressRow}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[s.progressDot, i <= 1 && s.progressDotActive]} />
          ))}
        </View>

        <View style={s.content}>
          <Text style={s.emoji}>🎯</Text>
          <Text style={s.heading}>What's your main goal?</Text>
          <Text style={s.sub}>This shapes your daily targets and gym plan.</Text>

          <View style={s.options}>
            {GOALS.map(g => (
              <TouchableOpacity
                key={g.value}
                style={[s.option, data.goal === g.value && s.optionSelected]}
                onPress={() => {
                  update({ goal: g.value });
                  setTimeout(() => router.push('/(onboarding)/step-3'), 150);
                }}
              >
                <Text style={s.optionEmoji}>{g.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.optionLabel, data.goal === g.value && s.optionLabelSelected]}>
                    {GOAL_LABELS[g.value]}
                  </Text>
                  <Text style={s.optionDesc}>{g.desc}</Text>
                </View>
                {data.goal === g.value && <Text style={s.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.footer}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.nextBtn, !data.goal && s.nextBtnDisabled]}
            onPress={() => router.push('/(onboarding)/step-3')}
            disabled={!data.goal}
          >
            <Text style={s.nextBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = (theme: AppThemeType) => StyleSheet.create({
  root:  { flex: 1, backgroundColor: theme.bg },
  inner: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
  progressRow: { flexDirection: 'row', gap: 6, paddingTop: 20, paddingBottom: 8 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.border },
  progressDotActive: { backgroundColor: theme.primary },
  content: { flex: 1, justifyContent: 'center', gap: 12 },
  emoji:   { fontSize: 48 },
  heading: { fontSize: 26, fontWeight: '700', color: theme.textPrimary },
  sub:     { fontSize: 16, color: theme.textMuted, lineHeight: 22 },
  options: { gap: 12, marginTop: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgCard,
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected:      { borderColor: theme.primary },
  optionEmoji:         { fontSize: 28 },
  optionLabel:         { fontSize: 17, fontWeight: '600', color: theme.textPrimary },
  optionLabelSelected: { color: theme.primary },
  optionDesc:          { fontSize: 13, color: theme.textMuted, marginTop: 2 },
  check:               { color: theme.primary, fontSize: 20, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backText:         { color: theme.textMuted, fontSize: 15 },
  nextBtn:          { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  nextBtnDisabled:  { opacity: 0.4 },
  nextBtnText:      { color: '#fff', fontSize: 16, fontWeight: '600' },
});
