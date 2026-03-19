import React, { useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, ScrollView, StatusBar, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { AppThemeType } from '@/constants/theme';
import { STORAGE_KEYS } from '@/utils/appConstants';
import { safeMultiRemove } from '@/utils/storage';
import { logger } from '@/utils/logger';

function useStyles(theme: AppThemeType) {
  return useMemo(() => StyleSheet.create({
    safe:         { flex: 1, backgroundColor: theme.bg },
    headerRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    backBtn:      { marginRight: 12, padding: 4 },
    headerTitle:  { fontSize: 22, fontWeight: '800', color: theme.textPrimary },

    content:      { paddingHorizontal: 16, paddingBottom: 48 },
    sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 20 },
    card:         { backgroundColor: theme.bgCard, borderRadius: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },

    row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border + '55' },
    rowLast:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    rowIcon:      { fontSize: 18, width: 32 },
    rowLabel:     { flex: 1, fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
    rowSub:       { fontSize: 12, color: theme.textMuted, marginTop: 1 },
    chevron:      { fontSize: 16, color: theme.textMuted },

    rowSwitchLast:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },

    dangerText:   { color: theme.error },
    signOutText:  { flex: 1, fontSize: 15, fontWeight: '600', color: theme.error },
    versionText:  { fontSize: 12, color: theme.textMuted, textAlign: 'center', marginTop: 24 },
  }), [theme]);
}

export default function SettingsScreen() {
  const { theme, isDark, toggleTheme } = useAppTheme();
  const { signOut } = useAuth();
  const router = useRouter();
  const s = useStyles(theme);

  const clearData = useCallback((label: string, keys: string[], onDone?: () => void) => {
    Alert.alert(`Clear ${label}?`, 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        const removed = await safeMultiRemove(keys);
        if (removed < keys.length) {
          Alert.alert('Partial clear', 'Some data could not be removed. Please try again.');
        }
        onDone?.();
      }},
    ]);
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => {
        try {
          await signOut();
        } catch (e) {
          logger.error('auth', 'signOut', 'Sign out failed', { error: String(e) });
          Alert.alert('Error', 'Could not sign out. Please try again.');
        }
      }},
    ]);
  }, [signOut]);

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={s.headerRow}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Settings</Text>
      </View>

      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Appearance ── */}
        <Text style={s.sectionLabel}>Appearance</Text>
        <View style={s.card}>
          <View style={s.rowSwitchLast}>
            <Text style={s.rowIcon}>{isDark ? '🌙' : '☀️'}</Text>
            <Text style={s.rowLabel}>{isDark ? 'Dark mode' : 'Light mode'}</Text>
            <Switch
              value={isDark}
              onValueChange={toggleTheme}
              trackColor={{ false: theme.border, true: theme.primary + '88' }}
              thumbColor={isDark ? theme.primary : theme.textMuted}
            />
          </View>
        </View>

        {/* ── Data & Privacy ── */}
        <Text style={s.sectionLabel}>Data & Privacy</Text>
        <View style={s.card}>
          {[
            { icon: '🍽️', label: 'Clear meal logs',           keys: [STORAGE_KEYS.MEAL_LOGS] },
            { icon: '⚖️', label: 'Clear weight log',           keys: [STORAGE_KEYS.WEIGHTS] },
            { icon: '💪', label: 'Clear workout & water logs', keys: [STORAGE_KEYS.WORKOUTS, STORAGE_KEYS.WATER_GOAL, STORAGE_KEYS.WATER_ML] },
            { icon: '🗄️', label: 'Clear AI & barcode cache',   keys: [STORAGE_KEYS.AI_MEALS, STORAGE_KEYS.BARCODE_CACHE] },
          ].map(({ icon, label, keys }, i, arr) => (
            <TouchableOpacity
              key={label}
              style={i < arr.length - 1 ? s.row : s.rowLast}
              onPress={() => clearData(label.replace('Clear ', ''), keys)}
              activeOpacity={0.7}
            >
              <Text style={s.rowIcon}>{icon}</Text>
              <Text style={[s.rowLabel, s.dangerText]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Account ── */}
        <Text style={s.sectionLabel}>Account</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.rowLast} onPress={handleSignOut} activeOpacity={0.7}>
            <Text style={s.rowIcon}>👋</Text>
            <Text style={s.signOutText}>Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Support ── */}
        <Text style={s.sectionLabel}>Support</Text>
        <View style={s.card}>
          <TouchableOpacity style={s.rowLast} onPress={() => router.push('/feedback')} activeOpacity={0.7}>
            <Text style={s.rowIcon}>💬</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.rowLabel}>Send feedback</Text>
              <Text style={s.rowSub}>Share a rating and message</Text>
            </View>
            <Text style={s.chevron}>›</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.versionText}>PeakRoutine v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
