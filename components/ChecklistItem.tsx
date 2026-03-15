import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AppTheme, AppThemeType } from '@/constants/theme';
import { createChecklistItemStyles } from './ChecklistItem.styles';
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
    <View style={{ borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, backgroundColor: color + '30', borderColor: color }}>
      <Text style={{ fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color }}>
        {category.replace('-', ' ')}
      </Text>
    </View>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────
interface ChecklistItemProps {
  event: ScheduleEvent;
  done: boolean;
  isLast: boolean;
  isNextUp?: boolean;
  onToggle: () => void;
}

export function ChecklistItem({ event, done, isLast, isNextUp, onToggle }: ChecklistItemProps) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createChecklistItemStyles(theme), [theme]);
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

  // ── Brief coaching detail (first non-bullet line, truncated) ──
  const coachDetail = detailLines.find(l => l.trim() && !isBullet(l));

  function renderDetailContent(parentDone: boolean) {
    if (!event.detail) return null;
    if (!hasBullets) {
      return <Text style={[s.detailLine, parentDone && { opacity: 0.5 }]}>{event.detail}</Text>;
    }
    return (
      <View style={s.detailBlock}>
        {detailLines.map((line, i) => {
          if (!line.trim()) return <View key={i} style={{ height: 3 }} />;
          const bullet = isBullet(line);
          const crossed = crossedLines.has(i);
          if (bullet) {
            return (
              <TouchableOpacity
                key={i}
                onPress={() => setCrossedLines(prev => toggleSetItem(prev, i))}
                activeOpacity={0.65}
                style={s.bulletRow}>
                <View style={[s.bulletDot, crossed && { backgroundColor: theme.success, borderColor: theme.success }]}>
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
    );
  }

  function renderRecipe() {
    if (!recipe) return null;
    return (
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
                  <View style={[s.bulletDot, crossed && { backgroundColor: theme.success, borderColor: theme.success }]}>
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
    );
  }

  // ── DONE: compact single row ──────────────────────────────────────────────
  if (done) {
    return (
      <View style={s.row}>
        <View style={s.spine}>
          <View style={[s.dotDone, { backgroundColor: theme.success }]} />
          {!isLast && <View style={[s.line, { backgroundColor: theme.border }]} />}
        </View>
        <TouchableOpacity style={s.doneRow} onPress={onToggle} activeOpacity={0.6}>
          <Text style={s.doneCheck}>✓</Text>
          <Text style={s.doneTime}>{event.time}</Text>
          <View style={s.doneLine}>
            <Text style={s.doneIcon}>{icon}</Text>
            <Text style={s.doneLabel} numberOfLines={1}>{event.label}</Text>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // ── NEXT UP: hero card ────────────────────────────────────────────────────
  if (isNextUp) {
    return (
      <View style={s.row}>
        <View style={s.spine}>
          <View style={[s.dotNextUp, { backgroundColor: color }]} />
          {!isLast && <View style={[s.line, { backgroundColor: color + '50' }]} />}
        </View>
        <View style={s.nextUpWrapper}>
          {/* NEXT UP banner */}
          <View style={s.nextUpBanner}>
            <View style={[s.nextUpBadge, { backgroundColor: color }]}>
              <Text style={s.nextUpBadgeText}>⚡ NEXT UP</Text>
            </View>
          </View>

          {/* Hero card */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onToggle}
            style={[s.nextUpCard, { backgroundColor: color + '12', borderColor: color }]}>
            <Text style={[s.nextUpTime, { color }]}>{event.time}</Text>
            <View style={s.nextUpLabelRow}>
              <Text style={s.nextUpIcon}>{icon}</Text>
              <Text style={s.nextUpLabel}>{event.label}</Text>
              {event.duration && (
                <View style={[s.nextUpDur, { backgroundColor: color + '20', borderColor: color + '50' }]}>
                  <Text style={[s.nextUpDurText, { color }]}>{event.duration}</Text>
                </View>
              )}
            </View>

            {coachDetail && (
              <Text style={s.nextUpDetail} numberOfLines={hasBullets ? 2 : undefined}>
                {hasBullets ? coachDetail : event.detail}
              </Text>
            )}

            {hasBullets && renderDetailContent(false)}
            {renderRecipe()}

            <View style={s.nextUpCheckRow}>
              <View style={[s.nextUpCheckBtn, { borderColor: color + '60', backgroundColor: color + '15' }]}>
                <Text style={[s.nextUpCheckText, { color }]}>Mark done</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── UPCOMING: standard card ───────────────────────────────────────────────
  return (
    <View style={s.row}>
      <View style={s.spine}>
        <View style={[s.dot, { backgroundColor: color + '60' }]} />
        {!isLast && <View style={[s.line, { backgroundColor: theme.border }]} />}
      </View>
      <View style={s.upcomingWrapper}>
        <Text style={s.upcomingTime}>{event.time}</Text>
        <View style={[s.upcomingCard, { borderLeftColor: color }]}>
          <View style={s.upcomingTopRow}>
            <Text style={s.upcomingIcon}>{icon}</Text>
            <Text style={s.upcomingLabel}>{event.label}</Text>
            {event.duration && (
              <View style={[s.upcomingDur, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                <Text style={[s.upcomingDurText, { color }]}>{event.duration}</Text>
              </View>
            )}
          </View>

          {event.detail && !hasBullets && (
            <Text style={s.upcomingDetail} numberOfLines={2}>{event.detail}</Text>
          )}

          {event.detail && hasBullets && coachDetail && (
            <Text style={s.upcomingDetail} numberOfLines={1}>{coachDetail}</Text>
          )}

          {renderRecipe()}

          <View style={s.checkboxRow}>
            <TouchableOpacity
              onPress={onToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={s.checkbox}>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: theme.textMuted }}>Tap to mark done</Text>
          </View>
        </View>
      </View>
    </View>
  );
}
