import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { createChecklistItemStyles } from './ChecklistItem.styles';
import {
  WORKOUT_FOCUS_OPTIONS, getFocusOption,
  getDefaultExercisesForFocus,
} from '@/constants/exerciseRegistry';

export interface SessionSummary {
  exerciseCount: number;
  totalSets:     number;
  volumeKg:      number;
}

interface Props {
  workoutType:      string;
  workoutFocus:     string;
  duration?:        string;
  onLogSets?:       () => void;
  onChangeFocus?:   (focus: string) => void;
  sessionSummary?:  SessionSummary | null;
  otherDayFocuses?: string[];
}

export function WorkoutCard({
  workoutType,
  workoutFocus,
  duration,
  onLogSets,
  onChangeFocus,
  sessionSummary,
  otherDayFocuses = [],
}: Props) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createChecklistItemStyles(theme), [theme]);

  const activeOption = useMemo(() => getFocusOption(workoutFocus), [workoutFocus]);
  const isRest       = activeOption?.key === 'rest';

  // Top-3 exercise names for the preview line
  const exercisePreview = useMemo(() => {
    if (isRest) return null;
    const exs = getDefaultExercisesForFocus(workoutFocus).slice(0, 3);
    return exs.map(e => e.name).join(' · ');
  }, [workoutFocus, isRest]);

  // Which focus keys are already used on other days this week
  const usedKeys = useMemo(() => {
    const s = new Set<string>();
    for (const f of otherDayFocuses) {
      const opt = getFocusOption(f);
      if (opt) s.add(opt.key);
    }
    return s;
  }, [otherDayFocuses]);


  // Inline balance nudge: warn if swapping to a focus already covered this week
  const nudge = useMemo(() => {
    if (!activeOption || !usedKeys.has(activeOption.key)) return null;
    return `You already have a ${activeOption.label} day this week`;
  }, [activeOption, usedKeys]);

  const color = theme.gym;

  return (
    <View style={s.rcCard}>
      {/* ── Header ── */}
      <View style={s.rcHeader}>
        <Text style={s.rcEmoji}>{activeOption?.emoji ?? '🏋️'}</Text>
        <View style={s.rcInfo}>
          <Text style={s.rcName}>{workoutType}</Text>
          <Text style={s.rcTiming} numberOfLines={1}>
            {activeOption?.detail ?? workoutFocus}
          </Text>
        </View>
        {duration && (
          <View style={{ borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, backgroundColor: theme.bgCardAlt, borderColor: theme.border }}>
            <Text style={{ fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.textMuted }}>
              {duration}
            </Text>
          </View>
        )}
        {!isRest && onLogSets && (
          <TouchableOpacity
            onPress={onLogSets}
            activeOpacity={0.8}
            style={{
              backgroundColor: sessionSummary ? color + '22' : color,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              borderWidth: sessionSummary ? 1 : 0,
              borderColor: sessionSummary ? color + '55' : undefined,
            }}>
            <Text style={{ fontSize: 11, color: sessionSummary ? color : '#fff' }}>▶</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: sessionSummary ? color : '#fff' }}>
              {sessionSummary ? 'Resume' : 'Start'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Exercise preview / Rest note ── */}
      <View style={{ paddingHorizontal: 12, paddingBottom: 10, marginTop: -2 }}>
        {isRest ? (
          <Text style={{ fontSize: 12, color: theme.textMuted, fontStyle: 'italic' }}>
            Light walk, stretching, or yoga — let the body recover
          </Text>
        ) : exercisePreview ? (
          <Text style={{ fontSize: 12, color: theme.textSecondary }} numberOfLines={1}>
            {exercisePreview}
            <Text style={{ color: theme.textMuted }}> +more</Text>
          </Text>
        ) : null}
      </View>

      {/* ── Focus locked notice ── */}
      {!onChangeFocus && !isRest && sessionSummary && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 8, marginTop: -4 }}>
          <Text style={{ fontSize: 11, color: theme.textMuted }}>
            🔒 Focus locked — session in progress
          </Text>
        </View>
      )}

      {/* ── Focus swap pills ── */}
      {onChangeFocus && (
        <View style={{ marginBottom: 4 }}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 12, gap: 6 }}
          >
            {WORKOUT_FOCUS_OPTIONS.map(opt => {
              const active    = activeOption?.key === opt.key;
              const duplicate = !active && usedKeys.has(opt.key);
              return (
                <TouchableOpacity
                  key={opt.key}
                  onPress={() => !active && onChangeFocus(opt.focusString)}
                  activeOpacity={active ? 1 : 0.7}
                  style={{
                    flexDirection:  'row',
                    alignItems:     'center',
                    gap:             4,
                    paddingHorizontal: 10,
                    paddingVertical:    6,
                    borderRadius:      10,
                    backgroundColor: active ? color + '28' : theme.bgCard,
                    borderWidth: 1,
                    borderColor: active ? color + '88' : theme.border,
                    opacity: duplicate ? 0.55 : 1,
                  }}
                >
                  <Text style={{ fontSize: 13 }}>{opt.emoji}</Text>
                  <Text style={{
                    fontSize:   12,
                    fontWeight: active ? '700' : '400',
                    color:      active ? color : theme.textSecondary,
                  }}>
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Fixed-height nudge slot — always reserves space so card height stays stable */}
          <View style={{ height: 22, justifyContent: 'center', paddingHorizontal: 14, marginTop: 4 }}>
            {nudge && (
              <Text style={{ fontSize: 11, color: theme.warning }}>⚠ {nudge}</Text>
            )}
          </View>
        </View>
      )}

      {/* ── Post-log stats line ── */}
      {!isRest && sessionSummary && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 12, marginTop: -4 }}>
          <Text style={{ fontSize: 12, color: theme.success, fontWeight: '600' }}>
            ✓ {sessionSummary.exerciseCount} exercises · {sessionSummary.totalSets} sets
            {sessionSummary.volumeKg > 0 ? ` · ${sessionSummary.volumeKg.toLocaleString()} kg` : ''}
          </Text>
        </View>
      )}
    </View>
  );
}
