// Shared constants and utilities used across the app

export const DAYS = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
] as const;

export function getTodayId(): string {
  return DAYS[new Date().getDay()];
}

/** Single source of truth for all AsyncStorage keys. */
export const STORAGE_KEYS = {
  // Fitness logs
  WORKOUTS:      '@peakroutine/workouts',
  WATER:         '@peakroutine/water',
  WEIGHTS:       '@peakroutine/weights',
  HABITS:        '@peakroutine/habits',
  // Meal tracking
  MEAL_LOGS:     '@peakroutine/meal_logs',
  BARCODE_CACHE: '@peakroutine/barcode_cache',
  AI_MEALS:      '@peakroutine/ai_meals',
  // Settings
  AI_ENABLED:    '@peakroutine/ai_enabled',
  AVATAR:        '@peakroutine/avatar_emoji',
  THEME:         '@peakroutine/theme',
  // Auth / onboarding
  ONBOARDING:    '@peakroutine/onboarding_complete',
  BIOMETRIC:     '@peakroutine/biometric_enabled',
  // Profile
  PROFILE:       '@peakroutine/user_profile',
} as const;

// Default gym days: Mon Tue Wed Thu Sat
export const GYM_DAYS = [1, 2, 3, 4, 6];

export function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isGymDay(d: Date, gymDays?: number[]): boolean {
  return (gymDays ?? GYM_DAYS).includes(d.getDay());
}

export function getWeekDates(): Date[] {
  const today = new Date();
  const sun = new Date(today);
  sun.setDate(today.getDate() - today.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sun);
    d.setDate(sun.getDate() + i);
    return d;
  });
}
