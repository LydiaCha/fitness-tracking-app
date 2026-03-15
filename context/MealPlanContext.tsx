/**
 * PeakRoutine — Meal Plan Context
 *
 * Provides a weekly AI-generated meal plan to the entire app.
 * Handles generation, persistence, and state.
 *
 * Generation flow:
 *   1. Build 28 slots from user's macro targets (buildWeekSlots)
 *   2. For every slot: filter candidates → score them (no AI yet)
 *   3. Send the ENTIRE week to Claude in one request (fast + context-aware)
 *   4. Parse Claude's selections, fall back to deterministic per slot on failure
 *   5. Compute grocery list from confirmed plan
 *   6. Persist to AsyncStorage
 */

import React, {
  createContext, useCallback, useContext, useEffect, useRef, useState,
} from 'react';
import { MEAL_DATABASE, getMeal } from '@/constants/mealDatabase';
import {
  filterMeals,
  scoreMeals,
  selectMealFallback,
  buildWeekSlots,
  buildPlanGroceryList,
  createPlanEntry,
  getIngredientReuseStats,
  PlanGrocerySection,
} from '@/utils/mealPlanner';
import { callClaude, extractJSON, ClaudeApiError } from '@/utils/claudeApi';
import { safeGetItem, safeSetItem, safeRemoveItem, safeParseJSON } from '@/utils/storage';
import { STORAGE_KEYS } from '@/utils/appConstants';
import {
  MealRecord,
  MealPlanSlot,
  MealPlanEntry,
  UserDietaryProfile,
  GoalTag,
} from '@/types/meal';
import { UserProfile, loadUserProfile } from '@/constants/userProfile';

// ─── Storage key ──────────────────────────────────────────────────────────────

const PLAN_STORAGE_KEY = STORAGE_KEYS.AI_MEALS;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MealPlanState {
  weeklyPlan:      MealPlanEntry[];
  groceryList:     PlanGrocerySection[];
  isGenerating:    boolean;
  /** 0–28 slots completed during current generation */
  progress:        number;
  error:           string | null;
  lastGeneratedAt: string | null;   // ISO date string
  /** How many ingredients appear in 2+ meals this week */
  reuseStats: {
    totalUniqueIngredients: number;
    reuseRatio: number;
    mostReusedIngredients: Array<{ ingredientId: string; name: string; count: number }>;
  } | null;
  // Next week
  nextWeekPlan:        MealPlanEntry[];
  nextGroceryList:     PlanGrocerySection[];
  isGeneratingNext:    boolean;
  nextGeneratedAt:     string | null;
}

interface MealPlanCtx extends MealPlanState {
  generatePlan:           (userProfile: UserProfile) => Promise<MealPlanEntry[]>;
  generateNextWeekPlan:   (userProfile: UserProfile) => Promise<void>;
  resetPlan:              () => Promise<void>;
  getMealById:            (id: string) => MealRecord | undefined;
  getEntriesForDay:       (day: number) => MealPlanEntry[];
  getNextWeekEntriesForDay: (day: number) => MealPlanEntry[];
}

// ─── Claude prompt builder (single-call for whole week) ───────────────────────

interface SlotCandidate {
  slotIndex: number;
  slot:      MealPlanSlot;
  candidates: Array<{ id: string; name: string; score: number; calories: number; protein: number }>;
}

function buildWeeklyPlanPrompt(params: {
  userProfile:    UserProfile;
  slotCandidates: SlotCandidate[];
  goalTags:       GoalTag[];
  lastWeekMealIds?: string[];
}): { systemPrompt: string; userMessage: string } {
  const { userProfile, slotCandidates, goalTags, lastWeekMealIds } = params;

  const systemPrompt = `You are a meal planning assistant for a fitness app.
You will receive 28 meal slots for a full week, each with 5 pre-scored candidate meals.
Your task: select the best meal for every slot.

RULES:
- Select ONLY from the candidates listed for each slot. Never invent meals.
- Prioritise ingredient reuse across the week to minimise grocery items.
- Ensure variety — avoid the same meal appearing on consecutive days unless repeatTolerance is "daily".
- Balance macros throughout each day (don't put two high-carb meals on the same day if avoidable).
- Match meal weight to slot type (snacks should be light, dinners satisfying).

Respond ONLY with a JSON array. No explanation. No markdown. Just the array:
[
  { "slotIndex": 0, "mealId": "meal-id-here", "portionMultiplier": 1.0 },
  ...28 items total
]

portionMultiplier: 0.75 (smaller) | 1.0 (standard) | 1.25 (larger) | 1.5 (double)
Only adjust if the standard serving is clearly far from the slot's calorie target.`;

  const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const slotLines = slotCandidates.map(({ slotIndex, slot, candidates }) => {
    const day   = DAY_NAMES[slot.day] ?? `Day ${slot.day + 1}`;
    const type  = slot.mealType.toUpperCase();
    const cands = candidates
      .map((c, i) => `  ${i + 1}. [${c.id}] ${c.name} | ${c.calories}kcal ${c.protein}gP | score:${c.score}`)
      .join('\n');
    return `Slot ${slotIndex} — ${day} ${type} (target: ${slot.targetCalories}kcal, ${slot.targetProtein}gP)\n${cands}`;
  }).join('\n\n');

  const lastWeekSection = lastWeekMealIds && lastWeekMealIds.length > 0
    ? `\nLast week's meals (avoid repeating where possible): ${[...new Set(lastWeekMealIds)].join(', ')}\n`
    : '';

  const userMessage = `User: ${userProfile.age}yo ${userProfile.gender}, ${userProfile.weightKg}kg
Goals: ${goalTags.join(', ')}
Daily targets: ${userProfile.calories} kcal · ${userProfile.protein}g P · ${userProfile.carbs}g C · ${userProfile.fat}g F
Restrictions: none${lastWeekSection}
${slotLines}`;

  return { systemPrompt, userMessage };
}

// ─── Map fitness goal → GoalTag ───────────────────────────────────────────────

function fitnessGoalToTags(goal: UserProfile['fitnessGoal']): GoalTag[] {
  switch (goal) {
    case 'gain':     return ['muscle-gain', 'post-workout'];
    case 'lose':     return ['fat-loss', 'maintenance'];
    case 'maintain': return ['maintenance', 'recovery'];
  }
}

// ─── Map UserProfile → UserDietaryProfile ─────────────────────────────────────

function toDietaryProfile(
  userProfile: UserProfile,
  recentMealIds: string[],
): UserDietaryProfile {
  return {
    restrictions:          [],    // TODO: extend UserProfile to include dietary restrictions
    dislikedIngredientIds: [],    // TODO: extend UserProfile to include dislikes
    goals:                 fitnessGoalToTags(userProfile.fitnessGoal),
    maxPrepMins:           30,
    recentMealIds,
  };
}

// ─── Persisted shape ──────────────────────────────────────────────────────────

interface PersistedPlan {
  weeklyPlan:      MealPlanEntry[];
  lastGeneratedAt: string;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const Ctx = createContext<MealPlanCtx | null>(null);

export function MealPlanProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<MealPlanState>({
    weeklyPlan:       [],
    groceryList:      [],
    isGenerating:     false,
    progress:         0,
    error:            null,
    lastGeneratedAt:  null,
    reuseStats:       null,
    nextWeekPlan:     [],
    nextGroceryList:  [],
    isGeneratingNext: false,
    nextGeneratedAt:  null,
  });

  // Prevent duplicate generation calls
  const generatingRef     = useRef(false);
  const nextGeneratingRef = useRef(false);

  // ── Load persisted plan on mount ──────────────────────────────────────────
  useEffect(() => {
    (async () => {
      const raw      = await safeGetItem(PLAN_STORAGE_KEY);
      const persisted = safeParseJSON<PersistedPlan>(raw, { weeklyPlan: [], lastGeneratedAt: '' });
      if (persisted.weeklyPlan.length > 0) {
        const groceryList  = buildPlanGroceryList(persisted.weeklyPlan);
        const reuseStats   = getIngredientReuseStats(persisted.weeklyPlan);
        setState(s => ({
          ...s,
          weeklyPlan:      persisted.weeklyPlan,
          groceryList,
          reuseStats,
          lastGeneratedAt: persisted.lastGeneratedAt ?? null,
        }));
      }

      // Also load next-week plan if stored — but discard it if it's too similar to this week
      const rawNext       = await safeGetItem(STORAGE_KEYS.AI_MEALS_NEXT_WEEK);
      const persistedNext = safeParseJSON<PersistedPlan>(rawNext, { weeklyPlan: [], lastGeneratedAt: '' });
      if (persistedNext.weeklyPlan.length > 0) {
        const thisIds = new Set(persisted.weeklyPlan.map((e: MealPlanEntry) => e.mealId));
        const overlapCount = persistedNext.weeklyPlan.filter((e: MealPlanEntry) => thisIds.has(e.mealId)).length;
        const overlapRatio = persistedNext.weeklyPlan.length > 0
          ? overlapCount / persistedNext.weeklyPlan.length
          : 0;

        if (overlapRatio > 0.6) {
          // Stale identical plan — clear it so it regenerates
          await safeRemoveItem(STORAGE_KEYS.AI_MEALS_NEXT_WEEK);
        } else {
          const nextGroceryList = buildPlanGroceryList(persistedNext.weeklyPlan);
          setState(s => ({
            ...s,
            nextWeekPlan:    persistedNext.weeklyPlan,
            nextGroceryList,
            nextGeneratedAt: persistedNext.lastGeneratedAt ?? null,
          }));
        }
      }
    })();
  }, []);

  // ── Shared generation core ────────────────────────────────────────────────
  /**
   * Runs the full Claude meal selection pipeline.
   * onProgress: called with 0–100 as generation proceeds.
   * onAuthError: called if Claude rejects the API key.
   * Returns the confirmed MealPlanEntry[] for the week.
   */
  const runGeneration = useCallback(async (
    userProfile:   UserProfile,
    onProgress:    (n: number) => void,
    onAuthError:   (msg: string) => void,
    avoidMealIds:  string[] = [],
  ): Promise<MealPlanEntry[]> => {
    const dailyTargets   = { calories: userProfile.calories, protein: userProfile.protein };
    const slots          = buildWeekSlots(dailyTargets);
    const goalTags       = fitnessGoalToTags(userProfile.fitnessGoal);
    const dietaryProfile = toDietaryProfile(userProfile, avoidMealIds);

    const avoidMealRecords = avoidMealIds
      .map(id => getMeal(id))
      .filter((m): m is MealRecord => m !== undefined);

    const slotCandidates: SlotCandidate[] = slots.map((slot, slotIndex) => {
      const candidates = filterMeals(slot, dietaryProfile);
      // Pass [] for already-planned (unknown upfront) and avoidMealIds for cross-week penalty
      const scored     = scoreMeals(candidates, slot, [], avoidMealIds);
      return {
        slotIndex,
        slot,
        candidates: scored.slice(0, 5).map(sc => ({
          id:       sc.meal.id,
          name:     sc.meal.name,
          score:    sc.score,
          calories: sc.meal.calories,
          protein:  sc.meal.protein,
        })),
      };
    });

    onProgress(1);

    type ClaudeSelection = { slotIndex: number; mealId: string; portionMultiplier: number };
    let claudeSelections: ClaudeSelection[] = [];

    try {
      const { systemPrompt, userMessage } = buildWeeklyPlanPrompt({ userProfile, slotCandidates, goalTags, lastWeekMealIds: avoidMealIds });
      const raw    = await callClaude({ systemPrompt, userMessage, maxTokens: 1500 });
      const parsed = extractJSON<ClaudeSelection[]>(raw);
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        claudeSelections = parsed;
      }
    } catch (err) {
      if (err instanceof ClaudeApiError && err.isAuthError) {
        onAuthError('No API key found. Add EXPO_PUBLIC_ANTHROPIC_API_KEY to your .env file. Using smart defaults instead.');
      }
    }

    onProgress(10);

    const confirmedEntries: MealPlanEntry[] = [];
    const usedMealIds: string[] = [];

    for (let i = 0; i < slots.length; i++) {
      const slot          = slots[i];
      const candidates    = slotCandidates[i].candidates;
      const claudeChoice  = claudeSelections.find(c => c.slotIndex === i);
      const claudeMeal    = claudeChoice ? getMeal(claudeChoice.mealId) : undefined;
      const isValidChoice = claudeMeal && candidates.some(c => c.id === claudeMeal.id);

      if (isValidChoice && claudeMeal && claudeChoice) {
        confirmedEntries.push(createPlanEntry(slot, claudeMeal, claudeChoice.portionMultiplier ?? 1.0));
        usedMealIds.push(claudeMeal.id);
      } else {
        const updatedProfile = toDietaryProfile(userProfile, usedMealIds);
        const plannedMeals   = confirmedEntries
          .map(e => getMeal(e.mealId))
          .filter((m): m is MealRecord => m !== undefined);
        const fallback = selectMealFallback(slot, updatedProfile, plannedMeals);
        if (fallback) {
          confirmedEntries.push(createPlanEntry(slot, fallback.meal, fallback.portionMultiplier));
          usedMealIds.push(fallback.meal.id);
        }
      }

      onProgress(10 + Math.round(((i + 1) / slots.length) * 90));
    }

    return confirmedEntries;
  }, []);

  // ── Current week generation ───────────────────────────────────────────────
  const generatePlan = useCallback(async (userProfile: UserProfile): Promise<MealPlanEntry[]> => {
    if (generatingRef.current) return [];
    generatingRef.current = true;
    setState(s => ({ ...s, isGenerating: true, progress: 0, error: null }));

    try {
      const confirmedEntries = await runGeneration(
        userProfile,
        (p) => setState(s => ({ ...s, progress: p })),
        (msg) => setState(s => ({ ...s, error: msg })),
      );

      const groceryList = buildPlanGroceryList(confirmedEntries);
      const reuseStats  = getIngredientReuseStats(confirmedEntries);
      const now         = new Date().toISOString();

      await safeSetItem(PLAN_STORAGE_KEY, JSON.stringify({ weeklyPlan: confirmedEntries, lastGeneratedAt: now }));
      // Invalidate next-week plan so it regenerates with the new this-week plan as avoidance
      await safeRemoveItem(STORAGE_KEYS.AI_MEALS_NEXT_WEEK);

      setState(s => ({
        ...s,
        weeklyPlan:      confirmedEntries,
        groceryList,
        reuseStats,
        isGenerating:    false,
        progress:        28,
        lastGeneratedAt: now,
        error: s.error?.includes('API key') ? s.error : null,
        nextWeekPlan:    [],
        nextGroceryList: [],
        nextGeneratedAt: null,
      }));

      return confirmedEntries;
    } catch (err) {
      setState(s => ({ ...s, isGenerating: false, error: `Plan generation failed: ${String(err)}` }));
      return [];
    } finally {
      generatingRef.current = false;
    }
  }, [runGeneration]);

  // ── Next week generation ──────────────────────────────────────────────────
  const generateNextWeekPlan = useCallback(async (userProfile: UserProfile): Promise<void> => {
    if (nextGeneratingRef.current) return;
    nextGeneratingRef.current = true;
    setState(s => ({ ...s, isGeneratingNext: true }));

    try {
      const thisWeekMealIds = state.weeklyPlan.map(e => e.mealId);
      const confirmedEntries = await runGeneration(
        userProfile,
        () => {},          // no granular progress for background generation
        () => {},          // auth errors already surfaced by current-week generation
        thisWeekMealIds,   // avoid repeating this week's meals
      );

      const nextGroceryList = buildPlanGroceryList(confirmedEntries);
      const now             = new Date().toISOString();

      await safeSetItem(STORAGE_KEYS.AI_MEALS_NEXT_WEEK, JSON.stringify({ weeklyPlan: confirmedEntries, lastGeneratedAt: now }));

      setState(s => ({
        ...s,
        nextWeekPlan:     confirmedEntries,
        nextGroceryList,
        isGeneratingNext: false,
        nextGeneratedAt:  now,
      }));
    } catch (err) {
      setState(s => ({ ...s, isGeneratingNext: false }));
    } finally {
      nextGeneratingRef.current = false;
    }
  }, [runGeneration, state.weeklyPlan]);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetPlan = useCallback(async () => {
    await safeRemoveItem(PLAN_STORAGE_KEY);
    await safeRemoveItem(STORAGE_KEYS.AI_MEALS_NEXT_WEEK);
    setState({
      weeklyPlan:       [],
      groceryList:      [],
      isGenerating:     false,
      progress:         0,
      error:            null,
      lastGeneratedAt:  null,
      reuseStats:       null,
      nextWeekPlan:     [],
      nextGroceryList:  [],
      isGeneratingNext: false,
      nextGeneratedAt:  null,
    });
  }, []);

  // ── Convenience helpers ───────────────────────────────────────────────────
  const getMealById = useCallback((id: string) => getMeal(id), []);

  const getEntriesForDay = useCallback(
    (day: number) => state.weeklyPlan.filter(e => e.slot.day === day),
    [state.weeklyPlan],
  );

  const getNextWeekEntriesForDay = useCallback(
    (day: number) => state.nextWeekPlan.filter(e => e.slot.day === day),
    [state.nextWeekPlan],
  );

  return (
    <Ctx.Provider value={{ ...state, generatePlan, generateNextWeekPlan, resetPlan, getMealById, getEntriesForDay, getNextWeekEntriesForDay }}>
      {children}
    </Ctx.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMealPlan(): MealPlanCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useMealPlan must be used inside <MealPlanProvider>');
  return ctx;
}
