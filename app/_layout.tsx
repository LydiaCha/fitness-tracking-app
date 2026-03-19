import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ThemeProvider, useAppTheme } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { MealPlanProvider } from '@/context/MealPlanContext';
import { WorkoutPlanProvider } from '@/context/WorkoutPlanContext';
import { WeeklyPlanProvider } from '@/context/WeeklyPlanContext';
import { UserProfileProvider, useUserProfile } from '@/context/UserProfileContext';
import { scheduleAllReminders } from '@/utils/notifications';
import { pruneOldLogs } from '@/utils/pruneStorage';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AuthGate() {
  const { session, loading, onboardingComplete, isLocked } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuth        = segments[0] === '(auth)';
    const inOnboarding  = segments[0] === '(onboarding)';
    const inBiometric   = segments[0] === 'biometric-gate';

    if (!session) {
      if (!inAuth) router.replace('/(auth)/welcome');
      return;
    }

    if (isLocked) {
      if (!inBiometric) router.replace('/biometric-gate');
      return;
    }

    if (!onboardingComplete) {
      if (!inOnboarding) router.replace('/(onboarding)/step-1');
      return;
    }

    if (inAuth || inOnboarding || inBiometric) {
      router.replace('/(tabs)');
    }
  }, [session, loading, onboardingComplete, isLocked, segments]);

  return null;
}

function AppNavigator() {
  const { theme, isDark } = useAppTheme();
  const { profile } = useUserProfile();

  const navTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      background: theme.bg,
      card: theme.bgCard,
      border: theme.border,
      primary: theme.primary,
    },
  };

  useEffect(() => {
    pruneOldLogs().catch((err) => console.warn('[Layout] pruneOldLogs:', err));
  }, []);

  // Re-schedule notifications whenever the profile changes (e.g. sleep time updated)
  useEffect(() => {
    scheduleAllReminders(profile).catch((err) => console.warn('[Layout] scheduleAllReminders:', err));
  }, [profile]);

  return (
    <NavThemeProvider value={navTheme}>
      <AuthGate />
      <Stack>
        <Stack.Screen name="(tabs)"          options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"          options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)"    options={{ headerShown: false }} />
        <Stack.Screen name="biometric-gate"  options={{ headerShown: false }} />
        <Stack.Screen name="day/[id]"        options={{ headerShown: false }} />
        <Stack.Screen name="feedback"        options={{ headerShown: false }} />
        <Stack.Screen name="settings"        options={{ headerShown: false }} />
        <Stack.Screen name="food-preferences" options={{ headerShown: false }} />
        <Stack.Screen name="my-schedule"      options={{ headerShown: false }} />
        <Stack.Screen name="my-health"        options={{ headerShown: false }} />
        <Stack.Screen name="auth/callback"   options={{ headerShown: false }} />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <UserProfileProvider>
            <MealPlanProvider>
              <WorkoutPlanProvider>
              <WeeklyPlanProvider>
                <AppNavigator />
              </WeeklyPlanProvider>
              </WorkoutPlanProvider>
            </MealPlanProvider>
          </UserProfileProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
