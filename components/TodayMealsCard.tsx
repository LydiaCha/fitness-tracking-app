import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MealType } from '@/types/meal';
import { useMealPlan } from '@/context/MealPlanContext';
import { getTodayMonFirst } from '@/utils/appConstants';
import { IndexStyles } from '@/app/(tabs)/index.styles';
import { AppThemeType } from '@/constants/theme';

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'smoothie'];

const MEAL_META: Record<MealType, { label: string; emoji: string; color: string }> = {
  breakfast: { label: 'Breakfast', emoji: '☀️', color: '#FF9F0A' },
  lunch:     { label: 'Lunch',     emoji: '🥗', color: '#30D158' },
  dinner:    { label: 'Dinner',    emoji: '🌙', color: '#0A84FF' },
  snack:     { label: 'Snack',     emoji: '🍎', color: '#BF5AF2' },
  smoothie:  { label: 'Smoothie',  emoji: '🥤', color: '#32D9CB' },
};

export function TodayMealsCard({
  theme,
  s,
}: {
  theme: AppThemeType;
  s: IndexStyles;
}) {
  const { weeklyPlan, getEntriesForDay, getMealById } = useMealPlan();
  const [expandedType, setExpandedType] = useState<MealType | null>(null);

  const todayIndex = useMemo(getTodayMonFirst, []);

  const entries = useMemo(
    () => [...getEntriesForDay(todayIndex)].sort(
      (a, b) => MEAL_ORDER.indexOf(a.slot.mealType) - MEAL_ORDER.indexOf(b.slot.mealType),
    ),
    [getEntriesForDay, todayIndex],
  );

  const totalKcal = useMemo(
    () => Math.round(entries.reduce((sum, e) => sum + e.actualCalories, 0)),
    [entries],
  );

  if (weeklyPlan.length === 0 || entries.length === 0) return null;

  return (
    <View style={s.todayMealsCard}>
      {/* Header */}
      <View style={s.todayMealsHeader}>
        <Text style={s.todayMealsTitle}>Today's Meals</Text>
        <Text style={s.todayMealsTotalKcal}>{totalKcal} kcal total</Text>
      </View>

      {/* Meal rows */}
      {entries.map((entry, index) => {
        const meal     = getMealById(entry.mealId);
        if (!meal) return null;

        const type     = entry.slot.mealType;
        const meta     = MEAL_META[type];
        const kcal     = Math.round(entry.actualCalories);
        const protein  = Math.round(entry.actualProtein);
        const carbs    = Math.round(meal.carbs  * entry.portionMultiplier);
        const fat      = Math.round(meal.fat    * entry.portionMultiplier);
        const isLast   = index === entries.length - 1;
        const expanded = expandedType === type;

        return (
          <View key={`${type}-${entry.mealId}`}>
            {index > 0 && <View style={s.todayMealDivider} />}

            <TouchableOpacity
              style={s.todayMealRow}
              onPress={() => setExpandedType(expanded ? null : type)}
              activeOpacity={0.7}>

              {/* Meal type pill */}
              <View style={[s.todayMealPill, { backgroundColor: meta.color + '22' }]}>
                <Text style={s.todayMealEmoji}>{meta.emoji}</Text>
                <Text style={[s.todayMealPillLabel, { color: meta.color }]}>{meta.label}</Text>
              </View>

              {/* Meal name */}
              <Text style={s.todayMealName} numberOfLines={1}>{meal.name}</Text>

              {/* Kcal + chevron */}
              <Text style={s.todayMealKcal}>{kcal} kcal</Text>
              <Text style={[s.todayMealChevron, expanded && s.todayMealChevronOpen]}>›</Text>
            </TouchableOpacity>

            {/* Expanded macros */}
            {expanded && (
              <View style={s.todayMealMacros}>
                <View style={s.todayMacroPill}>
                  <Text style={[s.todayMacroValue, { color: theme.primary }]}>{protein}g</Text>
                  <Text style={s.todayMacroLabel}>protein</Text>
                </View>
                <View style={s.todayMacroPill}>
                  <Text style={[s.todayMacroValue, { color: theme.water }]}>{carbs}g</Text>
                  <Text style={s.todayMacroLabel}>carbs</Text>
                </View>
                <View style={s.todayMacroPill}>
                  <Text style={[s.todayMacroValue, { color: theme.supplement }]}>{fat}g</Text>
                  <Text style={s.todayMacroLabel}>fat</Text>
                </View>
                {meal.tip ? (
                  <Text style={s.todayMealTip} numberOfLines={2}>💡 {meal.tip}</Text>
                ) : null}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
