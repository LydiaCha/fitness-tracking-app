/**
 * PeakRoutine — Grocery List Builder
 *
 * Converts a 7-day meal schedule into a clean, deduplicated, supermarket-ready
 * grocery list. Core philosophy: list what you BUY, not how you cook it.
 *
 * Pipeline per ingredient string:
 *   raw string
 *     → strip macro info / instruction noise
 *     → parse qty + unit + raw name
 *     → strip cooking-method words
 *     → apply canonical alias map  (egg → eggs, grilled chicken → chicken breast)
 *     → categorise
 *     → aggregate by (canonical name, unit)
 */

import { WEEK_SCHEDULE } from '@/constants/scheduleData';
import { SHAKE_RECIPES, MEAL_IDEAS } from '@/constants/nutritionData';
import { AppThemeType } from '@/constants/theme';

// ─── Public types ─────────────────────────────────────────────────────────────

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

export interface GroceryItem {
  id: string;
  name: string;       // canonical supermarket name, title-cased
  quantity: string;   // formatted e.g. "600g", "×6", "3 cups"
  qty: number;
  unit: string;
  category: GroceryCategory;
  checked: boolean;
}

export interface GrocerySection {
  category: GroceryCategory;
  label: string;
  emoji: string;
  items: GroceryItem[];
}

// ─── Internal constants ───────────────────────────────────────────────────────

export const CATEGORY_ORDER: GroceryCategory[] = [
  'protein', 'dairy', 'carbs', 'vegetables', 'fruit', 'frozen', 'pantry', 'drinks', 'supplements',
];

export const CATEGORY_META: Record<GroceryCategory, { label: string; emoji: string }> = {
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

// ── Unicode fractions ─────────────────────────────────────────────────────────

const UNICODE_FRACTIONS: Record<string, number> = {
  '½': 0.5,  '¼': 0.25, '¾': 0.75,
  '⅓': 0.333, '⅔': 0.667,
  '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875,
};

function expandFractions(s: string): string {
  for (const [ch, val] of Object.entries(UNICODE_FRACTIONS)) {
    s = s.replace(new RegExp(`(\\d+)${ch}`, 'g'), (_, w) => String(Number(w) + val));
    s = s.replace(new RegExp(ch, 'g'), String(val));
  }
  return s;
}

// ── Unit normalisation ────────────────────────────────────────────────────────

const UNIT_MAP: Record<string, string> = {
  cup: 'cup', cups: 'cup',
  tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp',
  tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
  scoop: 'scoop', scoops: 'scoop',
  slice: 'slice', slices: 'slice',
  can: 'can', cans: 'can', tin: 'can', tins: 'can',
  g: 'g', gram: 'g', grams: 'g',
  kg: 'kg', kilogram: 'kg', kilograms: 'kg',
  ml: 'ml', millilitre: 'ml', millilitres: 'ml',
  l: 'L', L: 'L', litre: 'L', litres: 'L',
};

// ── Cooking / preparation words to strip ─────────────────────────────────────
// These describe HOW food is cooked, not what you buy at a supermarket.

const COOKING_METHODS = [
  'scrambled', 'boiled', 'hard-boiled', 'soft-boiled', 'poached',
  'fried', 'pan-fried', 'stir-fried', 'deep-fried',
  'grilled', 'baked', 'roasted', 'steamed', 'sautéed', 'sauteed',
  'cooked', 'raw', 'dried', 'toasted', 'mashed', 'pureed',
  'crushed', 'minced', 'chopped', 'diced', 'sliced', 'shredded',
  'grated', 'crumbled', 'whipped', 'braised', 'poached',
  // Descriptors that don't affect what you buy
  'fresh', 'ripe', 'warm', 'hot', 'cold', 'chilled', 'organic',
  'lean', 'full-fat', 'low-fat', 'reduced-fat', 'light',
  'large', 'small', 'medium', 'extra',
  // Quantity words that slip through as adjectives
  'handful', 'pinch', 'dash', 'splash',
];
const COOKING_RE = new RegExp(`\\b(${COOKING_METHODS.join('|')})\\b`, 'gi');

// ── Canonical alias map ───────────────────────────────────────────────────────
// Maps any variant name → the canonical supermarket item name.
// Rules:
//   • More specific patterns first
//   • After COOKING_RE has already stripped preparation words
//   • Goal: "egg", "eggs", "scrambled egg" → all → "eggs"

const CANONICAL_ALIASES: [RegExp, string][] = [
  // ── Eggs ──────────────────────────────────────────────────────────────────
  [/\beggs?\b/, 'eggs'],

  // ── Chicken ───────────────────────────────────────────────────────────────
  [/\bchicken\s+thighs?\b/, 'chicken thighs'],
  [/\bchicken\s+breast\b/, 'chicken breast'],
  [/\bchicken\b/, 'chicken breast'],                    // bare "chicken" → breast

  // ── Beef / red meat ───────────────────────────────────────────────────────
  [/\bbeef\s+mince\b/, 'beef mince'],
  [/\blean\s+mince\b/, 'beef mince'],
  [/\bmince\b/, 'beef mince'],
  [/\bsirloin\s+steak\b/, 'sirloin steak'],
  [/\bsteak\b/, 'sirloin steak'],

  // ── Turkey ────────────────────────────────────────────────────────────────
  [/\bturkey\s+mince\b/, 'turkey mince'],
  [/\bturkey\b/, 'turkey mince'],

  // ── Fish ──────────────────────────────────────────────────────────────────
  [/\bsalmon\s+(fillet|steak)?\b/, 'salmon fillet'],
  [/\btuna\b/, 'tuna (tinned)'],

  // ── Protein powders (before generic "protein") ────────────────────────────
  [/\bcasein\s+protein\b/, 'casein protein'],
  [/\b(whey\s+)?protein\s+powder\b/, 'whey protein'],
  [/\b(vanilla|chocolate|strawberry)\s+whey\b/, 'whey protein'],
  [/\bwhey\s+protein\b/, 'whey protein'],
  [/\bprotein\s+(shake|bar)\b/, 'protein bar'],
  [/\b\d?\s*scoop\s+protein\b/, 'whey protein'],

  // ── Dairy: milk (before oat/almond/coconut milk which stay separate) ──────
  [/\b(full-fat|whole|semi-skimmed|skim|skimmed|low-fat)\s+milk\b/, 'milk'],
  [/\bwarm\s+milk\b/, 'milk'],
  [/^milk$/, 'milk'],

  // ── Dairy: yogurt ─────────────────────────────────────────────────────────
  [/\b(low-fat\s+)?greek\s+yoghu?rt\b/, 'greek yogurt'],
  [/\byoghu?rt\b/, 'yogurt'],

  // ── Dairy: cheese ─────────────────────────────────────────────────────────
  [/\bcottage\s+cheese\b/, 'cottage cheese'],
  [/\bcheddar(\s+cheese)?\b/, 'cheddar'],
  [/\bparmesan\b/, 'parmesan'],
  [/\bfeta(\s+cheese)?\b/, 'feta'],

  // ── Dairy: cheese (cream cheese before generic cream) ─────────────────────
  [/\bcream\s+cheese\b/, 'cream cheese'],

  // ── Dairy: butter / cream ────────────────────────────────────────────────
  [/\bsour\s+cream\b/, 'sour cream'],
  [/\bpeppercorn\s+sauce\b/, 'peppercorn sauce'],      // keep as pantry item
  [/\bgarlic\s+butter\b/, 'butter'],                   // garlic butter → buy butter

  // ── Carbs: rice ──────────────────────────────────────────────────────────
  [/\bbrown\s+rice(\s+\([^)]*\))?\b/, 'brown rice'],
  [/\bwhite\s+rice\b/, 'white rice'],
  [/\bcooked\s+rice\b/, 'brown rice'],
  [/\bleftover\s+rice\b/, 'brown rice'],

  // ── Carbs: oats ──────────────────────────────────────────────────────────
  [/\b(rolled\s+)?oats?\b/, 'oats'],

  // ── Carbs: bread / toast ─────────────────────────────────────────────────
  [/\b(wholegrain\s+)?sourdough\b/, 'wholegrain bread'],
  [/\bwholegrain\s+(toast|bread)\b/, 'wholegrain bread'],
  [/\btoast\b/, 'wholegrain bread'],

  // ── Carbs: pasta ─────────────────────────────────────────────────────────
  [/\bwholegrain\s+pasta\b/, 'wholegrain pasta'],
  [/\bpasta\b/, 'wholegrain pasta'],

  // ── Carbs: quinoa / wraps ────────────────────────────────────────────────
  [/\bquinoa\b/, 'quinoa'],
  [/\bwholegrain\s+tortilla\b/, 'wholegrain tortilla'],
  [/\btortilla\b/, 'wholegrain tortilla'],
  [/\brice\s+cakes?\b/, 'rice cakes'],
  [/\bcrackers?\b/, 'crackers'],
  [/\bgranola\b/, 'granola'],

  // ── Carbs: potatoes ──────────────────────────────────────────────────────
  [/\bbaby\s+potatoes?\b/, 'potatoes'],
  [/\bsweet\s+potatoes?\b/, 'sweet potato'],
  [/\bpotatoes?\b/, 'potatoes'],

  // ── Vegetables ───────────────────────────────────────────────────────────
  [/\bcherry\s+tomatoes?\b/, 'tomatoes'],
  [/\b(tinned\s+)?(diced\s+)?tomatoes?\b/, 'tomatoes'],
  [/\btomato\s+sauce\b/, 'tinned tomatoes'],
  [/\bbaby\s+spinach\b/, 'spinach'],
  [/\bspinach\s+leaves?\b/, 'spinach'],
  [/\bspinach\b/, 'spinach'],
  [/\bbok\s+choy\b/, 'bok choy'],
  [/\bsnap\s+peas\b/, 'snap peas'],
  [/\bgreen\s+beans\b/, 'green beans'],

  // ── Fruit ────────────────────────────────────────────────────────────────
  [/\bbananas?\b/, 'bananas'],
  [/\bstrawberr(y|ies)\b/, 'strawberries'],
  [/\bblueberr(y|ies)\b/, 'blueberries'],
  [/\braspberr(y|ies)\b/, 'raspberries'],
  [/\bmixed\s+berries\b/, 'mixed berries'],
  [/\bberries\b/, 'mixed berries'],
  [/\bmango(\s+chunks?)?\b/, 'mango'],
  [/\bavocados?\b/, 'avocado'],

  // ── Frozen (already-frozen items stay as frozen category) ────────────────
  [/\bfrozen\s+peas\s*(\+\s*corn(\s+mix)?)?\b/, 'peas & corn (frozen)'],
  [/\bpeas\s*(\+|and)\s*corn(\s+mix)?\b/, 'peas & corn (frozen)'],
  [/\bfrozen\s+corn\b/, 'peas & corn (frozen)'],
  [/\bfrozen\s+mango\b/, 'mango (frozen)'],
  [/\bfrozen\s+berries\b/, 'mixed berries (frozen)'],
  [/\bfrozen\s+mixed\s+berries\b/, 'mixed berries (frozen)'],
  [/\bice\s+cubes?\b/, 'ice cubes'],
  [/\bice\b/, 'ice cubes'],

  // ── Pantry: nuts / seeds / butters ───────────────────────────────────────
  [/\bpeanut\s+butter\b/, 'peanut butter'],
  [/\balmond\s+butter\b/, 'almond butter'],
  [/\balmonds?\b/, 'almonds'],
  [/\bwalnuts?\b/, 'walnuts'],
  [/\bchia\s+seeds?\b/, 'chia seeds'],
  [/\bflaxseeds?\b/, 'flaxseeds'],

  // ── Pantry: sweeteners / flavourings ─────────────────────────────────────
  [/\b(raw\s+)?honey\b/, 'honey'],
  [/\bmaple\s+syrup\b/, 'maple syrup'],
  [/\bcacao\s+powder\b/, 'cacao powder'],
  [/\bcocoa\s+powder\b/, 'cacao powder'],
  [/\bvanilla\s+extract\b/, 'vanilla extract'],
  [/\bcinnamon\b/, 'cinnamon'],
  [/\bnutmeg\b/, 'nutmeg'],
  [/\bginger\b/, 'ginger'],

  // ── Pantry: sauces / condiments ──────────────────────────────────────────
  [/\bsoy\s+sauce\b/, 'soy sauce'],
  [/\bsesame\s+oil\b/, 'sesame oil'],
  [/\bolive\s+oil\b/, 'olive oil'],
  [/\bsalsa\b/, 'salsa'],
  [/\bhummus\b/, 'hummus'],
  [/\bjalape[nñ]os?\b/, 'jalapeños'],
  [/\bitalian\s+herbs?\b/, 'Italian herbs'],

  // ── Drinks ────────────────────────────────────────────────────────────────
  [/\bcoconut\s+water\b/, 'coconut water'],
  [/\boat\s+milk\b/, 'oat milk'],
  [/\balmond\s+milk\b/, 'almond milk'],

  // ── Supplements ──────────────────────────────────────────────────────────
  [/\bcreatine(\s+\(\d+g\))?\b/, 'creatine'],
  [/\bmagnesium\s+glycinate\b/, 'magnesium glycinate'],
  [/\bmagnesium\b/, 'magnesium glycinate'],
  [/\bvitamin\s+d3?\b/, 'vitamin D3'],
  [/\bomega-?3\b/, 'omega-3'],
];

// ── Category keyword map ──────────────────────────────────────────────────────
// Checked against the CANONICAL name (already normalised).

const CATEGORY_KEYWORDS: Record<GroceryCategory, string[]> = {
  protein:     ['eggs', 'chicken breast', 'chicken thighs', 'beef mince', 'turkey mince', 'sirloin steak', 'salmon fillet', 'tuna', 'tuna (tinned)', 'whey protein', 'casein protein', 'protein bar'],
  dairy:       ['milk', 'greek yogurt', 'yogurt', 'cheddar', 'cottage cheese', 'cream cheese', 'parmesan', 'feta', 'sour cream', 'cream', 'butter', 'oat milk', 'almond milk'],
  carbs:       ['brown rice', 'white rice', 'oats', 'wholegrain bread', 'wholegrain pasta', 'quinoa', 'potatoes', 'sweet potato', 'wholegrain tortilla', 'rice cakes', 'crackers', 'granola'],
  vegetables:  ['broccoli', 'spinach', 'carrot', 'tomatoes', 'tinned tomatoes', 'cucumber', 'onion', 'garlic', 'green beans', 'capsicum', 'asparagus', 'mushrooms', 'zucchini', 'bok choy', 'snap peas', 'avocado', 'salsa', 'jalapeños', 'hummus'],
  fruit:       ['bananas', 'strawberries', 'blueberries', 'raspberries', 'mixed berries', 'mango', 'apple', 'lime', 'lemon', 'peach'],
  frozen:      ['peas & corn (frozen)', 'mango (frozen)', 'mixed berries (frozen)', 'ice cubes'],
  pantry:      ['peanut butter', 'almond butter', 'almonds', 'walnuts', 'chia seeds', 'flaxseeds', 'honey', 'maple syrup', 'cacao powder', 'vanilla extract', 'cinnamon', 'nutmeg', 'ginger', 'soy sauce', 'sesame oil', 'olive oil', 'italian herbs', 'peppercorn sauce'],
  drinks:      ['coconut water'],
  supplements: ['creatine', 'magnesium glycinate', 'vitamin d3', 'omega-3'],
};

// ─── Unit conversion (for consolidation) ─────────────────────────────────────
// Rough conversions — good enough for grocery planning, not cooking precision.

const TO_GRAMS: Partial<Record<string, number>> = {
  kg:   1000,
  cup:  240,
  tbsp: 15,
  tsp:  5,
  ml:   1,
  L:    1000,
};

// Items bought by count, not weight. For these, gram/tbsp entries are serving
// sizes that appear in recipe instructions — not purchase quantities.
const COUNT_ITEMS = new Set([
  'eggs', 'bananas', 'avocado', 'protein bar', 'wholegrain tortilla',
  'rice cakes', 'crackers',
]);

// ─── Parsing ──────────────────────────────────────────────────────────────────

interface Parsed {
  qty: number;
  unit: string;
  name: string;
}

function parseIngredient(raw: string): Parsed {
  let s = expandFractions(raw.trim());
  let qty = 0;
  let unit = '';

  // ── Check for quantity embedded in parentheses ─────────────────────────────
  // "Cottage cheese (100g)" → qty=100, unit='g'
  // "Tuna (150g)" → qty=150, unit='g'
  // Skip if parens contain a noun too — "(20g+ protein)" is a macro label, not qty.
  const parenQtyMatch = s.match(/\(\s*(\d+(?:\.\d+)?)\s*(g|kg|ml|L|cup|cups)\s*\)/i);
  if (parenQtyMatch) {
    // Only treat as qty if there's no leading number already (avoid double-counting)
    const hasLeadingNum = /^\d/.test(s.trim());
    if (!hasLeadingNum) {
      qty  = parseFloat(parenQtyMatch[1]);
      unit = UNIT_MAP[parenQtyMatch[2].toLowerCase()] ?? parenQtyMatch[2].toLowerCase();
    }
  }

  // Strip ALL parentheticals now (descriptions, macro labels, already-parsed qty)
  s = s.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();

  let rest = s;

  if (qty === 0) {
    // ── Inline gram notation: "150g chicken breast" ──────────────────────────
    const inlineGram = s.match(/^(\d+(?:\.\d+)?)(g|kg|ml|L)\s+(.+)$/i);
    if (inlineGram) {
      qty  = parseFloat(inlineGram[1]);
      unit = UNIT_MAP[inlineGram[2].toLowerCase()] ?? inlineGram[2].toLowerCase();
      rest = inlineGram[3];
    } else {
      // ── Leading number + optional unit word ──────────────────────────────
      const numMatch = s.match(/^(\d+(?:\.\d+)?)\s*(.*)/);
      if (numMatch) {
        qty  = parseFloat(numMatch[1]);
        rest = numMatch[2].trim();
        const unitMatch = rest.match(/^([a-zA-Z]+)\s*(.*)/);
        if (unitMatch && UNIT_MAP[unitMatch[1].toLowerCase()]) {
          unit = UNIT_MAP[unitMatch[1].toLowerCase()];
          rest = unitMatch[2].trim();
        }
      }
    }
  }

  // Strip cooking / preparation words
  rest = rest.replace(COOKING_RE, '').replace(/\s{2,}/g, ' ').trim();

  // Remove trailing filler words and punctuation left after stripping
  rest = rest.replace(/\b(of|a|an|the|and|with|on|in)\b$/gi, '').trim();
  rest = rest.replace(/[.,;:!?]+$/, '').trim();

  if (qty === 0) qty = 1;

  return { qty, unit, name: rest.toLowerCase() };
}

// ─── Unit consolidation ───────────────────────────────────────────────────────
// After aggregation, the same item may have multiple entries under different
// units (e.g. "cottage cheese__g" + "cottage cheese__tbsp"). Merge them.

interface AggEntry { qty: number; unit: string; canonical: string }

function consolidateEntries(
  aggregated: Map<string, AggEntry>,
): Map<string, AggEntry> {

  // Group all entries by canonical name
  const byName = new Map<string, AggEntry[]>();
  for (const entry of aggregated.values()) {
    const list = byName.get(entry.canonical) ?? [];
    list.push(entry);
    byName.set(entry.canonical, list);
  }

  const result = new Map<string, AggEntry>();

  for (const [canonical, entries] of byName) {
    if (entries.length === 1) {
      result.set(`${canonical}__${entries[0].unit}`, entries[0]);
      continue;
    }

    const isCount = COUNT_ITEMS.has(canonical);

    if (isCount) {
      // Sum only count (no-unit) entries; discard gram/tbsp serving-size entries
      const countEntries = entries.filter(e => e.unit === '');
      const totalCount   = countEntries.reduce((s, e) => s + e.qty, 0);
      // If no count entry exists, fall through to gram merge below
      if (countEntries.length > 0) {
        result.set(`${canonical}__`, { qty: totalCount || 1, unit: '', canonical });
        continue;
      }
    }

    // Convert everything to grams where possible, then sum
    let totalGrams = 0;
    let hasGramConversion = false;
    let nonConvertibleEntry: AggEntry | null = null;

    for (const e of entries) {
      if (e.unit === 'g') {
        totalGrams += e.qty;
        hasGramConversion = true;
      } else if (e.unit === '' && !isCount) {
        // Bare count for a weight item — can't convert without serving size, skip
        nonConvertibleEntry = e;
      } else {
        const factor = TO_GRAMS[e.unit];
        if (factor) {
          totalGrams += e.qty * factor;
          hasGramConversion = true;
        } else {
          // Unknown unit — keep as fallback
          nonConvertibleEntry = nonConvertibleEntry ?? e;
        }
      }
    }

    if (hasGramConversion) {
      result.set(`${canonical}__g`, { qty: Math.round(totalGrams), unit: 'g', canonical });
    } else if (nonConvertibleEntry) {
      result.set(`${canonical}__${nonConvertibleEntry.unit}`, nonConvertibleEntry);
    }
  }

  return result;
}

// ─── Plural normalisation ────────────────────────────────────────────────────
// Applied before the alias lookup so that "tomato" and "tomatoes" always
// reach the alias map in the same form. Maps singular → plural for grocery items
// where the standard purchase unit is plural (a bag of eggs, not "an egg").

const SINGULAR_TO_PLURAL: [RegExp, string][] = [
  [/\btomato\b/g,      'tomatoes'],
  [/\begg\b/g,         'eggs'],
  [/\bbanana\b/g,      'bananas'],
  [/\bavocado\b/g,     'avocados'],
  [/\balmond\b/g,      'almonds'],
  [/\bwalnut\b/g,      'walnuts'],
  [/\bblueberry\b/g,   'blueberries'],
  [/\bstrawberry\b/g,  'strawberries'],
  [/\braspberry\b/g,   'raspberries'],
  [/\bpotato\b/g,      'potatoes'],
  [/\bcarrot\b/g,      'carrots'],
  [/\bmushroom\b/g,    'mushrooms'],
  [/\bbean\b/g,        'beans'],
];

function normalisePlural(s: string): string {
  for (const [re, plural] of SINGULAR_TO_PLURAL) {
    s = s.replace(re, plural);
  }
  return s;
}

// ─── Normalisation ────────────────────────────────────────────────────────────

/**
 * Convert a raw parsed name to its canonical supermarket item name.
 * Returns null if the name is too short / looks like noise.
 */
function canonicalise(name: string): string | null {
  if (name.length < 2) return null;

  let s = normalisePlural(name.trim().toLowerCase());

  for (const [pattern, canonical] of CANONICAL_ALIASES) {
    if (pattern.test(s)) {
      return canonical;
    }
  }

  // No alias match — return as-is (still useful as a pantry/other item)
  return s || null;
}

// ─── Categorisation ───────────────────────────────────────────────────────────

function categorise(canonical: string): GroceryCategory {
  const lower = canonical.toLowerCase();
  for (const cat of CATEGORY_ORDER) {
    for (const kw of CATEGORY_KEYWORDS[cat]) {
      if (lower === kw || lower.includes(kw) || kw.includes(lower)) return cat;
    }
  }
  return 'pantry';
}

// ─── Formatting ───────────────────────────────────────────────────────────────

function formatQty(qty: number, unit: string): string {
  const rounded = Math.round(qty * 10) / 10;
  const display = rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1);
  if (!unit) return rounded <= 1 ? '' : `×${display}`;
  if (['g', 'kg', 'ml', 'L'].includes(unit)) return `${display}${unit}`;
  return `${display} ${unit}`;
}

function toTitleCase(s: string): string {
  return s.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.slice(1));
}

// ─── Inline detail extraction ─────────────────────────────────────────────────

const FOOD_TYPES = new Set(['meal', 'shake', 'snack']);

/**
 * Extract ingredient tokens from a free-text event detail string.
 * e.g. "150g chicken + rice + broccoli. ~550 kcal, 45g protein."
 *   → ["150g chicken", "rice", "broccoli"]
 */
function extractInlineIngredients(detail: string): string[] {
  let s = detail;

  // Strip recipe title prefix: "Recovery Shake: ..."
  s = s.replace(/^[^:]{1,40}:\s*/, '');

  // Strip macro info suffix: ". ~550 kcal..." or "(~380 kcal...)"
  s = s.replace(/\.\s*~?\d[\d,.]*\s*kcal[^.)]*/gi, '');
  s = s.replace(/\(~?\d[\d,.]*\s*kcal[^)]*\)/gi, '');

  // Strip supplement / instruction fragments
  s = s.replace(/\bTake\s+\w[^.+]*/gi, '');
  s = s.replace(/\b(take|add)\s+creatine[^.+]*/gi, '');

  // Take only the part before the first sentence-ending period
  s = s.split(/\.\s+/)[0];

  return s
    .split(/\s*\+\s*/)
    .map(t => t.trim())
    .filter(t => t.length > 2 && !/^\d+g?\s*protein/i.test(t));
}

// ─── Recipe lookup ────────────────────────────────────────────────────────────

function getRecipeIngredients(recipeId: string, recipeType: 'shake' | 'meal'): string[] {
  const list = recipeType === 'shake' ? SHAKE_RECIPES : MEAL_IDEAS;
  return list.find(r => r.id === recipeId)?.ingredients ?? [];
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function buildGroceryList(): GrocerySection[] {
  // 1. Collect raw ingredient strings from every food event in the week
  const rawIngredients: string[] = [];

  for (const day of WEEK_SCHEDULE) {
    for (const event of day.events) {
      if (event.recipeId && event.recipeType) {
        rawIngredients.push(...getRecipeIngredients(event.recipeId, event.recipeType));
      } else if (FOOD_TYPES.has(event.type) && event.detail) {
        rawIngredients.push(...extractInlineIngredients(event.detail));
      }
    }
  }

  // 2. Parse → canonicalise → aggregate by (canonical, unit)
  const aggregated = new Map<string, AggEntry>();

  for (const raw of rawIngredients) {
    const { qty, unit, name } = parseIngredient(raw);
    if (!name) continue;

    const canonical = canonicalise(name);
    if (!canonical) continue;

    const key = `${canonical}__${unit}`;
    const existing = aggregated.get(key);
    if (existing) {
      existing.qty += qty;
    } else {
      aggregated.set(key, { qty, unit, canonical });
    }
  }

  // 2b. Consolidate: merge same-item entries that have different units
  const consolidated = consolidateEntries(aggregated);

  // 3. Build GroceryItems grouped by category
  const sections = new Map<GroceryCategory, GroceryItem[]>();
  for (const cat of CATEGORY_ORDER) sections.set(cat, []);

  let idx = 0;
  for (const [, { qty, unit, canonical }] of consolidated) {
    const category = categorise(canonical);
    sections.get(category)!.push({
      id: `grocery-${idx++}`,
      name: toTitleCase(canonical),
      quantity: formatQty(qty, unit),
      qty,
      unit,
      category,
      checked: false,
    });
  }

  // 4. Sort alphabetically and return non-empty sections
  return CATEGORY_ORDER
    .map(cat => ({
      category: cat,
      ...CATEGORY_META[cat],
      items: sections.get(cat)!.sort((a, b) => a.name.localeCompare(b.name)),
    }))
    .filter(s => s.items.length > 0);
}

/** Maps a GroceryCategory to its theme accent colour. */
export function categoryAccent(category: GroceryCategory, theme: AppThemeType): string {
  switch (category) {
    case 'protein':     return theme.gym;
    case 'dairy':       return theme.secondary;
    case 'carbs':       return theme.wake;
    case 'vegetables':  return theme.meal;
    case 'fruit':       return theme.supplement;
    case 'frozen':      return theme.water;
    case 'pantry':      return theme.primary;
    case 'drinks':      return theme.shake;
    case 'supplements': return theme.rest;
  }
}

/** Formats a grocery list as plain text for sharing. */
export function formatGroceryList(sections: GrocerySection[], checkedIds: Set<string>): string {
  const lines: string[] = ['🛒 Weekly Grocery List — PeakRoutine', ''];
  for (const section of sections) {
    lines.push(`${section.emoji} ${section.label.toUpperCase()}`);
    for (const item of section.items) {
      const tick   = checkedIds.has(item.id) ? '☑' : '☐';
      const qtyStr = item.quantity ? ` (${item.quantity})` : '';
      lines.push(`${tick} ${item.name}${qtyStr}`);
    }
    lines.push('');
  }
  return lines.join('\n').trim();
}
