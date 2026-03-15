/**
 * PeakRoutine — Meal Planning Engine
 *
 * This module sits between the meal database and the AI.
 * It handles all the deterministic work so Claude only needs to do
 * the reasoning — not the filtering, scoring, or data wrangling.
 *
 * Architecture:
 *   1. filterMeals()         — hard rules, returns a shortlist (no AI)
 *   2. scoreMeals()          — ranks shortlist by ingredient overlap (no AI)
 *   3. formatPromptContext() — serializes shortlist + context for Claude
 *   4. applyPortionScale()   — adjusts macros when portion != 1.0
 *   5. buildPlanGroceryList()— aggregates ingredients from a confirmed plan
 *   6. selectMealFallback()  — pure rule-based pick if no AI available
 */

import { MEAL_DATABASE } from '@/constants/mealDatabase';
import {
  MealRecord,
  MealType,
  UserDietaryProfile,
  MealPlanSlot,
  MealPlanEntry,
  GroceryCategory,
  IngredientUnit,
} from '@/types/meal';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScoredMeal {
  meal: MealRecord;
  /** 0–100. Higher = better fit for this slot given what's already planned. */
  score: number;
  scoreBreakdown: {
    ingredientOverlap: number;   // 0–40: shared ingredients with already-planned meals
    goalAlignment: number;       // 0–30: how many goal tags match
    varietyBonus: number;        // 0–20: different category/cuisine from recent meals
    calorieProximity: number;    // 0–10: how close to target calories
  };
}

export interface PlanGroceryItem {
  ingredientId: string;
  name: string;
  totalQty: number;
  unit: IngredientUnit;
  groceryCategory: GroceryCategory;
  appearsInMeals: string[];   // meal names for transparency
}

export interface PlanGrocerySection {
  category: GroceryCategory;
  label: string;
  emoji: string;
  items: PlanGroceryItem[];
}

// ─── 1. Filtering ─────────────────────────────────────────────────────────────

/**
 * Returns meals that pass ALL hard rules for a given slot and user profile.
 * This runs before any AI call — it eliminates invalid options deterministically.
 */
export function filterMeals(
  slot: MealPlanSlot,
  profile: UserDietaryProfile,
): MealRecord[] {
  return MEAL_DATABASE.filter(meal => {
    // Must match the slot's meal type
    if (!meal.mealType.includes(slot.mealType)) return false;

    // Dietary restrictions — boolean flags, fast O(1) checks
    if (profile.restrictions.includes('gluten-free')  && !meal.isGlutenFree)  return false;
    if (profile.restrictions.includes('dairy-free')   && !meal.isDairyFree)   return false;
    if (profile.restrictions.includes('vegetarian')   && !meal.isVegetarian)  return false;
    if (profile.restrictions.includes('vegan')        && !meal.isVegan)       return false;
    if (profile.restrictions.includes('nut-free')     && !meal.isNutFree)     return false;

    // Prep time limit
    if (meal.totalMins > profile.maxPrepMins) return false;

    // Disliked ingredients
    const hasDisliked = meal.ingredients.some(ing =>
      profile.dislikedIngredientIds.includes(ing.ingredientId)
    );
    if (hasDisliked) return false;

    // Repeat tolerance — check against recently used meals
    if (!canRepeat(meal, profile.recentMealIds)) return false;

    return true;
  });
}

/**
 * Returns true if the meal is allowed to appear again given repeat tolerance.
 */
function canRepeat(meal: MealRecord, recentMealIds: string[]): boolean {
  const lastIdx = recentMealIds.lastIndexOf(meal.id);
  if (lastIdx === -1) return true; // never used recently

  const daysAgo = recentMealIds.length - 1 - lastIdx; // index distance = days ago

  switch (meal.repeatTolerance) {
    case 'daily':        return true;           // no restriction
    case 'every-2-days': return daysAgo >= 2;
    case 'weekly':       return daysAgo >= 7;
    default:             return true;
  }
}

// ─── 2. Scoring ───────────────────────────────────────────────────────────────

/**
 * Scores and sorts a filtered shortlist.
 * Higher score = better choice for this slot given current plan context.
 *
 * Scoring weights:
 *   40pts — ingredient overlap with already-planned meals (fewer unique items to buy)
 *   30pts — goal tag alignment
 *   20pts — variety (different category/cuisine from meals planned today)
 *   10pts — calorie proximity to slot target
 */
export function scoreMeals(
  candidates: MealRecord[],
  slot: MealPlanSlot,
  alreadyPlannedMeals: MealRecord[],
  /** Meal IDs to penalise (e.g. last week's plan) — avoids cross-week repetition */
  avoidMealIds: string[] = [],
): ScoredMeal[] {
  // Build the set of ingredient IDs already in this week's plan
  const plannedIngredientIds = new Set(
    alreadyPlannedMeals.flatMap(m => m.ingredients.map(i => i.ingredientId))
  );

  // Build the set of categories/cuisines used today (for variety scoring)
  const usedCategoriesToday = new Set(alreadyPlannedMeals.map(m => m.category));
  const usedCuisinesToday   = new Set(alreadyPlannedMeals.map(m => m.cuisine));

  const avoidSet = new Set(avoidMealIds);

  return candidates
    .map(meal => {
      // ── Ingredient overlap (0–40) ──────────────────────────────────────────
      const mealIngredientIds = meal.ingredients.map(i => i.ingredientId);
      const overlapCount = mealIngredientIds.filter(id => plannedIngredientIds.has(id)).length;
      const overlapRatio = mealIngredientIds.length > 0
        ? overlapCount / mealIngredientIds.length
        : 0;
      const ingredientOverlap = Math.round(overlapRatio * 40);

      // ── Goal alignment (0–30) ──────────────────────────────────────────────
      const matchingGoals = meal.goalTags.filter(t => slot.targetProtein >= 30
        ? ['muscle-gain', 'post-workout', 'recovery'].includes(t)
        : true
      ).length;
      const goalAlignment = Math.min(matchingGoals * 10, 30);

      // ── Variety bonus (0–20) ───────────────────────────────────────────────
      const categoryIsNew = !usedCategoriesToday.has(meal.category);
      const cuisineIsNew  = !usedCuisinesToday.has(meal.cuisine) && meal.cuisine !== 'generic';
      const varietyBonus  = (categoryIsNew ? 12 : 0) + (cuisineIsNew ? 8 : 0);

      // ── Calorie proximity (0–10) ───────────────────────────────────────────
      const calDiff = Math.abs(meal.calories - slot.targetCalories);
      const calorieProximity = calDiff <= 50  ? 10
                             : calDiff <= 100 ? 7
                             : calDiff <= 200 ? 4
                             : calDiff <= 300 ? 1
                             : 0;

      // ── Cross-week avoid penalty (-30) ────────────────────────────────────
      const avoidPenalty = avoidSet.has(meal.id) ? -30 : 0;

      const score = ingredientOverlap + goalAlignment + varietyBonus + calorieProximity + avoidPenalty;

      return {
        meal,
        score,
        scoreBreakdown: { ingredientOverlap, goalAlignment, varietyBonus, calorieProximity },
      };
    })
    .sort((a, b) => b.score - a.score);
}

// ─── 3. Prompt Formatting ─────────────────────────────────────────────────────

/**
 * Serializes the scored shortlist, slot context, and daily totals-so-far
 * into a compact string that can be inserted into a Claude prompt.
 *
 * Designed to be token-efficient — Claude does not need full ingredient lists
 * to make a selection. It needs names, macros, tags, and scores.
 */
export function formatPromptContext(params: {
  slot: MealPlanSlot;
  scoredCandidates: ScoredMeal[];
  alreadyPlannedToday: MealPlanEntry[];
  weeklyIngredients: string[];   // ingredient IDs already in this week's plan
  maxCandidates?: number;
}): string {
  const {
    slot,
    scoredCandidates,
    alreadyPlannedToday,
    weeklyIngredients,
    maxCandidates = 8,
  } = params;

  // Daily totals so far
  const todayCalories = alreadyPlannedToday.reduce((s, e) => s + e.actualCalories, 0);
  const todayProtein  = alreadyPlannedToday.reduce((s, e) => s + e.actualProtein, 0);

  const remainingCal     = slot.targetCalories;
  const remainingProtein = slot.targetProtein;

  // Top N candidates (already sorted by score)
  const top = scoredCandidates.slice(0, maxCandidates);

  const candidateLines = top.map((sc, i) => {
    const m = sc.meal;
    const flags = [
      m.isHighProtein   ? 'high-protein'  : null,
      m.isLowCarb       ? 'low-carb'      : null,
      m.batchFriendly   ? 'batch-ok'      : null,
      m.mealPrepOnly    ? 'prep-only'     : null,
    ].filter(Boolean).join(', ');

    return [
      `${i + 1}. [${m.id}] ${m.name}`,
      `   Macros: ${m.calories} kcal | ${m.protein}g P | ${m.carbs}g C | ${m.fat}g F`,
      `   Tags: ${m.goalTags.join(', ')} | ${flags || 'none'}`,
      `   Prep: ${m.totalMins} min | Repeat: ${m.repeatTolerance}`,
      `   Score: ${sc.score}/100 (overlap ${sc.scoreBreakdown.ingredientOverlap}, goal ${sc.scoreBreakdown.goalAlignment}, variety ${sc.scoreBreakdown.varietyBonus}, cal ${sc.scoreBreakdown.calorieProximity})`,
    ].join('\n');
  }).join('\n\n');

  const alreadyPlannedLines = alreadyPlannedToday.length > 0
    ? alreadyPlannedToday.map(e =>
        `  - ${e.mealId} (${e.actualCalories} kcal, ${e.actualProtein}g protein)`
      ).join('\n')
    : '  (nothing planned yet today)';

  const sharedIngredients = weeklyIngredients.slice(0, 12).join(', ');

  return `
## Slot to fill
Day ${slot.day + 1} — ${slot.mealType.toUpperCase()}
Target: ${remainingCal} kcal | ${remainingProtein}g protein

## Already planned today (${todayCalories} kcal, ${todayProtein}g protein so far)
${alreadyPlannedLines}

## Ingredients already in this week's plan (prioritise reuse)
${sharedIngredients || 'none yet'}

## Eligible candidates (scored, best first)
${candidateLines}
`.trim();
}

/**
 * Returns the full system + user prompt ready to send to Claude.
 * The model should respond with ONLY a JSON object — no prose.
 */
export function buildAIPrompt(params: {
  slot: MealPlanSlot;
  scoredCandidates: ScoredMeal[];
  alreadyPlannedToday: MealPlanEntry[];
  weeklyIngredients: string[];
  userGoals: string[];
  dailyTargets: { calories: number; protein: number; carbs: number; fat: number };
}): { systemPrompt: string; userMessage: string } {
  const context = formatPromptContext({
    slot:                params.slot,
    scoredCandidates:    params.scoredCandidates,
    alreadyPlannedToday: params.alreadyPlannedToday,
    weeklyIngredients:   params.weeklyIngredients,
  });

  const systemPrompt = `You are a meal planning assistant for a fitness app.
Your job is to select the best meal from a pre-filtered, pre-scored list of candidates.

Rules:
- You MUST select from the candidates list. Do not invent meals.
- Prioritise ingredient overlap to minimise grocery waste.
- Prioritise goal alignment.
- Consider daily macro balance — don't double up on carb-heavy meals in one day.
- If a meal is marked "prep-only", it means it must be prepared in advance — only choose it if it's a viable plan.

The user's fitness goals: ${params.userGoals.join(', ')}
Daily macro targets: ${params.dailyTargets.calories} kcal | ${params.dailyTargets.protein}g protein | ${params.dailyTargets.carbs}g carbs | ${params.dailyTargets.fat}g fat

Respond ONLY with a JSON object in this exact format (no explanation, no prose):
{
  "selectedMealId": "the-meal-id",
  "portionMultiplier": 1.0,
  "reasoning": "one sentence max"
}

portionMultiplier options: 0.75 (smaller), 1.0 (standard), 1.25 (larger), 1.5 (double)
Only adjust the portion if the standard serving is clearly too far from the calorie target.`;

  return { systemPrompt, userMessage: context };
}

// ─── 4. Portion Scaling ───────────────────────────────────────────────────────

/**
 * Returns adjusted macros for a non-standard portion.
 * Only valid for meals where portionScalable = true.
 */
export function applyPortionScale(
  meal: MealRecord,
  multiplier: number,
): { calories: number; protein: number; carbs: number; fat: number } {
  if (!meal.portionScalable) {
    return { calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat };
  }
  return {
    calories: Math.round(meal.calories * multiplier),
    protein:  Math.round(meal.protein  * multiplier),
    carbs:    Math.round(meal.carbs    * multiplier),
    fat:      Math.round(meal.fat      * multiplier),
  };
}

/**
 * Creates a confirmed MealPlanEntry from an AI (or fallback) selection.
 */
export function createPlanEntry(
  slot: MealPlanSlot,
  meal: MealRecord,
  portionMultiplier: number,
): MealPlanEntry {
  const scaled = applyPortionScale(meal, portionMultiplier);
  return {
    slot,
    mealId: meal.id,
    portionMultiplier,
    actualCalories: scaled.calories,
    actualProtein:  scaled.protein,
  };
}

// ─── 5. Grocery List from Plan ────────────────────────────────────────────────

const GROCERY_CATEGORY_META: Record<GroceryCategory, { label: string; emoji: string }> = {
  protein:     { label: 'Protein',        emoji: '🥩' },
  dairy:       { label: 'Dairy',          emoji: '🥛' },
  carbs:       { label: 'Carbs & Grains', emoji: '🌾' },
  vegetables:  { label: 'Vegetables',     emoji: '🥦' },
  fruit:       { label: 'Fruit',          emoji: '🍌' },
  frozen:      { label: 'Frozen',         emoji: '🧊' },
  pantry:      { label: 'Pantry',         emoji: '🫙' },
  drinks:      { label: 'Drinks',         emoji: '🥤' },
  supplements: { label: 'Supplements',    emoji: '💊' },
};

const GROCERY_CATEGORY_ORDER: GroceryCategory[] = [
  'protein', 'dairy', 'carbs', 'vegetables', 'fruit', 'frozen', 'pantry', 'drinks', 'supplements',
];

// Units that can be summed directly (same unit = just add quantities)
const SUMMABLE_UNITS = new Set<IngredientUnit>(['g', 'ml', 'cup', 'tbsp', 'tsp', 'scoop', 'piece', 'slice', 'can']);

/**
 * Aggregates ingredients from a confirmed meal plan into a grocery list.
 * Meals referenced by ID are looked up in MEAL_DATABASE.
 */
export function buildPlanGroceryList(entries: MealPlanEntry[]): PlanGrocerySection[] {
  const mealMap = new Map(MEAL_DATABASE.map(m => [m.id, m]));

  // Aggregate: ingredientId__unit → accumulated quantity
  const aggregated = new Map<string, PlanGroceryItem>();

  for (const entry of entries) {
    const meal = mealMap.get(entry.mealId);
    if (!meal) continue;

    for (const ing of meal.ingredients) {
      if (ing.optional) continue;   // optional ingredients are not auto-added

      const key = `${ing.ingredientId}__${ing.unit}`;
      const scaledQty = Math.round(ing.quantity * entry.portionMultiplier * 10) / 10;

      const existing = aggregated.get(key);
      if (existing) {
        existing.totalQty = Math.round((existing.totalQty + scaledQty) * 10) / 10;
        if (!existing.appearsInMeals.includes(meal.name)) {
          existing.appearsInMeals.push(meal.name);
        }
      } else {
        aggregated.set(key, {
          ingredientId: ing.ingredientId,
          name: ing.name,
          totalQty: scaledQty,
          unit: ing.unit,
          groceryCategory: ing.groceryCategory,
          appearsInMeals: [meal.name],
        });
      }
    }
  }

  // Group by category and sort alphabetically within each
  const sections = new Map<GroceryCategory, PlanGroceryItem[]>();
  for (const cat of GROCERY_CATEGORY_ORDER) sections.set(cat, []);

  for (const item of aggregated.values()) {
    sections.get(item.groceryCategory)?.push(item);
  }

  return GROCERY_CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      ...GROCERY_CATEGORY_META[cat],
      items: (sections.get(cat) ?? []).sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter(s => s.items.length > 0);
}

// ─── 6. Deterministic Fallback ────────────────────────────────────────────────

/**
 * Selects the best meal without AI — just takes the top-scored candidate.
 * Used when: no API key, offline mode, or AI call fails.
 * Also useful for testing the scoring logic in isolation.
 */
export function selectMealFallback(
  slot: MealPlanSlot,
  profile: UserDietaryProfile,
  alreadyPlannedMeals: MealRecord[],
): { meal: MealRecord; portionMultiplier: number } | null {
  const candidates = filterMeals(slot, profile);
  if (candidates.length === 0) return null;

  const scored = scoreMeals(candidates, slot, alreadyPlannedMeals);
  const best   = scored[0];
  if (!best) return null;

  // Auto-adjust portion if calorie difference is large and meal is scalable
  let portionMultiplier = 1.0;
  if (best.meal.portionScalable) {
    const ratio = slot.targetCalories / best.meal.calories;
    if      (ratio <= 0.8)  portionMultiplier = 0.75;
    else if (ratio >= 1.4)  portionMultiplier = 1.5;
    else if (ratio >= 1.2)  portionMultiplier = 1.25;
  }

  return { meal: best.meal, portionMultiplier };
}

// ─── 7. Week Structure Builder ────────────────────────────────────────────────

/**
 * Generates a standard 7-day slot structure (21 main slots + 7 snacks = 28 slots).
 * Calorie and protein targets per slot are distributed from the daily total.
 *
 * Distribution:
 *   Breakfast: 25% calories, 25% protein
 *   Lunch:     30% calories, 30% protein
 *   Dinner:    35% calories, 35% protein
 *   Snack:     10% calories, 10% protein
 */
export function buildWeekSlots(dailyTargets: {
  calories: number;
  protein: number;
}): MealPlanSlot[] {
  const distribution: Record<MealType, { cal: number; prot: number }> = {
    breakfast: { cal: 0.25, prot: 0.25 },
    lunch:     { cal: 0.30, prot: 0.30 },
    dinner:    { cal: 0.35, prot: 0.35 },
    snack:     { cal: 0.10, prot: 0.10 },
    smoothie:  { cal: 0.20, prot: 0.20 },
  };

  const slots: MealPlanSlot[] = [];
  const mealTypes: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  for (let day = 0; day < 7; day++) {
    for (const type of mealTypes) {
      const dist = distribution[type];
      slots.push({
        day,
        mealType: type,
        targetCalories: Math.round(dailyTargets.calories * dist.cal),
        targetProtein:  Math.round(dailyTargets.protein  * dist.prot),
      });
    }
  }

  return slots;
}

// ─── 8. Ingredient Overlap Stats ─────────────────────────────────────────────

/**
 * Returns a summary of ingredient reuse efficiency for a given meal plan.
 * Useful for displaying "X% of ingredients are shared across meals" to the user.
 */
export function getIngredientReuseStats(entries: MealPlanEntry[]): {
  totalUniqueIngredients: number;
  totalIngredientAppearances: number;
  reuseRatio: number;           // > 1 means ingredients are being reused
  mostReusedIngredients: Array<{ ingredientId: string; name: string; count: number }>;
} {
  const mealMap = new Map(MEAL_DATABASE.map(m => [m.id, m]));
  const countMap = new Map<string, { name: string; count: number }>();

  for (const entry of entries) {
    const meal = mealMap.get(entry.mealId);
    if (!meal) continue;
    for (const ing of meal.ingredients) {
      if (ing.optional) continue;
      const existing = countMap.get(ing.ingredientId);
      if (existing) {
        existing.count++;
      } else {
        countMap.set(ing.ingredientId, { name: ing.name, count: 1 });
      }
    }
  }

  const totalUniqueIngredients     = countMap.size;
  const totalIngredientAppearances = [...countMap.values()].reduce((s, v) => s + v.count, 0);
  const reuseRatio = totalUniqueIngredients > 0
    ? Math.round((totalIngredientAppearances / totalUniqueIngredients) * 10) / 10
    : 0;

  const mostReusedIngredients = [...countMap.entries()]
    .map(([ingredientId, { name, count }]) => ({ ingredientId, name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { totalUniqueIngredients, totalIngredientAppearances, reuseRatio, mostReusedIngredients };
}
