import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { AppTheme } from '@/constants/theme';
import { scheduleAllReminders } from '@/utils/notifications';

// Always dark theme for this app
const LydiaDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: AppTheme.bg,
    card: AppTheme.bgCard,
    border: AppTheme.border,
    primary: AppTheme.primary,
  },
};

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  useEffect(() => {
    // Schedule daily push notifications on first launch
    scheduleAllReminders().catch(() => {/* silently ignore if permission denied */});
  }, []);

  return (
    <ThemeProvider value={LydiaDarkTheme}>
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="day/[id]" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
