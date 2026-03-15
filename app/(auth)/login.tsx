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
import { createLoginStyles } from './login.styles';

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

  const s = useMemo(() => createLoginStyles(theme), [theme]);

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
