import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useOnboarding } from '@/context/OnboardingContext';
import { DietaryRestriction, RESTRICTION_OPTIONS, toggleDietaryRestriction } from '@/constants/userProfile';

const TOTAL_STEPS = 7;

export default function Step6() {
  const { theme } = useAppTheme();
  const { data, update } = useOnboarding();
  const router = useRouter();

  const s = styles(theme);

  const toggle = (restriction: DietaryRestriction) => {
    update({ dietaryRestrictions: toggleDietaryRestriction(data.dietaryRestrictions, restriction) });
  };

  const clearAll = () => update({ dietaryRestrictions: [] });

  return (
    <SafeAreaView style={s.root}>
      <View style={s.inner}>
        {/* Progress */}
        <View style={s.progressRow}>
          {Array.from({ length: TOTAL_STEPS }, (_, i) => (
            <View key={i} style={[s.progressDot, i <= 5 && s.progressDotActive]} />
          ))}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.emoji}>🥗</Text>
          <Text style={s.heading}>Any dietary needs?</Text>
          <Text style={s.sub}>We'll filter out meals that don't fit. Tap all that apply.</Text>

          <View style={s.options}>
            {RESTRICTION_OPTIONS.filter(opt =>
              !(opt.value === 'vegetarian' && data.dietaryRestrictions.includes('vegan'))
            ).map(opt => {
              const selected = data.dietaryRestrictions.includes(opt.value);
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.option, selected && s.optionSelected]}
                  onPress={() => toggle(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={s.optionEmoji}>{opt.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.optionLabel, selected && s.optionLabelSelected]}>{opt.label}</Text>
                  </View>
                  {selected && <Text style={s.check}>✓</Text>}
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={s.noneBtn} onPress={clearAll} activeOpacity={0.7}>
            <Text style={s.noneBtnText}>None of these</Text>
          </TouchableOpacity>
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.nextBtn}
            onPress={() => router.push('/(onboarding)/step-7')}
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
  content: { paddingBottom: 16, gap: 12 },
  emoji:   { fontSize: 48 },
  heading: { fontSize: 26, fontWeight: '700', color: theme.textPrimary },
  sub:     { fontSize: 16, color: theme.textMuted, lineHeight: 22 },
  options: { gap: 10, marginTop: 8 },
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
  optionEmoji:         { fontSize: 22 },
  optionLabel:         { fontSize: 16, fontWeight: '600', color: theme.textPrimary },
  optionLabelSelected: { color: theme.primary },
  optionSub:           { fontSize: 12, color: theme.textMuted, marginTop: 2 },
  check:               { color: theme.primary, fontSize: 18, fontWeight: '700' },
  noneBtn: {
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 4,
  },
  noneBtnText: { fontSize: 14, color: theme.textMuted, fontWeight: '500' },
  footer:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backText:    { color: theme.textMuted, fontSize: 15 },
  nextBtn:     { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
