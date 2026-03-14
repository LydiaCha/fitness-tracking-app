import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getAuthErrorMessage } from '@/utils/errorMessages';

export default function ForgotScreen() {
  const { theme } = useAppTheme();
  const { resetPassword } = useAuth();
  const router = useRouter();

  const [email,   setEmail]   = useState('');
  const [focused, setFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [sent,    setSent]    = useState(false);

  const handleReset = async () => {
    setError('');
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      setLoading(true);
      await resetPassword(email);
      setSent(true);
    } catch (e) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const s = styles(theme);

  if (sent) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.doneWrap}>
          <View style={s.doneIconWrap}>
            <View style={s.doneIconGlow} />
            <Text style={s.doneIconEmoji}>✉️</Text>
          </View>
          <Text style={s.doneTitle}>Email sent</Text>
          <Text style={s.doneSub}>
            Check your inbox for a password reset link. It may take a minute to arrive.
          </Text>
          <TouchableOpacity style={s.doneBtn} onPress={() => router.replace('/(auth)/login')}>
            <Text style={s.doneBtnText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={s.inner}>
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>

          <Text style={s.heading}>Reset password</Text>
          <Text style={s.sub}>
            Enter your email and we'll send you a link to create a new password.
          </Text>

          <View style={[s.input, focused && s.inputFocused]}>
            <Text style={s.inputIcon}>@</Text>
            <TextInput
              style={s.inputText}
              value={email}
              onChangeText={setEmail}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder="Email address"
              placeholderTextColor={theme.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              autoFocus
            />
          </View>

          {error ? (
            <View style={s.errorWrap}>
              <Text style={s.errorText}>⚠ {error}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[s.primaryBtn, loading && s.primaryBtnLoading]}
            onPress={handleReset}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.primaryBtnText}>Send reset link</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = (theme: AppThemeType) => StyleSheet.create({
  root:  { flex: 1, backgroundColor: theme.bg },
  inner: { flex: 1, paddingHorizontal: 24 },

  backBtn:   { paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' },
  backArrow: { fontSize: 32, color: theme.textMuted, lineHeight: 36 },

  heading: {
    fontSize: 32,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: -0.5,
    marginTop: 8,
  },
  sub: {
    fontSize: 15,
    color: theme.textMuted,
    marginTop: 6,
    marginBottom: 36,
    lineHeight: 22,
  },

  input: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgCard,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: theme.border,
    gap: 10,
    marginBottom: 12,
  },
  inputFocused: {
    borderColor: theme.primary,
    backgroundColor: theme.bgCardAlt,
  },
  inputIcon: { fontSize: 16, opacity: 0.5 },
  inputText: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.textPrimary,
  },

  errorWrap: {
    backgroundColor: `${theme.error}18`,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: `${theme.error}40`,
    marginBottom: 12,
  },
  errorText: { color: theme.error, fontSize: 14, lineHeight: 20 },

  primaryBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnLoading: { opacity: 0.7 },
  primaryBtnText:    { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },

  // Sent state
  doneWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 14 },
  doneIconWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  doneIconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.primary,
    opacity: 0.15,
  },
  doneIconEmoji: { fontSize: 60 },
  doneTitle:     { fontSize: 26, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.3 },
  doneSub:       { fontSize: 15, color: theme.textMuted, textAlign: 'center', lineHeight: 24 },
  doneBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 8,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  doneBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
