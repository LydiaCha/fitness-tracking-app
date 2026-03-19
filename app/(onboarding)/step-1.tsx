import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useOnboarding } from '@/context/OnboardingContext';
import { useAuth } from '@/context/AuthContext';

const TOTAL_STEPS = 7;

export default function Step1() {
  const { theme } = useAppTheme();
  const { data, update } = useOnboarding();
  const { signOut } = useAuth();
  const router = useRouter();
  const [name, setName] = useState(data.name);

  const canContinue = name.trim().length > 0;

  const s = styles(theme);

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={s.inner}>
          {/* Progress */}
          <View style={s.progressRow}>
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <View key={i} style={[s.progressDot, i === 0 && s.progressDotActive]} />
            ))}
          </View>

          <View style={s.content}>
            <Text style={s.emoji}>👋</Text>
            <Text style={s.heading}>What's your name?</Text>
            <Text style={s.sub}>We'll personalise your experience.</Text>

            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={theme.textMuted}
              autoFocus
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={() => {
                if (canContinue) {
                  update({ name: name.trim() });
                  router.push('/(onboarding)/step-2');
                }
              }}
            />
          </View>

          <View style={s.footer}>
            <TouchableOpacity onPress={signOut}>
              <Text style={s.exitText}>Exit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.nextBtn, !canContinue && s.nextBtnDisabled]}
              onPress={() => {
                update({ name: name.trim() });
                router.push('/(onboarding)/step-2');
              }}
              disabled={!canContinue}
            >
              <Text style={s.nextBtnText}>Continue →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: AppThemeType) => StyleSheet.create({
  root:  { flex: 1, backgroundColor: theme.bg },
  inner: { flex: 1, paddingHorizontal: 24, paddingBottom: 32 },
  progressRow: {
    flexDirection: 'row',
    gap: 6,
    paddingTop: 20,
    paddingBottom: 8,
  },
  progressDot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.border,
  },
  progressDotActive: {
    backgroundColor: theme.primary,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
  },
  emoji:   { fontSize: 48 },
  heading: { fontSize: 26, fontWeight: '700', color: theme.textPrimary },
  sub:     { fontSize: 16, color: theme.textMuted, lineHeight: 22 },
  input: {
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 16,
    fontSize: 20,
    color: theme.textPrimary,
    borderWidth: 1,
    borderColor: theme.border,
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exitText: { color: theme.textMuted, fontSize: 15 },
  nextBtn: {
    backgroundColor: theme.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
  },
  nextBtnDisabled: { opacity: 0.4 },
  nextBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
