import { MealType } from '@/types/meal';

export const MEAL_META: Record<MealType, { label: string; emoji: string; color: string }> = {
  breakfast: { label: 'Breakfast', emoji: '☀️', color: '#FF9F0A' },
  lunch:     { label: 'Lunch',     emoji: '🥗', color: '#30D158' },
  dinner:    { label: 'Dinner',    emoji: '🌙', color: '#0A84FF' },
  snack:     { label: 'Snack',     emoji: '🍎', color: '#BF5AF2' },
  smoothie:  { label: 'Smoothie',  emoji: '🥤', color: '#32D9CB' },
};
