import React, { useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
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
import { createWelcomeStyles } from '@/styles/welcome.styles';

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
  const s = useMemo(() => createWelcomeStyles(theme), [theme]);

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
