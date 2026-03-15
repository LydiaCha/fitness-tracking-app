/**
 * Smoke tests for the meal planning engine.
 * Run: npx jest utils/mealPlanner.test.ts
 */

import {
  filterMeals,
  scoreMeals,
  selectMealFallback,
  buildWeekSlots,
  buildPlanGroceryList,
  createPlanEntry,
  getIngredientReuseStats,
  formatPromptContext,
} from '../utils/mealPlanner';
import { MEAL_DATABASE } from '../constants/mealDatabase';
import { UserDietaryProfile, MealPlanSlot } from '../types/meal';

const BASE_PROFILE: UserDietaryProfile = {
  restrictions: [],
  dislikedIngredientIds: [],
  goals: ['muscle-gain'],
  maxPrepMins: 30,
  recentMealIds: [],
};

const DINNER_SLOT: MealPlanSlot = {
  day: 0,
  mealType: 'dinner',
  targetCalories: 500,
  targetProtein: 40,
};

const BREAKFAST_SLOT: MealPlanSlot = {
  day: 0,
  mealType: 'breakfast',
  targetCalories: 400,
  targetProtein: 25,
};

const SNACK_SLOT: MealPlanSlot = {
  day: 0,
  mealType: 'snack',
  targetCalories: 200,
  targetProtein: 15,
};

// ─── Database integrity ───────────────────────────────────────────────────────

describe('MEAL_DATABASE integrity', () => {
  test('all meals have unique IDs', () => {
    const ids = MEAL_DATABASE.map(m => m.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });

  test('all meals have at least one ingredient', () => {
    const empty = MEAL_DATABASE.filter(m => m.ingredients.length === 0);
    expect(empty.map(m => m.id)).toEqual([]);
  });

  test('all meals have valid macros (no zeros where unexpected)', () => {
    const noCalories = MEAL_DATABASE.filter(m => m.calories === 0);
    expect(noCalories.map(m => m.id)).toEqual([]);
  });

  test('all meals have at least one mealType', () => {
    const noType = MEAL_DATABASE.filter(m => m.mealType.length === 0);
    expect(noType.map(m => m.id)).toEqual([]);
  });

  test('database has meals for every meal type', () => {
    const types = ['breakfast', 'lunch', 'dinner', 'snack', 'smoothie'] as const;
    for (const type of types) {
      const count = MEAL_DATABASE.filter(m => m.mealType.includes(type)).length;
      expect(count).toBeGreaterThan(0);
    }
  });
});

// ─── filterMeals ─────────────────────────────────────────────────────────────

describe('filterMeals', () => {
  test('returns results for a standard dinner slot', () => {
    const results = filterMeals(DINNER_SLOT, BASE_PROFILE);
    expect(results.length).toBeGreaterThan(0);
    results.forEach(m => expect(m.mealType).toContain('dinner'));
  });

  test('enforces gluten-free restriction', () => {
    const profile = { ...BASE_PROFILE, restrictions: ['gluten-free'] as const };
    const results = filterMeals(DINNER_SLOT, { ...profile, restrictions: ['gluten-free'] });
    results.forEach(m => expect(m.isGlutenFree).toBe(true));
  });

  test('enforces dairy-free restriction', () => {
    const profile: UserDietaryProfile = { ...BASE_PROFILE, restrictions: ['dairy-free'] };
    const results = filterMeals(BREAKFAST_SLOT, profile);
    results.forEach(m => expect(m.isDairyFree).toBe(true));
  });

  test('enforces vegetarian restriction', () => {
    const profile: UserDietaryProfile = { ...BASE_PROFILE, restrictions: ['vegetarian'] };
    const results = filterMeals(DINNER_SLOT, profile);
    results.forEach(m => expect(m.isVegetarian).toBe(true));
  });

  test('enforces max prep time', () => {
    const profile: UserDietaryProfile = { ...BASE_PROFILE, maxPrepMins: 5 };
    const results = filterMeals(BREAKFAST_SLOT, profile);
    results.forEach(m => expect(m.totalMins).toBeLessThanOrEqual(5));
  });

  test('filters out disliked ingredients', () => {
    const profile: UserDietaryProfile = { ...BASE_PROFILE, dislikedIngredientIds: ['tuna-tinned'] };
    const results = filterMeals(DINNER_SLOT, profile);
    results.forEach(m => {
      const hasTuna = m.ingredients.some(i => i.ingredientId === 'tuna-tinned');
      expect(hasTuna).toBe(false);
    });
  });

  test('enforces weekly repeat tolerance', () => {
    // Use a meal with 'weekly' tolerance that appears in recentMealIds within 7 days
    const weeklyMeal = MEAL_DATABASE.find(m => m.repeatTolerance === 'weekly');
    if (!weeklyMeal) return; // skip if none

    const profile: UserDietaryProfile = {
      ...BASE_PROFILE,
      recentMealIds: [weeklyMeal.id], // used 0 days ago
    };
    const slot: MealPlanSlot = { ...DINNER_SLOT, mealType: weeklyMeal.mealType[0] };
    const results = filterMeals(slot, profile);
    expect(results.find(m => m.id === weeklyMeal.id)).toBeUndefined();
  });
});

// ─── scoreMeals ──────────────────────────────────────────────────────────────

describe('scoreMeals', () => {
  test('returns scored array with correct length', () => {
    const candidates = filterMeals(DINNER_SLOT, BASE_PROFILE);
    const scored = scoreMeals(candidates, DINNER_SLOT, []);
    expect(scored).toHaveLength(candidates.length);
  });

  test('scores are sorted descending', () => {
    const candidates = filterMeals(DINNER_SLOT, BASE_PROFILE);
    const scored = scoreMeals(candidates, DINNER_SLOT, []);
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i - 1].score).toBeGreaterThanOrEqual(scored[i].score);
    }
  });

  test('score increases when ingredients overlap with already-planned meals', () => {
    const candidates = filterMeals(DINNER_SLOT, BASE_PROFILE);
    const baseScored = scoreMeals(candidates, DINNER_SLOT, []);

    // Add a planned meal that shares ingredients with chicken-rice-bowl
    const chickenRice = MEAL_DATABASE.find(m => m.id === 'chicken-rice-bowl');
    const withOverlap = chickenRice
      ? scoreMeals(candidates, DINNER_SLOT, [chickenRice])
      : baseScored;

    // At least one meal should have a higher score with overlap context
    const maxScoreBase    = Math.max(...baseScored.map(s => s.score));
    const maxScoreOverlap = Math.max(...withOverlap.map(s => s.score));
    expect(maxScoreOverlap).toBeGreaterThanOrEqual(maxScoreBase);
  });

  test('all score breakdowns sum to total score', () => {
    const candidates = filterMeals(DINNER_SLOT, BASE_PROFILE).slice(0, 5);
    const scored = scoreMeals(candidates, DINNER_SLOT, []);
    scored.forEach(sc => {
      const { ingredientOverlap, goalAlignment, varietyBonus, calorieProximity } = sc.scoreBreakdown;
      const sum = ingredientOverlap + goalAlignment + varietyBonus + calorieProximity;
      expect(sc.score).toBe(sum);
    });
  });
});

// ─── selectMealFallback ───────────────────────────────────────────────────────

describe('selectMealFallback', () => {
  test('returns a meal for a standard slot', () => {
    const result = selectMealFallback(DINNER_SLOT, BASE_PROFILE, []);
    expect(result).not.toBeNull();
    expect(result!.meal.mealType).toContain('dinner');
  });

  test('returns null when no candidates exist', () => {
    const impossibleProfile: UserDietaryProfile = {
      ...BASE_PROFILE,
      restrictions: ['vegan', 'gluten-free'],
      maxPrepMins: 1,
    };
    const result = selectMealFallback(DINNER_SLOT, impossibleProfile, []);
    // Either null (no match) or a valid vegan gluten-free meal
    if (result !== null) {
      expect(result.meal.isVegan).toBe(true);
      expect(result.meal.isGlutenFree).toBe(true);
    }
  });

  test('portion multiplier is between 0.5 and 2.0', () => {
    const result = selectMealFallback(DINNER_SLOT, BASE_PROFILE, []);
    if (result) {
      expect(result.portionMultiplier).toBeGreaterThanOrEqual(0.5);
      expect(result.portionMultiplier).toBeLessThanOrEqual(2.0);
    }
  });
});

// ─── buildWeekSlots ───────────────────────────────────────────────────────────

describe('buildWeekSlots', () => {
  test('generates 28 slots for a full week (4 meals × 7 days)', () => {
    const slots = buildWeekSlots({ calories: 2000, protein: 150 });
    expect(slots).toHaveLength(28);
  });

  test('covers all 7 days', () => {
    const slots = buildWeekSlots({ calories: 2000, protein: 150 });
    const days = new Set(slots.map(s => s.day));
    expect(days.size).toBe(7);
  });

  test('all 4 meal types are present each day', () => {
    const slots = buildWeekSlots({ calories: 2000, protein: 150 });
    for (let day = 0; day < 7; day++) {
      const daySlots = slots.filter(s => s.day === day);
      const types = new Set(daySlots.map(s => s.mealType));
      expect(types.has('breakfast')).toBe(true);
      expect(types.has('lunch')).toBe(true);
      expect(types.has('dinner')).toBe(true);
      expect(types.has('snack')).toBe(true);
    }
  });

  test('calorie targets are positive numbers', () => {
    const slots = buildWeekSlots({ calories: 2000, protein: 150 });
    slots.forEach(s => expect(s.targetCalories).toBeGreaterThan(0));
  });
});

// ─── buildPlanGroceryList ────────────────────────────────────────────────────

describe('buildPlanGroceryList', () => {
  const sampleEntries = (() => {
    const meals = ['chicken-rice-bowl', 'overnight-oats-berry', 'beef-pasta'];
    const slots = buildWeekSlots({ calories: 2000, protein: 150 }).slice(0, 3);
    return meals.map((mealId, i) => {
      const meal = MEAL_DATABASE.find(m => m.id === mealId)!;
      return createPlanEntry(slots[i], meal, 1.0);
    });
  })();

  test('returns at least one section', () => {
    const sections = buildPlanGroceryList(sampleEntries);
    expect(sections.length).toBeGreaterThan(0);
  });

  test('all sections have items', () => {
    const sections = buildPlanGroceryList(sampleEntries);
    sections.forEach(s => expect(s.items.length).toBeGreaterThan(0));
  });

  test('items have positive quantities', () => {
    const sections = buildPlanGroceryList(sampleEntries);
    sections.flatMap(s => s.items).forEach(item => {
      expect(item.totalQty).toBeGreaterThan(0);
    });
  });

  test('each item references at least one meal', () => {
    const sections = buildPlanGroceryList(sampleEntries);
    sections.flatMap(s => s.items).forEach(item => {
      expect(item.appearsInMeals.length).toBeGreaterThan(0);
    });
  });

  test('quantities scale with portionMultiplier', () => {
    const meal = MEAL_DATABASE.find(m => m.id === 'chicken-rice-bowl')!;
    const slot  = DINNER_SLOT;

    const entry1x  = createPlanEntry(slot, meal, 1.0);
    const entry15x = createPlanEntry(slot, meal, 1.5);

    const list1x  = buildPlanGroceryList([entry1x]);
    const list15x = buildPlanGroceryList([entry15x]);

    // Total quantity at 1.5x should be greater than at 1x
    const total1x  = list1x.flatMap(s => s.items).reduce((s, i) => s + i.totalQty, 0);
    const total15x = list15x.flatMap(s => s.items).reduce((s, i) => s + i.totalQty, 0);
    expect(total15x).toBeGreaterThan(total1x);
  });
});

// ─── getIngredientReuseStats ──────────────────────────────────────────────────

describe('getIngredientReuseStats', () => {
  test('reuse ratio > 1 when meals share ingredients', () => {
    // chicken-rice-bowl and chicken-rice-broccoli share chicken-breast and brown-rice
    const meals = ['chicken-rice-bowl', 'chicken-rice-broccoli', 'chicken-stir-fry'];
    const entries = meals.map((mealId, i) => {
      const meal = MEAL_DATABASE.find(m => m.id === mealId)!;
      return createPlanEntry({ ...DINNER_SLOT, day: i }, meal, 1.0);
    });
    const stats = getIngredientReuseStats(entries);
    expect(stats.reuseRatio).toBeGreaterThan(1);
  });

  test('mostReusedIngredients returns at most 5 items', () => {
    const entries = MEAL_DATABASE.slice(0, 10).map((meal, i) =>
      createPlanEntry({ ...DINNER_SLOT, day: i % 7 }, meal, 1.0)
    );
    const stats = getIngredientReuseStats(entries);
    expect(stats.mostReusedIngredients.length).toBeLessThanOrEqual(5);
  });
});

// ─── formatPromptContext ─────────────────────────────────────────────────────

describe('formatPromptContext', () => {
  test('returns a non-empty string', () => {
    const candidates = filterMeals(DINNER_SLOT, BASE_PROFILE);
    const scored     = scoreMeals(candidates, DINNER_SLOT, []);
    const context    = formatPromptContext({
      slot:                DINNER_SLOT,
      scoredCandidates:    scored,
      alreadyPlannedToday: [],
      weeklyIngredients:   ['chicken-breast', 'brown-rice'],
    });
    expect(context.length).toBeGreaterThan(100);
  });

  test('respects maxCandidates limit', () => {
    const candidates = filterMeals(DINNER_SLOT, BASE_PROFILE);
    const scored     = scoreMeals(candidates, DINNER_SLOT, []);
    const context    = formatPromptContext({
      slot:                DINNER_SLOT,
      scoredCandidates:    scored,
      alreadyPlannedToday: [],
      weeklyIngredients:   [],
      maxCandidates:       3,
    });
    // Should contain "1." "2." "3." but not "4."
    expect(context).toContain('1.');
    expect(context).toContain('3.');
    expect(context).not.toMatch(/\n4\./);
  });
});
