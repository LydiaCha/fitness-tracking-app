/**
 * PeakRoutine — Meal Database Core Types
 *
 * These types underpin the AI-powered meal planning system.
 * The design principle: the AI selects and adjusts, it never invents.
 */

// ─── Enumerations ─────────────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'smoothie';

export type CuisineStyle =
  | 'generic'
  | 'asian'
  | 'mediterranean'
  | 'mexican'
  | 'american'
  | 'middle-eastern';

export type MealCategory =
  | 'eggs'
  | 'oats'
  | 'yogurt-bowl'
  | 'bowl'
  | 'wrap'
  | 'pasta'
  | 'stir-fry'
  | 'baked'
  | 'salad'
  | 'smoothie'
  | 'snack-plate'
  | 'no-cook'
  | 'pancakes'
  | 'soup'
  | 'curry'
  | 'pan-fry';

export type TemplateId =
  | 'protein-carb-veg-bowl'
  | 'eggs-toast-side'
  | 'yogurt-bowl'
  | 'oats-bowl'
  | 'wrap'
  | 'smoothie'
  | 'pasta-dish'
  | 'stir-fry'
  | 'baked-protein-veg'
  | 'simple-snack'
  | 'shake'
  | 'pancakes'
  | 'toast-topping'
  | 'egg-cups'
  | 'soup'
  | 'salad'
  | 'curry';

export type GoalTag =
  | 'muscle-gain'
  | 'fat-loss'
  | 'maintenance'
  | 'recovery'
  | 'pre-workout'
  | 'post-workout';

export type TimeSlot = 'morning' | 'midday' | 'evening' | 'late-night';

export type FlavorTag = 'savory' | 'sweet' | 'creamy' | 'crunchy' | 'spicy' | 'light' | 'hearty' | 'warm';

export type GroceryCategory =
  | 'protein'
  | 'dairy'
  | 'carbs'
  | 'vegetables'
  | 'fruit'
  | 'frozen'
  | 'pantry'
  | 'drinks'
  | 'supplements';

export type IngredientUnit =
  | 'g'
  | 'ml'
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'scoop'
  | 'piece'
  | 'slice'
  | 'can';

/** 1 = no-cook / assembly only, 2 = basic heat / toast, 3 = actual cooking */
export type Difficulty = 1 | 2 | 3;

/** How soon the same meal can be repeated in a plan without feeling repetitive */
export type RepeatTolerance = 'daily' | 'every-2-days' | 'weekly';

/** How filling the meal feels relative to its calories */
export type SatietyScore = 1 | 2 | 3;

// ─── Ingredient Registry ──────────────────────────────────────────────────────

/**
 * Master record for a single purchasable ingredient.
 * All meal ingredient references point to an id in this registry.
 */
export interface IngredientRecord {
  id: string;
  name: string;
  groceryCategory: GroceryCategory;
  defaultUnit: IngredientUnit;
  /** How long it lasts once purchased */
  shelfLife: 'fresh-3d' | 'fresh-7d' | 'frozen' | 'pantry';
  /** IDs of ingredients that can substitute this one */
  commonSubstituteIds: string[];
}

// ─── Meal Template ────────────────────────────────────────────────────────────

export interface TemplateSlot {
  name: string;          // e.g. "protein", "carb", "vegetable", "sauce"
  required: boolean;
  /** Ingredient IDs that are valid for this slot */
  validIngredientIds: string[];
}

export interface MealTemplate {
  id: TemplateId;
  name: string;
  description: string;
  slots: TemplateSlot[];
  /** Example meal IDs that use this template */
  exampleMealIds: string[];
}

// ─── Meal Record ──────────────────────────────────────────────────────────────

export interface MealIngredient {
  ingredientId: string;
  name: string;            // human-readable display name
  quantity: number;
  unit: IngredientUnit;
  prepNote?: string;       // "cooked", "frozen ok", "diced" — display only, not purchased
  optional: boolean;
  groceryCategory: GroceryCategory;
}

export interface IngredientSwap {
  originalIngredientId: string;
  replacementIngredientId: string;
  replacementName: string;
  reason: 'dietary' | 'budget' | 'preference' | 'availability';
  /** How the macros change when the swap is applied */
  macroDelta: { calories: number; protein: number; carbs: number; fat: number };
}

export interface MealRecord {
  // ── Identity ──────────────────────────────────────────────────────────────
  id: string;
  name: string;

  // ── Classification ────────────────────────────────────────────────────────
  mealType: MealType[];
  cuisine: CuisineStyle;
  category: MealCategory;
  templateId: TemplateId;

  // ── Macros (per single serving, default portion) ──────────────────────────
  calories: number;
  protein: number;   // g
  carbs: number;     // g
  fat: number;       // g
  fibre?: number;    // g

  // ── Prep ──────────────────────────────────────────────────────────────────
  prepMins: number;    // active hands-on time
  totalMins: number;   // includes passive time (soaking, baking, etc.)
  difficulty: Difficulty;
  batchFriendly: boolean;
  /** Best or only made in advance (overnight oats, casein shake, etc.) */
  mealPrepOnly: boolean;

  // ── Ingredients ───────────────────────────────────────────────────────────
  ingredients: MealIngredient[];

  // ── Dietary flags (fast boolean filters) ──────────────────────────────────
  isGlutenFree: boolean;
  isDairyFree: boolean;
  isVegetarian: boolean;
  isVegan: boolean;
  isHighProtein: boolean;   // ≥25g protein per serving
  isLowCarb: boolean;       // ≤20g net carbs per serving
  isNutFree: boolean;

  // ── AI planning metadata ──────────────────────────────────────────────────
  goalTags: GoalTag[];
  satietyScore: SatietyScore;
  flavorProfile: FlavorTag[];
  timeOfDay: TimeSlot[];
  repeatTolerance: RepeatTolerance;
  /** Can macros be linearly scaled by adjusting portion size? */
  portionScalable: boolean;

  // ── Grocery ───────────────────────────────────────────────────────────────
  /** Which supermarket aisles this meal touches — used for trip planning */
  groceryCategories: GroceryCategory[];

  // ── Content ───────────────────────────────────────────────────────────────
  tip?: string;
  instructions?: string;
  swaps?: IngredientSwap[];
}

// ─── Query / Selection Types (used by AI planning layer) ─────────────────────

export interface UserDietaryProfile {
  restrictions: Array<'gluten-free' | 'dairy-free' | 'vegetarian' | 'vegan' | 'nut-free'>;
  dislikedIngredientIds: string[];
  goals: GoalTag[];
  maxPrepMins: number;
  /** IDs of meals used in the last 7 days — used to enforce repeatTolerance */
  recentMealIds: string[];
}

export interface MealPlanSlot {
  day: number;          // 0–6 (Mon–Sun)
  mealType: MealType;
  targetCalories: number;
  targetProtein: number;
}

export interface MealPlanEntry {
  slot: MealPlanSlot;
  mealId: string;
  portionMultiplier: number;   // 1.0 = standard, 1.5 = larger, 0.75 = smaller
  actualCalories: number;
  actualProtein: number;
}
