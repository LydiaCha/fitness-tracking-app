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

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type FitnessGoal   = 'lose' | 'maintain' | 'gain';
export type Gender        = 'female' | 'male' | 'other';

export interface UserProfile {
  name:          string;
  weekSchedule:  DaySchedule[];   // index 0=Sun … 6=Sat
  gymDays:       number[];
  age:           number;
  gender:        Gender;
  heightCm:      number;
  weightKg:      number;
  activityLevel: ActivityLevel;
  fitnessGoal:   FitnessGoal;
  calories:      number;
  protein:       number;
  carbs:         number;
  fat:           number;
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
  name:          '',
  weekSchedule:  makeDefaultWeek(),
  gymDays:       [1, 2, 3, 4, 6],
  age:           30,
  gender:        'female',
  heightCm:      165,
  weightKg:      65,
  activityLevel: 'moderate',
  fitnessGoal:   'maintain',
  calories:      1900,
  protein:       145,
  carbs:         200,
  fat:           65,
};

const PROFILE_KEY = STORAGE_KEYS.PROFILE;

export const DAY_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
export const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

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

export async function loadUserProfile(): Promise<UserProfile> {
  const raw = await safeGetItem(PROFILE_KEY);
  const saved = safeParseJSON<Partial<UserProfile> & Record<string, unknown>>(raw, {});
  if (Object.keys(saved).length === 0) return { ...DEFAULT_PROFILE };

  // Migrate old flat format (sleepTime/wakeTime/workStart/workEnd) → weekSchedule
  if (!saved.weekSchedule) {
    const base: DaySchedule = {
      sleepTime: (saved.sleepTime as string) ?? DEFAULT_DAY.sleepTime,
      wakeTime:  (saved.wakeTime  as string) ?? DEFAULT_DAY.wakeTime,
      workStart: (saved.workStart as string) ?? DEFAULT_DAY.workStart,
      workEnd:   (saved.workEnd   as string) ?? DEFAULT_DAY.workEnd,
      isWorkDay: true,
    };
    saved.weekSchedule = WEEK_DAYS.map(d => ({
      ...base, isWorkDay: DEFAULT_WORK_DAYS.includes(d),
    }));
  }
  return { ...DEFAULT_PROFILE, ...saved };
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await safeSetItem(PROFILE_KEY, JSON.stringify(profile));
}

export function gymDayLabel(gymDays: number[]): string {
  if (gymDays.length === 0) return 'None';
  return gymDays.map(d => DAY_NAMES[d]).join(' · ');
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
- Daily macro targets: ${profile.calories} kcal · ${profile.protein}g protein · ${profile.carbs}g carbs · ${profile.fat}g fat
- Practical constraints: batch cooks on rest days, eats at unusual hours, needs portable/desk-friendly options, high-protein focus`;
}
