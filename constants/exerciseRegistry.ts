export interface Exercise {
  id:            string;
  name:          string;
  category:      'push' | 'pull' | 'legs' | 'core' | 'cardio';
  primaryMuscle: string;
  equipment:     'barbell' | 'dumbbell' | 'cable' | 'bodyweight' | 'machine';
  isCompound:    boolean;
  coaching:      string; // where to find it + key form cue
}

export const EXERCISES: Exercise[] = [
  // ── Push ──────────────────────────────────────────────────────────────────
  {
    id: 'bench-press', name: 'Bench Press', category: 'push',
    primaryMuscle: 'Chest', equipment: 'barbell', isCompound: true,
    coaching: 'Flat bench in the free weights area. Grip slightly wider than shoulders, lower bar to mid-chest with control, press straight up. Keep feet flat and back lightly arched.',
  },
  {
    id: 'incline-db-press', name: 'Incline DB Press', category: 'push',
    primaryMuscle: 'Chest', equipment: 'dumbbell', isCompound: true,
    coaching: 'Set an incline bench to 30–45°, near the dumbbell rack. Start with dumbbells at chest height, press up and slightly inward. Better upper-chest stretch than flat bench.',
  },
  {
    id: 'ohp', name: 'Overhead Press', category: 'push',
    primaryMuscle: 'Shoulders', equipment: 'barbell', isCompound: true,
    coaching: 'Squat rack or dedicated shoulder press station. Bar starts at upper chest, brace core hard, press overhead in a straight line. Avoid excessive lower-back arch.',
  },
  {
    id: 'db-ohp', name: 'DB Shoulder Press', category: 'push',
    primaryMuscle: 'Shoulders', equipment: 'dumbbell', isCompound: true,
    coaching: 'Adjustable bench near the dumbbell rack. Start with dumbbells at ear height, press overhead and bring them slightly together at the top. Greater range of motion than barbell.',
  },
  {
    id: 'lateral-raise', name: 'Lateral Raises', category: 'push',
    primaryMuscle: 'Shoulders', equipment: 'dumbbell', isCompound: false,
    coaching: 'Dumbbell rack — go much lighter than you think. Raise arms out to shoulder height, lead with elbows slightly bent. Pause briefly at the top. Form collapses fast with heavy weight.',
  },
  {
    id: 'tricep-pushdown', name: 'Tricep Pushdown', category: 'push',
    primaryMuscle: 'Triceps', equipment: 'cable', isCompound: false,
    coaching: 'Cable station, rope or straight bar at the top pulley. Pin elbows to your sides throughout — they should not move. Push down until arms are fully extended, control the return.',
  },
  {
    id: 'skull-crusher', name: 'Skull Crushers', category: 'push',
    primaryMuscle: 'Triceps', equipment: 'barbell', isCompound: false,
    coaching: 'Flat bench in the free weights area with an EZ-bar or straight bar. Hold above chest, lower toward forehead by bending only the elbows, press back up. Keep upper arms still.',
  },
  {
    id: 'cable-fly', name: 'Cable Fly', category: 'push',
    primaryMuscle: 'Chest', equipment: 'cable', isCompound: false,
    coaching: 'Cable crossover station — set pulleys at shoulder height or higher. Stand in the middle, bring handles forward in a hugging arc. Trains the chest under a full stretch. Keep a slight elbow bend throughout.',
  },

  // ── Pull ──────────────────────────────────────────────────────────────────
  {
    id: 'deadlift', name: 'Deadlift', category: 'pull',
    primaryMuscle: 'Back', equipment: 'barbell', isCompound: true,
    coaching: 'Deadlift platform or power rack. Hinge at hips, bar over mid-foot, grip just outside legs. Push the floor away to stand — don\'t think of it as a pull. Keep back flat throughout.',
  },
  {
    id: 'pull-up', name: 'Pull-ups', category: 'pull',
    primaryMuscle: 'Back', equipment: 'bodyweight', isCompound: true,
    coaching: 'Pull-up bar or functional rig. Overhand grip, start from a dead hang, pull chin over bar. Use the assisted machine or resistance bands if needed. Best back-width exercise.',
  },
  {
    id: 'barbell-row', name: 'Barbell Row', category: 'pull',
    primaryMuscle: 'Back', equipment: 'barbell', isCompound: true,
    coaching: 'Free weights area. Hinge forward ~45°, overhand grip on barbell, pull to your lower chest. Keep back flat and squeeze shoulder blades at the top. Control the descent.',
  },
  {
    id: 'cable-row', name: 'Cable Row', category: 'pull',
    primaryMuscle: 'Back', equipment: 'cable', isCompound: true,
    coaching: 'Seated row machine or low cable pulley with a V-bar. Feet on the platform, pull handle to your stomach and squeeze shoulder blades together. Don\'t round forward on the way back.',
  },
  {
    id: 'lat-pulldown', name: 'Lat Pulldown', category: 'pull',
    primaryMuscle: 'Back', equipment: 'cable', isCompound: true,
    coaching: 'Lat pulldown machine — overhead cable with padded knee support. Wide overhand grip, lean slightly back, pull bar to upper chest. Avoid swinging or using momentum.',
  },
  {
    id: 'db-row', name: 'DB Single Arm Row', category: 'pull',
    primaryMuscle: 'Back', equipment: 'dumbbell', isCompound: true,
    coaching: 'Place one hand and knee on a flat bench for support. Pull dumbbell from a dead hang to your hip, elbow close to body. Keep torso flat — it should not rotate. Great for imbalances.',
  },
  {
    id: 'face-pull', name: 'Face Pull', category: 'pull',
    primaryMuscle: 'Rear Delts', equipment: 'cable', isCompound: false,
    coaching: 'Cable station, rope attachment at head height. Pull toward your face with elbows flared wide and high. Trains rear delts and rotator cuff — essential for shoulder health and posture.',
  },
  {
    id: 'bicep-curl', name: 'Bicep Curl', category: 'pull',
    primaryMuscle: 'Biceps', equipment: 'dumbbell', isCompound: false,
    coaching: 'Dumbbell rack. Stand with palms facing up, curl to shoulder height, lower slowly. Keep elbows pinned to your sides. Slow on the way down — that\'s where the growth happens.',
  },
  {
    id: 'hammer-curl', name: 'Hammer Curl', category: 'pull',
    primaryMuscle: 'Biceps', equipment: 'dumbbell', isCompound: false,
    coaching: 'Dumbbell rack. Same as a bicep curl but palms face each other throughout. Trains the brachialis and forearms alongside biceps — gives more overall arm thickness.',
  },

  // ── Legs ──────────────────────────────────────────────────────────────────
  {
    id: 'squat', name: 'Back Squat', category: 'legs',
    primaryMuscle: 'Quads', equipment: 'barbell', isCompound: true,
    coaching: 'Squat rack. Bar rests on upper traps, feet shoulder-width apart. Squat to parallel or below, drive knees out over toes. Brace core before every rep. The most important leg exercise.',
  },
  {
    id: 'rdl', name: 'Romanian Deadlift', category: 'legs',
    primaryMuscle: 'Hamstrings', equipment: 'barbell', isCompound: true,
    coaching: 'Free weights area with barbell or dumbbells. Slight knee bend, push hips back as you lower the weight down your shins until you feel a hamstring stretch, then drive hips forward to stand.',
  },
  {
    id: 'hip-thrust', name: 'Hip Thrust', category: 'legs',
    primaryMuscle: 'Glutes', equipment: 'barbell', isCompound: true,
    coaching: 'Sit with shoulders against a bench, barbell across hips (use a pad). Drive through heels until hips are fully extended and body is straight. Squeeze glutes hard at the top.',
  },
  {
    id: 'leg-press', name: 'Leg Press', category: 'legs',
    primaryMuscle: 'Quads', equipment: 'machine', isCompound: true,
    coaching: 'Machine section. Feet shoulder-width on the platform. Lower the sled until knees reach 90°, press back without locking out at the top. Foot position changes emphasis — higher targets glutes.',
  },
  {
    id: 'bulgarian-split', name: 'Bulgarian Split Squat', category: 'legs',
    primaryMuscle: 'Glutes', equipment: 'dumbbell', isCompound: true,
    coaching: 'Near a bench with dumbbells. Rear foot elevated, front foot far enough forward so your shin stays vertical. Lower back knee toward the floor, drive through your front heel to stand.',
  },
  {
    id: 'leg-curl', name: 'Leg Curl', category: 'legs',
    primaryMuscle: 'Hamstrings', equipment: 'machine', isCompound: false,
    coaching: 'Machine section — look for the lying or seated leg curl. Curl heels toward your glutes against resistance. Go full range and control the lowering phase. Hamstring isolation.',
  },
  {
    id: 'leg-extension', name: 'Leg Extension', category: 'legs',
    primaryMuscle: 'Quads', equipment: 'machine', isCompound: false,
    coaching: 'Machine section, usually next to the leg curl. Sit with the pad resting on your shins, extend legs until straight, lower slowly. Quad isolation — keep reps controlled.',
  },
  {
    id: 'calf-raise', name: 'Calf Raise', category: 'legs',
    primaryMuscle: 'Calves', equipment: 'machine', isCompound: false,
    coaching: 'Calf raise machine or a step in the gym floor area. Rise up onto your toes slowly, then lower below the step for full range. Calves respond well to slow reps and high volume.',
  },
  {
    id: 'walking-lunge', name: 'Walking Lunge', category: 'legs',
    primaryMuscle: 'Quads', equipment: 'dumbbell', isCompound: true,
    coaching: 'Find a clear section of gym floor. Hold dumbbells at sides, step forward and lower the rear knee close to the floor, then drive forward into the next step. Keep torso upright throughout.',
  },

  // ── Core ──────────────────────────────────────────────────────────────────
  {
    id: 'plank', name: 'Plank', category: 'core',
    primaryMuscle: 'Core', equipment: 'bodyweight', isCompound: false,
    coaching: 'Anywhere on the gym floor — use a mat. Forearms down, body in a straight line from head to heels. Squeeze glutes and brace abs. Don\'t let hips sag or pike. Quality over duration.',
  },
  {
    id: 'ab-wheel', name: 'Ab Wheel Rollout', category: 'core',
    primaryMuscle: 'Core', equipment: 'bodyweight', isCompound: false,
    coaching: 'Stretching area — the ab wheel is usually in a corner or accessories rack. Kneel, roll forward slowly until hips nearly touch the floor, pull back using your abs. Even 5 reps is hard at first.',
  },
  {
    id: 'hanging-leg-raise', name: 'Hanging Leg Raise', category: 'core',
    primaryMuscle: 'Core', equipment: 'bodyweight', isCompound: false,
    coaching: 'Pull-up bar or captain\'s chair. Hang with arms extended, raise legs to hip height or higher with control. Avoid swinging — if you swing, you\'ve lost tension on the abs.',
  },
  {
    id: 'cable-crunch', name: 'Cable Crunch', category: 'core',
    primaryMuscle: 'Core', equipment: 'cable', isCompound: false,
    coaching: 'Cable station with rope attachment at the top pulley. Kneel facing the machine, pull rope to your ears, crunch forward by contracting abs — not by pulling with your arms. Trains abs under load.',
  },
  {
    id: 'russian-twist', name: 'Russian Twist', category: 'core',
    primaryMuscle: 'Core', equipment: 'dumbbell', isCompound: false,
    coaching: 'Stretching area with a dumbbell or plate. Sit with torso leaned back 45°, feet raised or on the floor. Hold weight and rotate side to side. Keep abs braced — don\'t let momentum take over.',
  },

  // ── Cardio ────────────────────────────────────────────────────────────────
  {
    id: 'treadmill', name: 'Treadmill', category: 'cardio',
    primaryMuscle: 'Full Body', equipment: 'machine', isCompound: true,
    coaching: 'Cardio section. Walk, jog or run. Increase incline for added calorie burn without joint impact. Good for steady-state sessions or HIIT intervals (e.g. 30s fast / 60s walk).',
  },
  {
    id: 'rowing-machine', name: 'Rowing Machine', category: 'cardio',
    primaryMuscle: 'Full Body', equipment: 'machine', isCompound: true,
    coaching: 'Cardio section — often near the entrance. Drive with legs first, then lean back, then pull handle to lower chest. Return in reverse order. Full-body, low-impact and often underused.',
  },
  {
    id: 'battle-ropes', name: 'Battle Ropes', category: 'cardio',
    primaryMuscle: 'Full Body', equipment: 'bodyweight', isCompound: true,
    coaching: 'Functional or turf area — ropes are usually anchored to a wall or post. Keep hips low and core braced. Make alternating or simultaneous waves. High-intensity and tough on the grip.',
  },
  {
    id: 'box-jump', name: 'Box Jumps', category: 'cardio',
    primaryMuscle: 'Full Body', equipment: 'bodyweight', isCompound: true,
    coaching: 'Functional or CrossFit area with plyo boxes. Hinge, swing arms and jump onto the box — land with soft bent knees. Always step back down rather than jumping off to protect your joints.',
  },
  {
    id: 'burpee', name: 'Burpees', category: 'cardio',
    primaryMuscle: 'Full Body', equipment: 'bodyweight', isCompound: true,
    coaching: 'No equipment — anywhere in the gym. Squat, jump feet back to plank, optional push-up, jump feet forward, jump up overhead. Brutal full-body conditioning. Pace yourself on the first few sets.',
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
  key:         string; // matches FOCUS_DEFAULTS keys
  emoji:       string; // gender-neutral icon shown on pill and card header
  label:       string; // short name shown on the pill
  detail:      string; // muscle groups shown below
  focusString: string; // stored as event.workoutFocus
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
