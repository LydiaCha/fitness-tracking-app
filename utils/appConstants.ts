// Shared constants used across multiple screens

export const DAYS = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday',
] as const;

export function getTodayId(): string {
  return DAYS[new Date().getDay()];
}

export const STORAGE_KEYS = {
  WORKOUTS: '@lydia/workouts',
  WATER:    '@lydia/water',
  WEIGHTS:  '@lydia/weights',
} as const;

// Mon Tue Wed Thu Sat
export const GYM_DAYS = [1, 2, 3, 4, 6];

export function toKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isGymDay(d: Date): boolean {
  return GYM_DAYS.includes(d.getDay());
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
