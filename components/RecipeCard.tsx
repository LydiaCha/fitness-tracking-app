import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { createChecklistItemStyles } from './ChecklistItem.styles';
import { toggleSetItem, MEAL_CAT_COLORS } from './checklistUtils';
import { BulletRow } from './BulletRow';
import { ShakeRecipe, Meal, SHAKE_RECIPES, MEAL_IDEAS } from '@/constants/nutritionData';
import { getMeal } from '@/constants/mealDatabase';
import { MealCategory, MealIngredient, MealRecord } from '@/types/meal';

interface Props {
  recipeId: string;
  recipeType: 'shake' | 'meal';
  /** Portion-adjusted macros — overrides the recipe's own values when provided */
  overrideMacros?: { calories: number; protein: number; carbs: number; fat: number };
}

// ─── MealRecord helpers ───────────────────────────────────────────────────────

const CATEGORY_EMOJI: Record<MealCategory, string> = {
  'eggs':        '🍳',
  'oats':        '🌾',
  'yogurt-bowl': '🥣',
  'bowl':        '🥗',
  'wrap':        '🌯',
  'pasta':       '🍝',
  'stir-fry':    '🥘',
  'baked':       '🍗',
  'salad':       '🥗',
  'smoothie':    '🥤',
  'snack-plate': '🍽️',
  'no-cook':     '🥪',
  'pancakes':    '🥞',
  'soup':        '🍲',
  'curry':       '🍛',
  'pan-fry':     '🍳',
};

function formatIngredient(ing: MealIngredient): string {
  const { quantity, unit, name, prepNote } = ing;
  const amount = unit === 'g' || unit === 'ml'
    ? `${quantity}${unit}`
    : unit === 'piece'
      ? `${quantity}×`
      : `${quantity} ${unit}`;
  const note = prepNote ? ` (${prepNote})` : '';
  return `${amount} ${name}${note}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RecipeCard({ recipeId, recipeType, overrideMacros }: Props) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createChecklistItemStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);
  const [crossed, setCrossed] = useState<Set<number>>(new Set());

  // Look up in shake/legacy meal lists first, then the AI meal database
  const legacyRecipe: ShakeRecipe | Meal | undefined = recipeType === 'shake'
    ? SHAKE_RECIPES.find(r => r.id === recipeId)
    : MEAL_IDEAS.find(r => r.id === recipeId);
  const dbMeal: MealRecord | undefined = !legacyRecipe ? getMeal(recipeId) : undefined;

  if (!legacyRecipe && !dbMeal) return null;

  // ── DB meal rendering ─────────────────────────────────────────────────────
  if (dbMeal) {
    const emoji = CATEGORY_EMOJI[dbMeal.category] ?? '🍽️';
    const macros = overrideMacros ?? dbMeal;
    const timing = dbMeal.prepMins <= 5
      ? 'No cook / 5 min'
      : dbMeal.totalMins > dbMeal.prepMins
        ? `${dbMeal.prepMins} min prep · ${dbMeal.totalMins} min total`
        : `${dbMeal.prepMins} min prep`;
    const ingredients = dbMeal.ingredients.map(formatIngredient);

    return (
      <View style={s.rcCard}>
        <TouchableOpacity onPress={() => setExpanded(v => !v)} activeOpacity={0.7} style={s.rcHeader}>
          <Text style={s.rcEmoji}>{emoji}</Text>
          <View style={s.rcInfo}>
            <Text style={s.rcName}>{dbMeal.name}</Text>
            <Text style={s.rcTiming} numberOfLines={1}>{timing}</Text>
          </View>
          <Text style={s.rcArrow}>{expanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        <View style={s.rcMacros}>
          <Text style={[s.rcMacro, { color: theme.meal }]}>🔥 {macros.calories} kcal</Text>
          <Text style={[s.rcMacro, { color: theme.primary }]}>💪 {macros.protein}g</Text>
          <Text style={[s.rcMacro, { color: theme.water }]}>🌾 {macros.carbs}g</Text>
          <Text style={[s.rcMacro, { color: theme.supplement }]}>🧈 {macros.fat}g fat</Text>
        </View>

        {expanded && (
          <View style={s.rcBody}>
            <Text style={s.rcSection}>Ingredients</Text>
            {ingredients.map((ing, i) => (
              <BulletRow
                key={i}
                text={ing}
                isCrossed={crossed.has(i)}
                onPress={() => setCrossed(prev => toggleSetItem(prev, i))}
                successColor={theme.success}
                s={s}
              />
            ))}
            {!!dbMeal.instructions && (
              <>
                <Text style={[s.rcSection, { marginTop: 10 }]}>Method</Text>
                <Text style={s.rcMethod}>{dbMeal.instructions}</Text>
              </>
            )}
            {dbMeal.tip && (
              <View style={s.rcTip}>
                <Text style={s.rcTipText}>💡 {dbMeal.tip}</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  }

  // ── Legacy recipe rendering (shake / MEAL_IDEAS) ──────────────────────────
  const recipe = legacyRecipe!;
  const catColor = recipeType === 'meal'
    ? (MEAL_CAT_COLORS[(recipe as Meal).category] ?? theme.primary)
    : null;
  const macros = overrideMacros ?? recipe;

  return (
    <View style={s.rcCard}>
      <TouchableOpacity onPress={() => setExpanded(v => !v)} activeOpacity={0.7} style={s.rcHeader}>
        <Text style={s.rcEmoji}>{recipe.emoji}</Text>
        <View style={s.rcInfo}>
          <Text style={s.rcName}>{recipe.name}</Text>
          <Text style={s.rcTiming} numberOfLines={1}>{recipe.timing}</Text>
        </View>
        {recipeType === 'meal' && catColor && (
          <View style={{ borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, backgroundColor: catColor + '30', borderColor: catColor }}>
            <Text style={{ fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: catColor }}>
              {(recipe as Meal).category.replace('-', ' ')}
            </Text>
          </View>
        )}
        <Text style={s.rcArrow}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      <View style={s.rcMacros}>
        <Text style={[s.rcMacro, { color: theme.meal }]}>🔥 {macros.calories} kcal</Text>
        <Text style={[s.rcMacro, { color: theme.primary }]}>💪 {macros.protein}g</Text>
        <Text style={[s.rcMacro, { color: theme.water }]}>🌾 {macros.carbs}g</Text>
        <Text style={[s.rcMacro, { color: theme.supplement }]}>🧈 {macros.fat}g fat</Text>
      </View>

      {expanded && (
        <View style={s.rcBody}>
          <Text style={s.rcSection}>Ingredients</Text>
          {recipe.ingredients.map((ing, i) => (
            <BulletRow
              key={i}
              text={ing}
              isCrossed={crossed.has(i)}
              onPress={() => setCrossed(prev => toggleSetItem(prev, i))}
              successColor={theme.success}
              s={s}
            />
          ))}
          {!!(recipe as ShakeRecipe | Meal).instructions && (
            <>
              <Text style={[s.rcSection, { marginTop: 10 }]}>Method</Text>
              <Text style={s.rcMethod}>{(recipe as ShakeRecipe | Meal).instructions}</Text>
            </>
          )}
          {recipe.tip && (
            <View style={s.rcTip}>
              <Text style={s.rcTipText}>💡 {recipe.tip}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}
