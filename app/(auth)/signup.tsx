import React, { useState, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, TextInput,
  ActivityIndicator, SafeAreaView, KeyboardAvoidingView,
  Platform, ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getAuthErrorMessage } from '@/utils/errorMessages';
import { createSignupStyles } from './signup.styles';

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

  const s = useMemo(() => createSignupStyles(theme), [theme]);

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
