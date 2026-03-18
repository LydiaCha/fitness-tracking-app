import { AppTheme } from '@/constants/theme';

export const EVENT_ICONS: Record<string, string> = {
  wake: '🌅', sleep: '😴', work: '💻', class: '📚', gym: '🏋️',
  meal: '🍽️', snack: '🍎', shake: '🥤', supplement: '💊', water: '💧',
  rest: '☁️', yoga: '🧘', prep: '📋', free: '🌟', 'plan-review': '📅',
};

// Accent colours — identical in both themes, safe to use at module level
export const MEAL_CAT_COLORS: Record<string, string> = {
  'pre-workout':  AppTheme.secondary,
  'post-workout': AppTheme.gym,
  'main':         AppTheme.meal,
  'snack':        AppTheme.supplement,
  'night-shift':  AppTheme.work,
};

export function isBullet(line: string) { return line.trimStart().startsWith('•'); }

export function toggleSetItem(prev: Set<number>, i: number): Set<number> {
  const next = new Set(prev);
  next.has(i) ? next.delete(i) : next.add(i);
  return next;
}
