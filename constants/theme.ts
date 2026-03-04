/**
 * Lydia Schedule App — Dark Fitness Theme
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

// App-wide design tokens — always dark
export const AppTheme = {
  bg: '#0D0D1A',
  bgCard: '#16162A',
  bgCardAlt: '#1E1E38',
  border: '#2A2A4A',
  primary: '#a855f7',      // purple
  primaryLight: '#d8b4fe',
  secondary: '#22d3ee',    // cyan
  secondaryLight: '#a5f3fc',
  gym: '#f43f5e',          // rose/red
  class: '#3b82f6',        // blue
  sleep: '#7c3aed',        // dark purple
  work: '#475569',         // slate
  meal: '#22c55e',         // green
  shake: '#06b6d4',        // cyan
  supplement: '#f59e0b',   // amber
  rest: '#6366f1',         // indigo
  yoga: '#10b981',         // emerald
  water: '#38bdf8',        // sky
  wake: '#fbbf24',         // amber/gold
  prep: '#94a3b8',         // cool grey
  free: '#64748b',         // slate
  textPrimary: '#F0F0FF',
  textSecondary: '#94A3C0',
  textMuted: '#5A5A7A',
  success: '#4ade80',
  warning: '#fbbf24',
  error: '#f87171',
};

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
