/**
 * PeakRoutine — Exercise Database
 *
 * Curated set of exercises used by WorkoutPlanContext as candidates for
 * AI workout generation. Each exercise is tagged so the planner can filter
 * by split, equipment availability, and fitness level before sending
 * candidates to Claude.
 *
 * split:    which workout type this exercise belongs to
 * requires: 'gym' = needs gym equipment, 'home' = bodyweight/dumbbells only, 'both' = either
 * level:    minimum fitness level needed
 * pattern:  movement pattern (for variety scoring)
 */

export type ExerciseSplit    = 'upper-push' | 'upper-pull' | 'lower' | 'hiit-core' | 'full-body';
export type ExercisePattern  = 'push' | 'pull' | 'hinge' | 'squat' | 'carry' | 'core' | 'cardio';
export type ExerciseRequires = 'gym' | 'home' | 'both';
export type ExerciseLevel    = 'beginner' | 'intermediate' | 'advanced' | 'all';
export type MuscleGroup      = 'chest' | 'shoulders' | 'triceps' | 'back' | 'biceps' | 'legs' | 'glutes' | 'core' | 'fullbody';

export interface Exercise {
  id:          string;
  name:        string;
  muscle:      MuscleGroup;
  split:       ExerciseSplit[];   // can appear in multiple splits
  requires:    ExerciseRequires;
  level:       ExerciseLevel;
  pattern:     ExercisePattern;
  /** Default sets × reps for intermediate. Claude adjusts for level. */
  defaultSets: number;
  defaultReps: string;
  defaultRest: string;
  cue?:        string;
}

export const EXERCISE_DATABASE: Exercise[] = [
  // ─── Upper Push ──────────────────────────────────────────────────────────

  {
    id: 'barbell-bench-press',
    name: 'Barbell bench press',
    muscle: 'chest',
    split: ['upper-push', 'full-body'],
    requires: 'gym',
    level: 'intermediate',
    pattern: 'push',
    defaultSets: 4, defaultReps: '6–8', defaultRest: '2 min',
    cue: 'Drive feet into floor, slight arch, bar to lower chest',
  },
  {
    id: 'dumbbell-chest-press',
    name: 'Dumbbell chest press',
    muscle: 'chest',
    split: ['upper-push'],
    requires: 'both',
    level: 'beginner',
    pattern: 'push',
    defaultSets: 3, defaultReps: '10–12', defaultRest: '90s',
    cue: 'Full stretch at bottom, squeeze at top',
  },
  {
    id: 'incline-dumbbell-press',
    name: 'Incline dumbbell press',
    muscle: 'chest',
    split: ['upper-push'],
    requires: 'gym',
    level: 'beginner',
    pattern: 'push',
    defaultSets: 3, defaultReps: '10–12', defaultRest: '90s',
    cue: '30–45° incline, elbows at 45° to torso',
  },
  {
    id: 'push-up',
    name: 'Push-up',
    muscle: 'chest',
    split: ['upper-push', 'full-body'],
    requires: 'both',
    level: 'all',
    pattern: 'push',
    defaultSets: 3, defaultReps: '12–15', defaultRest: '60s',
    cue: 'Straight line from head to heels, lower chest to floor',
  },
  {
    id: 'dumbbell-shoulder-press',
    name: 'Dumbbell shoulder press',
    muscle: 'shoulders',
    split: ['upper-push'],
    requires: 'both',
    level: 'beginner',
    pattern: 'push',
    defaultSets: 3, defaultReps: '10–12', defaultRest: '90s',
    cue: 'Press straight up, avoid shrugging',
  },
  {
    id: 'lateral-raise',
    name: 'Lateral raise',
    muscle: 'shoulders',
    split: ['upper-push'],
    requires: 'both',
    level: 'all',
    pattern: 'push',
    defaultSets: 3, defaultReps: '12–15', defaultRest: '60s',
    cue: 'Lead with elbows, stop at shoulder height',
  },
  {
    id: 'cable-lateral-raise',
    name: 'Cable lateral raise',
    muscle: 'shoulders',
    split: ['upper-push'],
    requires: 'gym',
    level: 'beginner',
    pattern: 'push',
    defaultSets: 3, defaultReps: '12–15', defaultRest: '60s',
    cue: 'Constant tension throughout the range',
  },
  {
    id: 'tricep-pushdown',
    name: 'Tricep cable pushdown',
    muscle: 'triceps',
    split: ['upper-push'],
    requires: 'gym',
    level: 'all',
    pattern: 'push',
    defaultSets: 3, defaultReps: '12–15', defaultRest: '60s',
    cue: 'Elbows locked at sides, full extension',
  },
  {
    id: 'overhead-tricep-extension',
    name: 'Overhead tricep extension',
    muscle: 'triceps',
    split: ['upper-push'],
    requires: 'both',
    level: 'beginner',
    pattern: 'push',
    defaultSets: 3, defaultReps: '12–15', defaultRest: '60s',
    cue: 'Keep elbows pointing up, lower behind head',
  },
  {
    id: 'skull-crusher',
    name: 'EZ-bar skull crusher',
    muscle: 'triceps',
    split: ['upper-push'],
    requires: 'gym',
    level: 'intermediate',
    pattern: 'push',
    defaultSets: 3, defaultReps: '10–12', defaultRest: '90s',
    cue: 'Lower to forehead, elbows fixed',
  },

  // ─── Upper Pull ──────────────────────────────────────────────────────────

  {
    id: 'lat-pulldown',
    name: 'Lat pulldown',
    muscle: 'back',
    split: ['upper-pull'],
    requires: 'gym',
    level: 'beginner',
    pattern: 'pull',
    defaultSets: 4, defaultReps: '10–12', defaultRest: '90s',
    cue: 'Pull to upper chest, lean back slightly',
  },
  {
    id: 'cable-row',
    name: 'Seated cable row',
    muscle: 'back',
    split: ['upper-pull', 'full-body'],
    requires: 'gym',
    level: 'beginner',
    pattern: 'pull',
    defaultSets: 3, defaultReps: '10–12', defaultRest: '90s',
    cue: 'Chest tall, pull to lower chest, squeeze shoulder blades',
  },
  {
    id: 'dumbbell-row',
    name: 'Single-arm dumbbell row',
    muscle: 'back',
    split: ['upper-pull'],
    requires: 'both',
    level: 'beginner',
    pattern: 'pull',
    defaultSets: 3, defaultReps: '10–12 each', defaultRest: '60s',
    cue: 'Pull elbow to hip, keep torso parallel to floor',
  },
  {
    id: 'pull-up',
    name: 'Pull-up',
    muscle: 'back',
    split: ['upper-pull', 'full-body'],
    requires: 'both',
    level: 'intermediate',
    pattern: 'pull',
    defaultSets: 3, defaultReps: '6–10', defaultRest: '2 min',
    cue: 'Start from dead hang, pull chin over bar',
  },
  {
    id: 'face-pull',
    name: 'Cable face pull',
    muscle: 'shoulders',
    split: ['upper-pull'],
    requires: 'gym',
    level: 'beginner',
    pattern: 'pull',
    defaultSets: 3, defaultReps: '15–20', defaultRest: '60s',
    cue: 'Pull to face, external rotate at end',
  },
  {
    id: 'rear-delt-fly',
    name: 'Rear delt dumbbell fly',
    muscle: 'shoulders',
    split: ['upper-pull'],
    requires: 'both',
    level: 'beginner',
    pattern: 'pull',
    defaultSets: 3, defaultReps: '12–15', defaultRest: '60s',
    cue: 'Hinge at hips, arms arc out to shoulder height',
  },
  {
    id: 'barbell-curl',
    name: 'Barbell curl',
    muscle: 'biceps',
    split: ['upper-pull'],
    requires: 'gym',
    level: 'beginner',
    pattern: 'pull',
    defaultSets: 3, defaultReps: '10–12', defaultRest: '60s',
    cue: 'Elbows pinned at sides, full range of motion',
  },
  {
    id: 'dumbbell-curl',
    name: 'Dumbbell curl',
    muscle: 'biceps',
    split: ['upper-pull'],
    requires: 'both',
    level: 'all',
    pattern: 'pull',
    defaultSets: 3, defaultReps: '10–12 each', defaultRest: '60s',
    cue: 'Supinate at the top for peak contraction',
  },
  {
    id: 'hammer-curl',
    name: 'Hammer curl',
    muscle: 'biceps',
    split: ['upper-pull'],
    requires: 'both',
    level: 'all',
    pattern: 'pull',
    defaultSets: 3, defaultReps: '10–12 each', defaultRest: '60s',
    cue: 'Neutral grip, controlled tempo',
  },

  // ─── Lower Body ──────────────────────────────────────────────────────────

  {
    id: 'barbell-squat',
    name: 'Barbell back squat',
    muscle: 'legs',
    split: ['lower', 'full-body'],
    requires: 'gym',
    level: 'intermediate',
    pattern: 'squat',
    defaultSets: 4, defaultReps: '6–8', defaultRest: '2 min',
    cue: 'Brace core, knees track toes, break parallel',
  },
  {
    id: 'goblet-squat',
    name: 'Goblet squat',
    muscle: 'legs',
    split: ['lower'],
    requires: 'both',
    level: 'beginner',
    pattern: 'squat',
    defaultSets: 3, defaultReps: '12–15', defaultRest: '90s',
    cue: 'Hold dumbbell at chest, sit between knees',
  },
  {
    id: 'leg-press',
    name: 'Leg press',
    muscle: 'legs',
    split: ['lower'],
    requires: 'gym',
    level: 'beginner',
    pattern: 'squat',
    defaultSets: 4, defaultReps: '10–12', defaultRest: '90s',
    cue: 'Feet shoulder-width, knees track toes, full ROM',
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian deadlift',
    muscle: 'legs',
    split: ['lower', 'full-body'],
    requires: 'gym',
    level: 'beginner',
    pattern: 'hinge',
    defaultSets: 3, defaultReps: '10–12', defaultRest: '90s',
    cue: 'Push hips back, slight knee bend, bar stays close to legs',
  },
  {
    id: 'dumbbell-rdl',
    name: 'Dumbbell RDL',
    muscle: 'legs',
    split: ['lower'],
    requires: 'both',
    level: 'beginner',
    pattern: 'hinge',
    defaultSets: 3, defaultReps: '10–12', defaultRest: '90s',
    cue: 'Feel hamstring stretch, flat back throughout',
  },
  {
    id: 'hip-thrust',
    name: 'Barbell hip thrust',
    muscle: 'glutes',
    split: ['lower'],
    requires: 'gym',
    level: 'beginner',
    pattern: 'hinge',
    defaultSets: 4, defaultReps: '10–12', defaultRest: '90s',
    cue: 'Squeeze glutes hard at top, chin tucked',
  },
  {
    id: 'glute-bridge',
    name: 'Glute bridge',
    muscle: 'glutes',
    split: ['lower'],
    requires: 'both',
    level: 'all',
    pattern: 'hinge',
    defaultSets: 3, defaultReps: '15–20', defaultRest: '60s',
    cue: 'Drive through heels, squeeze at top for 1s',
  },
  {
    id: 'walking-lunge',
    name: 'Walking lunge',
    muscle: 'legs',
    split: ['lower'],
    requires: 'both',
    level: 'beginner',
    pattern: 'squat',
    defaultSets: 3, defaultReps: '12 each leg', defaultRest: '90s',
    cue: 'Long stride, front knee over ankle, back knee grazes floor',
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian split squat',
    muscle: 'legs',
    split: ['lower'],
    requires: 'both',
    level: 'intermediate',
    pattern: 'squat',
    defaultSets: 3, defaultReps: '10 each leg', defaultRest: '90s',
    cue: 'Rear foot elevated, torso upright, knee to floor',
  },
  {
    id: 'cable-glute-kickback',
    name: 'Cable glute kickback',
    muscle: 'glutes',
    split: ['lower'],
    requires: 'gym',
    level: 'beginner',
    pattern: 'hinge',
    defaultSets: 3, defaultReps: '15 each', defaultRest: '60s',
    cue: 'Slight forward lean, extend fully and squeeze',
  },

  // ─── HIIT + Core ─────────────────────────────────────────────────────────

  {
    id: 'burpee',
    name: 'Burpee',
    muscle: 'fullbody',
    split: ['hiit-core'],
    requires: 'both',
    level: 'all',
    pattern: 'cardio',
    defaultSets: 4, defaultReps: '30s on / 15s off', defaultRest: '15s',
  },
  {
    id: 'jump-squat',
    name: 'Jump squat',
    muscle: 'legs',
    split: ['hiit-core'],
    requires: 'both',
    level: 'all',
    pattern: 'cardio',
    defaultSets: 4, defaultReps: '30s on / 15s off', defaultRest: '15s',
    cue: 'Soft landing, absorb through hips and knees',
  },
  {
    id: 'mountain-climber',
    name: 'Mountain climber',
    muscle: 'core',
    split: ['hiit-core'],
    requires: 'both',
    level: 'all',
    pattern: 'cardio',
    defaultSets: 4, defaultReps: '30s on / 15s off', defaultRest: '15s',
    cue: 'Hips low, drive knees alternately to chest',
  },
  {
    id: 'high-knee',
    name: 'High knees',
    muscle: 'fullbody',
    split: ['hiit-core'],
    requires: 'both',
    level: 'all',
    pattern: 'cardio',
    defaultSets: 4, defaultReps: '30s on / 15s off', defaultRest: '15s',
  },
  {
    id: 'plank',
    name: 'Plank hold',
    muscle: 'core',
    split: ['hiit-core'],
    requires: 'both',
    level: 'all',
    pattern: 'core',
    defaultSets: 4, defaultReps: '45s', defaultRest: '30s',
    cue: 'Straight line, squeeze glutes and abs',
  },
  {
    id: 'cable-crunch',
    name: 'Cable crunch',
    muscle: 'core',
    split: ['hiit-core'],
    requires: 'gym',
    level: 'beginner',
    pattern: 'core',
    defaultSets: 3, defaultReps: '15–20', defaultRest: '60s',
    cue: 'Crunch elbows to thighs, hold 1s',
  },
  {
    id: 'hanging-knee-raise',
    name: 'Hanging knee raise',
    muscle: 'core',
    split: ['hiit-core'],
    requires: 'gym',
    level: 'intermediate',
    pattern: 'core',
    defaultSets: 3, defaultReps: '12–15', defaultRest: '60s',
    cue: 'Controlled lower, no swinging',
  },
  {
    id: 'russian-twist',
    name: 'Russian twist',
    muscle: 'core',
    split: ['hiit-core'],
    requires: 'both',
    level: 'all',
    pattern: 'core',
    defaultSets: 3, defaultReps: '20 total', defaultRest: '60s',
    cue: 'Feet off floor for added difficulty, rotate fully each side',
  },

  // ─── Full Body ───────────────────────────────────────────────────────────

  {
    id: 'deadlift',
    name: 'Barbell deadlift',
    muscle: 'back',
    split: ['full-body'],
    requires: 'gym',
    level: 'intermediate',
    pattern: 'hinge',
    defaultSets: 4, defaultReps: '5–6', defaultRest: '3 min',
    cue: 'Bar over mid-foot, brace hard, drive floor away',
  },
  {
    id: 'kettlebell-swing',
    name: 'Kettlebell swing',
    muscle: 'fullbody',
    split: ['full-body', 'hiit-core'],
    requires: 'both',
    level: 'intermediate',
    pattern: 'hinge',
    defaultSets: 4, defaultReps: '15–20', defaultRest: '60s',
    cue: 'Hip hinge, not squat — power from glutes',
  },
  {
    id: 'farmer-carry',
    name: "Farmer's carry",
    muscle: 'fullbody',
    split: ['full-body'],
    requires: 'both',
    level: 'all',
    pattern: 'carry',
    defaultSets: 3, defaultReps: '30m', defaultRest: '90s',
    cue: 'Tall posture, slight shoulder retraction, breathe steadily',
  },
  {
    id: 'dumbbell-thruster',
    name: 'Dumbbell thruster',
    muscle: 'fullbody',
    split: ['full-body'],
    requires: 'both',
    level: 'intermediate',
    pattern: 'push',
    defaultSets: 3, defaultReps: '10–12', defaultRest: '90s',
    cue: 'Squat deep, use leg drive to press overhead',
  },
  {
    id: 'box-jump',
    name: 'Box jump',
    muscle: 'legs',
    split: ['hiit-core', 'full-body'],
    requires: 'gym',
    level: 'intermediate',
    pattern: 'cardio',
    defaultSets: 4, defaultReps: '8–10', defaultRest: '60s',
    cue: 'Land softly with full foot on box, step down',
  },
];

/** Returns exercises filtered for a given split and equipment availability. */
export function getExercisesForSplit(
  split:     ExerciseSplit,
  equipment: 'gym' | 'home' | 'both',
): Exercise[] {
  return EXERCISE_DATABASE.filter(ex => {
    if (!ex.split.includes(split)) return false;
    if (equipment === 'gym')  return ex.requires === 'gym' || ex.requires === 'both';
    if (equipment === 'home') return ex.requires === 'home' || ex.requires === 'both';
    return true; // 'both' — all exercises
  });
}

/** Returns exercises filtered for a given split, equipment, and minimum level. */
export function getExerciseCandidates(
  split:    ExerciseSplit,
  equipment: 'gym' | 'home' | 'both',
  level:    'beginner' | 'intermediate' | 'advanced',
): Exercise[] {
  const LEVEL_ORDER = { beginner: 0, intermediate: 1, advanced: 2, all: 0 };
  const userLevel   = LEVEL_ORDER[level];
  return getExercisesForSplit(split, equipment).filter(
    ex => LEVEL_ORDER[ex.level] <= userLevel,
  );
}

export function getExercise(id: string): Exercise | undefined {
  return EXERCISE_DATABASE.find(ex => ex.id === id);
}

// ─── Workout split definitions ────────────────────────────────────────────────

/**
 * Single source of truth for the weekly split rotation.
 * Used by both WorkoutPlanContext (to filter exercise candidates) and
 * scheduleBuilder (to label gym-day events in the schedule).
 */
export const WORKOUT_SPLITS: Array<{
  workoutType:  string;
  workoutFocus: string;
  split:        ExerciseSplit;
}> = [
  { workoutType: 'Upper Push',  workoutFocus: 'Chest · Shoulders · Triceps', split: 'upper-push'  },
  { workoutType: 'Lower Body',  workoutFocus: 'Glutes · Quads · Hamstrings', split: 'lower'       },
  { workoutType: 'Upper Pull',  workoutFocus: 'Back · Biceps · Rear Delts',  split: 'upper-pull'  },
  { workoutType: 'HIIT + Core', workoutFocus: 'Cardio · Abs · Obliques',     split: 'hiit-core'   },
  { workoutType: 'Full Body',   workoutFocus: 'Compound Lifts · Strength',   split: 'full-body'   },
];

/**
 * Default workout detail strings shown in the schedule when no AI plan is available.
 * Single source of truth — both scheduleBuilder and WorkoutPlanContext reference this.
 */
export const DEFAULT_WORKOUT_DETAIL: Record<string, string> = {
  'Upper Push':
    'Warm-up: 5 min treadmill + arm circles\n' +
    '• Barbell bench press: 4×8\n' +
    '• Dumbbell shoulder press: 3×10\n' +
    '• Incline dumbbell press: 3×12\n' +
    '• Lateral raises: 3×15\n' +
    '• Tricep rope pushdowns: 3×12\n' +
    '• Overhead tricep extension: 3×12\n' +
    'Cool-down: 5 min chest & shoulder stretch',
  'Lower Body':
    'Warm-up: 5 min bike or leg swings\n' +
    '• Barbell squats: 4×8\n' +
    '• Romanian deadlifts: 3×10\n' +
    '• Hip thrusts: 4×12\n' +
    '• Leg press: 3×15\n' +
    '• Walking lunges: 3×12 each leg\n' +
    '• Glute kickbacks (cable): 3×15\n' +
    'Cool-down: 10 min stretch + foam roll',
  'Upper Pull':
    'Warm-up: 5 min row machine + shoulder circles\n' +
    '• Lat pulldown: 4×10\n' +
    '• Seated cable row: 3×12\n' +
    '• Single-arm dumbbell row: 3×10 each\n' +
    '• Face pulls (cable): 3×15\n' +
    '• Rear delt fly (dumbbells): 3×12\n' +
    '• Bicep curls (barbell): 3×10\n' +
    '• Hammer curls: 3×12\n' +
    'Cool-down: 10 min lat & bicep stretch',
  'HIIT + Core':
    'Warm-up: 5 min jog\n' +
    'HIIT — 30s on / 15s off × 5 rounds:\n' +
    '• Burpees\n' +
    '• Jump squats\n' +
    '• Mountain climbers\n' +
    '• High knees\n' +
    'Core block:\n' +
    '• Plank: 4×45s\n' +
    '• Cable crunches: 3×15\n' +
    '• Hanging knee raises: 3×12\n' +
    '• Russian twists: 3×20\n' +
    'Cool-down: 10 min stretching + deep breathing',
  'Full Body':
    'Warm-up: 8 min full-body dynamic warm-up\n' +
    '• Deadlifts: 4×6 (heavy)\n' +
    '• Barbell back squat: 3×8\n' +
    '• Bench press: 3×8\n' +
    '• Dumbbell lunges: 3×12 each leg\n' +
    '• Pull-ups or lat pulldown: 3×10\n' +
    '• Shoulder press: 3×10\n' +
    "• Farmer's carries: 3×30m\n" +
    'Cool-down: 10 min full-body stretch',
};
