import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { MealPlanEntry, MealIngredient, MealRecord, MealType, MEAL_ORDER } from '@/types/meal';
import { WeekStyles } from '@/app/(tabs)/week.styles';

const FULL_DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTH_NAMES    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function portionLabel(multiplier: number): string | null {
  if (multiplier <= 0.8)  return 'Small portion';
  if (multiplier >= 1.4)  return 'Double portion';
  if (multiplier >= 1.15) return 'Large portion';
  return null;
}

function formatQty(qty: number): string {
  if (qty === 0.25) return '¼';
  if (qty === 0.33 || qty === 0.334) return '⅓';
  if (qty === 0.5)  return '½';
  if (qty === 0.75) return '¾';
  if (qty % 1 === 0) return String(qty);
  return qty.toString();
}

function formatIngredient(ing: MealIngredient): string {
  const unit = ing.unit === 'piece' ? (ing.quantity === 1 ? '' : 'x') : ing.unit;
  const qty  = formatQty(ing.quantity);
  const base = unit ? `${qty} ${unit} ${ing.name}` : `${qty} ${ing.name}`;
  return ing.prepNote ? `${base} — ${ing.prepNote}` : base;
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch:     'Lunch',
  dinner:    'Dinner',
  snack:     'Snack',
  smoothie:  'Smoothie',
};

import { MEAL_META } from '@/constants/mealColors';

export function DayCard({
  day,
  date,
  isToday,
  isPast,
  getEntriesForDay,
  getMealById,
  s,
}: {
  day: number;
  date: Date;
  isToday: boolean;
  isPast?: boolean;
  getEntriesForDay: (d: number) => MealPlanEntry[];
  getMealById: (id: string) => MealRecord | undefined;
  s: WeekStyles;
}) {
  const entries = getEntriesForDay(day);
  const [collapsed, setCollapsed] = useState(!!isPast);
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());

  const sortedEntries = useMemo(
    () => [...entries].sort(
      (a, b) => MEAL_ORDER.indexOf(a.slot.mealType) - MEAL_ORDER.indexOf(b.slot.mealType),
    ),
    [entries],
  );

  const totalKcal = Math.round(entries.reduce((sum, e) => sum + e.actualCalories, 0));
  const dateLabel = `${MONTH_NAMES[date.getMonth()]} ${date.getDate()}`;

  function toggleExpand(key: string) {
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  return (
    <View style={[s.dayCard, isToday && s.dayCardToday, isPast && !isToday && { opacity: 0.55 }]}>
      <TouchableOpacity
        style={[s.dayHeader, isToday && s.dayHeaderToday]}
        onPress={() => setCollapsed(c => !c)}
        activeOpacity={0.7}
      >
        <Text style={[s.dayName, isPast && !isToday && { opacity: 0.5 }]}>{FULL_DAY_NAMES[day]}</Text>
        <Text style={s.dayDate}>{dateLabel}</Text>
        {isToday && (
          <View style={s.todayBadge}>
            <Text style={s.todayBadgeText}>TODAY</Text>
          </View>
        )}
        {totalKcal > 0 && <Text style={s.dayKcal}>{totalKcal} kcal</Text>}
        <Text style={[s.dayChevron, !collapsed && s.dayChevronOpen]}>›</Text>
      </TouchableOpacity>

      {!collapsed && sortedEntries.map(entry => {
        const meal    = getMealById(entry.mealId);
        if (!meal) return null;
        const key     = `${entry.slot.day}-${entry.slot.mealType}-${entry.mealId}`;
        const kcal    = Math.round(entry.actualCalories);
        const protein = Math.round(entry.actualProtein);
        const color   = MEAL_META[entry.slot.mealType].color;
        const portion = portionLabel(entry.portionMultiplier);
        const expanded = expandedKeys.has(key);
        const hasDetails = meal.ingredients.length > 0 || !!meal.instructions || !!meal.tip;

        return (
          <View key={key}>
            <TouchableOpacity
              onPress={() => hasDetails && toggleExpand(key)}
              activeOpacity={hasDetails ? 0.7 : 1}
              style={s.mealEntryRow}
            >
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
              {hasDetails && (
                <Text style={[s.mealExpandArrow, expanded && s.mealExpandArrowOpen]}>›</Text>
              )}
            </TouchableOpacity>

            {expanded && (
              <View style={s.mealExpandedSection}>
                {meal.ingredients.length > 0 && (
                  <>
                    <Text style={s.mealExpandLabel}>Ingredients</Text>
                    {meal.ingredients.map((ing, i) => (
                      <Text key={i} style={s.mealIngredientText}>
                        • {formatIngredient(ing)}{ing.optional ? ' (optional)' : ''}
                      </Text>
                    ))}
                  </>
                )}
                {!!meal.instructions && (
                  <>
                    <Text style={[s.mealExpandLabel, { marginTop: 10 }]}>Method</Text>
                    <Text style={s.mealInstructionsText}>{meal.instructions}</Text>
                  </>
                )}
                {!!meal.tip && (
                  <View style={s.mealTipBox}>
                    <Text style={s.mealTipText}>💡 {meal.tip}</Text>
                  </View>
                )}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}
