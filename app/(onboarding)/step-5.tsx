import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useOnboarding } from '@/context/OnboardingContext';

const TOTAL_STEPS = 7;

const GYM_OPTIONS = [
  { days: 2, label: '2 days',  desc: 'Great for getting started' },
  { days: 3, label: '3 days',  desc: 'Classic split, solid progress' },
  { days: 4, label: '4 days',  desc: 'Upper/lower or push/pull/legs' },
  { days: 5, label: '5 days',  desc: 'High frequency training' },
];

export default function Step5() {
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
            <View key={i} style={[s.progressDot, i <= 4 && s.progressDotActive]} />
          ))}
        </View>

        <View style={s.content}>
          <Text style={s.emoji}>🏋️</Text>
          <Text style={s.heading}>Gym days per week</Text>
          <Text style={s.sub}>We'll build your training split around this.</Text>

          <View style={s.options}>
            {GYM_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.days}
                style={[s.option, data.gymDaysPerWeek === opt.days && s.optionSelected]}
                onPress={() => update({ gymDaysPerWeek: opt.days })}
              >
                <Text style={[s.optionDays, data.gymDaysPerWeek === opt.days && s.optionDaysSelected]}>
                  {opt.label}
                </Text>
                <Text style={s.optionDesc}>{opt.desc}</Text>
                {data.gymDaysPerWeek === opt.days && <Text style={s.check}>✓</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.footer}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.nextBtn}
            onPress={() => router.push('/(onboarding)/step-6')}
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
  options: { gap: 10, marginTop: 16 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgCard,
    borderRadius: 16,
    padding: 18,
    gap: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected:       { borderColor: theme.primary },
  optionDays:           { fontSize: 17, fontWeight: '700', color: theme.textPrimary, width: 56 },
  optionDaysSelected:   { color: theme.primary },
  optionDesc:           { flex: 1, fontSize: 13, color: theme.textMuted },
  check:                { color: theme.primary, fontSize: 18, fontWeight: '700' },
  footer:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backText:         { color: theme.textMuted, fontSize: 15 },
  nextBtn:          { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  nextBtnText:      { color: '#fff', fontSize: 16, fontWeight: '600' },
});
