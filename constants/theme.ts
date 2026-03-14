/**
 * Lydia Schedule App — Theme tokens
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: '#a855f7',
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: '#a855f7',
  },
  dark: {
    text: '#F0F0FF',
    background: '#0D0D1A',
    tint: '#a855f7',
    icon: '#8B8BAD',
    tabIconDefault: '#8B8BAD',
    tabIconSelected: '#a855f7',
  },
};

export const AppThemeDark = {
  bg: '#0D0D1A',
  bgCard: '#16162A',
  bgCardAlt: '#1E1E38',
  border: '#2A2A4A',
  primary: '#a855f7',
  primaryLight: '#d8b4fe',
  secondary: '#22d3ee',
  secondaryLight: '#a5f3fc',
  gym: '#f43f5e',
  class: '#3b82f6',
  sleep: '#7c3aed',
  work: '#475569',
  meal: '#22c55e',
  shake: '#06b6d4',
  supplement: '#f59e0b',
  rest: '#6366f1',
  yoga: '#10b981',
  water: '#38bdf8',
  wake: '#fbbf24',
  prep: '#94a3b8',
  free: '#64748b',
  textPrimary: '#F0F0FF',
  textSecondary: '#94A3C0',
  textMuted: '#5A5A7A',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
};

export const AppThemeLight = {
  bg: '#F8F9FA',
  bgCard: '#FFFFFF',
  bgCardAlt: '#F2F2F7',
  border: '#E2E8F0',
  primary: '#a855f7',
  primaryLight: '#7e22ce',
  secondary: '#0891b2',
  secondaryLight: '#0e7490',
  gym: '#e11d48',
  class: '#2563eb',
  sleep: '#6d28d9',
  work: '#334155',
  meal: '#16a34a',
  shake: '#0284c7',
  supplement: '#d97706',
  rest: '#4f46e5',
  yoga: '#059669',
  water: '#0284c7',
  wake: '#d97706',
  prep: '#64748b',
  free: '#475569',
  textPrimary: '#1A1A2E',
  textSecondary: '#4A5568',
  textMuted: '#9CA3AF',
  success: '#16a34a',
  warning: '#d97706',
  error: '#dc2626',
};

// Backwards-compatible alias — always dark; use useAppTheme() for dynamic theming
export const AppTheme = AppThemeDark;

export type AppThemeType = typeof AppThemeDark;

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
