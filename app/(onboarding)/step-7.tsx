import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useOnboarding } from '@/context/OnboardingContext';
import { PREP_OPTIONS } from '@/constants/userProfile';

const TOTAL_STEPS = 7;

export default function Step7() {
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
            <View key={i} style={[s.progressDot, i <= 6 && s.progressDotActive]} />
          ))}
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
          <Text style={s.emoji}>⏱️</Text>
          <Text style={s.heading}>How long do you want to spend cooking?</Text>

          <Text style={s.sectionLabel}>Max prep time per meal</Text>
          <Text style={s.sub}>How long do you want to spend cooking?</Text>

          <View style={s.prepRow}>
            {PREP_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[s.prepPill, data.maxPrepMins === opt.value && s.prepPillSelected]}
                onPress={() => update({ maxPrepMins: opt.value })}
                activeOpacity={0.7}
              >
                <Text style={[s.prepPillText, data.maxPrepMins === opt.value && s.prepPillTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.nextBtn}
            onPress={() => router.push('/(onboarding)/done')}
          >
            <Text style={s.nextBtnText}>See my plan →</Text>
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
  content: { paddingBottom: 16, gap: 10 },
  emoji:        { fontSize: 48 },
  heading:      { fontSize: 26, fontWeight: '700', color: theme.textPrimary },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginBottom: -4 },
  sub:          { fontSize: 15, color: theme.textMuted, lineHeight: 22 },
  prepRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  prepPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    backgroundColor: theme.bgCard,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  prepPillSelected:     { borderColor: theme.primary },
  prepPillText:         { fontSize: 13, fontWeight: '600', color: theme.textMuted },
  prepPillTextSelected: { color: theme.primary },
  footer:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backText:    { color: theme.textMuted, fontSize: 15 },
  nextBtn:     { backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 28 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
