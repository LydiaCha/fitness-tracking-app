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

type Field = 'email' | 'password' | 'confirm' | null;

export default function SignupScreen() {
  const { theme } = useAppTheme();
  const { signUp, signInWithGoogle } = useAuth();
  const router = useRouter();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [showCf,   setShowCf]   = useState(false);
  const [focused,  setFocused]  = useState<Field>(null);
  const [loading,  setLoading]  = useState(false);
  const [googleL,  setGoogleL]  = useState(false);
  const [error,    setError]    = useState('');
  const [done,     setDone]     = useState(false);

  const handleSignup = async () => {
    setError('');
    if (!email.trim() || !password || !confirm) {
      setError('Please fill in all fields.');
      return;
    }
    if (!email.includes('@') || !email.includes('.')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    try {
      setLoading(true);
      await signUp(email, password);
      setDone(true);
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

  // ── Confirmation screen ──────────────────────────────────────────────────────
  if (done) {
    return (
      <SafeAreaView style={s.root}>
        <View style={s.doneWrap}>
          <View style={s.doneIconWrap}>
            <View style={s.doneIconGlow} />
            <Text style={s.doneIconEmoji}>📬</Text>
          </View>
          <Text style={s.doneTitle}>Check your inbox</Text>
          <Text style={s.doneSub}>
            We sent a confirmation link to
          </Text>
          <Text style={s.doneEmail}>{email}</Text>
          <Text style={s.doneSub2}>
            Tap the link to activate your account, then come back and sign in.
          </Text>
          <TouchableOpacity
            style={s.doneBtn}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={s.doneBtnText}>Go to sign in</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ── Sign-up form ─────────────────────────────────────────────────────────────
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

          <Text style={s.heading}>Create account</Text>
          <Text style={s.sub}>Start tracking your routine</Text>

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
                placeholder="Password (8+ characters)"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showPw}
                autoComplete="new-password"
              />
              <TouchableOpacity onPress={() => setShowPw(p => !p)} hitSlop={8}>
                <Text style={s.eyeBtn}>{showPw ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {/* Confirm password */}
            <View style={inputStyle('confirm')}>
              <Text style={s.inputIcon}>🔒</Text>
              <TextInput
                style={s.inputText}
                value={confirm}
                onChangeText={setConfirm}
                onFocus={() => setFocused('confirm')}
                onBlur={() => setFocused(null)}
                placeholder="Confirm password"
                placeholderTextColor={theme.textMuted}
                secureTextEntry={!showCf}
                autoComplete="new-password"
              />
              <TouchableOpacity onPress={() => setShowCf(p => !p)} hitSlop={8}>
                <Text style={s.eyeBtn}>{showCf ? '🙈' : '👁'}</Text>
              </TouchableOpacity>
            </View>

            {/* Inline error */}
            {error ? (
              <View style={s.errorWrap}>
                <Text style={s.errorText}>⚠ {error}</Text>
              </View>
            ) : null}

            {/* Submit */}
            <TouchableOpacity
              style={[s.primaryBtn, loading && s.primaryBtnLoading]}
              onPress={handleSignup}
              disabled={loading || googleL}
              activeOpacity={0.85}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={s.primaryBtnText}>Create account</Text>
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
            <Text style={s.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <Text style={s.footerLink}>Sign in</Text>
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
  },

  form: { gap: 12 },

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

  errorWrap: {
    backgroundColor: `${theme.error}18`,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: `${theme.error}40`,
  },
  errorText: { color: theme.error, fontSize: 14, lineHeight: 20 },

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
  primaryBtnText:    { color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 0.2 },

  divider: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 4 },
  dividerLine: { flex: 1, height: 1, backgroundColor: theme.border },
  dividerText: { color: theme.textMuted, fontSize: 13 },

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

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 36 },
  footerText: { color: theme.textMuted, fontSize: 15 },
  footerLink: { color: theme.primary, fontSize: 15, fontWeight: '700' },

  // Done state
  doneWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  doneIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  doneIconGlow: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.primary,
    opacity: 0.15,
  },
  doneIconEmoji: { fontSize: 60 },
  doneTitle: { fontSize: 26, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.3 },
  doneSub:   { fontSize: 15, color: theme.textMuted, textAlign: 'center' },
  doneEmail: { fontSize: 15, color: theme.primary, fontWeight: '600' },
  doneSub2:  { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 22, marginTop: -4 },
  doneBtn: {
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
    marginTop: 12,
    shadowColor: theme.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  doneBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
