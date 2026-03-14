import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { getAuthErrorMessage } from '@/utils/errorMessages';

type Field = 'email' | 'password' | null;

export default function LoginScreen() {
  const { theme } = useAppTheme();
  const { signIn, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [focused,  setFocused]  = useState<Field>(null);
  const [loading,  setLoading]  = useState(false);
  const [googleL,  setGoogleL]  = useState(false);
  const [error,    setError]    = useState('');

  const handleLogin = async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    // Basic email format guard
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    try {
      setLoading(true);
      await signIn(email, password);
    } catch (e) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
      setGoogleL(true);
      await signInWithGoogle();
    } catch (e) {
      setError(getAuthErrorMessage(e));
    } finally {
      setGoogleL(false);
    }
  };

  const s = styles(theme);

  const inputStyle = (field: Field) => [
    s.input,
    focused === field && s.inputFocused,
  ];

  return (
    <SafeAreaView style={s.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">

          {/* Header */}
          <TouchableOpacity style={s.backBtn} onPress={() => router.back()} hitSlop={12}>
            <Text style={s.backArrow}>‹</Text>
          </TouchableOpacity>

          <Text style={s.heading}>Welcome back</Text>
          <Text style={s.sub}>Sign in to your account</Text>

          {/* Form */}
          <View style={s.form}>

            {/* Email */}
            <View style={inputStyle('email')}>
              <Text style={s.inputIcon}>@</Text>
              <TextInput
                style={s.inputText}
                value={email}
                onChangeText={setEmail}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                placeholder="Email address"
                placeholderTextColor={theme.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
              />
            </View>

            {/* Password */}
            <View style={inputStyle('password')}>
              <Text style={s.inputIcon}>🔒</Text>
              <TextInput
                style={s.inputText}
                value={password}
                onChangeText={setPassword}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused(null)}
                placeholder="Password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPw}
                autoComplete="current-password"
              />
              <TouchableOpacity onPress={() => setShowPw(p => !p)} hitSlop={8}>
                <Text style={s.eyeBtn}>{showPw ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {/* Forgot */}
            <TouchableOpacity
              onPress={() => router.push('/(auth)/forgot')}
              style={s.forgotWrap}
            >
              <Text style={s.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            {/* Inline error */}
            {error ? (
              <View style={s.errorWrap}>
                <Text style={s.errorText}>⚠ {error}</Text>
              </View>
            ) : null}

            {/* Sign in button */}
            <TouchableOpacity
              style={[s.primaryBtn, loading && s.primaryBtnLoading]}
              onPress={handleLogin}
              disabled={loading || googleL}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>Sign in</Text>
              }
            </TouchableOpacity>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Google */}
            <TouchableOpacity
              style={s.googleBtn}
              onPress={handleGoogle}
              disabled={googleL || loading}
              activeOpacity={0.85}
            >
              {googleL ? (
                <ActivityIndicator color={theme.textPrimary} />
              ) : (
                <>
                  <View style={s.googleIconWrap}>
                    <Text style={s.googleLetter}>G</Text>
                  </View>
                  <Text style={s.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={s.footer}>
            <Text style={s.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/signup')}>
              <Text style={s.footerLink}>Sign up</Text>
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

  backBtn:  { paddingTop: 16, paddingBottom: 8, alignSelf: 'flex-start' },
  backArrow:{ fontSize: 32, color: theme.textMuted, lineHeight: 36 },

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
  },

  form: { gap: 12 },

  // Input row (icon + text + optional toggle)
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
  eyeBtn: { fontSize: 16, opacity: 0.6, paddingVertical: 14 },

  forgotWrap: { alignSelf: 'flex-end', marginTop: -2 },
  forgotText: { color: theme.primary, fontSize: 14, fontWeight: '500' },

  // Error
  errorWrap: {
    backgroundColor: `${theme.error}18`,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: `${theme.error}40`,
  },
  errorText: { color: theme.error, fontSize: 14, lineHeight: 20 },

  // Primary button
  primaryBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: 'center',
    marginTop: 4,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryBtnLoading: { opacity: 0.7 },
  primaryBtnText: { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },

  // Divider
  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: { color: theme.textMuted, fontSize: 13 },

  // Google button
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: theme.bgCardAlt,
    borderRadius: 14,
    paddingVertical: 15,
    borderWidth: 1.5,
    borderColor: theme.border,
  },
  googleIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleLetter:  { fontSize: 14, fontWeight: '800', color: '#4285F4' },
  googleBtnText: { fontSize: 16, fontWeight: '600', color: theme.textPrimary },

  // Footer
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 36 },
  footerText: { color: theme.textMuted, fontSize: 15 },
  footerLink: { color: theme.primary, fontSize: 15, fontWeight: '700' },
});
