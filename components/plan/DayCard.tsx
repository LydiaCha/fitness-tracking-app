import React, { useMemo } from 'react';
import { View, Text } from 'react-native';
import { MealPlanEntry, MealRecord, MealType } from '@/types/meal';
import { PlanStyles } from '@/app/(tabs)/plan.styles';

const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_NAMES    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'smoothie'];

function portionLabel(multiplier: number): string | null {
  if (multiplier <= 0.8)  return 'Small portion';
  if (multiplier >= 1.4)  return 'Double portion';
  if (multiplier >= 1.15) return 'Large portion';
  return null;
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  snack:     'Snack',
  smoothie:  'Smoothie',
};

const MEAL_TYPE_COLORS: Record<MealType, string> = {
  breakfast: '#FF9F0A',
  lunch:     '#30D158',
  dinner:    '#0A84FF',
  snack:     '#BF5AF2',
  smoothie:  '#32D9CB',
};

export function DayCard({
  day,
  date,
  isToday,
  getEntriesForDay,
  getMealById,
  s,
}: {
  day: number;
  date: Date;
  isToday: boolean;
  getEntriesForDay: (d: number) => MealPlanEntry[];
  getMealById: (id: string) => MealRecord | undefined;
  s: PlanStyles;
}) {
  const entries = getEntriesForDay(day);

  const sortedEntries = useMemo(
    () => [...entries].sort(
      (a, b) => MEAL_ORDER.indexOf(a.slot.mealType) - MEAL_ORDER.indexOf(b.slot.mealType),
    ),
    [entries],
  );

  const totalKcal = Math.round(entries.reduce((sum, e) => sum + e.actualCalories, 0));
  const dateLabel = `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;

  return (
    <View style={[s.dayCard, isToday && s.dayCardToday]}>
      <View style={[s.dayHeader, isToday && s.dayHeaderToday]}>
        <Text style={s.dayName}>{FULL_DAY_NAMES[day]}</Text>
        <Text style={s.dayDate}>{dateLabel}</Text>
        {isToday && (
          <View style={s.todayBadge}>
            <Text style={s.todayBadgeText}>TODAY</Text>
          </View>
        )}
        {totalKcal > 0 && <Text style={s.dayKcal}>{totalKcal} kcal</Text>}
      </View>

      {sortedEntries.map(entry => {
        const meal    = getMealById(entry.mealId);
        if (!meal) return null;
        const kcal    = Math.round(entry.actualCalories);
        const protein = Math.round(entry.actualProtein);
        const color   = MEAL_TYPE_COLORS[entry.slot.mealType];
        const portion = portionLabel(entry.portionMultiplier);
        return (
          <View key={`${entry.slot.day}-${entry.slot.mealType}-${entry.mealId}`} style={s.mealEntryRow}>
            <View style={[s.mealTypePill, { backgroundColor: color + '22' }]}>
              <Text style={[s.mealTypePillText, { color }]}>
                {MEAL_TYPE_LABELS[entry.slot.mealType]}
              </Text>
            </View>
            <View style={s.mealEntryInfo}>
              <Text style={s.mealEntryName} numberOfLines={1}>{meal.name}</Text>
              <View style={s.mealEntryMeta}>
                <Text style={s.mealEntryMetaText}>{kcal} kcal · {protein}g protein</Text>
                {portion && (
                  <View style={s.mealPortionBadge}>
                    <Text style={s.mealPortionText}>{portion}</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
