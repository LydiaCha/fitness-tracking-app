import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, SafeAreaView, Alert,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useAuth } from '@/context/AuthContext';
import { biometricLabel } from '@/utils/biometric';
import { logger } from '@/utils/logger';

export default function BiometricGate() {
  const { theme } = useAppTheme();
  const { biometricType, unlock, skipBiometric, signOut } = useAuth();
  const [loading,    setLoading]    = useState(false);
  const [failCount,  setFailCount]  = useState(0);

  const label = biometricLabel(biometricType);

  useEffect(() => {
    handleUnlock();
  }, []);

  const handleUnlock = async () => {
    setLoading(true);
    try {
      const success = await unlock();
      if (!success) {
        setFailCount(prev => prev + 1);
      }
    } catch (e) {
      logger.error('biometric', 'unlock', 'Unexpected error during unlock attempt', { error: String(e) });
      setFailCount(prev => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (e) {
      logger.error('auth', 'signOut', 'Sign-out failed from biometric gate', { error: String(e) });
      Alert.alert('Sign-out failed', 'Please try again.');
    }
  };

  const s = styles(theme);

  return (
    <SafeAreaView style={s.root}>
      <View style={s.center}>
        <Text style={s.icon}>
          {biometricType === 'facial' ? '👁' : '👆'}
        </Text>
        <Text style={s.title}>App locked</Text>
        <Text style={s.sub}>Use {label} to continue</Text>

        {failCount >= 3 && (
          <View style={s.hintWrap}>
            <Text style={s.hintText}>
              Having trouble? Use Skip below or Sign out and re-enter your password.
            </Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color={theme.primary} size="large" style={{ marginTop: 32 }} />
        ) : (
          <TouchableOpacity style={s.unlockBtn} onPress={handleUnlock}>
            <Text style={s.unlockText}>Unlock with {label}</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={s.footer}>
        <TouchableOpacity onPress={skipBiometric}>
          <Text style={s.skipText}>Skip for now</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleSignOut}>
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = (theme: AppThemeType) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  icon:  { fontSize: 72, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: theme.textPrimary },
  sub:   { fontSize: 16, color: theme.textMuted },

  hintWrap: {
    marginTop: 8,
    backgroundColor: `${theme.warning}18`,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: `${theme.warning}40`,
    maxWidth: 280,
  },
  hintText: {
    color: theme.warning,
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },

  unlockBtn: {
    marginTop: 28,
    backgroundColor: theme.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  unlockText: { color: '#fff', fontSize: 17, fontWeight: '600' },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  skipText:    { color: theme.textMuted, fontSize: 15 },
  signOutText: { color: theme.error, fontSize: 15 },
});
