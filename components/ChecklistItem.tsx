import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { createChecklistItemStyles } from './ChecklistItem.styles';
import { useAppTheme } from '@/context/ThemeContext';
import { ScheduleEvent } from '@/constants/scheduleData';
import { RecipeCard } from './RecipeCard';
import { SHAKE_RECIPES, MEAL_IDEAS } from '@/constants/nutritionData';
import { EVENT_ICONS, MEAL_CAT_COLORS, isBullet, toggleSetItem } from './checklistUtils';
import { BulletRow } from './BulletRow';
import { WorkoutCard, SessionSummary } from './WorkoutCard';

export { EVENT_ICONS, MEAL_CAT_COLORS, isBullet, toggleSetItem };

// ─── Component ───────────────────────────────────────────────────────────────
interface ChecklistItemProps {
  event: ScheduleEvent;
  done: boolean;
  skipped: boolean;
  isLast: boolean;
  onToggle: () => void;
  onSkip: () => void;
  onLogSets?: () => void;
  onChangeFocus?: (focus: string) => void;
  sessionSummary?: SessionSummary | null;
  otherDayFocuses?: string[];
}

export function ChecklistItem({ event, done, skipped, isLast, onToggle, onSkip, onLogSets, onChangeFocus, sessionSummary, otherDayFocuses }: ChecklistItemProps) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createChecklistItemStyles(theme), [theme]);

  // Compute bullet metadata before state so we can use it in the initializer.
  // Checklists only activate when there are MORE than 2 bullet items —
  // 1–2 items are shown as plain coaching text instead.
  // Gym events use WorkoutCard instead of inline bullet rendering.
  const isGymEvent   = event.type === 'gym';
  const detailLines  = event.detail?.split('\n') ?? [];
  const bulletCount  = detailLines.filter(isBullet).length;
  const hasBullets   = !isGymEvent && bulletCount > 2;

  // For plain-text detail: measured line count drives the expand threshold.
  // null = not yet measured (render unclamped so onTextLayout gets the true count).
  const [textLineCount, setTextLineCount] = useState<number | null>(null);
  const isTextLong = textLineCount !== null && textLineCount > 3;
  const isExpandable = hasBullets || isTextLong;

  const [crossedLines, setCrossedLines] = useState<Set<number>>(new Set());
  // Bullet checklists start expanded so they're immediately actionable
  const [detailExpanded, setDetailExpanded] = useState(hasBullets);
  // null = no user override; use event's own recipeId
  const [recipeOverride, setRecipeOverride] = useState<string | null>(null);
  const selectedRecipeId = recipeOverride ?? event.recipeId;

  // Build the full list of recipe options (primary + alternatives) for swap pills
  const recipeOptions = useMemo(() => {
    if (!event.recipeId || !event.recipeType || !event.alternatives?.length) return [];
    const ids = [event.recipeId, ...event.alternatives];
    return ids.flatMap(id => {
      const recipe = event.recipeType === 'shake'
        ? SHAKE_RECIPES.find(r => r.id === id)
        : MEAL_IDEAS.find(r => r.id === id);
      return recipe ? [{ id, emoji: recipe.emoji, name: recipe.name }] : [];
    });
  }, [event.recipeId, event.recipeType, event.alternatives]);

  const color = (theme as Record<string, string>)[event.type] ?? theme.primary;
  const icon  = EVENT_ICONS[event.type] ?? '•';

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
              <BulletRow
                key={i}
                text={line.trimStart().replace(/^•\s*/, '')}
                isCrossed={crossed}
                onPress={() => setCrossedLines(prev => toggleSetItem(prev, i))}
                successColor={theme.success}
                s={s}
              />
            );
          }
          return <Text key={i} style={s.detailLine}>{line}</Text>;
        })}
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

  // ── SKIPPED: compact single row ───────────────────────────────────────────
  if (skipped) {
    return (
      <View style={s.row}>
        <View style={s.spine}>
          <View style={[s.dotDone, { backgroundColor: theme.textMuted }]} />
          {!isLast && <View style={[s.line, { backgroundColor: theme.border }]} />}
        </View>
        <TouchableOpacity style={s.skippedRow} onPress={onSkip} activeOpacity={0.6}>
          <Text style={s.skippedDash}>⊘</Text>
          <Text style={s.doneTime}>{event.time}</Text>
          <View style={s.doneLine}>
            <Text style={s.doneIcon}>{icon}</Text>
            <Text style={s.skippedLabel} numberOfLines={1}>{event.label}</Text>
          </View>
        </TouchableOpacity>
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
          <TouchableOpacity
            style={s.upcomingTopRow}
            onPress={isExpandable ? () => setDetailExpanded(e => !e) : undefined}
            activeOpacity={isExpandable ? 0.7 : 1}>
            <Text style={s.upcomingIcon}>{icon}</Text>
            <Text style={s.upcomingLabel} numberOfLines={1}>{event.label}</Text>
            {event.duration && !isGymEvent && (
              <View style={[s.upcomingDur, { backgroundColor: color + '20', borderColor: color + '40' }]}>
                <Text style={[s.upcomingDurText, { color }]}>{event.duration}</Text>
              </View>
            )}
            {isExpandable && (
              <Text style={s.rcArrow}>{detailExpanded ? '▲' : '▼'}</Text>
            )}
          </TouchableOpacity>

          {hasBullets && (
            detailExpanded
              ? renderDetailContent(false)
              : null
          )}

          {!hasBullets && !isGymEvent && event.detail && (
            <Text
              style={s.upcomingDetail}
              numberOfLines={isTextLong && !detailExpanded ? 3 : undefined}
              onTextLayout={(e) => {
                if (textLineCount === null) {
                  setTextLineCount(e.nativeEvent.lines.length);
                }
              }}>
              {event.detail}
            </Text>
          )}

          {isGymEvent && event.workoutType && (
            <WorkoutCard
              workoutType={event.workoutType}
              workoutFocus={event.workoutFocus ?? ''}
              duration={event.duration}
              onLogSets={onLogSets}
              onChangeFocus={onChangeFocus}
              sessionSummary={sessionSummary}
              otherDayFocuses={otherDayFocuses}
            />
          )}

          {recipeOptions.length > 1 && (
            <View style={{ marginTop: 8 }}>
              <Text style={s.swapLabel}>Choose one</Text>
              <View style={s.swapRow}>
                {recipeOptions.map(opt => {
                  const active = selectedRecipeId === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[s.swapPill, active && s.swapPillActive]}
                      onPress={() => setRecipeOverride(opt.id === event.recipeId ? null : opt.id)}
                      activeOpacity={0.7}>
                      <Text style={[s.swapPillText, active && s.swapPillTextActive]}>
                        {opt.emoji}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {selectedRecipeId && event.recipeType && (
            <RecipeCard
              recipeId={selectedRecipeId}
              recipeType={event.recipeType}
              overrideMacros={event.macros}
            />
          )}


          <View style={s.checkboxRow}>
            <TouchableOpacity
              onPress={onToggle}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={s.checkbox}>
            </TouchableOpacity>
            <Text style={{ fontSize: 12, color: theme.textMuted }}>Tap to mark done</Text>
            <TouchableOpacity onPress={onSkip} activeOpacity={0.7} style={s.skipBtn}>
              <Text style={s.skipBtnText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
