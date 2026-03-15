/**
 * PeakRoutine — Meal Template Definitions
 *
 * Templates are the core of reliable AI meal generation.
 * Instead of inventing meals freely, the AI fills template slots
 * from the approved ingredient registry.
 *
 * Each template defines:
 *  - the named slots (protein, carb, vegetable, sauce, etc.)
 *  - which ingredients are valid for each slot
 *  - example meals that were built from this template
 *
 * 10 templates × 4–6 valid options per slot = hundreds of valid combinations
 * without writing hundreds of individual recipes.
 */

import { MealTemplate } from '@/types/meal';

export const MEAL_TEMPLATES: MealTemplate[] = [
  {
    id: 'protein-carb-veg-bowl',
    name: 'Protein + Carb + Veg Bowl',
    description:
      'The most versatile template. A portion of protein over a carb base with a vegetable and a sauce. Works for lunch and dinner. Naturally high-protein and macro-balanced.',
    slots: [
      {
        name: 'protein',
        required: true,
        validIngredientIds: ['chicken-breast', 'beef-mince', 'salmon-fillet', 'tuna-tinned', 'eggs', 'turkey-mince'],
      },
      {
        name: 'carb',
        required: true,
        validIngredientIds: ['brown-rice', 'quinoa', 'sweet-potato', 'baby-potatoes', 'wholegrain-pasta'],
      },
      {
        name: 'vegetable',
        required: true,
        validIngredientIds: ['broccoli', 'spinach', 'capsicum', 'green-beans', 'asparagus', 'zucchini', 'mushrooms'],
      },
      {
        name: 'sauce',
        required: false,
        validIngredientIds: ['soy-sauce', 'olive-oil', 'sesame-oil', 'salsa', 'tinned-tomatoes'],
      },
    ],
    exampleMealIds: ['chicken-rice-bowl', 'chicken-quinoa-spinach', 'beef-taco-bowl', 'salmon-quinoa-broccoli'],
  },

  {
    id: 'eggs-toast-side',
    name: 'Eggs + Toast + Side',
    description:
      'Classic egg-based breakfast. Egg preparation and toppings vary to create meaningful variety without any new ingredients.',
    slots: [
      {
        name: 'egg-prep',
        required: true,
        validIngredientIds: ['eggs'],
      },
      {
        name: 'toast',
        required: true,
        validIngredientIds: ['wholegrain-bread'],
      },
      {
        name: 'topping',
        required: true,
        validIngredientIds: ['avocado', 'cheddar', 'feta', 'hummus', 'cream-cheese'],
      },
      {
        name: 'side',
        required: false,
        validIngredientIds: ['tomatoes', 'cherry-tomatoes', 'spinach', 'mushrooms', 'cucumber'],
      },
    ],
    exampleMealIds: ['scrambled-eggs-toast', 'poached-eggs-avo', 'veggie-omelette'],
  },

  {
    id: 'yogurt-bowl',
    name: 'Yogurt Bowl',
    description:
      'High-protein no-cook meal. Greek yogurt or cottage cheese as a base, with fruit, a crunchy topping, and a drizzle. Takes 2 minutes. Suitable for breakfast, snack, or pre-sleep.',
    slots: [
      {
        name: 'base',
        required: true,
        validIngredientIds: ['greek-yogurt', 'cottage-cheese'],
      },
      {
        name: 'fruit',
        required: true,
        validIngredientIds: ['frozen-berries', 'strawberries', 'banana', 'frozen-mango', 'apple'],
      },
      {
        name: 'topping',
        required: false,
        validIngredientIds: ['granola', 'rolled-oats', 'chia-seeds', 'mixed-nuts'],
      },
      {
        name: 'drizzle',
        required: false,
        validIngredientIds: ['honey', 'maple-syrup', 'peanut-butter'],
      },
    ],
    exampleMealIds: ['greek-yogurt-parfait', 'cottage-cheese-fruit'],
  },

  {
    id: 'oats-bowl',
    name: 'Oats Bowl',
    description:
      'Rolled oats as base — prepared as overnight oats, porridge, or protein oats. Adding protein powder and a nut butter makes this a complete macro meal.',
    slots: [
      {
        name: 'oat-type',
        required: true,
        validIngredientIds: ['rolled-oats'],
      },
      {
        name: 'liquid',
        required: true,
        validIngredientIds: ['milk', 'oat-milk'],
      },
      {
        name: 'protein-boost',
        required: false,
        validIngredientIds: ['whey-protein', 'greek-yogurt'],
      },
      {
        name: 'fruit',
        required: true,
        validIngredientIds: ['banana', 'frozen-berries', 'strawberries', 'apple'],
      },
      {
        name: 'add-on',
        required: false,
        validIngredientIds: ['peanut-butter', 'almond-butter', 'chia-seeds', 'honey', 'cinnamon'],
      },
    ],
    exampleMealIds: ['overnight-oats-berry', 'overnight-oats-banana-pb', 'protein-porridge'],
  },

  {
    id: 'wrap',
    name: 'Wrap',
    description:
      'A wholegrain tortilla filled with a protein, a sauce or spread, and salad items. Ready in under 5 minutes if protein is pre-cooked. Easy to pack for work or uni.',
    slots: [
      {
        name: 'tortilla',
        required: true,
        validIngredientIds: ['wholegrain-tortilla'],
      },
      {
        name: 'protein',
        required: true,
        validIngredientIds: ['chicken-breast', 'tuna-tinned', 'eggs', 'beef-mince'],
      },
      {
        name: 'spread',
        required: false,
        validIngredientIds: ['hummus', 'cream-cheese', 'sour-cream', 'salsa', 'avocado'],
      },
      {
        name: 'salad',
        required: false,
        validIngredientIds: ['spinach', 'cucumber', 'tomatoes', 'capsicum'],
      },
      {
        name: 'cheese',
        required: false,
        validIngredientIds: ['cheddar', 'feta'],
      },
    ],
    exampleMealIds: ['chicken-salsa-wrap', 'tuna-cream-cheese-wrap', 'hummus-veg-wrap'],
  },

  {
    id: 'smoothie',
    name: 'Protein Smoothie',
    description:
      'Blended meal — liquid base, a protein source, fruit, and an optional add-on. Fastest possible meal prep. High in protein and portable.',
    slots: [
      {
        name: 'liquid',
        required: true,
        validIngredientIds: ['milk', 'oat-milk', 'coconut-water'],
      },
      {
        name: 'protein',
        required: true,
        validIngredientIds: ['whey-protein', 'casein-protein', 'greek-yogurt'],
      },
      {
        name: 'fruit',
        required: true,
        validIngredientIds: ['banana', 'frozen-berries', 'frozen-mango', 'strawberries'],
      },
      {
        name: 'add-on',
        required: false,
        validIngredientIds: ['peanut-butter', 'almond-butter', 'chia-seeds', 'rolled-oats', 'spinach', 'cacao-powder', 'ginger', 'cinnamon', 'honey'],
      },
    ],
    exampleMealIds: ['recovery-shake', 'mango-ginger-boost', 'berry-burst', 'night-shift-energy', 'warm-bedtime-casein'],
  },

  {
    id: 'pasta-dish',
    name: 'Pasta Dish',
    description:
      'Wholegrain pasta with a protein and a sauce. Higher carb — suitable for post-workout dinners, rest days, or batch cooking.',
    slots: [
      {
        name: 'pasta',
        required: true,
        validIngredientIds: ['wholegrain-pasta'],
      },
      {
        name: 'protein',
        required: true,
        validIngredientIds: ['beef-mince', 'chicken-breast', 'tuna-tinned', 'eggs'],
      },
      {
        name: 'sauce',
        required: true,
        validIngredientIds: ['tinned-tomatoes', 'olive-oil', 'soy-sauce'],
      },
      {
        name: 'vegetable',
        required: false,
        validIngredientIds: ['spinach', 'zucchini', 'capsicum', 'mushrooms', 'cherry-tomatoes'],
      },
      {
        name: 'topping',
        required: false,
        validIngredientIds: ['parmesan', 'feta', 'cheddar'],
      },
    ],
    exampleMealIds: ['beef-pasta', 'tuna-pasta-salad', 'pasta-tomato-spinach'],
  },

  {
    id: 'stir-fry',
    name: 'Stir-Fry',
    description:
      'One-pan meal, 10–15 minutes. Protein cooked in a hot pan with vegetables and a soy-based sauce, served over rice. Great for batch prep.',
    slots: [
      {
        name: 'protein',
        required: true,
        validIngredientIds: ['chicken-breast', 'beef-mince', 'turkey-mince', 'eggs'],
      },
      {
        name: 'vegetable',
        required: true,
        validIngredientIds: ['broccoli', 'capsicum', 'spinach', 'mushrooms', 'zucchini', 'frozen-peas-corn'],
      },
      {
        name: 'carb',
        required: true,
        validIngredientIds: ['brown-rice', 'wholegrain-pasta'],
      },
      {
        name: 'sauce',
        required: true,
        validIngredientIds: ['soy-sauce', 'sesame-oil'],
      },
    ],
    exampleMealIds: ['chicken-stir-fry', 'beef-fried-rice', 'egg-fried-rice-veg'],
  },

  {
    id: 'baked-protein-veg',
    name: 'Baked Protein + Veg',
    description:
      'Protein baked or pan-seared with roasted vegetables and a carb side. Minimal active prep — oven does the work. Good for Sunday batch prep.',
    slots: [
      {
        name: 'protein',
        required: true,
        validIngredientIds: ['chicken-breast', 'chicken-thighs', 'salmon-fillet', 'sirloin-steak'],
      },
      {
        name: 'carb-side',
        required: true,
        validIngredientIds: ['sweet-potato', 'baby-potatoes', 'brown-rice', 'quinoa'],
      },
      {
        name: 'vegetable',
        required: true,
        validIngredientIds: ['green-beans', 'asparagus', 'broccoli', 'zucchini', 'capsicum', 'mushrooms'],
      },
      {
        name: 'fat',
        required: false,
        validIngredientIds: ['olive-oil', 'butter'],
      },
    ],
    exampleMealIds: ['baked-chicken-sweet-potato', 'baked-salmon-potatoes', 'steak-potatoes-peas', 'one-pan-chicken-veg'],
  },

  {
    id: 'simple-snack',
    name: 'Simple Snack',
    description:
      'No-cook assembly of 1–3 items. Keeps energy stable between meals without being a full meal. Target: 150–300 kcal, ≥10g protein where possible.',
    slots: [
      {
        name: 'protein-item',
        required: true,
        validIngredientIds: ['greek-yogurt', 'cottage-cheese', 'eggs', 'mixed-nuts', 'whey-protein'],
      },
      {
        name: 'carb-item',
        required: false,
        validIngredientIds: ['rice-cakes', 'wholegrain-crackers', 'granola', 'banana', 'apple'],
      },
      {
        name: 'extra',
        required: false,
        validIngredientIds: ['peanut-butter', 'almond-butter', 'honey', 'dark-chocolate', 'frozen-berries'],
      },
    ],
    exampleMealIds: ['cottage-cheese-berries', 'boiled-eggs-rice-cakes', 'apple-almond-butter', 'mixed-nuts-dark-choc', 'banana-pb-rice-cakes'],
  },
];

// ─── Quick lookup ─────────────────────────────────────────────────────────────

const _templateMap = new Map(MEAL_TEMPLATES.map(t => [t.id, t]));

export function getMealTemplate(id: string): MealTemplate | undefined {
  return _templateMap.get(id as import('@/types/meal').TemplateId);
}
