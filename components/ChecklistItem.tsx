import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AppTheme, AppThemeType } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { ScheduleEvent } from '@/constants/scheduleData';
import { SHAKE_RECIPES, MEAL_IDEAS, ShakeRecipe, Meal } from '@/constants/nutritionData';

// ─── Module-level helpers ────────────────────────────────────────────────────
export const EVENT_ICONS: Record<string, string> = {
  wake: '🌅', sleep: '😴', work: '💻', class: '📚', gym: '🏋️',
  meal: '🍽️', snack: '🍎', shake: '🥤', supplement: '💊', water: '💧',
  rest: '☁️', yoga: '🧘', prep: '📋', free: '🌟',
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

function MealCatBadge({ category, theme }: { category: string; theme: AppThemeType }) {
  const color = MEAL_CAT_COLORS[category] ?? theme.primary;
  return (
    <View style={[{ borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, backgroundColor: color + '30', borderColor: color }]}>
      <Text style={[{ fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color }]}>
        {category.replace('-', ' ')}
      </Text>
    </View>
  );
}

function useStyles(theme: AppThemeType) {
  return useMemo(() => StyleSheet.create({
    item:         { flexDirection: 'row', gap: 8, marginBottom: 2 },
    itemDone:     { opacity: 0.35 },
    timeline:     { alignItems: 'center', width: 14, paddingTop: 20 },
    dot:          { width: 10, height: 10, borderRadius: 5, zIndex: 1 },
    line:         { flex: 1, width: 2, marginTop: 2 },
    card:         { flex: 1, backgroundColor: theme.bgCard, borderRadius: 12, padding: 12, marginBottom: 6, borderLeftWidth: 3, borderWidth: 1, borderColor: theme.border },
    topRow:       { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
    checkbox:     { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
    checkmark:    { fontSize: 12, color: '#fff', fontWeight: '700' },
    time:         { flex: 1, fontSize: 11, color: theme.textMuted, fontWeight: '600' },
    durBadge:     { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
    durText:      { fontSize: 10, fontWeight: '700' },
    labelRow:     { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
    icon:         { fontSize: 15 },
    label:        { flex: 1, fontSize: 14, color: theme.textPrimary, fontWeight: '500' },
    labelDone:    { textDecorationLine: 'line-through', color: theme.textMuted },
    detail:       { fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginTop: 4 },
    detailBlock:  { marginTop: 6, gap: 2 },
    detailLine:   { fontSize: 12, color: theme.textSecondary, lineHeight: 18, paddingLeft: 2 },
    bulletRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    bulletDot:    { width: 18, height: 18, borderRadius: 5, borderWidth: 1.5, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
    bulletCheck:  { fontSize: 10, color: '#fff', fontWeight: '700' },
    bulletText:   { flex: 1, fontSize: 13, color: theme.textPrimary, lineHeight: 18 },
    bulletCrossed:{ textDecorationLine: 'line-through', color: theme.textMuted, opacity: 0.55 },

    rcCard:       { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border },
    rcHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    rcEmoji:      { fontSize: 24 },
    rcInfo:       { flex: 1 },
    rcName:       { fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginBottom: 1 },
    rcTiming:     { fontSize: 11, color: theme.textSecondary },
    rcArrow:      { fontSize: 11, color: theme.textMuted },
    rcMacros:     { flexDirection: 'row', gap: 10, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, marginBottom: 2 },
    rcMacro:      { fontSize: 12, fontWeight: '600' },
    rcBody:       { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border },
    rcDesc:       { fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginBottom: 10 },
    rcSection:    { fontSize: 11, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
    rcMethod:     { fontSize: 12, color: theme.textSecondary, lineHeight: 18 },
    rcTip:        { backgroundColor: theme.primary + '18', borderRadius: 8, padding: 10, marginTop: 10, borderWidth: 1, borderColor: theme.primary + '40' },
    rcTipText:    { fontSize: 12, color: theme.primaryLight, lineHeight: 17 },
  }), [theme]);
}

// ─── Component ───────────────────────────────────────────────────────────────
interface ChecklistItemProps {
  event: ScheduleEvent;
  done: boolean;
  isLast: boolean;
  onToggle: () => void;
}

export function ChecklistItem({ event, done, isLast, onToggle }: ChecklistItemProps) {
  const { theme } = useAppTheme();
  const s = useStyles(theme);
  const [recipeExpanded, setRecipeExpanded] = useState(false);
  const [crossedLines, setCrossedLines] = useState<Set<number>>(new Set());
  const [crossedIngredients, setCrossedIngredients] = useState<Set<number>>(new Set());

  const color = (theme as Record<string, string>)[event.type] ?? theme.primary;
  const icon = EVENT_ICONS[event.type] ?? '•';

  const recipe = event.recipeId
    ? (event.recipeType === 'shake' ? SHAKE_RECIPES : MEAL_IDEAS).find(r => r.id === event.recipeId)
    : undefined;

  const detailLines = event.detail?.split('\n') ?? [];
  const hasBullets = detailLines.some(isBullet);

  return (
    <View style={[s.item, done && s.itemDone]}>
      {/* Timeline */}
      <View style={s.timeline}>
        <View style={[s.dot, { backgroundColor: done ? theme.textMuted : color }]} />
        {!isLast && <View style={[s.line, { backgroundColor: color + '35' }]} />}
      </View>

      {/* Card */}
      <View style={[s.card, { borderLeftColor: color }]}>
        {/* Top row */}
        <View style={s.topRow}>
          <TouchableOpacity
            onPress={onToggle}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[s.checkbox, done && { backgroundColor: theme.success, borderColor: theme.success }]}>
            {done && <Text style={s.checkmark}>✓</Text>}
          </TouchableOpacity>
          <Text style={s.time}>{event.time}</Text>
          {event.duration && (
            <View style={[s.durBadge, { backgroundColor: color + '20', borderColor: color + '50' }]}>
              <Text style={[s.durText, { color }]}>{event.duration}</Text>
            </View>
          )}
        </View>

        {/* Label row */}
        <View style={s.labelRow}>
          <Text style={s.icon}>{icon}</Text>
          <Text style={[s.label, done && s.labelDone]}>{event.label}</Text>
        </View>

        {/* Plain detail */}
        {event.detail && !hasBullets && (
          <Text style={s.detail}>{event.detail}</Text>
        )}

        {/* Bullet detail */}
        {event.detail && hasBullets && (
          <View style={s.detailBlock}>
            {detailLines.map((line, i) => {
              const bullet = isBullet(line);
              const crossed = crossedLines.has(i);
              if (!line.trim()) return <View key={i} style={{ height: 4 }} />;
              if (bullet) {
                return (
                  <TouchableOpacity
                    key={i}
                    onPress={() => setCrossedLines(prev => toggleSetItem(prev, i))}
                    activeOpacity={0.65}
                    style={s.bulletRow}>
                    <View style={[s.bulletDot, crossed && { backgroundColor: theme.success }]}>
                      {crossed && <Text style={s.bulletCheck}>✓</Text>}
                    </View>
                    <Text style={[s.bulletText, crossed && s.bulletCrossed]}>
                      {line.trimStart().replace(/^•\s*/, '')}
                    </Text>
                  </TouchableOpacity>
                );
              }
              return <Text key={i} style={s.detailLine}>{line}</Text>;
            })}
          </View>
        )}

        {/* Linked recipe */}
        {recipe && (
          <View style={s.rcCard}>
            <TouchableOpacity onPress={() => setRecipeExpanded(v => !v)} activeOpacity={0.7} style={s.rcHeader}>
              <Text style={s.rcEmoji}>{recipe.emoji}</Text>
              <View style={s.rcInfo}>
                <Text style={s.rcName}>{recipe.name}</Text>
                <Text style={s.rcTiming}>{recipe.timing}</Text>
              </View>
              {event.recipeType === 'meal' && (
                <MealCatBadge category={(recipe as Meal).category} theme={theme} />
              )}
              <Text style={s.rcArrow}>{recipeExpanded ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            <View style={s.rcMacros}>
              <Text style={[s.rcMacro, { color: theme.meal }]}>🔥 {recipe.calories} kcal</Text>
              <Text style={[s.rcMacro, { color: theme.primary }]}>💪 {recipe.protein}g</Text>
              <Text style={[s.rcMacro, { color: theme.water }]}>🌾 {recipe.carbs}g</Text>
              {event.recipeType === 'shake' && (
                <Text style={[s.rcMacro, { color: theme.supplement }]}>🧈 {(recipe as ShakeRecipe).fat}g fat</Text>
              )}
            </View>

            {recipeExpanded && (
              <View style={s.rcBody}>
                {event.recipeType === 'meal' && !!(recipe as Meal).description && (
                  <Text style={s.rcDesc}>{(recipe as Meal).description}</Text>
                )}
                <Text style={s.rcSection}>Ingredients</Text>
                {recipe.ingredients.map((ing, i) => {
                  const crossed = crossedIngredients.has(i);
                  return (
                    <TouchableOpacity key={i} onPress={() => setCrossedIngredients(prev => toggleSetItem(prev, i))} activeOpacity={0.65} style={s.bulletRow}>
                      <View style={[s.bulletDot, crossed && { backgroundColor: theme.success }]}>
                        {crossed && <Text style={s.bulletCheck}>✓</Text>}
                      </View>
                      <Text style={[s.bulletText, crossed && s.bulletCrossed]}>{ing}</Text>
                    </TouchableOpacity>
                  );
                })}
                {event.recipeType === 'shake' && (
                  <>
                    <Text style={[s.rcSection, { marginTop: 10 }]}>Method</Text>
                    <Text style={s.rcMethod}>{(recipe as ShakeRecipe).instructions}</Text>
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
        )}
      </View>
    </View>
  );
}
