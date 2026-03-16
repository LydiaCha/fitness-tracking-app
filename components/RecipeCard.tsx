import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { createChecklistItemStyles } from './ChecklistItem.styles';
import { toggleSetItem, MEAL_CAT_COLORS } from './ChecklistItem';
import { ShakeRecipe, Meal, SHAKE_RECIPES, MEAL_IDEAS } from '@/constants/nutritionData';

interface Props {
  recipeId: string;
  recipeType: 'shake' | 'meal';
}

export function RecipeCard({ recipeId, recipeType }: Props) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createChecklistItemStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);
  const [crossed, setCrossed] = useState<Set<number>>(new Set());

  const recipe = recipeType === 'shake'
    ? SHAKE_RECIPES.find(r => r.id === recipeId)
    : MEAL_IDEAS.find(r => r.id === recipeId);

  if (!recipe) return null;

  const catColor = recipeType === 'meal'
    ? (MEAL_CAT_COLORS[(recipe as Meal).category] ?? theme.primary)
    : null;

  return (
    <View style={s.rcCard}>
      <TouchableOpacity onPress={() => setExpanded(v => !v)} activeOpacity={0.7} style={s.rcHeader}>
        <Text style={s.rcEmoji}>{recipe.emoji}</Text>
        <View style={s.rcInfo}>
          <Text style={s.rcName}>{recipe.name}</Text>
          <Text style={s.rcTiming}>{recipe.timing}</Text>
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
        <Text style={[s.rcMacro, { color: theme.meal }]}>🔥 {recipe.calories} kcal</Text>
        <Text style={[s.rcMacro, { color: theme.primary }]}>💪 {recipe.protein}g</Text>
        <Text style={[s.rcMacro, { color: theme.water }]}>🌾 {recipe.carbs}g</Text>
        <Text style={[s.rcMacro, { color: theme.supplement }]}>🧈 {recipe.fat}g fat</Text>
      </View>

      {expanded && (
        <View style={s.rcBody}>
          {recipeType === 'meal' && !!(recipe as Meal).description && (
            <Text style={s.rcDesc}>{(recipe as Meal).description}</Text>
          )}
          <Text style={s.rcSection}>Ingredients</Text>
          {recipe.ingredients.map((ing, i) => {
            const isCrossed = crossed.has(i);
            return (
              <TouchableOpacity
                key={i}
                onPress={() => setCrossed(prev => toggleSetItem(prev, i))}
                activeOpacity={0.65}
                style={s.bulletRow}
              >
                <View style={[s.bulletDot, isCrossed && { backgroundColor: theme.success, borderColor: theme.success }]}>
                  {isCrossed && <Text style={s.bulletCheck}>✓</Text>}
                </View>
                <Text style={[s.bulletText, isCrossed && s.bulletCrossed]}>{ing}</Text>
              </TouchableOpacity>
            );
          })}
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
