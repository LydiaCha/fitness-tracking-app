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
  TextInput, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Vibration, Dimensions, Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { ExerciseInfoSheet } from '@/components/ExerciseInfoSheet';
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
  exerciseId: string;
  sets:       SetDraft[];
  expanded:   boolean;
  lastSets:   SetRecord[];
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
  value, step, min, max, unit, onChange, theme, color, width,
}: {
  value: number; step: number; min: number; max: number;
  unit: string; onChange: (v: number) => void; theme: AppThemeType; color: string;
  width?: number;
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
          width: 90, height: 42, borderRadius: 12,
          borderWidth: 1.5, borderColor: color,
          backgroundColor: theme.bgCardAlt,
          color: theme.textPrimary, fontSize: 16,
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

  // Merged pill: [−  |  value\nunit  |  +]
  return (
    <View style={{
      flexDirection: 'row', height: 52, borderRadius: 12,
      borderWidth: 1, borderColor: hasValue ? color : theme.border,
      backgroundColor: hasValue ? color + '12' : theme.bgCardAlt,
      overflow: 'hidden',
      ...(width ? { width } : { flex: 1 }),
    }}>
      <TouchableOpacity
        onPress={() => onChange(+Math.max(min, value - step).toFixed(1))}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 0 }}
        style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 22, color: hasValue ? color : theme.textMuted, lineHeight: 26, marginTop: -1 }}>−</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onLongPress={() => { setText(value > 0 ? String(value) : ''); setEditing(true); }}
        delayLongPress={400}
        style={{
          flex: 1, alignItems: 'center', justifyContent: 'center',
          borderLeftWidth: 1, borderRightWidth: 1, borderColor: hasValue ? color + '40' : theme.border,
        }}>
        {value > 0 ? (
          <>
            <Text style={{ fontSize: 17, fontWeight: '800', color: theme.textPrimary, lineHeight: 20 }}>
              {value}
            </Text>
            <Text style={{ fontSize: 10, color: color, fontWeight: '600', letterSpacing: 0.5, marginTop: 1 }}>
              {unit.trim().toUpperCase()}
            </Text>
          </>
        ) : (
          <Text style={{ fontSize: 14, color: theme.textMuted }}>—</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => onChange(+Math.min(max, value + step).toFixed(1))}
        hitSlop={{ top: 4, bottom: 4, left: 0, right: 4 }}
        style={{ width: 36, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 22, color: hasValue ? color : theme.textMuted, lineHeight: 26, marginTop: -1 }}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─── SetRow ───────────────────────────────────────────────────────────────────

function SetRow({
  set, coachWeight, theme, onChange, onDelete, onMarkDone,
}: {
  set:          SetDraft;
  coachWeight?: number;
  theme:        AppThemeType;
  onChange:     (field: 'weightKg' | 'reps', val: number) => void;
  onDelete:     () => void;
  onMarkDone:   () => void;
}) {
  const color       = theme.gym;
  const isUnstarted = !set.done && set.weightKg === 0 && set.reps === 0;

  return (
    <View style={{ marginBottom: 8 }}>
      {coachWeight && isUnstarted && (
        <Text style={{ fontSize: 11, color, marginBottom: 3, fontWeight: '600', opacity: 0.85 }}>
          ✦ Coach: {coachWeight} kg target
        </Text>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: set.done ? 0.5 : 1 }}>
        <Stepper value={set.weightKg} step={2.5} min={0} max={300} unit=" kg"
          onChange={v => onChange('weightKg', v)} theme={theme} color={color} />

        <Text style={{ fontSize: 13, color: theme.textMuted, fontWeight: '300' }}>×</Text>

        <Stepper value={set.reps} step={1} min={0} max={50} unit=" reps"
          onChange={v => onChange('reps', v)} theme={theme} color={color} />

        {/* Done button — red tint when done, neutral when pending */}
        <TouchableOpacity
          onPress={onMarkDone}
          hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
          style={{
            width: 38, height: 38, borderRadius: 19,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: set.done ? color + '18' : theme.bgCardAlt,
            borderWidth: 1.5,
            borderColor: set.done ? color + '55' : theme.border,
          }}>
          <Text style={{ fontSize: 17, color: set.done ? color : theme.textMuted }}>✓</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onDelete} hitSlop={{ top: 12, bottom: 12, left: 8, right: 4 }}>
          <Text style={{ fontSize: 14, color: theme.textMuted + '80' }}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── RestBanner ───────────────────────────────────────────────────────────────

function RestBanner({
  ctx, isCompound, onStart, onSkip, theme,
}: {
  ctx:        RestCtx;
  isCompound: boolean;
  onStart:    () => void;
  onSkip:     () => void;
  theme:      AppThemeType;
}) {
  const fmt = (s: number) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const cyan         = theme.secondary;
  const lastSetText  = `${ctx.lastSet.reps} × ${ctx.lastSet.weightKg} kg`;
  const nextSetLabel = `Set ${ctx.setIdx + 2}`;

  return (
    <View style={{
      marginHorizontal: 14, marginBottom: 12,
      backgroundColor: theme.bgCardAlt, borderRadius: 12,
      borderWidth: 1,
      borderColor: ctx.phase === 'done' ? theme.success + '55' : theme.border,
      padding: 12,
    }}>
      {ctx.phase === 'prompted' && (
        <>
          <Text style={{ fontSize: 12, color: theme.success, fontWeight: '600', marginBottom: 6 }}>
            ✓ Set {ctx.setIdx + 1} done · {lastSetText}
          </Text>
          <Text style={{ fontSize: 11, color: theme.textMuted, marginBottom: 10 }}>
            {isCompound ? 'Compound lift — 2 min rest recommended' : 'Isolation — 75 s rest recommended'}
          </Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity onPress={onStart} activeOpacity={0.8} style={{
              flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: 10,
              backgroundColor: cyan + '20', borderWidth: 1, borderColor: cyan + '55',
            }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: cyan }}>
                ⏱ Rest {fmt(ctx.recommended)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSkip} activeOpacity={0.8} style={{
              paddingHorizontal: 16, paddingVertical: 9, borderRadius: 10,
              borderWidth: 1, borderColor: theme.border,
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
              <Text style={{ fontSize: 44, fontWeight: '900', color: theme.textPrimary, lineHeight: 50 }}>{fmt(ctx.secs)}</Text>
              <Text style={{ fontSize: 12, color: theme.textMuted, marginBottom: 4 }}>remaining</Text>
            </View>
            <View style={{ height: 4, backgroundColor: theme.border, borderRadius: 2, overflow: 'hidden' }}>
              <View style={{ height: 4, borderRadius: 2, backgroundColor: cyan, width: `${Math.round((ctx.secs / ctx.recommended) * 100)}%` }} />
            </View>
          </View>
          <TouchableOpacity onPress={onSkip} activeOpacity={0.8} style={{
            alignItems: 'center', paddingVertical: 9, borderRadius: 10,
            borderWidth: 1, borderColor: cyan + '55', backgroundColor: cyan + '15',
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: cyan }}>Start {nextSetLabel} now →</Text>
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
            backgroundColor: theme.success + '20', borderWidth: 1, borderColor: theme.success + '55',
          }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: theme.success }}>💪 Let's go</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── ExerciseSection ──────────────────────────────────────────────────────────

function ExerciseSection({
  state, brief, theme, restCtx, isActive,
  onToggleExpand, onSetChange, onAddSet, onDeleteSet, onMarkDone,
  onRemove, onStartRest, onSkipRest, onInfo,
}: {
  state:          ExerciseState;
  brief?:         ExerciseBrief;
  theme:          AppThemeType;
  restCtx?:       RestCtx;
  isActive:       boolean;
  onToggleExpand: () => void;
  onSetChange:    (si: number, field: 'weightKg' | 'reps', val: number) => void;
  onAddSet:       () => void;
  onDeleteSet:    (si: number) => void;
  onMarkDone:     (si: number) => void;
  onRemove:       () => void;
  onStartRest:    () => void;
  onSkipRest:     () => void;
  onInfo:         () => void;
}) {
  const exercise  = getExerciseById(state.exerciseId);
  if (!exercise) return null;

  const color   = theme.gym;
  const allDone = state.sets.length > 0 && state.sets.every(s => s.done);

  return (
    <View style={{
      backgroundColor: theme.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: isActive ? theme.gym : theme.border,
      marginBottom: 10,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <TouchableOpacity onPress={onToggleExpand} activeOpacity={0.7}
        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 10 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: theme.textPrimary }}>{exercise.name}</Text>
            <TouchableOpacity onPress={onInfo} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} activeOpacity={0.6}>
              <Text style={{ fontSize: 13, color: theme.textMuted }}>ⓘ</Text>
            </TouchableOpacity>
            {allDone && (
              <View style={{ backgroundColor: theme.bgCardAlt, borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1, borderColor: theme.border }}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.textMuted }}>✓ DONE</Text>
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
                backgroundColor: s.done ? color : s.weightKg > 0 && s.reps > 0 ? color + '50' : color + '18',
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
              key={i} set={set} theme={theme}
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
              borderWidth: 1, borderColor: theme.border,
            }}>
              <Text style={{ fontSize: 13, color: theme.textMuted, fontWeight: '500' }}>+ Add set</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={onRemove} activeOpacity={0.7} style={{
              paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10,
              borderWidth: 1, borderColor: theme.border,
            }}>
              <Text style={{ fontSize: 13, color: theme.textMuted }}>Remove</Text>
            </TouchableOpacity>
          </View>
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

  const color    = theme.gym;
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

              {/* Quick form cue */}
              {isExpanded && ex.cues.length > 0 && (
                <View style={{
                  marginHorizontal: 20, marginBottom: 14,
                  backgroundColor: theme.bgCardAlt, borderRadius: 10,
                  padding: 12, borderWidth: 1, borderColor: theme.border,
                }}>
                  <Text style={{ fontSize: 13, color: theme.textSecondary, lineHeight: 20 }}>
                    {ex.cues[0]}
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

function PostSession({
  note, prs, volume, theme, noteLoading, onDone, focus, exSummaries,
}: {
  note: string | null; prs: string[]; volume: number;
  theme: AppThemeType; noteLoading: boolean; onDone: () => void;
  focus: string; exSummaries: ExSummary[];
}) {
  const { width: ww } = Dimensions.get('window');
  const color      = theme.gym;
  const gold       = '#f59e0b';
  const hasPRs     = prs.length > 0;
  const focusLabel = focus.split('–')[0].trim() || focus;
  const focusSub   = focus.includes('–') ? focus.split('–')[1]?.trim() ?? '' : '';
  const totalSets  = exSummaries.reduce((s, e) => s + e.sets, 0);
  const shortDate  = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();

  const [activeIdx, setActiveIdx] = useState(0);
  const [pagerH,    setPagerH]    = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const scrollTo = (idx: number) => {
    scrollRef.current?.scrollTo({ x: idx * ww, animated: true });
    setActiveIdx(idx);
  };

  // ── Share text per card ───────────────────────────────────────────────────
  const recapShare = [
    `🏋️ ${focusLabel.toUpperCase()} · DONE`,
    volume > 0 ? `${volume.toLocaleString()} kg total volume` : 'Session logged',
    `${exSummaries.length} exercises · ${totalSets} sets${hasPRs ? ` · ${prs.length} PR${prs.length > 1 ? 's' : ''}` : ''}`,
    ``, `Tracked with PeakRoutine 🔥`,
  ].join('\n');

  const liftsShare = [
    `🏋️ ${focusLabel.toUpperCase()} — MY LIFTS`, ``,
    ...exSummaries.map(ex =>
      `${ex.isPR ? '🏆 ' : ''}${ex.name}: ${ex.sets} sets · ${ex.bestSet.reps} × ${ex.bestSet.weightKg} kg`
    ),
    ``, `Tracked with PeakRoutine 🔥`,
  ].join('\n');

  const coachShare = [
    hasPRs ? `🏆 NEW PERSONAL RECORD${prs.length > 1 ? 'S' : ''}` : `🧠 COACH NOTE`,
    ``,
    ...(hasPRs ? prs.map(pr => `🏆 ${pr}`) : []),
    hasPRs && note ? `` : '',
    note ?? 'Great session — keep showing up.',
    ``, `Tracked with PeakRoutine 🔥`,
  ].join('\n');

  // ── Sub-components ────────────────────────────────────────────────────────
  const Divider = () => (
    <View style={{ height: 1, backgroundColor: '#FFFFFF14', marginVertical: 20 }} />
  );

  const BrandRow = ({ shareText }: { shareText: string }) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: '#FFFFFF45', letterSpacing: 2, textTransform: 'uppercase' }}>
        PeakRoutine
      </Text>
      <TouchableOpacity
        onPress={() => Share.share({ message: shareText })}
        activeOpacity={0.7}
        style={{
          flexDirection: 'row', alignItems: 'center', gap: 6,
          paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
          backgroundColor: '#FFFFFF18', borderWidth: 1, borderColor: '#FFFFFF28',
        }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFFCC' }}>Share ↑</Text>
      </TouchableOpacity>
    </View>
  );

  const Dot = ({ active }: { active: boolean }) => (
    <View style={{ width: active ? 22 : 6, height: 6, borderRadius: 3,
      backgroundColor: active ? color : theme.border }} />
  );

  return (
    <View style={{ flex: 1 }}>

      {/* ── Pager ─────────────────────────────────────────────────────────── */}
      <View style={{ flex: 1 }} onLayout={e => setPagerH(e.nativeEvent.layout.height)}>
        {pagerH > 0 && (
          <ScrollView
            ref={scrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={e =>
              setActiveIdx(Math.round(e.nativeEvent.contentOffset.x / ww))
            }
          >

            {/* ── Card 1: Hero Recap ── */}
            <LinearGradient
              colors={['#1B0930', '#0D0D1A']}
              start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
              style={{ width: ww, height: pagerH, padding: 28, justifyContent: 'space-between' }}
            >
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color }} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      Session Complete
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#FFFFFF45', fontWeight: '600' }}>{shortDate}</Text>
                </View>
                <Text style={{ fontSize: 30, fontWeight: '900', color: '#FFFFFF', marginTop: 6, lineHeight: 34 }}>
                  {focusLabel}
                </Text>
                {focusSub !== '' && (
                  <Text style={{ fontSize: 11, color: '#FFFFFF50', letterSpacing: 1, textTransform: 'uppercase' }}>
                    {focusSub}
                  </Text>
                )}
              </View>

              <View style={{ alignItems: 'center' }}>
                {volume > 0 ? (
                  <>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: '#FFFFFF45', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 }}>
                      Total Volume
                    </Text>
                    <Text style={{ fontSize: 72, fontWeight: '900', color: '#FFFFFF', lineHeight: 78 }}>
                      {volume.toLocaleString()}
                    </Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color, letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>
                      kilograms
                    </Text>
                  </>
                ) : (
                  <Text style={{ fontSize: 52, marginBottom: 4 }}>{hasPRs ? '🏆' : '✅'}</Text>
                )}

                <View style={{ flexDirection: 'row', marginTop: 36, gap: 0 }}>
                  {[
                    { val: exSummaries.length, label: 'exercises', accent: false },
                    { val: totalSets,          label: 'sets',      accent: false },
                    { val: prs.length,         label: 'PRs',       accent: hasPRs },
                  ].map(({ val, label, accent }, idx) => (
                    <React.Fragment key={label}>
                      {idx > 0 && (
                        <View style={{ width: 1, backgroundColor: '#FFFFFF20', alignSelf: 'center', height: 30, marginHorizontal: 20 }} />
                      )}
                      <View style={{ alignItems: 'center', minWidth: 54 }}>
                        <Text style={{ fontSize: 36, fontWeight: '900', color: accent ? gold : '#FFFFFF', lineHeight: 40 }}>
                          {val}
                        </Text>
                        <Text style={{ fontSize: 10, color: '#FFFFFF45', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                          {label}
                        </Text>
                      </View>
                    </React.Fragment>
                  ))}
                </View>
              </View>

              <View>
                <Divider />
                <BrandRow shareText={recapShare} />
              </View>
            </LinearGradient>

            {/* ── Card 2: Lifts ── */}
            <LinearGradient
              colors={['#061520', '#0D0D1A']}
              start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
              style={{ width: ww, height: pagerH, padding: 28, justifyContent: 'space-between' }}
            >
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.secondary }} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.secondary, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      Your Lifts
                    </Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#FFFFFF45', fontWeight: '600' }}>{shortDate}</Text>
                </View>
                <Text style={{ fontSize: 24, fontWeight: '800', color: '#FFFFFF', marginTop: 6 }}>{focusLabel}</Text>
              </View>

              <View style={{ flex: 1, justifyContent: 'center', marginVertical: 8 }}>
                <View style={{ height: 1, backgroundColor: '#FFFFFF14', marginBottom: 14 }} />
                {exSummaries.slice(0, 6).map((ex, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}>
                    <Text style={{ fontSize: 14, width: 20, textAlign: 'center', color: ex.isPR ? gold : '#FFFFFF35' }}>
                      {ex.isPR ? '🏆' : '·'}
                    </Text>
                    <Text style={{ flex: 1, fontSize: 14, fontWeight: ex.isPR ? '700' : '500',
                      color: ex.isPR ? '#FFFFFF' : '#FFFFFFCC' }}>
                      {ex.name}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#FFFFFF55' }}>
                      {ex.sets}×{ex.bestSet.reps} @ {ex.bestSet.weightKg}kg
                    </Text>
                  </View>
                ))}
                {exSummaries.length > 6 && (
                  <Text style={{ fontSize: 11, color: '#FFFFFF35', textAlign: 'center', marginTop: 4 }}>
                    +{exSummaries.length - 6} more
                  </Text>
                )}
                <View style={{ height: 1, backgroundColor: '#FFFFFF14', marginTop: 14 }} />
                {volume > 0 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 16 }}>
                    <View style={{ backgroundColor: '#FFFFFF10', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#FFFFFFCC' }}>
                        {volume.toLocaleString()} kg total volume
                      </Text>
                    </View>
                  </View>
                )}
              </View>

              <View>
                <Divider />
                <BrandRow shareText={liftsShare} />
              </View>
            </LinearGradient>

            {/* ── Card 3: Coach + PRs ── */}
            <LinearGradient
              colors={hasPRs ? ['#1A0E00', '#0D0D1A'] : ['#08101E', '#0D0D1A']}
              start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }}
              style={{ width: ww, height: pagerH, padding: 28, justifyContent: 'space-between' }}
            >
              {hasPRs ? (
                <View style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: gold }} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: gold, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      Personal Record{prs.length > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 28, fontWeight: '900', color: '#FFFFFF', marginTop: 4 }}>🏆 New best!</Text>
                  <View style={{ gap: 8, marginTop: 12 }}>
                    {prs.map((pr, i) => (
                      <View key={i} style={{ backgroundColor: gold + '18', borderRadius: 12,
                        padding: 14, borderWidth: 1, borderColor: gold + '35' }}>
                        <Text style={{ fontSize: 15, fontWeight: '700', color: gold }}>{pr}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary }} />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primary, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                    Coach
                  </Text>
                </View>
              )}

              <View style={{ flex: 1, justifyContent: hasPRs ? 'flex-end' : 'center', paddingTop: hasPRs ? 0 : 0 }}>
                {hasPRs && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 14 }}>
                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary }} />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: theme.primary, textTransform: 'uppercase', letterSpacing: 1.5 }}>
                      Coach
                    </Text>
                  </View>
                )}
                {noteLoading ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator color={theme.primary} size="small" />
                    <Text style={{ fontSize: 13, color: '#FFFFFF45' }}>Writing your note…</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 16, color: '#FFFFFFEE', lineHeight: 26 }}>
                    {note ?? 'Great session — keep showing up.'}
                  </Text>
                )}
              </View>

              <View>
                <Divider />
                <BrandRow shareText={coachShare} />
              </View>
            </LinearGradient>

          </ScrollView>
        )}
      </View>

      {/* ── Bottom chrome ─────────────────────────────────────────────────── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18, gap: 14 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <TouchableOpacity key={i} onPress={() => scrollTo(i)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
              <Dot active={activeIdx === i} />
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity onPress={onDone} activeOpacity={0.8} style={{
          backgroundColor: color, borderRadius: 16, paddingVertical: 15, alignItems: 'center',
        }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>Done</Text>
        </TouchableOpacity>
      </View>

    </View>
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
  const [loading,      setLoading]      = useState(true);
  const [exStates,     setExStates]     = useState<ExerciseState[]>([]);
  const [activeExIdx,  setActiveExIdx]  = useState(0);
  const [showPicker,   setShowPicker]   = useState(false);
  const [infoExercise, setInfoExercise] = useState<Exercise | null>(null);

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
              return { exerciseId: ex.id, sets: restored.map(s => ({ weightKg: s.weightKg, reps: s.reps, done: true })), expanded: true, lastSets };
            }
          }
          return { exerciseId: ex.id, sets: initSets(lastSets), expanded: false, lastSets };
        }),
      );
      // On resume, open the first incomplete exercise; on fresh start, open index 0
      const firstIncomplete = states.findIndex(s => !s.sets.every(set => set.done));
      const startIdx = firstIncomplete !== -1 ? firstIncomplete : 0;
      if (states.length > 0) states[startIdx] = { ...states[startIdx], expanded: true };
      if (!cancelled) { setExStates(states); setActiveExIdx(startIdx); setLoading(false); }
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
  const toggleExpand = useCallback((i: number) => {
    setActiveExIdx(i);
    setExStates(p => p.map((ex, idx) => idx === i ? { ...ex, expanded: !ex.expanded } : ex));
  }, []);

  const updateSet = useCallback((exIdx: number, si: number, field: 'weightKg' | 'reps', val: number) =>
    setExStates(p => p.map((ex, i) => i !== exIdx ? ex : {
      ...ex, sets: ex.sets.map((s, j) => j === si ? { ...s, [field]: val } : s),
    })), []);

  const markDone = useCallback((exIdx: number, si: number) => {
    const ex  = exStates[exIdx];
    const set = ex?.sets[si];
    const marking = set && !set.done;

    setExStates(prev => {
      const updated = prev.map((e, i) => i !== exIdx ? e : {
        ...e, sets: e.sets.map((s, j) => j === si ? { ...s, done: !s.done } : s),
      });
      // Auto-advance: collapse done exercise, expand next undone one
      if (marking && set.weightKg > 0 && set.reps > 0) {
        const allDone = updated[exIdx].sets.every(s => s.done);
        if (allDone) {
          const nextIdx = updated.findIndex((e, i) => i > exIdx && !e.sets.every(s => s.done));
          if (nextIdx !== -1) {
            setActiveExIdx(nextIdx);
            return updated.map((e, i) => {
              if (i === exIdx)   return { ...e, expanded: false };
              if (i === nextIdx) return { ...e, expanded: true };
              return e;
            });
          } else {
            // Last exercise — just collapse it
            return updated.map((e, i) => i === exIdx ? { ...e, expanded: false } : e);
          }
        }
      }
      return updated;
    });

    if (marking && set.weightKg > 0 && set.reps > 0) {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      setRestCtx(null);  // clear any stale banner before setting the new one
      const exercise    = getExerciseById(ex.exerciseId);
      const recommended = exercise?.isCompound
        ? ({ lose: 60, maintain: 90, gain: 120 }[profile.fitnessGoal] ?? 90)
        : ({ lose: 45, maintain: 60, gain: 90  }[profile.fitnessGoal] ?? 60);
      setRestCtx({
        exIdx, setIdx: si,
        lastSet: { weightKg: set.weightKg, reps: set.reps },
        phase: 'prompted', secs: recommended, recommended,
      });
    } else {
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

  const removeExercise = useCallback((i: number) => {
    setExStates(p => p.filter((_, idx) => idx !== i));
    setActiveExIdx(prev => {
      if (prev < i)  return prev;           // removed after active — unchanged
      if (prev > i)  return prev - 1;       // removed before active — shift down
      return Math.max(0, i - 1);            // removed the active one — go to previous
    });
  }, []);

  const addExercise = useCallback((ex: Exercise) => {
    setActiveExIdx(exStates.length);
    setExStates(p => [...p, {
      exerciseId: ex.id, sets: [{ weightKg: 20, reps: 8, done: false }],
      expanded: true, lastSets: [],
    }]);
    getLastSets(ex.id).then(lastSets =>
      setExStates(p => p.map(s => s.exerciseId === ex.id && s.lastSets.length === 0 ? { ...s, lastSets } : s)),
    );
    setShowPicker(false);
  }, [exStates.length]);


  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (phase !== 'session') return;   // guard against double-tap
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
      setPhase('session');
      Alert.alert('Save failed', 'Could not save your session. Please try again.');
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
    <>
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
                          Long-press weight or reps to type a custom value · Mark ✓ after each set to start a guided rest timer · Tap + to add more exercises
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
                      isActive={i === activeExIdx}
                      onToggleExpand={() => toggleExpand(i)}
                      onSetChange={(si, field, val) => updateSet(i, si, field, val)}
                      onAddSet={() => addSet(i)}
                      onDeleteSet={si => deleteSet(i, si)}
                      onMarkDone={si => markDone(i, si)}
                      onRemove={() => removeExercise(i)}
                      onStartRest={startRest}
                      onSkipRest={skipRest}
                      onInfo={() => setInfoExercise(getExerciseById(state.exerciseId) ?? null)}
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
    <ExerciseInfoSheet exercise={infoExercise} onClose={() => setInfoExercise(null)} />
    </>
  );
}
