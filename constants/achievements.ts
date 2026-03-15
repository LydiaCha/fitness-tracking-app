export type AchievementData = {
  workoutStreak:   number;  // current streak
  totalWorkouts:   number;  // all-time workout days
  mealLogDays:     number;  // days with at least one meal logged
  waterLogDays:    number;  // days with water logged
  supplementDays:  number;  // days with habits logged
  weightEntries:   number;  // total weight log entries
  profileComplete: boolean; // has set height/weight/goal
};

export type Achievement = {
  id:          string;
  emoji:       string;
  name:        string;
  description: string;
  unlocked:    (d: AchievementData) => boolean;
};

export const ACHIEVEMENTS: Achievement[] = [
  // ── Workout streaks ──────────────────────────────────────────────────────
  {
    id: 'first_workout',
    emoji: '💪',
    name: 'First Sweat',
    description: 'Log your first workout',
    unlocked: d => d.totalWorkouts >= 1,
  },
  {
    id: 'streak_3',
    emoji: '🔥',
    name: 'On Fire',
    description: '3-day workout streak',
    unlocked: d => d.workoutStreak >= 3,
  },
  {
    id: 'streak_7',
    emoji: '⚡',
    name: 'Week Warrior',
    description: '7-day workout streak',
    unlocked: d => d.workoutStreak >= 7,
  },
  {
    id: 'streak_14',
    emoji: '🏅',
    name: 'Fortnight',
    description: '14-day workout streak',
    unlocked: d => d.workoutStreak >= 14,
  },
  {
    id: 'streak_30',
    emoji: '🏆',
    name: 'Monthly Hero',
    description: '30-day workout streak',
    unlocked: d => d.workoutStreak >= 30,
  },
  {
    id: 'streak_100',
    emoji: '👑',
    name: 'Century',
    description: '100-day workout streak',
    unlocked: d => d.workoutStreak >= 100,
  },
  // ── Nutrition ────────────────────────────────────────────────────────────
  {
    id: 'first_meal',
    emoji: '🥗',
    name: 'First Bite',
    description: 'Log your first meal',
    unlocked: d => d.mealLogDays >= 1,
  },
  {
    id: 'meal_7',
    emoji: '🍽️',
    name: 'Consistent Eater',
    description: 'Log meals for 7 days',
    unlocked: d => d.mealLogDays >= 7,
  },
  // ── Hydration ────────────────────────────────────────────────────────────
  {
    id: 'first_water',
    emoji: '💧',
    name: 'Hydrated',
    description: 'Log water for the first time',
    unlocked: d => d.waterLogDays >= 1,
  },
  {
    id: 'water_7',
    emoji: '🌊',
    name: 'Flow State',
    description: 'Track water for 7 days',
    unlocked: d => d.waterLogDays >= 7,
  },
  // ── Supplements ──────────────────────────────────────────────────────────
  {
    id: 'first_supplement',
    emoji: '💊',
    name: 'Supplement Starter',
    description: 'Track supplements for the first time',
    unlocked: d => d.supplementDays >= 1,
  },
  // ── Weight ───────────────────────────────────────────────────────────────
  {
    id: 'first_weight',
    emoji: '⚖️',
    name: 'Weigh In',
    description: 'Log your first weight entry',
    unlocked: d => d.weightEntries >= 1,
  },
  {
    id: 'weight_10',
    emoji: '📈',
    name: 'Tracking Progress',
    description: 'Log 10 weight entries',
    unlocked: d => d.weightEntries >= 10,
  },
  // ── Profile ──────────────────────────────────────────────────────────────
  {
    id: 'profile_complete',
    emoji: '🎯',
    name: 'All Set Up',
    description: 'Complete your profile',
    unlocked: d => d.profileComplete,
  },
];
