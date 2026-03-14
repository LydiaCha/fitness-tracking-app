import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle,
  withRepeat, withTiming, withDelay,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { Logo } from '@/components/Logo';

// ─── Animated ring component ──────────────────────────────────────────────────
function Ring({
  size, color, delay, startAngle = 0,
}: {
  size: number; color: string; delay: number; startAngle?: number;
}) {
  const rotate = useSharedValue(startAngle);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: 600 }));
    rotate.value = withDelay(
      delay,
      withRepeat(
        withTiming(startAngle + 360, { duration: 8000, easing: Easing.linear }),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotate.value}deg` }],
    opacity: opacity.value,
  }));

  const r = size / 2;

  return (
    <Animated.View
      style={[
        style,
        {
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: r,
          borderWidth: 3,
          borderColor: color,
          // Only show ~75% of the ring arc via overflow + clip trick
          borderTopColor: 'transparent',
        },
      ]}
    />
  );
}

// ─── Hero visual ─────────────────────────────────────────────────────────────
function FitnessRings({ theme }: { theme: AppThemeType }) {
  const scale = useSharedValue(0.85);

  useEffect(() => {
    scale.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[pulseStyle, { width: 180, height: 180, alignItems: 'center', justifyContent: 'center' }]}>
      {/* Outer glow */}
      <View style={{
        position: 'absolute',
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: theme.primary,
        opacity: 0.06,
      }} />
      {/* Rings — outer to inner, different speeds/colors */}
      <Ring size={170} color={theme.gym}        delay={0}    startAngle={45}  />
      <Ring size={128} color={theme.primary}    delay={150}  startAngle={180} />
      <Ring size={86}  color={theme.secondary}  delay={300}  startAngle={270} />
      {/* Center icon */}
      <View style={{
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: theme.bgCardAlt,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: theme.border,
      }}>
        <Text style={{ fontSize: 26 }}>⚡</Text>
      </View>
    </Animated.View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────
export default function WelcomeScreen() {
  const { theme } = useAppTheme();
  const router = useRouter();
  const s = styles(theme);

  return (
    <SafeAreaView style={s.root}>
      {/* Background glows */}
      <View style={s.glowTop}    pointerEvents="none" />
      <View style={s.glowBottom} pointerEvents="none" />

      {/* Hero */}
      <View style={s.hero}>
        <FitnessRings theme={theme} />
        <View style={s.heroText}>
          <View style={s.logoRow}>
            <Logo size={40} />
            <Text style={s.title}>PeakRoutine</Text>
          </View>
          <Text style={s.subtitle}>Your daily routine, perfected.</Text>
        </View>
      </View>

      {/* Feature pills */}
      <View style={s.pills}>
        {['🏋️ Workouts', '🥗 Nutrition', '💊 Supplements'].map(label => (
          <View key={label} style={s.pill}>
            <Text style={s.pillText}>{label}</Text>
          </View>
        ))}
      </View>

      {/* Actions */}
      <View style={s.actions}>
        <TouchableOpacity
          onPress={() => router.push('/(auth)/signup')}
          activeOpacity={0.85}
          style={s.primaryBtnWrap}
        >
          <LinearGradient
            colors={['#a855f7', '#7c3aed', '#22d3ee']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.primaryBtn}
          >
            <Text style={s.primaryBtnText}>Get Started  →</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.secondaryBtn}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.7}
        >
          <Text style={s.secondaryBtnText}>
            Already have an account?{' '}
            <Text style={s.secondaryBtnAccent}>Sign in</Text>
          </Text>
        </TouchableOpacity>

        <Text style={s.terms}>
          By continuing you agree to our Terms of Service and Privacy Policy.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = (theme: AppThemeType) => StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: 28,
    paddingBottom: 32,
    overflow: 'hidden',
  },

  glowTop: {
    position: 'absolute',
    top: -180,
    alignSelf: 'center',
    width: 420,
    height: 420,
    borderRadius: 210,
    backgroundColor: theme.primary,
    opacity: 0.07,
  },
  glowBottom: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: theme.secondary,
    opacity: 0.05,
  },

  // Hero
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  heroText: { alignItems: 'center', gap: 10 },
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: theme.textPrimary,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 16,
    color: theme.textMuted,
    letterSpacing: 0.2,
  },

  // Feature pills
  pills: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 28,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: theme.bgCardAlt,
    borderWidth: 1,
    borderColor: theme.border,
  },
  pillText: {
    fontSize: 12,
    color: theme.textSecondary,
    fontWeight: '500',
  },

  // Actions
  actions: { gap: 12, alignItems: 'center' },
  primaryBtnWrap: {
    alignSelf: 'stretch',
    shadowColor: '#7c3aed',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 10,
  },
  primaryBtn: {
    borderRadius: 18,
    paddingVertical: 18,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  secondaryBtn: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    color: theme.textMuted,
  },
  secondaryBtnAccent: {
    color: theme.primaryLight,
    fontWeight: '600',
  },

  terms: {
    fontSize: 11,
    color: theme.textMuted,
    textAlign: 'center',
    lineHeight: 16,
    marginTop: 2,
    opacity: 0.6,
  },
});
