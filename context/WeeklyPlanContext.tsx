/**
 * PeakRoutine — Weekly Plan Context
 *
 * Owns the AI-generated weekly schedule shown in the Today view.
 * Combines two AI calls into a single weekly plan:
 *   1. Meal selection  (delegated to MealPlanContext)
 *   2. Workout focus   (small Claude call — one focus string per gym day)
 *
 * The result is a DaySchedule[] with the same shape as WEEK_SCHEDULE, but
 * with meal events replaced by AI-selected meals and workoutFocus updated.
 *
 * Auto-regenerates on the first app open of a new week (Monday).
 * Falls back to the hardcoded WEEK_SCHEDULE when no plan exists yet.
 */

import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { WEEK_SCHEDULE, DaySchedule, ScheduleEvent } from '@/constants/scheduleData';
import { getMeal } from '@/constants/mealDatabase';
import { MealPlanEntry, MEAL_ORDER } from '@/types/meal';
import { useMealPlan } from '@/context/MealPlanContext';
import { useWorkoutPlan, buildWorkoutContent } from '@/context/WorkoutPlanContext';
import { safeGetItem, safeSetItem, safeParseJSON } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/appConstants';
import { loadUserProfile, UserProfile, DEFAULT_PROFILE } from '@/constants/userProfile';
import { generateScheduleSkeleton } from '@/utils/scheduleBuilder';

// ─── Helpers ──────────────────────────────────────────────────────────────────


/** Returns the ISO date string of this week's Monday (local time). */
function getThisWeekMonday(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

/**
 * Convert JS day index (0=Sun) → Mon-first index (0=Mon).
 * Used to map UserProfile.gymDays → MealPlanEntry.slot.day / WEEK_SCHEDULE index.
 */
function jsToMonFirst(jsDay: number): number {
  return (jsDay - 1 + 7) % 7;
}

// ─── Prep detail builder ──────────────────────────────────────────────────────

const PREP_TYPE_LABELS: Record<string, string> = {
  breakfast: 'Breakfasts',
  lunch:     'Lunches',
  dinner:    'Dinners',
  snack:     'Snacks',
  smoothie:  'Smoothies',
};

/**
 * Builds the dynamic "Meal prep for the week" detail string from this
 * week's generated meal entries. Groups unique meals by type with repeat counts.
 */
function buildPrepDetail(mealEntries: MealPlanEntry[]): string {
  const lines: string[] = ['Sunday batch cook (1.5–2 hrs):\n'];

  const types = ['breakfast', 'lunch', 'dinner', 'snack', 'smoothie'];

  for (const mealType of types) {
    const typeEntries = mealEntries.filter(e => e.slot.mealType === mealType);
    if (typeEntries.length === 0) continue;

    const counts = new Map<string, number>();
    for (const entry of typeEntries) {
      const meal = getMeal(entry.mealId);
      if (!meal) continue;
      counts.set(meal.name, (counts.get(meal.name) ?? 0) + 1);
    }
    if (counts.size === 0) continue;

    lines.push((PREP_TYPE_LABELS[mealType] ?? mealType) + ':');
    for (const [name, count] of counts) {
      lines.push(`• ${name}${count > 1 ? ` ×${count}` : ''}`);
    }
    lines.push('');
  }

  lines.push('Anything appearing ×2 or more is worth batch cooking on Sunday!');
  return lines.join('\n').trim();
}

// ─── Persisted-overlay hydration ─────────────────────────────────────────────

/**
 * Rebuilds a DaySchedule[] by applying a FRESH skeleton (updated event times,
 * supplements, etc.) while preserving the MEAL CHOICES from a previously
 * persisted overlay. This ensures user meal swaps survive app restarts.
 *
 * Non-meal events always come from the fresh skeleton so schedule changes
 * (sleep time, gym days) take effect immediately.
 */
function rebuildFromPersistedOverlay(
  persistedOverlay: DaySchedule[],
  workoutFocuses:   Record<string, string>,
  skeleton:         DaySchedule[],
): DaySchedule[] {
  return skeleton.map((skeletonDay, dayIndex) => {
    const persistedDay = persistedOverlay[dayIndex];
    if (!persistedDay) return skeletonDay;

    // Meal events from the persisted overlay, in slot order
    const persistedMeals = persistedDay.events.filter(e => e.type === 'meal');

    // Slot indices (positions of meal-type events) in the fresh skeleton
    const mealSlotIndices = skeletonDay.events
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.type === 'meal')
      .map(({ i }) => i);

    const newEvents: ScheduleEvent[] = [...skeletonDay.events];
    mealSlotIndices.forEach((eventIdx, pos) => {
      const src = persistedMeals[pos];
      if (!src?.recipeId) return;
      newEvents[eventIdx] = {
        ...skeletonDay.events[eventIdx],   // keep skeleton label, time, type
        recipeId:   src.recipeId,
        recipeType: src.recipeType,
        macros:     src.macros,
        ...(src.detail ? { detail: src.detail } : {}),
      };
    });

    // Preserve the meal-prep detail on Sunday (day 6)
    if (dayIndex === 6) {
      const skeletonPrepIdx = newEvents.findIndex(
        e => e.type === 'prep' && e.label === 'Meal prep for the week',
      );
      if (skeletonPrepIdx !== -1) {
        const persistedPrep = persistedDay.events.find(
          e => e.type === 'prep' && e.label === 'Meal prep for the week',
        );
        if (persistedPrep?.detail) {
          newEvents[skeletonPrepIdx] = { ...newEvents[skeletonPrepIdx], detail: persistedPrep.detail };
        }
      }
    }

    const focus = workoutFocuses[String(dayIndex)];
    return {
      ...skeletonDay,
      events: newEvents,
      ...(focus ? { workoutFocus: focus } : {}),
    };
  });
}

// ─── Overlay builder ──────────────────────────────────────────────────────────

/**
 * Builds a new DaySchedule[] by overlaying AI meals and workout focuses
 * onto a base schedule. All non-meal events are preserved unchanged.
 * Falls back to the hardcoded WEEK_SCHEDULE when no base is provided.
 */
function buildOverlaySchedule(
  mealEntries:    MealPlanEntry[],
  workoutFocuses: Record<string, string>,   // Mon-first day index (string) → focus
  baseSchedule:   DaySchedule[],
): DaySchedule[] {
  return baseSchedule.map((day, dayIndex) => {
    // ── 1. Replace `type === 'meal'` events with AI-selected meals ─────────
    const dayEntries = mealEntries
      .filter(e => e.slot.day === dayIndex)
      .sort((a, b) => MEAL_ORDER.indexOf(a.slot.mealType) - MEAL_ORDER.indexOf(b.slot.mealType));

    // Indices of meal-type events in this day (in their original order)
    const mealEventIndices = day.events
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.type === 'meal')
      .map(({ i }) => i);

    const newEvents: ScheduleEvent[] = [...day.events];

    // Map from the end so that later-day entries (dinner) always land in a slot.
    // Days with fewer slots than entries drop early-day meals (e.g. breakfast on
    // days where the schedule has no breakfast slot), never dinner.
    const entryOffset = Math.max(0, dayEntries.length - mealEventIndices.length);

    mealEventIndices.forEach((eventIdx, pos) => {
      const entry = dayEntries[entryOffset + pos];
      if (!entry) return;

      const meal = getMeal(entry.mealId);
      if (!meal) return;

      const cals    = Math.round(entry.actualCalories);
      const protein = Math.round(entry.actualProtein);
      const carbs   = Math.round(meal.carbs   * entry.portionMultiplier);
      const fat     = Math.round(meal.fat     * entry.portionMultiplier);

      // Use a prep/batch note distinct from the recipe tip (which RecipeCard shows)
      const detail = meal.mealPrepOnly
        ? 'Best prepared the night before — keep in the fridge overnight.'
        : meal.batchFriendly && meal.prepMins > 10
          ? `~${meal.prepMins} min prep — worth making a double batch on Sunday.`
          : meal.prepMins <= 5
            ? undefined
            : `~${meal.prepMins} min prep`;

      newEvents[eventIdx] = {
        ...day.events[eventIdx],
        // Keep the skeleton label ("Breakfast", "Lunch", "Dinner") —
        // RecipeCard shows the meal name, so overwriting here creates duplication.
        ...(detail !== undefined ? { detail } : {}),
        recipeId:   meal.id,
        recipeType: 'meal',
        macros:     { calories: cals, protein, carbs, fat },
      };
    });

    // ── 2. Update workoutFocus if Claude provided one ─────────────────────
    const focus = workoutFocuses[String(dayIndex)];

    // ── 3. Update "Meal prep for the week" detail on Sunday (day 6) ───────
    if (dayIndex === 6 && mealEntries.length > 0) {
      const prepIdx = newEvents.findIndex(
        e => e.type === 'prep' && e.label === 'Meal prep for the week',
      );
      if (prepIdx !== -1) {
        newEvents[prepIdx] = {
          ...newEvents[prepIdx],
          detail: buildPrepDetail(mealEntries),
        };
      }
    }

    return {
      ...day,
      events: newEvents,
      ...(focus ? { workoutFocus: focus } : {}),
    };
  });
}

/** Converts a WorkoutDay[] from WorkoutPlanContext into the workoutFocuses map
 *  expected by buildOverlaySchedule (Mon-first day index string → focus string). */
function workoutDaysToFocuses(
  workoutDays: Array<{ gymDayIndex: number; split: string; focus: string }>,
  gymDays:     number[],
): Record<string, string> {
  const sortedGymDays = [...gymDays].sort((a, b) => a - b);
  const focuses: Record<string, string> = {};
  for (const day of workoutDays) {
    const jsDay = sortedGymDays[day.gymDayIndex];
    if (jsDay === undefined) continue;
    focuses[String(jsToMonFirst(jsDay))] = `${day.split} – ${day.focus}`;
  }
  return focuses;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeeklyPlanState {
  overlaySchedule: DaySchedule[];
  isGenerating:    boolean;
  error:           string | null;
  weekStartDate:   string | null;
}

interface WeeklyPlanCtx extends WeeklyPlanState {
  weeklySchedule:       DaySchedule[];
  generateWeeklyPlan:   (profile?: UserProfile) => Promise<void>;
  rebuildSkeleton:      (profile: UserProfile) => Promise<void>;
  setDayWorkoutFocus:   (dayIndex: number, focus: string) => Promise<void>;
}

// ─── Persisted shape ─────────────────────────────────────────────────────────

interface PersistedWeeklyPlan {
  weekStartDate:   string;
  overlaySchedule: DaySchedule[];
}

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<WeeklyPlanCtx | null>(null);

export function WeeklyPlanProvider({ children }: { children: React.ReactNode }) {
  const { generatePlan: generateMeals } = useMealPlan();
  const { workoutContent, generateWorkoutPlan } = useWorkoutPlan();

  const [state, setState] = useState<WeeklyPlanState>(() => ({
    overlaySchedule: generateScheduleSkeleton(DEFAULT_PROFILE),
    isGenerating:    false,
    error:           null,
    weekStartDate:   null,
  }));

  const generatingRef = useRef(false);

  // ── Load persisted plan on mount; auto-generate if it's a new week ────────
  useEffect(() => {
    (async () => {
      const thisMonday = getThisWeekMonday();

      const raw = await safeGetItem(STORAGE_KEYS.WEEKLY_PLAN);
      const persisted = safeParseJSON<PersistedWeeklyPlan>(raw, {
        weekStartDate: '', overlaySchedule: [],
      });

      if (
        persisted.weekStartDate === thisMonday &&
        persisted.overlaySchedule.length > 0
      ) {
        // Stored plan is current. Rebuild on a fresh skeleton so non-AI event
        // details (supplements, gym, wake, etc.) always reflect the latest copy.
        const profile  = await loadUserProfile();
        const skeleton = generateScheduleSkeleton(profile, workoutContent);

        // Recover workout focuses from the persisted overlay
        const workoutFocuses: Record<string, string> = {};
        persisted.overlaySchedule.forEach((day, i) => {
          if (day.workoutFocus) workoutFocuses[String(i)] = day.workoutFocus;
        });

        // Use the persisted overlay as the meal source — this preserves any
        // user swaps made during the week without re-reading AI_MEALS.
        const hasMeals = persisted.overlaySchedule.some(
          day => day.events.some(e => e.type === 'meal' && e.recipeId),
        );
        const overlay = hasMeals
          ? rebuildFromPersistedOverlay(persisted.overlaySchedule, workoutFocuses, skeleton)
          : skeleton;

        setState(s => ({
          ...s,
          overlaySchedule: overlay,
          weekStartDate:   thisMonday,
        }));
      } else {
        // New week or first run — show skeleton immediately while generating
        const profile  = await loadUserProfile();
        const skeleton = generateScheduleSkeleton(profile, workoutContent);
        setState(s => ({ ...s, overlaySchedule: skeleton, weekStartDate: thisMonday }));
        generateWeeklyPlan(profile);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Core generation ───────────────────────────────────────────────────────
  const generateWeeklyPlan = useCallback(async (profile?: UserProfile) => {
    if (generatingRef.current) return;
    generatingRef.current = true;

    setState(s => ({ ...s, isGenerating: true, error: null }));

    try {
      const userProfile = profile ?? (await loadUserProfile());
      const thisMonday  = getThisWeekMonday();

      // ── Step 1: Generate workouts + meals in parallel (independent) ──────
      const [generatedWorkouts, mealEntries] = await Promise.all([
        generateWorkoutPlan(userProfile),
        generateMeals(userProfile),
      ]);

      // Use freshly generated content directly — avoids stale closure on workoutContent
      const freshWorkoutContent = buildWorkoutContent(generatedWorkouts);
      const skeleton = generateScheduleSkeleton(userProfile, freshWorkoutContent);

      // ── Step 2: Derive workout focuses from generated plan ────────────────
      const workoutFocuses = workoutDaysToFocuses(generatedWorkouts, userProfile.gymDays);

      // ── Step 4: Build overlay on top of the skeleton ──────────────────
      if (mealEntries.length === 0) {
        // Meal generation failed — show skeleton without meal overlay
        setState(s => ({ ...s, overlaySchedule: skeleton, isGenerating: false }));
        return;
      }

      const overlay = buildOverlaySchedule(mealEntries, workoutFocuses, skeleton);

      // ── Step 4: Persist ───────────────────────────────────────────────
      const persisted: PersistedWeeklyPlan = {
        weekStartDate:   thisMonday,
        overlaySchedule: overlay,
      };
      await safeSetItem(STORAGE_KEYS.WEEKLY_PLAN, JSON.stringify(persisted));

      setState(s => ({
        ...s,
        overlaySchedule: overlay,
        isGenerating:    false,
        weekStartDate:   thisMonday,
        // Keep auth error if it came from meal generation, clear other errors
        error: s.error?.includes('API key') ? s.error : null,
      }));

    } catch (err) {
      setState(s => ({
        ...s,
        isGenerating: false,
        error: `Weekly plan generation failed: ${String(err)}`,
      }));
    } finally {
      generatingRef.current = false;
    }
  }, [generateMeals, generateWorkoutPlan]);

  /**
   * Rebuilds the schedule skeleton from a new profile without triggering AI calls.
   * Re-overlays the existing AI-generated meals and workout focuses on top of
   * the fresh skeleton so profile changes (gym days, sleep times) take effect
   * immediately without losing the current week's meal plan.
   */
  const rebuildSkeleton = useCallback(async (profile: UserProfile) => {
    const skeleton = generateScheduleSkeleton(profile, workoutContent);

    const planRaw = await safeGetItem(STORAGE_KEYS.WEEKLY_PLAN);
    const persisted = safeParseJSON<PersistedWeeklyPlan>(
      planRaw, { weekStartDate: '', overlaySchedule: [] },
    );

    const workoutFocuses: Record<string, string> = {};
    persisted.overlaySchedule.forEach((day, i) => {
      if (day.workoutFocus) workoutFocuses[String(i)] = day.workoutFocus;
    });

    const hasMeals = persisted.overlaySchedule.some(
      day => day.events.some(e => e.type === 'meal' && e.recipeId),
    );
    const overlay = hasMeals
      ? rebuildFromPersistedOverlay(persisted.overlaySchedule, workoutFocuses, skeleton)
      : skeleton;

    const thisMonday = getThisWeekMonday();
    await safeSetItem(STORAGE_KEYS.WEEKLY_PLAN, JSON.stringify({ weekStartDate: thisMonday, overlaySchedule: overlay }));
    setState(s => ({ ...s, overlaySchedule: overlay, weekStartDate: thisMonday }));
  }, [workoutContent]);

  const setDayWorkoutFocus = useCallback(async (dayIndex: number, newFocus: string) => {
    const updated = state.overlaySchedule.map((day, i) => {
      if (i !== dayIndex) return day;
      return {
        ...day,
        workoutFocus: newFocus,
        events: day.events.map(e =>
          e.type === 'gym' ? { ...e, workoutFocus: newFocus } : e,
        ),
      };
    });
    setState(s => ({ ...s, overlaySchedule: updated }));
    const raw       = await safeGetItem(STORAGE_KEYS.WEEKLY_PLAN);
    const persisted = safeParseJSON<PersistedWeeklyPlan>(raw, { weekStartDate: getThisWeekMonday(), overlaySchedule: [] });
    await safeSetItem(STORAGE_KEYS.WEEKLY_PLAN, JSON.stringify({ ...persisted, overlaySchedule: updated }));
  }, [state.overlaySchedule]);

  return (
    <Ctx.Provider value={{ ...state, weeklySchedule: state.overlaySchedule, generateWeeklyPlan, rebuildSkeleton, setDayWorkoutFocus }}>
      {children}
    </Ctx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWeeklyPlan(): WeeklyPlanCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useWeeklyPlan must be used inside <WeeklyPlanProvider>');
  return ctx;
}
