import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { AppTheme } from '@/constants/theme';
import { createChecklistItemStyles } from './ChecklistItem.styles';
import { useAppTheme } from '@/context/ThemeContext';
import { ScheduleEvent } from '@/constants/scheduleData';
import { RecipeCard } from './RecipeCard';

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

// ─── Component ───────────────────────────────────────────────────────────────
interface ChecklistItemProps {
  event: ScheduleEvent;
  done: boolean;
  skipped: boolean;
  isLast: boolean;
  onToggle: () => void;
  onSkip: () => void;
}

export function ChecklistItem({ event, done, skipped, isLast, onToggle, onSkip }: ChecklistItemProps) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createChecklistItemStyles(theme), [theme]);
  const [crossedLines, setCrossedLines] = useState<Set<number>>(new Set());

  const color = (theme as Record<string, string>)[event.type] ?? theme.primary;
  const icon = EVENT_ICONS[event.type] ?? '•';

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

          {event.recipeId && event.recipeType && (
            <RecipeCard recipeId={event.recipeId} recipeType={event.recipeType} />
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
