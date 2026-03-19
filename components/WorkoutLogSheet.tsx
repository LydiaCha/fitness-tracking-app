/**
 * WorkoutLogSheet — AI-coached workout logging
 *
 * Flow:
 *  1. Session  → stepper logging + inline rest coaching + AI brief targets
 *  2. Save     → PR detection + AI post-session note
 *  3. Post     → summary cards, PRs, coaching note, shareable
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator, Vibration,
} from 'react-native';
import { Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import {
  SetRecord, WorkoutLog, calcE1RM,
  getLastSets, saveWorkoutLog, loadTodayLog,
  loadWorkoutLogs, computeStrengthSnapshots, getE1RMHistory,
} from '@/utils/strengthLog';
import { toKey } from '@/utils/appConstants';
import {
  Exercise, getDefaultExercisesForFocus, getExerciseById,
  EXERCISES, getFocusOption,
} from '@/constants/exerciseRegistry';
import { callClaude, extractJSON } from '@/utils/claudeApi';
import { useUserProfile } from '@/context/UserProfileContext';
import { safeGetItem, safeSetItem } from '@/utils/storage';

// ─── Types ────────────────────────────────────────────────────────────────────

type Phase = 'session' | 'saving' | 'post';

interface SetDraft {
  weightKg: number;
  reps:     number;
  done:     boolean;
}

interface ExerciseState {
  exerciseId:     string;
  sets:           SetDraft[];
  expanded:       boolean;
  lastSets:       SetRecord[];
  swapLoading:    boolean;
  swapSuggestion: { exercise: Exercise; reason: string } | null;
}

interface ExerciseBrief {
  exerciseId:        string;
  sets:              number;
  repsRange:         string;
  suggestedWeightKg: number;
  note?:             string;
}

interface ExSummary {
  name:     string;
  sets:     number;
  bestSet:  { weightKg: number; reps: number };
  isPR:     boolean;
}

type RestPhase = 'prompted' | 'counting' | 'done';

interface RestCtx {
  exIdx:       number;
  setIdx:      number;
  lastSet:     { weightKg: number; reps: number };
  phase:       RestPhase;
  secs:        number;
  recommended: number;
}

interface Brief {
  targets:     ExerciseBrief[];
  generalNote: string;
}

export interface Props {
  visible:             boolean;
  focus:               string;
  onClose:             () => void;
  onSaved?:            () => void;
  onCompleteGymEvent?: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initSets(lastSets: SetRecord[], brief?: ExerciseBrief): SetDraft[] {
  const count  = brief?.sets ?? (lastSets.length > 0 ? lastSets.length : 3);
  const weight = brief?.suggestedWeightKg ?? (lastSets[0]?.weightKg ?? 20);
  if (lastSets.length > 0) {
    return lastSets.slice(0, count).map(s => ({
      weightKg: brief?.suggestedWeightKg ?? s.weightKg,
      reps:     s.reps,
      done:     false,
    }));
  }
  return Array.from({ length: count }, () => ({ weightKg: weight, reps: 8, done: false }));
}

function totalVolume(states: ExerciseState[]): number {
  return Math.round(states.reduce((tot, ex) =>
    tot + ex.sets.filter(s => s.weightKg > 0 && s.reps > 0)
      .reduce((s, r) => s + r.weightKg * r.reps, 0), 0));
}

function countFilled(states: ExerciseState[]): number {
  return states.reduce((n, ex) =>
    n + ex.sets.filter(s => s.weightKg > 0 && s.reps > 0).length, 0);
}

// ─── Stepper ──────────────────────────────────────────────────────────────────

function Stepper({
  value, step, min, max, unit, onChange, theme, color,
}: {
  value: number; step: number; min: number; max: number;
  unit: string; onChange: (v: number) => void; theme: AppThemeType; color: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text,    setText]    = useState('');
  const hasValue = value > 0;

  const commit = () => {
    const v = parseFloat(text.replace(',', '.'));
    if (!isNaN(v) && v >= min && v <= max) onChange(+v.toFixed(1));
    setEditing(false);
  };

  if (editing) {
    return (
      <TextInput
        style={{
          width: 80, height: 40, borderRadius: 12,
          borderWidth: 1.5, borderColor: color,
          backgroundColor: theme.bgCardAlt,
          color: theme.textPrimary, fontSize: 17,
          fontWeight: '700', textAlign: 'center',
        }}
        value={text}
        onChangeText={setText}
        onBlur={commit}
        onSubmitEditing={commit}
        autoFocus
        keyboardType="decimal-pad"
        returnKeyType="done"
        selectTextOnFocus
      />
    );
  }

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
      <TouchableOpacity
        onPress={() => onChange(+Math.max(min, value - step).toFixed(1))}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        style={{
          width: 28, height: 28, borderRadius: 14,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: hasValue ? color + '55' : theme.border,
        }}>
        <Text style={{ fontSize: 18, color: hasValue ? color : theme.textMuted, lineHeight: 22, marginTop: -2 }}>−</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onLongPress={() => { setText(value > 0 ? String(value) : ''); setEditing(true); }}
        delayLongPress={400}
        style={{
          minWidth: 68, height: 40, paddingHorizontal: 8,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: hasValue ? color + '15' : theme.bgCardAlt,
          borderRadius: 10,
          borderWidth: 1, borderColor: hasValue ? color + '35' : theme.border,
        }}>
        <Text style={{ fontSize: 17, fontWeight: '800', color: hasValue ? theme.textPrimary : theme.textMuted }}>
          {value > 0 ? `${value}${unit}` : '—'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onChange(+Math.min(max, value + step).toFixed(1))}
        hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
        style={{
          width: 28, height: 28, borderRadius: 14,
          alignItems: 'center', justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: hasValue ? color + '55' : theme.border,
          backgroundColor: hasValue ? color + '10' : 'transparent',
        }}>
        <Text style={{ fontSize: 18, color: hasValue ? color : theme.textMuted, lineHeight: 22, marginTop: -2 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── SetRow ───────────────────────────────────────────────────────────────────

function SetRow({
  set, index, coachWeight, theme, onChange, onDelete, onMarkDone,
}: {
  set:          SetDraft;
  index:        number;
  coachWeight?: number;
  theme:        AppThemeType;
  onChange:     (field: 'weightKg' | 'reps', val: number) => void;
  onDelete:     () => void;
  onMarkDone:   () => void;
}) {
  const color       = theme.gym ?? '#a855f7';
  const isUnstarted = !set.done && set.weightKg === 0 && set.reps === 0;

  return (
    <View style={{ marginBottom: 8 }}>
      {coachWeight && isUnstarted && (
        <Text style={{ fontSize: 11, color, marginBottom: 3, marginLeft: 36, fontWeight: '600', opacity: 0.85 }}>
          ✦ Coach: {coachWeight} kg target
        </Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: set.done ? 0.45 : 1 }}>
        {/* Set number badge */}
        <View style={{
          width: 26, height: 26, borderRadius: 13,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: set.done ? theme.success + '22' : color + '15',
          borderWidth: 1, borderColor: set.done ? theme.success + '55' : color + '30',
        }}>
          {set.done
            ? <Text style={{ fontSize: 11, color: theme.success, fontWeight: '900' }}>✓</Text>
            : <Text style={{ fontSize: 11, fontWeight: '700', color }}>{index + 1}</Text>
          }
        </View>

        <Stepper value={set.weightKg} step={2.5} min={0} max={300} unit=" kg"
          onChange={v => onChange('weightKg', v)} theme={theme} color={color} />

        <Text style={{ fontSize: 14, color: theme.textMuted, fontWeight: '300', marginHorizontal: 2 }}>×</Text>

        <Stepper value={set.reps} step={1} min={0} max={50} unit=" reps"
          onChange={v => onChange('reps', v)} theme={theme} color={color} />

        {/* Done button */}
        <TouchableOpacity
          onPress={onMarkDone}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          style={{
            width: 42, height: 42, borderRadius: 21,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: set.done ? theme.success + '22' : theme.bgCardAlt,
            borderWidth: 1.5,
            borderColor: set.done ? theme.success + '70' : theme.border,
          }}>
          <Text style={{ fontSize: 18, color: set.done ? theme.success : theme.textMuted }}>✓</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 12, bottom: 12, left: 8, right: 4 }}>
          <Text style={{ fontSize: 15, color: theme.border }}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── RestBanner ───────────────────────────────────────────────────────────────

function RestBanner({
  ctx, isCompound, onStart, onSkip, color, theme,
}: {
  ctx:        RestCtx;
  isCompound: boolean;
  onStart:    () => void;
  onSkip:     () => void;
  color:      string;
  theme:      AppThemeType;
}) {
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const lastSetText  = `${ctx.lastSet.reps} × ${ctx.lastSet.weightKg} kg`;
  const nextSetLabel = `Set ${ctx.setIdx + 2}`;

  return (
    <View style={{
      marginHorizontal: 14, marginBottom: 12,
      backgroundColor: color + '12', borderRadius: 12,
      borderWidth: 1, borderColor: color + '30', padding: 12,
    }}>
      {ctx.phase === 'prompted' && (
        <>
          <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 8 }}>
            ✓ Set {ctx.setIdx + 1} done · {lastSetText}
            {isCompound ? '  ·  Compound — rest 2 min recommended' : '  ·  Isolation — rest 75 s recommended'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={onStart} activeOpacity={0.8} style={{
              flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 10,
              backgroundColor: color + '22', borderWidth: 1, borderColor: color + '55',
            }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color }}>
                ⏱ Rest {fmt(ctx.recommended)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSkip} activeOpacity={0.8} style={{
              paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10,
              borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgCardAlt,
            }}>
              <Text style={{ fontSize: 13, color: theme.textMuted }}>Skip →</Text>
            </TouchableOpacity>
          </View>
        </>
      )}

      {ctx.phase === 'counting' && (
        <>
          <View style={{ marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
              <Text style={{ fontSize: 44, fontWeight: '900', color, lineHeight: 50 }}>{fmt(ctx.secs)}</Text>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>remaining</Text>
            </View>
            <View style={{ height: 4, backgroundColor: theme.border, borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: color, width: `${Math.round((ctx.secs / ctx.recommended) * 100)}%` }} />
            </View>
          </View>
          <TouchableOpacity onPress={onSkip} activeOpacity={0.8} style={{
            alignItems: 'center', paddingVertical: 9, borderRadius: 10,
            borderWidth: 1, borderColor: color + '55', backgroundColor: color + '18',
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color }}>Start {nextSetLabel} now →</Text>
          </TouchableOpacity>
        </>
      )}

      {ctx.phase === 'done' && (
        <>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.textPrimary, marginBottom: 4 }}>
            Ready for {nextSetLabel}?
          </Text>
          <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10 }}>
            Last set: {lastSetText} — try to match it!
          </Text>
          <TouchableOpacity onPress={onSkip} activeOpacity={0.8} style={{
            alignItems: 'center', paddingVertical: 9, borderRadius: 10,
            backgroundColor: color + '22', borderWidth: 1, borderColor: color + '55',
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color }}>💪 Let's go</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── ExerciseSection ──────────────────────────────────────────────────────────

function ExerciseSection({
  state, brief, theme, restCtx,
  onToggleExpand, onSetChange, onAddSet, onDeleteSet, onMarkDone,
  onRemove, onRequestSwap, onAcceptSwap, onDismissSwap,
  onStartRest, onSkipRest,
}: {
  state:          ExerciseState;
  brief?:         ExerciseBrief;
  theme:          AppThemeType;
  restCtx?:       RestCtx;
  onToggleExpand: () => void;
  onSetChange:    (si: number, field: 'weightKg' | 'reps', val: number) => void;
  onAddSet:       () => void;
  onDeleteSet:    (si: number) => void;
  onMarkDone:     (si: number) => void;
  onRemove:       () => void;
  onRequestSwap:  () => void;
  onAcceptSwap:   () => void;
  onDismissSwap:  () => void;
  onStartRest:    () => void;
  onSkipRest:     () => void;
}) {
  const exercise  = getExerciseById(state.exerciseId);
  if (!exercise) return null;

  const color      = theme.gym ?? '#a855f7';
  const doneSets   = state.sets.filter(s => s.done).length;
  const filledSets = state.sets.filter(s => s.weightKg > 0 && s.reps > 0).length;
  const allDone    = state.sets.length > 0 && state.sets.every(s => s.done);

  return (
    <View style={{
      backgroundColor: theme.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderLeftWidth: doneSets > 0 || state.expanded ? 3 : 1,
      borderColor: allDone ? theme.success + '60' : doneSets > 0 ? color + '50' : state.expanded ? color + '50' : theme.border,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 10 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary }}>{exercise.name}</Text>
            {allDone && (
              <View style={{ backgroundColor: theme.success + '20', borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 10, fontWeight: '800', color: theme.success }}>✓ DONE</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
            <Text style={{ fontSize: 12, color: theme.textMuted }}>{exercise.primaryMuscle}</Text>
            {brief && (
              <Text style={{ fontSize: 12, color: theme.textMuted }}>· {brief.sets}×{brief.repsRange} @ {brief.suggestedWeightKg} kg</Text>
            )}
          </View>
        </View>

        {/* Dot set indicators */}
        {state.sets.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
            {state.sets.slice(0, 6).map((s, i) => (
              <View key={i} style={{
                width: 8, height: 8, borderRadius: 4,
                backgroundColor: s.done ? theme.success : s.weightKg > 0 && s.reps > 0 ? color + '60' : theme.border,
              }} />
            ))}
            {state.sets.length > 6 && (
              <Text style={{ fontSize: 10, color: theme.textMuted }}>+{state.sets.length - 6}</Text>
            )}
          </View>
        )}

        <Text style={{ fontSize: 12, color: state.expanded ? color : theme.textMuted, marginLeft: 4 }}>
          {state.expanded ? '▾' : '›'}
        </Text>
      </TouchableOpacity>

      {/* Inline rest banner — visible even when section is collapsed */}
      {restCtx && (
        <RestBanner
          ctx={restCtx}
          isCompound={exercise.isCompound ?? false}
          onStart={onStartRest}
          onSkip={onSkipRest}
          color={color}
          theme={theme}
        />
      )}

      {state.expanded && (
        <View style={{ paddingHorizontal: 14, paddingBottom: 14, paddingTop: 2 }}>

          {/* AI brief note */}
          {brief?.note && (
            <View style={{ backgroundColor: color + '14', borderRadius: 8, padding: 10, marginBottom: 12 }}>
              <Text style={{ fontSize: 12, color, lineHeight: 18 }}>✦  {brief.note}</Text>
            </View>
          )}

          {/* Set rows */}
          {state.sets.map((set, i) => (
            <SetRow
              key={i} set={set} index={i} theme={theme}
              coachWeight={brief && i === 0 ? brief.suggestedWeightKg : undefined}
              onChange={(field, val) => onSetChange(i, field, val)}
              onDelete={() => onDeleteSet(i)}
              onMarkDone={() => onMarkDone(i)}
            />
          ))}

          {/* Row actions */}
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
            <TouchableOpacity onPress={onAddSet} activeOpacity={0.7} style={{
              flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
              borderWidth: 1, borderStyle: 'dashed', borderColor: color + '55',
            }}>
              <Text style={{ fontSize: 13, color, fontWeight: '600' }}>+ Add set</Text>
            </TouchableOpacity>

            {/* Swap exercise */}
            <TouchableOpacity onPress={onRequestSwap} activeOpacity={0.7} style={{
              paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
              borderWidth: 1, borderColor: theme.border,
              flexDirection: 'row', alignItems: 'center', gap: 5,
            }}>
              {state.swapLoading
                ? <ActivityIndicator size="small" color={color} />
                : <Text style={{ fontSize: 13, color: theme.textMuted }}>⇄ Swap</Text>}
            </TouchableOpacity>

            <TouchableOpacity onPress={onRemove} activeOpacity={0.7} style={{
              paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
              borderWidth: 1, borderColor: theme.border,
            }}>
              <Text style={{ fontSize: 13, color: theme.textMuted }}>Remove</Text>
            </TouchableOpacity>
          </View>

          {/* Swap suggestion card */}
          {state.swapSuggestion && (
            <View style={{
              backgroundColor: theme.bgCardAlt, borderRadius: 10,
              padding: 12, marginTop: 10, gap: 6,
            }}>
              <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                Suggested:{' '}
                <Text style={{ fontWeight: '700', color: theme.textPrimary }}>
                  {state.swapSuggestion.exercise.name}
                </Text>
              </Text>
              <Text style={{ fontSize: 11, color: theme.textMuted }}>{state.swapSuggestion.reason}</Text>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <TouchableOpacity onPress={onAcceptSwap} activeOpacity={0.8} style={{
                  flex: 1, paddingVertical: 8, borderRadius: 8, alignItems: 'center',
                  backgroundColor: color + '20', borderWidth: 1, borderColor: color + '55',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color }}>Use it</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onDismissSwap} activeOpacity={0.8} style={{
                  paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8,
                  backgroundColor: theme.bgCardAlt, borderWidth: 1, borderColor: theme.border,
                }}>
                  <Text style={{ fontSize: 12, color: theme.textMuted }}>Keep</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

// ─── ExercisePicker ───────────────────────────────────────────────────────────

type ExCat = 'push' | 'pull' | 'legs' | 'core' | 'cardio';

const EX_CATS: { key: ExCat; emoji: string; label: string }[] = [
  { key: 'push',   emoji: '🫸', label: 'Push'   },
  { key: 'pull',   emoji: '🧲', label: 'Pull'   },
  { key: 'legs',   emoji: '🦵', label: 'Legs'   },
  { key: 'core',   emoji: '🔥', label: 'Core'   },
  { key: 'cardio', emoji: '🫀', label: 'Cardio' },
];

const EQUIPMENT_COLOR: Record<Exercise['equipment'], string> = {
  barbell:    '#f59e0b',
  dumbbell:   '#3b82f6',
  cable:      '#8b5cf6',
  bodyweight: '#10b981',
  machine:    '#6b7280',
};

function defaultCatForFocus(focus: string): ExCat {
  const f = focus.toLowerCase();
  if (f.includes('pull') || f.includes('back') || f.includes('bicep')) return 'pull';
  if (f.includes('leg')  || f.includes('lower') || f.includes('glute') || f.includes('quad')) return 'legs';
  if (f.includes('cardio') || f.includes('hiit') || f.includes('conditioning')) return 'cardio';
  if (f.includes('core')  || f.includes('abs')) return 'core';
  return 'push';
}

function ExercisePicker({
  existingIds, focus, theme, onAdd, onClose,
}: {
  existingIds: string[]; focus: string; theme: AppThemeType;
  onAdd: (ex: Exercise) => void; onClose: () => void;
}) {
  const [cat,       setCat]       = useState<ExCat>(() => defaultCatForFocus(focus));
  const [expanded,  setExpanded]  = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState<string | null>(null);

  const color    = theme.gym ?? '#a855f7';
  const filtered = EXERCISES.filter(e => e.category === cat && !existingIds.includes(e.id));

  function handleAdd(ex: Exercise) {
    setJustAdded(ex.id);
    setTimeout(() => {
      onAdd(ex);
      setJustAdded(null);
    }, 500);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Header */}
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: theme.border,
      }}>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 22, color: theme.textMuted, marginRight: 12, lineHeight: 26 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ flex: 1, fontSize: 16, fontWeight: '700', color: theme.textPrimary }}>Add exercise</Text>
      </View>

      {/* Category pills — fixed row, no scroll */}
      <View style={{
        flexDirection: 'row', paddingHorizontal: 16,
        paddingVertical: 10, gap: 6,
        borderBottomWidth: 1, borderBottomColor: theme.border,
      }}>
        {EX_CATS.map(c => {
          const active = cat === c.key;
          return (
            <TouchableOpacity
              key={c.key}
              onPress={() => { setCat(c.key); setExpanded(null); }}
              activeOpacity={0.7}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 7,
                borderRadius: 10, borderWidth: 1,
                backgroundColor: active ? color + '22' : theme.bgCard,
                borderColor:     active ? color + '88' : theme.border,
              }}>
              <Text style={{ fontSize: 15 }}>{c.emoji}</Text>
              <Text style={{
                fontSize: 10, marginTop: 2,
                fontWeight: active ? '700' : '400',
                color: active ? color : theme.textMuted,
              }}>{c.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Exercise list */}
      <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
        {filtered.length === 0 ? (
          <Text style={{ color: theme.textMuted, textAlign: 'center', paddingVertical: 32, fontSize: 14 }}>
            All {cat} exercises are already in your session
          </Text>
        ) : filtered.map((ex, i) => {
          const isExpanded  = expanded === ex.id;
          const wasAdded    = justAdded === ex.id;
          const eqColor     = EQUIPMENT_COLOR[ex.equipment];

          return (
            <View key={ex.id} style={{
              borderBottomWidth: i < filtered.length - 1 ? 1 : 0,
              borderBottomColor: theme.border,
            }}>
              {/* Main row */}
              <TouchableOpacity
                onPress={() => setExpanded(isExpanded ? null : ex.id)}
                activeOpacity={0.7}
                style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, gap: 12 }}>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary }}>{ex.name}</Text>
                    {ex.isCompound && (
                      <View style={{ backgroundColor: color + '18', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 0.5 }}>Compound</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 11, color: theme.textMuted }}>{ex.primaryMuscle}</Text>
                    <View style={{ width: 3, height: 3, borderRadius: 1.5, backgroundColor: theme.border }} />
                    <View style={{ backgroundColor: eqColor + '22', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: eqColor, textTransform: 'capitalize' }}>{ex.equipment}</Text>
                    </View>
                  </View>
                </View>

                {/* Expand hint */}
                <Text style={{ fontSize: 12, color: isExpanded ? color : theme.textMuted }}>
                  {isExpanded ? '▲' : '▼'}
                </Text>

                {/* Add button */}
                <TouchableOpacity
                  onPress={() => handleAdd(ex)}
                  disabled={wasAdded}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={{
                    paddingHorizontal: 14, paddingVertical: 8,
                    borderRadius: 10, borderWidth: 1,
                    backgroundColor: wasAdded ? theme.success + '20' : color + '18',
                    borderColor:     wasAdded ? theme.success + '55' : color + '55',
                  }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: wasAdded ? theme.success : color }}>
                    {wasAdded ? '✓' : 'Add'}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>

              {/* Coaching description */}
              {isExpanded && (
                <View style={{
                  marginHorizontal: 20, marginBottom: 14,
                  backgroundColor: color + '0e', borderRadius: 10,
                  padding: 12, borderLeftWidth: 3, borderLeftColor: color + '55',
                }}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>
                    {ex.coaching}
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── PostSession ──────────────────────────────────────────────────────────────

function ShareButton({ message, color }: { message: string; color: string }) {
  return (
    <TouchableOpacity
      onPress={() => Share.share({ message })}
      activeOpacity={0.7}
      style={{
        flexDirection: 'row', alignItems: 'center', gap: 5,
        alignSelf: 'flex-end', marginTop: 10,
        paddingHorizontal: 12, paddingVertical: 6,
        borderRadius: 20, borderWidth: 1,
        borderColor: color + '55', backgroundColor: color + '15',
      }}>
      <Text style={{ fontSize: 12, color, fontWeight: '600' }}>↑ Share</Text>
    </TouchableOpacity>
  );
}

function PostSession({
  note, prs, volume, theme, noteLoading, onDone, focus, exSummaries,
}: {
  note: string | null; prs: string[]; volume: number;
  theme: AppThemeType; noteLoading: boolean; onDone: () => void;
  focus: string; exSummaries: ExSummary[];
}) {
  const color      = theme.gym ?? '#a855f7';
  const date       = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const totalSets  = exSummaries.reduce((s, e) => s + e.sets, 0);
  const focusLabel = focus.split('–')[0].trim() || focus;

  const cardStyle = {
    borderRadius: 20, padding: 20, marginBottom: 4, borderWidth: 1,
  };

  const recapText = [
    `🏋️ PeakRoutine — Session Recap`,
    `${date}`,
    ``,
    `${volume.toLocaleString()} kg total volume`,
    `${exSummaries.length} exercises · ${totalSets} sets · ${prs.length} PRs`,
    `${focusLabel}`,
  ].join('\n');

  const liftsText = [
    `🏋️ PeakRoutine — Your Lifts`,
    `${date}`,
    ``,
    ...exSummaries.map(ex =>
      `${ex.isPR ? '🏆 ' : ''}${ex.name}: ${ex.sets} sets · best ${ex.bestSet.reps}×${ex.bestSet.weightKg}kg`
    ),
  ].join('\n');

  const prsText = [
    `🏆 PeakRoutine — New Personal Records`,
    `${date}`,
    ``,
    ...prs.map(pr => `🏆 ${pr}`),
  ].join('\n');

  const coachText = [
    `🧠 PeakRoutine — Coach`,
    `${date}`,
    ``,
    note ?? 'Great session — keep showing up.',
  ].join('\n');

  return (
    <ScrollView
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}>

      {/* Header */}
      <Text style={{ fontSize: 44, textAlign: 'center', marginBottom: 6 }}>
        {prs.length > 0 ? '🏆' : '✅'}
      </Text>
      <Text style={{ fontSize: 22, fontWeight: '800', color: theme.textPrimary, textAlign: 'center', marginBottom: 2 }}>
        Session complete
      </Text>
      <Text style={{ fontSize: 13, color: theme.textMuted, textAlign: 'center', marginBottom: 28 }}>
        Tap ↑ Share on any card to post it
      </Text>

      {/* ── Card 1: Recap ── */}
      <View style={[cardStyle, { backgroundColor: color + '18', borderColor: color + '40' }]}>
        <Text style={{ fontSize: 11, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
          Session Recap
        </Text>
        <Text style={{ fontSize: 13, color: theme.textMuted, marginBottom: 4 }}>{date}</Text>
        <Text style={{ fontSize: 32, fontWeight: '900', color: theme.textPrimary, marginBottom: 2 }}>
          {volume.toLocaleString()} kg
        </Text>
        <Text style={{ fontSize: 14, color: theme.textMuted, marginBottom: 14 }}>total volume</Text>
        <View style={{ flexDirection: 'row', gap: 16, marginBottom: 10 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.textPrimary }}>{exSummaries.length}</Text>
            <Text style={{ fontSize: 11, color: theme.textMuted }}>exercises</Text>
          </View>
          <View style={{ width: 1, backgroundColor: theme.border }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.textPrimary }}>{totalSets}</Text>
            <Text style={{ fontSize: 11, color: theme.textMuted }}>sets</Text>
          </View>
          <View style={{ width: 1, backgroundColor: theme.border }} />
          <View style={{ alignItems: 'center' }}>
            <Text style={{ fontSize: 22, fontWeight: '800', color: theme.textPrimary }}>{prs.length}</Text>
            <Text style={{ fontSize: 11, color: theme.textMuted }}>PRs</Text>
          </View>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, color: theme.textMuted }}>{focusLabel}</Text>
        </View>
        <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 10 }}>PeakRoutine</Text>
      </View>
      <ShareButton message={recapText} color={color} />

      {/* ── Card 2: Lifts ── */}
      {exSummaries.length > 0 && (
        <>
          <View style={[cardStyle, { backgroundColor: theme.bgCard, borderColor: theme.border, marginTop: 20 }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Your Lifts
            </Text>
            {exSummaries.map((ex, i) => (
              <View key={i} style={{
                flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
                borderBottomWidth: i < exSummaries.length - 1 ? 1 : 0,
                borderBottomColor: theme.border,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: theme.textPrimary }}>
                    {ex.isPR ? '🏆 ' : ''}{ex.name}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 1 }}>
                    {ex.sets} sets · best {ex.bestSet.reps} × {ex.bestSet.weightKg} kg
                  </Text>
                </View>
              </View>
            ))}
            <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 12 }}>PeakRoutine</Text>
          </View>
          <ShareButton message={liftsText} color={color} />
        </>
      )}

      {/* ── Card 3: PRs ── */}
      {prs.length > 0 && (
        <>
          <View style={[cardStyle, { backgroundColor: '#f59e0b14', borderColor: '#f59e0b44', marginTop: 20 }]}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              New Personal Records
            </Text>
            <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 10 }}>🏆</Text>
            {prs.map((pr, i) => (
              <View key={i} style={{
                backgroundColor: '#f59e0b22', borderRadius: 10,
                padding: 10, marginBottom: i < prs.length - 1 ? 8 : 0,
              }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#f59e0b', textAlign: 'center' }}>{pr}</Text>
              </View>
            ))}
            <Text style={{ fontSize: 10, color: '#f59e0b88', marginTop: 12 }}>PeakRoutine</Text>
          </View>
          <ShareButton message={prsText} color="#f59e0b" />
        </>
      )}

      {/* ── Card 4: Coach note ── */}
      <View style={[cardStyle, { backgroundColor: color + '14', borderColor: color + '30', marginTop: 20 }]}>
        <Text style={{ fontSize: 11, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
          Coach
        </Text>
        {noteLoading ? (
          <View style={{ alignItems: 'center', gap: 10, paddingVertical: 20 }}>
            <ActivityIndicator color={color} />
            <Text style={{ fontSize: 12, color: theme.textMuted }}>Reviewing your session…</Text>
          </View>
        ) : (
          <Text style={{ fontSize: 15, color: theme.textPrimary, lineHeight: 23 }}>
            {note ?? 'Great session — keep showing up.'}
          </Text>
        )}
        <Text style={{ fontSize: 10, color: theme.textMuted, marginTop: 12 }}>PeakRoutine</Text>
      </View>
      {!noteLoading && <ShareButton message={coachText} color={color} />}

      {/* Done button */}
      <TouchableOpacity onPress={onDone} activeOpacity={0.8} style={{
        backgroundColor: color, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 28,
      }}>
        <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Done</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkoutLogSheet({ visible, focus, onClose, onSaved, onCompleteGymEvent }: Props) {
  const { theme }   = useAppTheme();
  const { profile } = useUserProfile();
  const today       = toKey(new Date());

  const defaultExercises = useMemo(() => getDefaultExercisesForFocus(focus), [focus]);
  const activeOption     = useMemo(() => getFocusOption(focus), [focus]);

  // ── Phase ────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState<Phase>('session');

  // ── Exercise data ─────────────────────────────────────────────────────────
  const [loading,    setLoading]    = useState(true);
  const [exStates,   setExStates]   = useState<ExerciseState[]>([]);
  const [showPicker, setShowPicker] = useState(false);

  // ── AI brief ─────────────────────────────────────────────────────────────
  const [brief,        setBrief]        = useState<Brief | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  // ── First-use tips ────────────────────────────────────────────────────────
  const [showTip, setShowTip] = useState(false);
  useEffect(() => {
    safeGetItem('workout_tips_seen').then(v => { if (!v) setShowTip(true); });
  }, []);
  const dismissTip = useCallback(() => {
    setShowTip(false);
    safeSetItem('workout_tips_seen', '1');
  }, []);

  // ── Rest timer ────────────────────────────────────────────────────────────
  const timerRef                      = useRef<ReturnType<typeof setInterval> | null>(null);
  const [restCtx, setRestCtx]         = useState<RestCtx | null>(null);

  // ── Post session ──────────────────────────────────────────────────────────
  const [postNote,     setPostNote]     = useState<string | null>(null);
  const [noteLoading,  setNoteLoading]  = useState(false);
  const [prs,          setPrs]          = useState<string[]>([]);
  const [volume,       setVolume]       = useState(0);
  const [exSummaries,  setExSummaries]  = useState<ExSummary[]>([]);

  // ── Reset on close ───────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) return;
    setPhase('session');
    setBrief(null);
    setBriefLoading(false);
    setRestCtx(null);
    setPostNote(null);
    setPrs([]);
    setExSummaries([]);
    setShowPicker(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, [visible]);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  // ── Load exercise data ───────────────────────────────────────────────────
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setLoading(true);

    (async () => {
      const todayLog = await loadTodayLog(today);
      const states: ExerciseState[] = await Promise.all(
        defaultExercises.map(async (ex): Promise<ExerciseState> => {
          const lastSets = await getLastSets(ex.id);
          if (todayLog) {
            const restored = todayLog.sets.filter(s => s.exerciseId === ex.id);
            if (restored.length > 0) {
              return { exerciseId: ex.id, sets: restored.map(s => ({ weightKg: s.weightKg, reps: s.reps, done: true })), expanded: true, lastSets, swapLoading: false, swapSuggestion: null };
            }
          }
          return { exerciseId: ex.id, sets: initSets(lastSets), expanded: false, lastSets, swapLoading: false, swapSuggestion: null };
        }),
      );
      if (!cancelled) { setExStates(states); setLoading(false); }
    })();

    return () => { cancelled = true; };
  }, [visible, focus, today, defaultExercises]);

  // ── AI pre-session brief ─────────────────────────────────────────────────
  const generateBrief = useCallback(async (states: ExerciseState[]) => {
    if (states.length === 0) return;
    setBriefLoading(true);
    try {
      const exerciseLines = states.map(ex => {
        const name = getExerciseById(ex.exerciseId)?.name ?? ex.exerciseId;
        const last = ex.lastSets.length > 0
          ? `last: ${ex.lastSets.length}×${ex.lastSets[0].weightKg} kg×${ex.lastSets[0].reps}`
          : 'no history';
        return `- ${ex.exerciseId} (${name}): ${last}`;
      }).join('\n');

      const raw = await callClaude({
        systemPrompt: 'You are a strength coach generating a workout plan. Return ONLY valid JSON, no prose.',
        userMessage:
          `Focus: ${focus}\nGoal: ${profile.fitnessGoal}\n\n` +
          `Exercises:\n${exerciseLines}\n\n` +
          `Return: { "targets": [{ "exerciseId": "string", "sets": number, "repsRange": "8-10", "suggestedWeightKg": number, "note": "string" }], "generalNote": "string" }`,
        maxTokens: 600,
      });
      const parsed = extractJSON<Brief>(raw);
      if (parsed?.targets) {
        setBrief(parsed);
        // Apply suggested weights to unstarted sets
        setExStates(prev => prev.map(ex => {
          const target = parsed.targets.find(t => t.exerciseId === ex.exerciseId);
          if (!target || ex.sets.some(s => s.done)) return ex;
          return { ...ex, sets: initSets(ex.lastSets, target) };
        }));
      }
    } catch (_) {
      // Non-fatal — session continues without brief
    } finally {
      setBriefLoading(false);
    }
  }, [focus, profile.fitnessGoal]);

  // Auto-trigger brief once data is loaded
  useEffect(() => {
    if (!loading && exStates.length > 0 && !brief && !briefLoading) {
      generateBrief(exStates);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]); // intentionally only on loading change

  // ── Rest timer ───────────────────────────────────────────────────────────

  /** User taps "Rest Xm" — begin countdown */
  const startRest = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestCtx(prev => prev ? { ...prev, phase: 'counting' } : null);
    timerRef.current = setInterval(() => {
      setRestCtx(prev => {
        if (!prev || prev.phase !== 'counting') {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          return prev;
        }
        if (prev.secs <= 1) {
          clearInterval(timerRef.current!);
          timerRef.current = null;
          Vibration.vibrate();
          return { ...prev, phase: 'done', secs: 0 };
        }
        return { ...prev, secs: prev.secs - 1 };
      });
    }, 1000);
  }, []);

  /** User taps "Skip" or "Let's go" — dismiss rest */
  const skipRest = useCallback(() => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRestCtx(null);
  }, []);

  // ── Exercise state updaters ──────────────────────────────────────────────
  const toggleExpand = useCallback((i: number) =>
    setExStates(p => p.map((ex, idx) => idx === i ? { ...ex, expanded: !ex.expanded } : ex)), []);

  const updateSet = useCallback((exIdx: number, si: number, field: 'weightKg' | 'reps', val: number) =>
    setExStates(p => p.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j === si ? { ...s, [field]: val } : s),
    })), []);

  const markDone = useCallback((exIdx: number, si: number) => {
    // Capture current state before the update
    const ex  = exStates[exIdx];
    const set = ex?.sets[si];
    const marking = set && !set.done; // true = marking done, false = undoing

    setExStates(p => p.map((e, i) => i !== exIdx ? e : {
      ...e, sets: e.sets.map((s, j) => j === si ? { ...s, done: !s.done } : s),
    }));

    if (marking && set.weightKg > 0 && set.reps > 0) {
      // Clear any running timer
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      const exercise    = getExerciseById(ex.exerciseId);
      const recommended = exercise?.isCompound ? 120 : 75;
      setRestCtx({
        exIdx, setIdx: si,
        lastSet: { weightKg: set.weightKg, reps: set.reps },
        phase: 'prompted', secs: recommended, recommended,
      });
    } else {
      // Undoing — clear rest if it was for this set
      setRestCtx(prev =>
        prev?.exIdx === exIdx && prev?.setIdx === si ? null : prev,
      );
    }
  }, [exStates]);

  const addSet = useCallback((i: number) =>
    setExStates(p => p.map((ex, idx) => {
      if (idx !== i) return ex;
      const lastW = [...ex.sets].reverse().find(s => s.weightKg > 0)?.weightKg ?? 20;
      return { ...ex, sets: [...ex.sets, { weightKg: lastW, reps: 8, done: false }] };
    })), []);

  const deleteSet = useCallback((exIdx: number, si: number) =>
    setExStates(p => p.map((ex, i) => {
      if (i !== exIdx) return ex;
      const sets = ex.sets.filter((_, j) => j !== si);
      return { ...ex, sets: sets.length > 0 ? sets : [{ weightKg: 20, reps: 8, done: false }] };
    })), []);

  const removeExercise = useCallback((i: number) =>
    setExStates(p => p.filter((_, idx) => idx !== i)), []);

  const addExercise = useCallback((ex: Exercise) => {
    setExStates(p => [...p, {
      exerciseId: ex.id, sets: [{ weightKg: 20, reps: 8, done: false }],
      expanded: true, lastSets: [], swapLoading: false, swapSuggestion: null,
    }]);
    getLastSets(ex.id).then(lastSets =>
      setExStates(p => p.map(s => s.exerciseId === ex.id && s.lastSets.length === 0 ? { ...s, lastSets } : s)),
    );
    setShowPicker(false);
  }, []);

  // ── AI exercise swap ─────────────────────────────────────────────────────
  const requestSwap = useCallback(async (exIdx: number) => {
    const ex      = exStates[exIdx];
    const current = ex ? getExerciseById(ex.exerciseId) : null;
    if (!current) return;

    setExStates(p => p.map((s, i) => i === exIdx ? { ...s, swapLoading: true, swapSuggestion: null } : s));
    try {
      const existing     = exStates.map(s => s.exerciseId);
      const alternatives = EXERCISES.filter(e => e.category === current.category && !existing.includes(e.id));

      if (alternatives.length === 0) {
        setExStates(p => p.map((s, i) => i === exIdx ? { ...s, swapLoading: false } : s));
        return;
      }

      const altList = alternatives.map(e => `${e.id} (${e.name})`).join(', ');
      const raw = await callClaude({
        systemPrompt: 'You are a strength coach. Return ONLY valid JSON, no markdown: { "exerciseId": "exact_id_from_list", "reason": "one sentence why" }',
        userMessage:  `Swap: ${current.name} (${current.primaryMuscle})\nFocus: ${focus}\nGoal: ${profile.fitnessGoal}\nAvailable (use exact ID): ${altList}`,
        maxTokens: 120,
      });
      const parsed = extractJSON<{ exerciseId: string; reason: string }>(raw);
      let suggested = parsed ? getExerciseById(parsed.exerciseId) : null;
      // Fallback: partial match or first alternative
      if (!suggested && parsed?.exerciseId) {
        suggested = alternatives.find(e =>
          e.id.includes(parsed.exerciseId) || parsed.exerciseId.includes(e.id) ||
          e.name.toLowerCase().includes(parsed.exerciseId.toLowerCase().replace(/_/g, ' '))
        ) ?? alternatives[0];
      }
      if (!suggested) suggested = alternatives[0];

      setExStates(p => p.map((s, i) => i === exIdx ? {
        ...s, swapLoading: false,
        swapSuggestion: { exercise: suggested!, reason: parsed?.reason ?? 'Good alternative for this focus' },
      } : s));
    } catch (_) {
      setExStates(p => p.map((s, i) => i === exIdx ? { ...s, swapLoading: false } : s));
    }
  }, [exStates, focus, profile.fitnessGoal]);

  const acceptSwap = useCallback((exIdx: number) => {
    const newEx = exStates[exIdx]?.swapSuggestion?.exercise;
    if (!newEx) return;
    setExStates(p => p.map((ex, i) => i !== exIdx ? ex : {
      ...ex, exerciseId: newEx.id,
      sets: [{ weightKg: 20, reps: 8, done: false }],
      swapSuggestion: null, lastSets: [],
    }));
    getLastSets(newEx.id).then(lastSets =>
      setExStates(p => p.map(s => s.exerciseId === newEx.id && s.lastSets.length === 0 ? { ...s, lastSets } : s)),
    );
  }, [exStates]);

  const dismissSwap = useCallback((exIdx: number) =>
    setExStates(p => p.map((ex, i) => i === exIdx ? { ...ex, swapSuggestion: null } : ex)), []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    setPhase('saving');
    try {
      // 1. Persist sets
      const sets: SetRecord[] = [];
      let n = 1;
      for (const ex of exStates) {
        for (const s of ex.sets) {
          if (s.weightKg > 0 && s.reps > 0) {
            sets.push({ exerciseId: ex.exerciseId, setNumber: n++, reps: s.reps, weightKg: s.weightKg });
          }
        }
      }
      if (sets.length > 0) {
        await saveWorkoutLog({ date: today, focus, sets });
        onSaved?.();
      }

      const vol = totalVolume(exStates);
      setVolume(vol);

      // 2. PR detection
      const allLogs   = await loadWorkoutLogs();
      const snapshots = computeStrengthSnapshots(allLogs);
      const newPRs: string[] = [];

      for (const ex of exStates) {
        const exercise = getExerciseById(ex.exerciseId);
        if (!exercise) continue;
        const todayBest = Math.max(0, ...ex.sets.map(s => calcE1RM(s.weightKg, s.reps)));
        const history   = getE1RMHistory(snapshots, ex.exerciseId);
        const prevBest  = history.length > 1 ? history[history.length - 2].e1rm : 0;
        if (todayBest > 0 && todayBest > prevBest) {
          newPRs.push(`${exercise.name} ${todayBest.toFixed(1)} kg e1RM`);
        }
      }
      setPrs(newPRs);

      // 3. Build exercise summaries for the shareable cards
      const summaries: ExSummary[] = exStates.flatMap(ex => {
        const exercise = getExerciseById(ex.exerciseId);
        if (!exercise) return [];
        const filled = ex.sets.filter(s => s.weightKg > 0 && s.reps > 0);
        if (!filled.length) return [];
        const bestSet = filled.reduce((best, s) =>
          calcE1RM(s.weightKg, s.reps) > calcE1RM(best.weightKg, best.reps) ? s : best, filled[0]);
        return [{
          name:    exercise.name,
          sets:    filled.length,
          bestSet: { weightKg: bestSet.weightKg, reps: bestSet.reps },
          isPR:    newPRs.some(pr => pr.includes(exercise.name)),
        }];
      });
      setExSummaries(summaries);

      // 4. Transition to post screen — show it immediately, note loads async
      setPhase('post');
      setNoteLoading(true);

      // 5. AI post-session note
      const statsLines = exStates.map(ex => {
        const exercise = getExerciseById(ex.exerciseId);
        const filled   = ex.sets.filter(s => s.weightKg > 0 && s.reps > 0);
        if (!filled.length) return null;
        const avgW   = +(filled.reduce((s, r) => s + r.weightKg, 0) / filled.length).toFixed(1);
        const avgR   = Math.round(filled.reduce((s, r) => s + r.reps, 0) / filled.length);
        const best   = Math.max(...filled.map(s => calcE1RM(s.weightKg, s.reps)));
        const isPR   = newPRs.some(pr => pr.includes(exercise?.name ?? ''));
        return `- ${exercise?.name}: ${filled.length} sets, avg ${avgR}×${avgW} kg, e1RM ${best.toFixed(1)} kg${isPR ? ' ← NEW PR' : ''}`;
      }).filter(Boolean).join('\n');

      callClaude({
        systemPrompt: 'You are a strength coach. Write a 2–3 sentence post-workout note. Be specific with numbers, concise, and action-oriented. No fluff.',
        userMessage:  `Workout: ${focus}\nGoal: ${profile.fitnessGoal}\nVolume: ${vol.toLocaleString()} kg\n\n${statsLines}`,
        maxTokens: 180,
      }).then(raw => setPostNote(raw.trim())).catch(() => {}).finally(() => setNoteLoading(false));

    } catch (_) {
      setPhase('session'); // fallback to session on hard error
    }
  }, [exStates, today, focus, onSaved, profile.fitnessGoal]);

  const handleDone = useCallback(() => {
    onCompleteGymEvent?.();
    onClose();
  }, [onCompleteGymEvent, onClose]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filledCt  = countFilled(exStates);
  const doneCt    = exStates.reduce((n, ex) => n + ex.sets.filter(s => s.done).length, 0);
  const totalSets = exStates.reduce((n, ex) => n + ex.sets.length, 0);
  const liveVol   = totalVolume(exStates);
  const color     = theme.gym ?? '#a855f7';

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>

          {/* ── Header ── */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            paddingHorizontal: 20, paddingVertical: 16,
            borderBottomWidth: 1, borderBottomColor: theme.border,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 18, fontWeight: '700', color: theme.textPrimary }}>
                {activeOption?.emoji ?? '🏋️'} {focus.split('–')[0].trim() || focus}
              </Text>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginTop: 2 }}>
                {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
              </Text>
            </View>
            {phase !== 'post' && (
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={{ fontSize: 16, color: theme.textMuted }}>Close</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Saving spinner ── */}
          {phase === 'saving' && (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
              <ActivityIndicator color={color} size="large" />
              <Text style={{ fontSize: 14, color: theme.textMuted }}>Saving session…</Text>
            </View>
          )}

          {/* ── Post session ── */}
          {phase === 'post' && (
            <PostSession
              note={postNote} prs={prs} volume={volume}
              theme={theme} noteLoading={noteLoading} onDone={handleDone}
              focus={focus} exSummaries={exSummaries}
            />
          )}

          {/* ── Progress bar (session only) ── */}
          {phase === 'session' && !loading && !showPicker && totalSets > 0 && (
            <View style={{ height: 3, backgroundColor: theme.border, marginHorizontal: 0 }}>
              <View style={{
                height: 3,
                width: `${Math.round((doneCt / totalSets) * 100)}%`,
                backgroundColor: doneCt === totalSets ? theme.success : color,
              }} />
            </View>
          )}

          {/* ── Session ── */}
          {phase === 'session' && (
            showPicker ? (
              <ExercisePicker
                existingIds={exStates.map(s => s.exerciseId)}
                focus={focus}
                theme={theme} onAdd={addExercise} onClose={() => setShowPicker(false)}
              />
            ) : loading ? (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                <ActivityIndicator color={color} />
              </View>
            ) : (
              <>
                <ScrollView
                  contentContainerStyle={{ padding: 16, paddingBottom: 16 }}
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}>

                  {/* First-use tip banner */}
                  {showTip && (
                    <TouchableOpacity
                      onPress={dismissTip}
                      activeOpacity={0.8}
                      style={{
                        backgroundColor: theme.bgCardAlt, borderRadius: 12,
                        padding: 12, marginBottom: 14,
                        borderWidth: 1, borderColor: theme.border,
                        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
                      }}>
                      <Text style={{ fontSize: 16 }}>💡</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 13, fontWeight: '600', color: theme.textPrimary, marginBottom: 4 }}>
                          Quick tips
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.textSecondary, lineHeight: 18 }}>
                          Long-press weight or reps to type a custom value · Mark ✓ after each set then tap Rest to start a guided rest · Use Swap inside any exercise for an AI alternative
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 6 }}>Tap to dismiss</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* AI brief banner */}
                  {(briefLoading || brief?.generalNote) && (
                    <View style={{
                      backgroundColor: color + '14', borderRadius: 14,
                      padding: 14, marginBottom: 16,
                      borderWidth: 1, borderColor: color + '30',
                      flexDirection: 'row', alignItems: 'center', gap: 10,
                    }}>
                      {briefLoading ? (
                        <>
                          <ActivityIndicator color={color} size="small" />
                          <Text style={{ fontSize: 13, color: theme.textMuted }}>Tailoring session…</Text>
                        </>
                      ) : (
                        <Text style={{ fontSize: 13, color: theme.textPrimary, flex: 1 }}>✦  {brief!.generalNote}</Text>
                      )}
                    </View>
                  )}

                  {/* Exercise sections */}
                  {exStates.map((state, i) => (
                    <ExerciseSection
                      key={state.exerciseId + i}
                      state={state}
                      brief={brief?.targets.find(t => t.exerciseId === state.exerciseId)}
                      theme={theme}
                      restCtx={restCtx?.exIdx === i ? restCtx : undefined}
                      onToggleExpand={() => toggleExpand(i)}
                      onSetChange={(si, field, val) => updateSet(i, si, field, val)}
                      onAddSet={() => addSet(i)}
                      onDeleteSet={si => deleteSet(i, si)}
                      onMarkDone={si => markDone(i, si)}
                      onRemove={() => removeExercise(i)}
                      onRequestSwap={() => requestSwap(i)}
                      onAcceptSwap={() => acceptSwap(i)}
                      onDismissSwap={() => dismissSwap(i)}
                      onStartRest={startRest}
                      onSkipRest={skipRest}
                    />
                  ))}

                  {/* Add exercise */}
                  <TouchableOpacity onPress={() => setShowPicker(true)} activeOpacity={0.7} style={{
                    alignItems: 'center', paddingVertical: 12, borderRadius: 12,
                    borderWidth: 1, borderStyle: 'dashed', borderColor: theme.border,
                  }}>
                    <Text style={{ fontSize: 13, color: theme.textMuted }}>+ Add exercise</Text>
                  </TouchableOpacity>
                </ScrollView>

                {/* ── Sticky footer: volume + save ── */}
                <View style={{
                  flexDirection: 'row', alignItems: 'center',
                  paddingHorizontal: 16, paddingVertical: 12,
                  borderTopWidth: 1, borderTopColor: theme.border,
                  gap: 12,
                }}>
                  <View style={{ flex: 1 }}>
                    {filledCt > 0 ? (
                      <>
                        <Text style={{ fontSize: 16, fontWeight: '700', color }}>{liveVol.toLocaleString()} kg</Text>
                        <Text style={{ fontSize: 11, color: theme.textMuted, marginTop: 1 }}>{filledCt} set{filledCt !== 1 ? 's' : ''} logged</Text>
                      </>
                    ) : (
                      <Text style={{ fontSize: 13, color: theme.textMuted }}>Log sets to save</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={handleSave}
                    disabled={filledCt === 0}
                    activeOpacity={0.8}
                    style={{
                      paddingHorizontal: 24, paddingVertical: 13,
                      borderRadius: 14,
                      backgroundColor: filledCt > 0 ? color : theme.bgCardAlt,
                      borderWidth: 1, borderColor: filledCt > 0 ? color : theme.border,
                    }}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: filledCt > 0 ? '#fff' : theme.textMuted }}>
                      Save session
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )
          )}

        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}
