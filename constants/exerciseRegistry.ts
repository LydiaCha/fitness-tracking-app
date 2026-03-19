export interface Exercise {
  id:               string;
  name:             string;
  category:         'push' | 'pull' | 'legs' | 'core' | 'cardio';
  primaryMuscle:    string;
  equipment:        'barbell' | 'dumbbell' | 'cable' | 'bodyweight' | 'machine';
  isCompound:       boolean;
  location:         string;      // where to find it in the gym
  cues:             string[];    // step-by-step form cues
  defaultSets:      number;
  defaultRepsRange: string;      // e.g. "8–12" or "30–60 sec"
  gifUrl?:          string;      // optional — populate in a future phase
}

export const EXERCISES: Exercise[] = [
  // ── Push ──────────────────────────────────────────────────────────────────
  {
    id: 'bench-press', name: 'Bench Press', category: 'push',
    primaryMuscle: 'Chest', equipment: 'barbell', isCompound: true,
    location: 'Flat bench in the free weights area',
    cues: [
      'Grip slightly wider than shoulder-width',
      'Lower the bar to mid-chest with control',
      'Press straight up',
      'Keep feet flat and back lightly arched',
    ],
    defaultSets: 3, defaultRepsRange: '6–10',
  },
  {
    id: 'incline-db-press', name: 'Incline DB Press', category: 'push',
    primaryMuscle: 'Chest', equipment: 'dumbbell', isCompound: true,
    location: 'Incline bench set to 30–45°, near the dumbbell rack',
    cues: [
      'Start with dumbbells at chest height',
      'Press up and slightly inward',
      'Better upper-chest stretch than flat bench',
    ],
    defaultSets: 3, defaultRepsRange: '8–12',
  },
  {
    id: 'ohp', name: 'Overhead Press', category: 'push',
    primaryMuscle: 'Shoulders', equipment: 'barbell', isCompound: true,
    location: 'Squat rack or dedicated shoulder press station',
    cues: [
      'Bar starts at upper chest',
      'Brace core hard before pressing',
      'Press overhead in a straight line',
      'Avoid excessive lower-back arch',
    ],
    defaultSets: 3, defaultRepsRange: '6–10',
  },
  {
    id: 'db-ohp', name: 'DB Shoulder Press', category: 'push',
    primaryMuscle: 'Shoulders', equipment: 'dumbbell', isCompound: true,
    location: 'Adjustable bench near the dumbbell rack',
    cues: [
      'Start with dumbbells at ear height',
      'Press overhead and bring them slightly together at the top',
      'Greater range of motion than barbell',
    ],
    defaultSets: 3, defaultRepsRange: '8–12',
  },
  {
    id: 'lateral-raise', name: 'Lateral Raises', category: 'push',
    primaryMuscle: 'Shoulders', equipment: 'dumbbell', isCompound: false,
    location: 'Dumbbell rack',
    cues: [
      'Go much lighter than you think',
      'Raise arms out to shoulder height with elbows slightly bent',
      'Pause briefly at the top',
      'Form collapses fast with heavy weight',
    ],
    defaultSets: 3, defaultRepsRange: '12–15',
  },
  {
    id: 'tricep-pushdown', name: 'Tricep Pushdown', category: 'push',
    primaryMuscle: 'Triceps', equipment: 'cable', isCompound: false,
    location: 'Cable station — rope or straight bar at the top pulley',
    cues: [
      'Pin elbows to your sides — they should not move',
      'Push down until arms are fully extended',
      'Control the return slowly',
    ],
    defaultSets: 3, defaultRepsRange: '10–15',
  },
  {
    id: 'skull-crusher', name: 'Skull Crushers', category: 'push',
    primaryMuscle: 'Triceps', equipment: 'barbell', isCompound: false,
    location: 'Flat bench in the free weights area with an EZ-bar or straight bar',
    cues: [
      'Hold bar above chest with arms extended',
      'Lower toward forehead by bending only the elbows',
      'Press back up',
      'Keep upper arms completely still throughout',
    ],
    defaultSets: 3, defaultRepsRange: '10–12',
  },
  {
    id: 'cable-fly', name: 'Cable Fly', category: 'push',
    primaryMuscle: 'Chest', equipment: 'cable', isCompound: false,
    location: 'Cable crossover station — set pulleys at shoulder height or higher',
    cues: [
      'Stand in the middle of the station',
      'Bring handles forward in a hugging arc',
      'Keep a slight elbow bend throughout',
      'Trains chest under a full stretch',
    ],
    defaultSets: 3, defaultRepsRange: '12–15',
  },

  // ── Pull ──────────────────────────────────────────────────────────────────
  {
    id: 'deadlift', name: 'Deadlift', category: 'pull',
    primaryMuscle: 'Back', equipment: 'barbell', isCompound: true,
    location: 'Deadlift platform or power rack',
    cues: [
      'Bar over mid-foot, grip just outside legs',
      'Hinge at hips, keep back flat',
      'Push the floor away to stand — don\'t think of it as a pull',
      'Keep back flat throughout the movement',
    ],
    defaultSets: 3, defaultRepsRange: '4–6',
  },
  {
    id: 'pull-up', name: 'Pull-ups', category: 'pull',
    primaryMuscle: 'Back', equipment: 'bodyweight', isCompound: true,
    location: 'Pull-up bar or functional rig',
    cues: [
      'Overhand grip, start from a dead hang',
      'Pull chin over the bar',
      'Use the assisted machine or resistance bands if needed',
      'Best back-width exercise',
    ],
    defaultSets: 3, defaultRepsRange: '5–10',
  },
  {
    id: 'barbell-row', name: 'Barbell Row', category: 'pull',
    primaryMuscle: 'Back', equipment: 'barbell', isCompound: true,
    location: 'Free weights area',
    cues: [
      'Hinge forward ~45° with overhand grip',
      'Pull bar to your lower chest',
      'Squeeze shoulder blades at the top',
      'Control the descent slowly',
    ],
    defaultSets: 3, defaultRepsRange: '6–10',
  },
  {
    id: 'cable-row', name: 'Cable Row', category: 'pull',
    primaryMuscle: 'Back', equipment: 'cable', isCompound: true,
    location: 'Seated row machine or low cable pulley with a V-bar',
    cues: [
      'Feet on the platform',
      'Pull handle to your stomach',
      'Squeeze shoulder blades together at the end',
      'Don\'t round forward on the way back',
    ],
    defaultSets: 3, defaultRepsRange: '10–12',
  },
  {
    id: 'lat-pulldown', name: 'Lat Pulldown', category: 'pull',
    primaryMuscle: 'Back', equipment: 'cable', isCompound: true,
    location: 'Lat pulldown machine — overhead cable with padded knee support',
    cues: [
      'Wide overhand grip',
      'Lean slightly back',
      'Pull bar to upper chest',
      'Avoid swinging or using momentum',
    ],
    defaultSets: 3, defaultRepsRange: '8–12',
  },
  {
    id: 'db-row', name: 'DB Single Arm Row', category: 'pull',
    primaryMuscle: 'Back', equipment: 'dumbbell', isCompound: true,
    location: 'Flat bench with a dumbbell from the rack',
    cues: [
      'Place one hand and knee on the bench for support',
      'Pull dumbbell from a dead hang to your hip, elbow close to body',
      'Keep torso flat — it should not rotate',
      'Great for fixing left-right imbalances',
    ],
    defaultSets: 3, defaultRepsRange: '8–12',
  },
  {
    id: 'face-pull', name: 'Face Pull', category: 'pull',
    primaryMuscle: 'Rear Delts', equipment: 'cable', isCompound: false,
    location: 'Cable station — rope attachment at head height',
    cues: [
      'Pull the rope toward your face',
      'Keep elbows flared wide and high',
      'Trains rear delts and rotator cuff',
      'Essential for shoulder health and posture',
    ],
    defaultSets: 3, defaultRepsRange: '12–15',
  },
  {
    id: 'bicep-curl', name: 'Bicep Curl', category: 'pull',
    primaryMuscle: 'Biceps', equipment: 'dumbbell', isCompound: false,
    location: 'Dumbbell rack',
    cues: [
      'Palms facing up, elbows pinned to your sides',
      'Curl to shoulder height',
      'Lower slowly — that\'s where the growth happens',
      'Avoid swinging your torso',
    ],
    defaultSets: 3, defaultRepsRange: '10–15',
  },
  {
    id: 'hammer-curl', name: 'Hammer Curl', category: 'pull',
    primaryMuscle: 'Biceps', equipment: 'dumbbell', isCompound: false,
    location: 'Dumbbell rack',
    cues: [
      'Palms face each other throughout (neutral grip)',
      'Curl to shoulder height, lower slowly',
      'Trains brachialis and forearms alongside biceps',
      'Gives more overall arm thickness than standard curls',
    ],
    defaultSets: 3, defaultRepsRange: '10–15',
  },

  // ── Legs ──────────────────────────────────────────────────────────────────
  {
    id: 'squat', name: 'Back Squat', category: 'legs',
    primaryMuscle: 'Quads', equipment: 'barbell', isCompound: true,
    location: 'Squat rack',
    cues: [
      'Bar rests on upper traps, feet shoulder-width apart',
      'Brace core before every rep',
      'Squat to parallel or below',
      'Drive knees out over toes on the way up',
    ],
    defaultSets: 4, defaultRepsRange: '5–8',
  },
  {
    id: 'rdl', name: 'Romanian Deadlift', category: 'legs',
    primaryMuscle: 'Hamstrings', equipment: 'barbell', isCompound: true,
    location: 'Free weights area with barbell or dumbbells',
    cues: [
      'Slight knee bend throughout',
      'Push hips back as you lower the weight down your shins',
      'Lower until you feel a hamstring stretch',
      'Drive hips forward to stand',
    ],
    defaultSets: 3, defaultRepsRange: '8–12',
  },
  {
    id: 'hip-thrust', name: 'Hip Thrust', category: 'legs',
    primaryMuscle: 'Glutes', equipment: 'barbell', isCompound: true,
    location: 'Flat bench with a barbell — use a hip thrust pad',
    cues: [
      'Sit with shoulders against the bench, barbell across hips',
      'Drive through heels until hips are fully extended',
      'Body should be straight at the top',
      'Squeeze glutes hard at the top for 1–2 seconds',
    ],
    defaultSets: 3, defaultRepsRange: '10–15',
  },
  {
    id: 'leg-press', name: 'Leg Press', category: 'legs',
    primaryMuscle: 'Quads', equipment: 'machine', isCompound: true,
    location: 'Machine section — leg press machine',
    cues: [
      'Feet shoulder-width on the platform',
      'Lower the sled until knees reach 90°',
      'Press back without locking out at the top',
      'Higher foot position targets glutes more',
    ],
    defaultSets: 3, defaultRepsRange: '10–15',
  },
  {
    id: 'bulgarian-split', name: 'Bulgarian Split Squat', category: 'legs',
    primaryMuscle: 'Glutes', equipment: 'dumbbell', isCompound: true,
    location: 'Near a bench with dumbbells from the rack',
    cues: [
      'Rear foot elevated on the bench',
      'Front foot far enough forward so shin stays vertical',
      'Lower back knee toward the floor',
      'Drive through your front heel to stand',
    ],
    defaultSets: 3, defaultRepsRange: '8–12',
  },
  {
    id: 'leg-curl', name: 'Leg Curl', category: 'legs',
    primaryMuscle: 'Hamstrings', equipment: 'machine', isCompound: false,
    location: 'Machine section — lying or seated leg curl machine',
    cues: [
      'Curl heels toward your glutes against resistance',
      'Go full range of motion',
      'Control the lowering phase — don\'t drop',
      'Pure hamstring isolation',
    ],
    defaultSets: 3, defaultRepsRange: '10–15',
  },
  {
    id: 'leg-extension', name: 'Leg Extension', category: 'legs',
    primaryMuscle: 'Quads', equipment: 'machine', isCompound: false,
    location: 'Machine section — leg extension machine, usually next to the leg curl',
    cues: [
      'Sit with the pad resting on your shins',
      'Extend legs until straight',
      'Lower slowly — don\'t let the weight drop',
      'Pure quad isolation',
    ],
    defaultSets: 3, defaultRepsRange: '12–15',
  },
  {
    id: 'calf-raise', name: 'Calf Raise', category: 'legs',
    primaryMuscle: 'Calves', equipment: 'machine', isCompound: false,
    location: 'Calf raise machine or a raised step/platform',
    cues: [
      'Rise up onto your toes slowly',
      'Lower below the step for full range of motion',
      'Calves respond well to slow reps',
      'High volume works well — aim for 15–20 reps per set',
    ],
    defaultSets: 4, defaultRepsRange: '15–20',
  },
  {
    id: 'walking-lunge', name: 'Walking Lunge', category: 'legs',
    primaryMuscle: 'Quads', equipment: 'dumbbell', isCompound: true,
    location: 'Clear section of gym floor with dumbbells',
    cues: [
      'Hold dumbbells at your sides',
      'Step forward and lower rear knee close to the floor',
      'Drive forward into the next step',
      'Keep torso upright throughout',
    ],
    defaultSets: 3, defaultRepsRange: '10–12 each leg',
  },

  // ── Core ──────────────────────────────────────────────────────────────────
  {
    id: 'plank', name: 'Plank', category: 'core',
    primaryMuscle: 'Core', equipment: 'bodyweight', isCompound: false,
    location: 'Gym floor — use a mat from the stretching area',
    cues: [
      'Forearms down, body in a straight line from head to heels',
      'Squeeze glutes and brace abs hard',
      'Don\'t let hips sag or pike',
      'Quality over duration — stop before form breaks',
    ],
    defaultSets: 3, defaultRepsRange: '30–60 sec',
  },
  {
    id: 'ab-wheel', name: 'Ab Wheel Rollout', category: 'core',
    primaryMuscle: 'Core', equipment: 'bodyweight', isCompound: false,
    location: 'Stretching area — ab wheel in the accessories corner',
    cues: [
      'Kneel on a mat',
      'Roll forward slowly until hips nearly touch the floor',
      'Pull back using your abs, not your arms',
      'Even 5 reps is very hard at first — build up slowly',
    ],
    defaultSets: 3, defaultRepsRange: '5–10',
  },
  {
    id: 'hanging-leg-raise', name: 'Hanging Leg Raise', category: 'core',
    primaryMuscle: 'Core', equipment: 'bodyweight', isCompound: false,
    location: 'Pull-up bar or captain\'s chair',
    cues: [
      'Hang with arms fully extended',
      'Raise legs to hip height or higher with control',
      'Avoid swinging — bracing prevents it',
      'If you swing, you\'ve lost tension on the abs',
    ],
    defaultSets: 3, defaultRepsRange: '10–15',
  },
  {
    id: 'cable-crunch', name: 'Cable Crunch', category: 'core',
    primaryMuscle: 'Core', equipment: 'cable', isCompound: false,
    location: 'Cable station — rope attachment at the top pulley',
    cues: [
      'Kneel facing the machine, rope at your ears',
      'Crunch forward by contracting abs — not by pulling with your arms',
      'Lower back to the start with control',
      'Trains abs under load for better strength gains',
    ],
    defaultSets: 3, defaultRepsRange: '12–15',
  },
  {
    id: 'russian-twist', name: 'Russian Twist', category: 'core',
    primaryMuscle: 'Core', equipment: 'dumbbell', isCompound: false,
    location: 'Stretching area with a dumbbell or weight plate',
    cues: [
      'Sit with torso leaned back 45°',
      'Feet raised or on the floor',
      'Hold weight and rotate side to side',
      'Keep abs braced — don\'t let momentum take over',
    ],
    defaultSets: 3, defaultRepsRange: '10–15 each side',
  },

  // ── Cardio ────────────────────────────────────────────────────────────────
  {
    id: 'treadmill', name: 'Treadmill', category: 'cardio',
    primaryMuscle: 'Full Body', equipment: 'machine', isCompound: true,
    location: 'Cardio section — treadmill',
    cues: [
      'Walk, jog or run at your target pace',
      'Increase incline for added calorie burn without joint impact',
      'Steady-state: 20–40 min at moderate pace',
      'HIIT: 30s fast / 60s walk, repeat 8–10 times',
    ],
    defaultSets: 1, defaultRepsRange: '20–30 min',
  },
  {
    id: 'rowing-machine', name: 'Rowing Machine', category: 'cardio',
    primaryMuscle: 'Full Body', equipment: 'machine', isCompound: true,
    location: 'Cardio section — rowing machine, often near the entrance',
    cues: [
      'Drive with legs first',
      'Then lean back',
      'Then pull handle to lower chest',
      'Return in reverse order: arms → lean forward → legs',
    ],
    defaultSets: 1, defaultRepsRange: '10–20 min',
  },
  {
    id: 'battle-ropes', name: 'Battle Ropes', category: 'cardio',
    primaryMuscle: 'Full Body', equipment: 'bodyweight', isCompound: true,
    location: 'Functional or turf area — ropes anchored to a wall or post',
    cues: [
      'Keep hips low in a half-squat, core braced',
      'Make alternating waves (one arm up, one down)',
      'Or simultaneous waves for a different stimulus',
      'High-intensity — pace yourself in the first set',
    ],
    defaultSets: 4, defaultRepsRange: '30 sec on / 30 sec off',
  },
  {
    id: 'box-jump', name: 'Box Jumps', category: 'cardio',
    primaryMuscle: 'Full Body', equipment: 'bodyweight', isCompound: true,
    location: 'Functional or CrossFit area — plyo boxes',
    cues: [
      'Hinge and swing arms to generate power',
      'Jump onto the box, land with soft bent knees',
      'Always step back down — never jump off backwards',
      'Start with a lower box until you\'re confident',
    ],
    defaultSets: 4, defaultRepsRange: '8–10',
  },
  {
    id: 'burpee', name: 'Burpees', category: 'cardio',
    primaryMuscle: 'Full Body', equipment: 'bodyweight', isCompound: true,
    location: 'No equipment needed — any open floor space',
    cues: [
      'Squat down and jump feet back to a plank position',
      'Optional push-up at the bottom',
      'Jump feet forward to your hands',
      'Jump up with arms overhead — that\'s one rep',
    ],
    defaultSets: 3, defaultRepsRange: '10–15',
  },
];

// Default exercises shown in the log sheet per focus type.
// Ordered: compounds first, then accessories.
const FOCUS_DEFAULTS: Record<string, string[]> = {
  push:     ['bench-press',   'ohp',         'incline-db-press', 'tricep-pushdown', 'lateral-raise'],
  pull:     ['barbell-row',   'pull-up',     'lat-pulldown',     'bicep-curl',      'face-pull'],
  legs:     ['squat',         'hip-thrust',  'rdl',              'leg-press',       'leg-curl'],
  core:     ['plank',         'hanging-leg-raise', 'ab-wheel',   'cable-crunch'],
  cardio:   ['battle-ropes',  'box-jump',    'burpee',           'treadmill'],
  fullbody: ['squat',         'deadlift',    'bench-press',      'barbell-row',     'ohp'],
};

/** Matches a workout focus string (from Claude or the schedule) to an exercise list. */
export function getDefaultExercisesForFocus(focus: string): Exercise[] {
  const f = focus.toLowerCase();

  let key: keyof typeof FOCUS_DEFAULTS = 'fullbody';
  if (f.includes('push') || f.includes('chest') || f.includes('tricep'))                           key = 'push';
  else if (f.includes('pull') || f.includes('back') || f.includes('bicep'))                        key = 'pull';
  else if (f.includes('leg') || f.includes('lower') || f.includes('glute') || f.includes('quad'))  key = 'legs';
  else if (f.includes('hiit') || f.includes('cardio') || f.includes('conditioning'))               key = 'cardio';
  else if (f.includes('core') || f.includes('abs'))                                                 key = 'core';

  const ids = FOCUS_DEFAULTS[key];
  return ids.flatMap(id => EXERCISES.filter(e => e.id === id));
}

// ─── Swappable focus options (shown as pills on the WorkoutCard) ──────────────

export interface WorkoutFocusOption {
  key:         string;
  emoji:       string;
  label:       string;
  detail:      string;
  focusString: string;
}

export const WORKOUT_FOCUS_OPTIONS: WorkoutFocusOption[] = [
  { key: 'push',     emoji: '🫸',  label: 'Push',      detail: 'Chest, Shoulders, Triceps',   focusString: 'Upper Push – Chest, Shoulders, Triceps'   },
  { key: 'pull',     emoji: '🧲',  label: 'Pull',      detail: 'Back, Biceps',                focusString: 'Upper Pull – Back, Biceps'                 },
  { key: 'legs',     emoji: '🦵',  label: 'Legs',      detail: 'Quads, Glutes, Hamstrings',   focusString: 'Legs – Quads, Glutes, Hamstrings'          },
  { key: 'fullbody', emoji: '⚡',  label: 'Full Body', detail: 'Compound movements',          focusString: 'Full Body – Compound Movements'            },
  { key: 'core',     emoji: '🔥',  label: 'Core',      detail: 'Abs & Stability',             focusString: 'Core – Abs & Stability'                    },
  { key: 'cardio',   emoji: '🫀',  label: 'Cardio',    detail: 'Conditioning',                focusString: 'Cardio – Conditioning'                     },
  { key: 'rest',     emoji: '🌿',  label: 'Rest',      detail: 'Active recovery',             focusString: 'Rest – Active Recovery'                    },
];

/** Returns the WorkoutFocusOption whose key matches the given focus string. */
export function getFocusOption(focus: string): WorkoutFocusOption | undefined {
  const f = focus.toLowerCase();
  return WORKOUT_FOCUS_OPTIONS.find(opt => {
    if (opt.key === 'push')     return f.includes('push')  || f.includes('chest')  || f.includes('tricep');
    if (opt.key === 'pull')     return f.includes('pull')  || f.includes('back')   || f.includes('bicep');
    if (opt.key === 'legs')     return f.includes('leg')   || f.includes('lower')  || f.includes('glute') || f.includes('quad');
    if (opt.key === 'cardio')   return f.includes('cardio')|| f.includes('hiit')   || f.includes('conditioning');
    if (opt.key === 'core')     return f.includes('core')  || f.includes('abs');
    if (opt.key === 'fullbody') return f.includes('full')  || f.includes('compound');
    if (opt.key === 'rest')     return f.includes('rest')  || f.includes('recovery');
    return false;
  });
}

/** Returns the primary compound for a focus — used as default in the strength chart. */
export function getPrimaryCompoundForFocus(focus: string): Exercise | null {
  return getDefaultExercisesForFocus(focus).find(e => e.isCompound) ?? null;
}

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find(e => e.id === id);
}
