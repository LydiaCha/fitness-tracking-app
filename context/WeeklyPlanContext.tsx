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
import { MealPlanEntry } from '@/types/meal';
import { useMealPlan } from '@/context/MealPlanContext';
import { callClaude, extractJSON, ClaudeApiError } from '@/utils/claudeApi';
import { safeGetItem, safeSetItem, safeParseJSON } from '@/utils/storage';
import { STORAGE_KEYS, toKey } from '@/utils/appConstants';
import { loadUserProfile, UserProfile, DAY_NAMES } from '@/constants/userProfile';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MEAL_ORDER = ['breakfast', 'lunch', 'dinner', 'snack', 'smoothie'] as const;

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

// ─── Overlay builder ──────────────────────────────────────────────────────────

/**
 * Builds a new DaySchedule[] by overlaying AI meals and workout focuses
 * onto WEEK_SCHEDULE. All non-meal events are preserved unchanged.
 */
function buildOverlaySchedule(
  mealEntries:    MealPlanEntry[],
  workoutFocuses: Record<string, string>,   // Mon-first day index (string) → focus
): DaySchedule[] {
  return WEEK_SCHEDULE.map((day, dayIndex) => {
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

    mealEventIndices.forEach((eventIdx, pos) => {
      const entry = dayEntries[pos];
      if (!entry) return;

      const meal = getMeal(entry.mealId);
      if (!meal) return;

      const cals    = Math.round(entry.actualCalories);
      const protein = Math.round(entry.actualProtein);
      const carbs   = Math.round(meal.carbs   * entry.portionMultiplier);
      const fat     = Math.round(meal.fat     * entry.portionMultiplier);

      const detail = [
        meal.tip ?? `${meal.prepMins} min prep`,
        `${cals} kcal · ${protein}g protein · ${carbs}g carbs · ${fat}g fat`,
      ].join('\n');

      newEvents[eventIdx] = {
        ...day.events[eventIdx],
        label:      meal.name,
        detail,
        recipeId:   meal.id,
        recipeType: 'meal',
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

// ─── Claude prompt for workout focus ─────────────────────────────────────────

function buildWorkoutFocusPrompt(gymDays: number[], goal: string): {
  systemPrompt: string;
  userMessage:  string;
} {
  const monFirstDays = gymDays
    .map(jsToMonFirst)
    .sort((a, b) => a - b);

  const dayNames = monFirstDays
    .map(d => DAY_NAMES[(d + 1) % 7])  // DAY_NAMES is Sun-first, shift back
    .join(', ');

  const systemPrompt =
    `You are a strength coach designing a weekly training split. ` +
    `Return ONLY a JSON object — no prose, no markdown. ` +
    `Keys are Mon-first day indices (0=Mon, 1=Tue, … 6=Sun) as strings. ` +
    `Values are short focus descriptions (e.g. "Upper Push – Chest, Shoulders, Triceps").`;

  const userMessage =
    `Gym days (Mon-first indices): [${monFirstDays.join(', ')}] (${dayNames})\n` +
    `Fitness goal: ${goal}\n` +
    `Assign a balanced Push/Pull/Legs or Upper/Lower split ensuring adequate recovery.\n` +
    `Example format: { "0": "Upper Push – Chest, Shoulders, Triceps", "1": "Pull – Back, Biceps" }`;

  return { systemPrompt, userMessage };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface WeeklyPlanState {
  /** null = not yet generated; Today view shows a loading/error screen. */
  overlaySchedule: DaySchedule[] | null;
  isGenerating:    boolean;
  error:           string | null;
  weekStartDate:   string | null;
}

interface WeeklyPlanCtx extends WeeklyPlanState {
  /** null while generating or on error — Today view handles both states. */
  weeklySchedule:      DaySchedule[] | null;
  generateWeeklyPlan:  (profile?: UserProfile) => Promise<void>;
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

  const [state, setState] = useState<WeeklyPlanState>({
    overlaySchedule: null,
    isGenerating:    false,
    error:           null,
    weekStartDate:   null,
  });

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
        // Stored plan is current — use it
        setState(s => ({
          ...s,
          overlaySchedule: persisted.overlaySchedule,
          weekStartDate:   thisMonday,
        }));
      } else {
        // New week or first run — auto-generate
        const profile = await loadUserProfile();
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

      // ── Step 1: Generate meals (delegates to MealPlanContext) ─────────────
      const mealEntries = await generateMeals(userProfile);

      // ── Step 2: Generate workout focus per gym day ─────────────────────
      let workoutFocuses: Record<string, string> = {};

      try {
        const { systemPrompt, userMessage } = buildWorkoutFocusPrompt(
          userProfile.gymDays,
          userProfile.fitnessGoal,
        );
        const raw    = await callClaude({ systemPrompt, userMessage, maxTokens: 400 });
        const parsed = extractJSON<Record<string, string>>(raw);
        if (parsed && typeof parsed === 'object') {
          workoutFocuses = parsed;
        }
      } catch (err) {
        // Workout focus is non-critical — fall back to WEEK_SCHEDULE values
        if (!(err instanceof ClaudeApiError && err.isAuthError)) {
          // Only log non-auth errors; auth error already surfaced by meal generation
          setState(s => ({
            ...s,
            error: 'Workout focus unavailable — using defaults.',
          }));
        }
      }

      // ── Step 3: Build overlay ─────────────────────────────────────────
      if (mealEntries.length === 0) {
        // Meal generation failed — use WEEK_SCHEDULE as-is
        setState(s => ({ ...s, isGenerating: false }));
        return;
      }

      const overlay = buildOverlaySchedule(mealEntries, workoutFocuses);

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
  }, [generateMeals]);

  return (
    <Ctx.Provider value={{ ...state, weeklySchedule: state.overlaySchedule, generateWeeklyPlan }}>
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
