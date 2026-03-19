/**
 * PeakRoutine — Theme tokens
 */

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

/**
 * App-wide typography scale. Font sizes and weights are theme-independent
 * (they don't change between light/dark mode), so they live here rather than
 * inside the theme objects.
 *
 * Semantic size names:
 *   pageHeading  — main screen / modal title (26)
 *   cardTitle    — card section title (16)
 *   body         — default list rows, labels (15)
 *   bodySmall    — secondary / muted supporting text (13)
 *   label        — small-caps section dividers (11, uppercase)
 *   micro        — badge / tag text (10)
 *
 * Pre-composed patterns:
 *   sectionLabel — the uppercase small-caps label used above content groups
 */
export const typography = {
  sizes: {
    pageHeading: 26,
    cardTitle:   16,
    body:        15,
    bodySmall:   13,
    label:       11,
    micro:       10,
  },
  weights: {
    black:    '900' as const,
    heavy:    '800' as const,
    bold:     '700' as const,
    semibold: '600' as const,
    medium:   '500' as const,
  },
  /** Standard small-caps section label — use this object spread in StyleSheet */
  sectionLabel: {
    fontSize:      11,
    fontWeight:    '700' as const,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.8,
  },
} as const;

