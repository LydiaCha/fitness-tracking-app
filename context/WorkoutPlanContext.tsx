/**
 * PeakRoutine — Workout Plan Context
 *
 * Provides a weekly AI-generated workout plan to the entire app.
 * Mirrors MealPlanContext in architecture: Claude is the selection layer over
 * curated exercise candidates, not a free-form generator.
 *
 * Generation flow:
 *   1. Assign splits to gym days (cycling through Upper Push → Lower → Upper Pull → HIIT → Full Body)
 *   2. For every gym day: filter candidates by equipment + level → send to Claude
 *   3. Claude returns WorkoutDay[] — each day has exercises with sets/reps/rest
 *   4. Validate output with validateWorkoutPlan(); fall back to WORKOUT_DETAIL on failure
 *   5. Build workoutContent (split→detail strings) for scheduleBuilder injection
 *   6. Persist to AsyncStorage
 */

import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { callClaude, extractJSON, ClaudeApiError } from '@/utils/claudeApi';
import { safeGetItem, safeSetItem, safeRemoveItem, safeParseJSON } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/appConstants';
import {
  getExerciseCandidates, Exercise, WORKOUT_SPLITS, DEFAULT_WORKOUT_DETAIL,
} from '@/constants/exerciseDatabase';
import { validateWorkoutPlan } from '@/utils/validateClaude';
import { computeDayLoad, dayLoadToPromptString } from '@/utils/dayLoad';
import { UserProfile, loadUserProfile } from '@/constants/userProfile';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WorkoutExercise {
  exerciseId: string;
  name:       string;
  sets:       number;
  reps:       string;
  rest:       string;
  cue?:       string;
}

export interface WorkoutDay {
  /** 0-based index into the user's sorted gymDays array */
  gymDayIndex: number;
  split:       string;
  focus:       string;
  warmup:      string;
  cooldown:    string;
  exercises:   WorkoutExercise[];
}

export interface WorkoutPlanState {
  weeklyPlan:      WorkoutDay[];
  /** Split name → detail string (for scheduleBuilder injection) */
  workoutContent:  Record<string, string>;
  isGenerating:    boolean;
  /** 0–100 progress during generation */
  progress:        number;
  error:           string | null;
  lastGeneratedAt: string | null;
  planIsStale:     boolean;
}

interface WorkoutPlanCtx extends WorkoutPlanState {
  generateWorkoutPlan: (profile: UserProfile) => Promise<WorkoutDay[]>;
  getWorkoutForDay:    (gymDayIndex: number) => WorkoutDay | undefined;
  resetWorkoutPlan:    () => Promise<void>;
}


// ─── Plan fingerprint ─────────────────────────────────────────────────────────

function makeWorkoutFingerprint(profile: UserProfile): string {
  const gymDays = [...(profile.gymDays ?? [])].sort((a, b) => a - b).join(',');
  return `${profile.fitnessGoal}:${profile.fitnessLevel}:${profile.equipment}:${gymDays}`;
}

// ─── WorkoutDay → detail string ───────────────────────────────────────────────

function workoutDayToDetailString(day: WorkoutDay): string {
  const lines: string[] = [];
  lines.push(`Warm-up: ${day.warmup}`);
  for (const ex of day.exercises) {
    lines.push(`• ${ex.name}: ${ex.sets}×${ex.reps}`);
  }
  lines.push(`Cool-down: ${day.cooldown}`);
  return lines.join('\n');
}

// ─── Claude prompt builder ────────────────────────────────────────────────────

interface GymDayWithCandidates {
  gymDayIndex: number;
  workoutType: string;
  workoutFocus: string;
  candidates:   Exercise[];
}

function buildWorkoutPlanPrompt(params: {
  profile:     UserProfile;
  gymDays:     GymDayWithCandidates[];
  dayLoadStr:  string;
}): { systemPrompt: string; userMessage: string } {
  const { profile, gymDays, dayLoadStr } = params;

  const systemPrompt = `You are a personal trainer building a personalised weekly workout plan.
You will receive gym days with their assigned splits and pre-filtered exercise candidates.
Your task: select 5–8 exercises per day and specify sets, reps, and rest.

HARD CONSTRAINTS:
- Select ONLY from the listed candidates for each day. Do not invent exercises.
- Every candidate is already filtered for the user's equipment and fitness level.
- Each day must have at least 4 exercises, maximum 8.
- Sets: 2–5. Reps: must be a string (e.g. "8", "10–12", "30s", "45s", "15 each").
- Rest: must be a string (e.g. "60s", "90s", "2 min", "3 min").

PREFERENCES:
- Prioritise compound movements first, accessory work last.
- Match volume to fitness level: beginners fewer sets, advanced more.
- HIIT days should lead with cardio intervals before core work.
- Include a warmup string and cooldown string per day.

Respond ONLY with a JSON array. No explanation, no markdown:
[
  {
    "gymDayIndex": 0,
    "split": "Upper Push",
    "focus": "Chest · Shoulders · Triceps",
    "warmup": "5 min treadmill + arm circles",
    "cooldown": "5 min chest stretch",
    "exercises": [
      { "exerciseId": "barbell-bench-press", "name": "Barbell bench press", "sets": 4, "reps": "6–8", "rest": "2 min", "cue": "..." },
      ...
    ]
  },
  ...
]`;

  const dayBlocks = gymDays.map(({ gymDayIndex, workoutType, workoutFocus, candidates }) => {
    const candLines = candidates
      .map(ex => `  [${ex.id}] ${ex.name} | ${ex.muscle} | ${ex.pattern} | default: ${ex.defaultSets}×${ex.defaultReps} / ${ex.defaultRest}`)
      .join('\n');
    return `Day ${gymDayIndex} — ${workoutType} (${workoutFocus})\nCandidates:\n${candLines}`;
  }).join('\n\n');

  const userMessage = `User: ${profile.age}yo ${profile.gender}, ${profile.weightKg}kg
Goal: ${profile.fitnessGoal} | Level: ${profile.fitnessLevel} | Equipment: ${profile.equipment}
Training load: ${dayLoadStr}
Gym days this week: ${profile.gymDays.length}

${dayBlocks}`;

  return { systemPrompt, userMessage };
}

// ─── Persisted shape ──────────────────────────────────────────────────────────

interface PersistedWorkoutPlan {
  weeklyPlan:          WorkoutDay[];
  lastGeneratedAt:     string;
  profileFingerprint?: string;
}

// ─── WorkoutDay → detail string (exported for WeeklyPlanContext use) ──────────

export function buildWorkoutContent(plan: WorkoutDay[]): Record<string, string> {
  const content: Record<string, string> = { ...DEFAULT_WORKOUT_DETAIL };
  for (const day of plan) {
    content[day.split] = workoutDayToDetailString(day);
  }
  return content;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<WorkoutPlanCtx | null>(null);

export function WorkoutPlanProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WorkoutPlanState>({
    weeklyPlan:      [],
    workoutContent:  DEFAULT_WORKOUT_DETAIL,
    isGenerating:    false,
    progress:        0,
    error:           null,
    lastGeneratedAt: null,
    planIsStale:     false,
  });

  const generatingRef = useRef(false);

  // ── Load persisted plan on mount ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const raw       = await safeGetItem(STORAGE_KEYS.AI_WORKOUTS);
      const persisted = safeParseJSON<PersistedWorkoutPlan>(raw, { weeklyPlan: [], lastGeneratedAt: '' });
      if (persisted.weeklyPlan.length === 0) return;

      // Validate the loaded plan before using it
      if (!validateWorkoutPlan(persisted.weeklyPlan)) return;

      const workoutContent = buildWorkoutContent(persisted.weeklyPlan);
      const currentProfile = await loadUserProfile();
      const planIsStale    = persisted.profileFingerprint !== undefined &&
        persisted.profileFingerprint !== makeWorkoutFingerprint(currentProfile);

      setState(s => ({
        ...s,
        weeklyPlan:      persisted.weeklyPlan,
        workoutContent,
        lastGeneratedAt: persisted.lastGeneratedAt ?? null,
        planIsStale,
      }));
    })();
  }, []);

  // ── Generation ────────────────────────────────────────────────────────────
  const generateWorkoutPlan = useCallback(async (profile: UserProfile): Promise<WorkoutDay[]> => {
    if (generatingRef.current) return [];
    generatingRef.current = true;
    setState(s => ({ ...s, isGenerating: true, progress: 0, error: null }));

    try {
      const sortedGymDays = [...profile.gymDays].sort((a, b) => a - b);
      const dayLoad       = await computeDayLoad(profile.gymDays);
      const dayLoadStr    = dayLoadToPromptString(dayLoad);

      setState(s => ({ ...s, progress: 5 }));

      // Build candidate list per gym day
      const gymDaysWithCandidates: GymDayWithCandidates[] = sortedGymDays.map((_, i) => {
        const cycleEntry = WORKOUT_SPLITS[i % WORKOUT_SPLITS.length];
        const candidates = getExerciseCandidates(
          cycleEntry.split,
          profile.equipment,
          profile.fitnessLevel,
        );
        return {
          gymDayIndex:  i,
          workoutType:  cycleEntry.workoutType,
          workoutFocus: cycleEntry.workoutFocus,
          candidates,
        };
      });

      setState(s => ({ ...s, progress: 15 }));

      let plan: WorkoutDay[] = [];

      try {
        const { systemPrompt, userMessage } = buildWorkoutPlanPrompt({
          profile,
          gymDays: gymDaysWithCandidates,
          dayLoadStr,
        });
        const raw    = await callClaude({ systemPrompt, userMessage, maxTokens: 3000 });
        const parsed = extractJSON<WorkoutDay[]>(raw);
        const valid  = parsed ? validateWorkoutPlan(parsed) : null;
        if (valid) plan = valid;
      } catch (err) {
        if (err instanceof ClaudeApiError && err.isAuthError) {
          setState(s => ({
            ...s,
            error: 'No API key found. Add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file. Using defaults instead.',
          }));
        }
      }

      setState(s => ({ ...s, progress: 80 }));

      // Fill any missing gym days with synthetic fallback entries
      const plannedIndices = new Set(plan.map(d => d.gymDayIndex));
      for (const { gymDayIndex, workoutType, workoutFocus, candidates } of gymDaysWithCandidates) {
        if (plannedIndices.has(gymDayIndex)) continue;
        plan.push(buildFallbackDay(gymDayIndex, workoutType, workoutFocus, candidates));
      }

      // Sort by gymDayIndex for deterministic ordering
      plan.sort((a, b) => a.gymDayIndex - b.gymDayIndex);

      const workoutContent = buildWorkoutContent(plan);
      const now            = new Date().toISOString();

      await safeSetItem(STORAGE_KEYS.AI_WORKOUTS, JSON.stringify({
        weeklyPlan:          plan,
        lastGeneratedAt:     now,
        profileFingerprint:  makeWorkoutFingerprint(profile),
      } as PersistedWorkoutPlan));

      setState(s => ({
        ...s,
        weeklyPlan:      plan,
        workoutContent,
        isGenerating:    false,
        planIsStale:     false,
        progress:        100,
        lastGeneratedAt: now,
        error: s.error?.includes('API key') ? s.error : null,
      }));

      return plan;
    } catch (err) {
      setState(s => ({ ...s, isGenerating: false, error: `Workout generation failed: ${String(err)}` }));
      return [];
    } finally {
      generatingRef.current = false;
    }
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetWorkoutPlan = useCallback(async () => {
    await safeRemoveItem(STORAGE_KEYS.AI_WORKOUTS);
    setState({
      weeklyPlan:      [],
      workoutContent:  DEFAULT_WORKOUT_DETAIL,
      isGenerating:    false,
      progress:        0,
      error:           null,
      lastGeneratedAt: null,
      planIsStale:     false,
    });
  }, []);

  // ── Convenience ───────────────────────────────────────────────────────────
  const getWorkoutForDay = useCallback(
    (gymDayIndex: number) => state.weeklyPlan.find(d => d.gymDayIndex === gymDayIndex),
    [state.weeklyPlan],
  );

  return (
    <Ctx.Provider value={{ ...state, generateWorkoutPlan, getWorkoutForDay, resetWorkoutPlan }}>
      {children}
    </Ctx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWorkoutPlan(): WorkoutPlanCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWorkoutPlan must be used inside <WorkoutPlanProvider>');
  return ctx;
}

// ─── Fallback day builder ─────────────────────────────────────────────────────

function buildFallbackDay(
  gymDayIndex:  number,
  workoutType:  string,
  workoutFocus: string,
  candidates:   Exercise[],
): WorkoutDay {
  // Pick up to 6 candidates in database order (already sorted by split/muscle group)
  const selected = candidates.slice(0, 6);
  return {
    gymDayIndex,
    split:    workoutType,
    focus:    workoutFocus,
    warmup:   '5 min light cardio + dynamic stretch',
    cooldown: '5–10 min static stretch',
    exercises: selected.map(ex => ({
      exerciseId: ex.id,
      name:       ex.name,
      sets:       ex.defaultSets,
      reps:       ex.defaultReps,
      rest:       ex.defaultRest,
      cue:        ex.cue,
    })),
  };
}
