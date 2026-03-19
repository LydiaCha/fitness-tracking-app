import { STORAGE_KEYS } from '@/utils/appConstants';
import { safeGetItem, safeSetItem, safeParseJSON } from '@/utils/storage';

export interface DaySchedule {
  sleepTime: string;   // e.g. "9:00 AM"
  wakeTime:  string;   // e.g. "4:30 PM"
  workStart: string;   // e.g. "12:00 AM"
  workEnd:   string;   // e.g. "8:00 AM"
  isWorkDay: boolean;
}

const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6] as const;
const DEFAULT_WORK_DAYS = [1, 2, 3, 4]; // Mon–Thu

export type ActivityLevel      = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type FitnessGoal        = 'lose' | 'maintain' | 'gain';
export type Gender             = 'female' | 'male' | 'other';
export type DietaryRestriction = 'gluten-free' | 'dairy-free' | 'vegetarian' | 'vegan' | 'nut-free';
export type CuisinePreference  = 'asian' | 'mediterranean' | 'mexican' | 'american' | 'middle-eastern';
export type FitnessLevel       = 'beginner' | 'intermediate' | 'advanced';
export type TrainingEquipment  = 'gym' | 'home' | 'both';

export const RESTRICTION_OPTIONS: Array<{ value: DietaryRestriction; emoji: string; label: string }> = [
  { value: 'gluten-free',  emoji: '🌾', label: 'Gluten-free' },
  { value: 'dairy-free',   emoji: '🥛', label: 'Dairy-free' },
  { value: 'vegetarian',   emoji: '🥦', label: 'Vegetarian' },
  { value: 'vegan',        emoji: '🌱', label: 'Vegan' },
  { value: 'nut-free',     emoji: '🥜', label: 'Nut-free' },
];

export const CUISINE_OPTIONS: Array<{ value: CuisinePreference; emoji: string; label: string }> = [
  { value: 'asian',          emoji: '🍜', label: 'Asian' },
  { value: 'mediterranean',  emoji: '🫒', label: 'Mediterranean' },
  { value: 'mexican',        emoji: '🌮', label: 'Mexican' },
  { value: 'american',       emoji: '🍔', label: 'American' },
  { value: 'middle-eastern', emoji: '🥙', label: 'Middle Eastern' },
];

export const PREP_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 15, label: '15 min' },
  { value: 30, label: '30 min' },
  { value: 45, label: '45 min' },
  { value: 60, label: '60+ min' },
];

/** Toggle a dietary restriction with vegan ↔ vegetarian sync rules. */
export function toggleDietaryRestriction(
  cur: DietaryRestriction[],
  restriction: DietaryRestriction,
): DietaryRestriction[] {
  if (cur.includes(restriction)) {
    const next = cur.filter(r => r !== restriction);
    return restriction === 'vegetarian' ? next.filter(r => r !== 'vegan') : next;
  }
  const next = [...cur, restriction];
  return restriction === 'vegan' && !next.includes('vegetarian') ? [...next, 'vegetarian'] : next;
}

export interface UserProfile {
  /** Incremented when a breaking schema change requires a migration in loadUserProfile(). */
  profileSchemaVersion: number;

  name:          string;
  weekSchedule:  DaySchedule[];   // index 0=Sun … 6=Sat
  gymDays:       number[];
  age:           number;
  gender:        Gender;
  heightCm:      number;
  weightKg:      number;
  activityLevel: ActivityLevel;
  fitnessGoal:   FitnessGoal;

  /**
   * Macro targets.
   * null = derive from calcMacroTargets() automatically.
   * number = user has explicitly set this value — respected as-is.
   * Always read through getEffectiveMacros() rather than directly.
   */
  caloriesTarget: number | null;
  proteinTarget:  number | null;
  carbsTarget:    number | null;
  fatTarget:      number | null;

  // Dietary preferences (fed into AI meal planning)
  dietaryRestrictions:   DietaryRestriction[];
  cuisinePreferences:    CuisinePreference[];   // empty = no preference = all cuisines
  dislikedIngredientIds: string[];
  maxPrepMins:           number;
  // Training setup — used by AI workout generation
  fitnessLevel: FitnessLevel;
  equipment:    TrainingEquipment;

  // Supplement reminders in Today's schedule
  supplementsEnabled:    boolean;
}

const DEFAULT_DAY: DaySchedule = {
  sleepTime: '9:00 AM',
  wakeTime:  '4:30 PM',
  workStart: '12:00 AM',
  workEnd:   '8:00 AM',
  isWorkDay: true,
};

function makeDefaultWeek(): DaySchedule[] {
  return WEEK_DAYS.map(d => ({
    ...DEFAULT_DAY,
    isWorkDay: DEFAULT_WORK_DAYS.includes(d),
  }));
}

export const DEFAULT_PROFILE: UserProfile = {
  profileSchemaVersion: 3,
  name:          '',
  weekSchedule:  makeDefaultWeek(),
  gymDays:       [1, 2, 3, 4, 6],
  age:           30,
  gender:        'female',
  heightCm:      165,
  weightKg:      65,
  activityLevel: 'moderate',
  fitnessGoal:   'maintain',
  caloriesTarget: null,
  proteinTarget:  null,
  carbsTarget:    null,
  fatTarget:      null,
  dietaryRestrictions:   [],
  cuisinePreferences:    [],
  dislikedIngredientIds: [],
  maxPrepMins:           30,
  fitnessLevel:          'intermediate',
  equipment:             'gym',
  supplementsEnabled:    true,
};

const PROFILE_KEY = STORAGE_KEYS.PROFILE;

export const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

export const FITNESS_LEVEL_OPTIONS: Array<{ value: FitnessLevel; label: string; desc: string }> = [
  { value: 'beginner',     label: 'Beginner',     desc: 'New to structured training' },
  { value: 'intermediate', label: 'Intermediate', desc: '1–3 years consistent training' },
  { value: 'advanced',     label: 'Advanced',     desc: '3+ years, progressive overload' },
];

export const EQUIPMENT_OPTIONS: Array<{ value: TrainingEquipment; label: string; desc: string }> = [
  { value: 'gym',  label: 'Gym',       desc: 'Full equipment access' },
  { value: 'home', label: 'Home',      desc: 'Bodyweight & dumbbells' },
  { value: 'both', label: 'Both',      desc: 'Gym most days, home occasionally' },
];

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary:   'Desk only',
  light:       '1–3 days/wk',
  moderate:    '3–5 days/wk',
  active:      '6–7 days/wk',
  very_active: 'Athlete',
};

export const GOAL_LABELS: Record<FitnessGoal, string> = {
  lose:     'Lose fat',
  maintain: 'Maintain',
  gain:     'Build muscle',
};

/** Mifflin-St Jeor TDEE + goal-adjusted macro split */
export function calcMacroTargets(
  profile: Pick<UserProfile, 'age' | 'gender' | 'weightKg' | 'heightCm' | 'activityLevel' | 'fitnessGoal'>,
): { calories: number; protein: number; carbs: number; fat: number } {
  const { age, gender, weightKg, heightCm, activityLevel, fitnessGoal } = profile;

  const bmr = gender === 'male'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
    : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const mult: Record<ActivityLevel, number> = {
    sedentary:   1.2,
    light:       1.375,
    moderate:    1.55,
    active:      1.725,
    very_active: 1.9,
  };
  const tdee = bmr * mult[activityLevel];

  const adj: Record<FitnessGoal, number> = { lose: -350, maintain: 0, gain: 250 };
  const calories = Math.round(tdee + adj[fitnessGoal]);

  // High-protein split: 1.8–2.2g/kg, 0.8g fat/kg, carbs fill the rest
  const protein = Math.round(weightKg * (fitnessGoal === 'gain' ? 2.2 : 1.8));
  const fat     = Math.round(weightKg * 0.8);
  const carbs   = Math.max(50, Math.round((calories - protein * 4 - fat * 9) / 4));

  return { calories, protein, carbs, fat };
}

/**
 * Returns the resolved macro targets for a profile.
 * null target → formula-computed value. number target → user override.
 * Always use this instead of reading caloriesTarget etc. directly.
 */
export function getEffectiveMacros(
  profile: Pick<UserProfile, 'caloriesTarget' | 'proteinTarget' | 'carbsTarget' | 'fatTarget' | 'age' | 'gender' | 'weightKg' | 'heightCm' | 'activityLevel' | 'fitnessGoal'>,
): { calories: number; protein: number; carbs: number; fat: number } {
  const computed = calcMacroTargets(profile);
  return {
    calories: profile.caloriesTarget ?? computed.calories,
    protein:  profile.proteinTarget  ?? computed.protein,
    carbs:    profile.carbsTarget    ?? computed.carbs,
    fat:      profile.fatTarget      ?? computed.fat,
  };
}

export async function loadUserProfile(): Promise<UserProfile> {
  const raw = await safeGetItem(PROFILE_KEY);
  // Use a loose type so we can read old-schema fields during migration
  const saved = safeParseJSON<Record<string, unknown>>(raw, {});

  if (Object.keys(saved).length === 0) return { ...DEFAULT_PROFILE };

  // Migrations run in version order. Each bumps profileSchemaVersion and
  // falls through to later migrations so a v1 profile gets all fixes in one load.
  const version = (saved.profileSchemaVersion as number | undefined) ?? 1;

  // ── v2: replace flat macro fields with nullable *Target fields ────────────
  if (version < 2) {
    saved.caloriesTarget = null;
    saved.proteinTarget  = null;
    saved.carbsTarget    = null;
    saved.fatTarget      = null;
    saved.profileSchemaVersion = 2;
    delete saved.calories;
    delete saved.protein;
    delete saved.carbs;
    delete saved.fat;
  }

  // ── v3: add fitnessLevel + equipment with safe defaults ───────────────────
  if (version < 3) {
    if (!saved.fitnessLevel) saved.fitnessLevel = 'intermediate';
    if (!saved.equipment)    saved.equipment    = 'gym';
    saved.profileSchemaVersion = 3;
  }

  if (version < 3) {
    const migrated = { ...DEFAULT_PROFILE, ...saved };
    await safeSetItem(PROFILE_KEY, JSON.stringify(migrated));
    return migrated;
  }

  return { ...DEFAULT_PROFILE, ...saved } as UserProfile;
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await safeSetItem(PROFILE_KEY, JSON.stringify(profile));
}

export function gymDayLabel(gymDays: number[]): string {
  if (gymDays.length === 0) return 'None';
  if (gymDays.length === 7) return 'Every day';
  const s = [...gymDays].sort((a, b) => a - b);
  // Mon–Fri
  if (s.length === 5 && s[0] === 1 && s[4] === 5 && s.every((d, i) => d === i + 1)) return 'Mon–Fri';
  // Weekends
  if (s.length === 2 && s[0] === 0 && s[1] === 6) return 'Weekends';
  // Mon–Sat
  if (s.length === 6 && s[0] === 1 && s[5] === 6 && s.every((d, i) => d === i + 1)) return 'Mon–Sat';
  // Weekdays + Sat
  if (s.length === 6 && s[0] === 0 && s[5] === 5) return 'Sun–Fri';
  return s.map(d => DAY_NAMES[d]).join(' ');
}

export function buildAISystemPrompt(profile: UserProfile): string {
  const restDays = ([...WEEK_DAYS] as number[])
    .filter(d => !profile.gymDays.includes(d))
    .map(d => DAY_NAMES[d])
    .join(', ');

  const scheduleLines = profile.weekSchedule.map((day, i) => {
    const name = DAY_NAMES[i];
    const gym  = profile.gymDays.includes(i) ? ' (gym)' : '';
    if (!day.isWorkDay) return `  ${name}: rest${gym}, sleep ${day.sleepTime}–${day.wakeTime}`;
    return `  ${name}: work ${day.workStart}–${day.workEnd}${gym}, sleep ${day.sleepTime}–${day.wakeTime}`;
  }).join('\n');

  return `You are a nutrition expert creating personalised meal ideas for a specific person:
- Profile: ${profile.age}yo ${profile.gender}, ${profile.weightKg}kg, ${profile.heightCm}cm, goal: ${profile.fitnessGoal}
- Weekly schedule:\n${scheduleLines}
- Gym days: ${gymDayLabel(profile.gymDays)}
- Rest days: ${restDays}
- Daily macro targets: ${getEffectiveMacros(profile).calories} kcal · ${getEffectiveMacros(profile).protein}g protein · ${getEffectiveMacros(profile).carbs}g carbs · ${getEffectiveMacros(profile).fat}g fat
- Practical constraints: batch cooks on rest days, eats at unusual hours, needs portable/desk-friendly options, high-protein focus`;
}
