import { DarkTheme, DefaultTheme, ThemeProvider as NavThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { ThemeProvider, useAppTheme } from '@/context/ThemeContext';
import { AuthProvider, useAuth } from '@/context/AuthContext';
import { MealPlanProvider } from '@/context/MealPlanContext';
import { WeeklyPlanProvider } from '@/context/WeeklyPlanContext';
import { scheduleAllReminders } from '@/utils/notifications';
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
    scheduleAllReminders().catch(() => {});
  }, []);

  return (
    <NavThemeProvider value={navTheme}>
      <AuthGate />
      <Stack>
        <Stack.Screen name="(tabs)"          options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"          options={{ headerShown: false }} />
        <Stack.Screen name="(onboarding)"    options={{ headerShown: false }} />
        <Stack.Screen name="biometric-gate"  options={{ headerShown: false }} />
        <Stack.Screen name="day/[id]"   options={{ headerShown: false }} />
        <Stack.Screen name="feedback"        options={{ headerShown: false }} />
        <Stack.Screen name="grocery"          options={{ headerShown: false }} />
        <Stack.Screen name="settings"        options={{ headerShown: false }} />
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
          <MealPlanProvider>
            <WeeklyPlanProvider>
              <AppNavigator />
            </WeeklyPlanProvider>
          </MealPlanProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
