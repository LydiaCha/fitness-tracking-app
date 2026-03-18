/**
 * PeakRoutine — Schedule Skeleton Builder
 *
 * Generates a profile-driven DaySchedule[] (Mon-first) from a UserProfile.
 * This skeleton replaces the hardcoded WEEK_SCHEDULE as the base for the
 * AI overlay, ensuring event timing and structure reflect the user's actual
 * sleep / work / gym schedule.
 *
 * Event structure per day (in time order):
 *   Wake → Supplements → Breakfast (meal) →
 *   [Gym early + shake?] →
 *   Lunch (meal) →
 *   [Work: water, snack, Dinner (meal), water, pre-sleep snack, WORK ENDS] →
 *   [Non-work Dinner] →
 *   [Gym post-work + shake?] →
 *   [Active recovery on rest days] →
 *   [Sunday meal prep] →
 *   Magnesium → Wind down → Sleep
 *
 * Each day always has exactly 3 `type === 'meal'` events (Breakfast, Lunch,
 * Dinner) so that buildOverlaySchedule can map the AI meal plan 1-to-1.
 */

import { UserProfile } from '@/constants/userProfile';
import { DaySchedule, ScheduleEvent } from '@/constants/scheduleData';

// ─── Constants ────────────────────────────────────────────────────────────────

const MON_FIRST_IDS: readonly string[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
];
const MON_FIRST_NAMES: readonly string[] = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
];
const MON_FIRST_SHORT: readonly string[] = [
  'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN',
];

/** Workout splits assigned in sequence to gym days. */
const GYM_SPLITS = [
  { workoutType: 'Upper Push',  workoutFocus: 'Chest · Shoulders · Triceps' },
  { workoutType: 'Lower Body',  workoutFocus: 'Glutes · Quads · Hamstrings' },
  { workoutType: 'Upper Pull',  workoutFocus: 'Back · Biceps · Rear Delts'  },
  { workoutType: 'HIIT + Core', workoutFocus: 'Cardio · Abs · Obliques'     },
  { workoutType: 'Full Body',   workoutFocus: 'Compound Lifts · Strength'   },
] as const;

type GymSplit = (typeof GYM_SPLITS)[number];

const GYM_DURATION_MINS = 75;

/** Exercise detail strings — bullets are rendered as interactive checkboxes in the app. */
const WORKOUT_DETAIL: Record<string, string> = {
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
    '• Farmer\'s carries: 3×30m\n' +
    'Cool-down: 10 min full-body stretch',
};

// ─── Time helpers ─────────────────────────────────────────────────────────────

/** Parse "4:30 PM" → minutes from midnight (0–1439). */
function timeToMins(time: string): number {
  const parts = time.trim().split(' ');
  const period = parts[1] ?? 'AM';
  const [hStr, mStr = '0'] = (parts[0] ?? '0:0').split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

/** Minutes from midnight (may overflow) → "H:MM AM/PM". */
function minsToTime(totalMins: number): string {
  const m = ((totalMins % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${min.toString().padStart(2, '0')} ${period}`;
}

/** Add `delta` minutes to a time string. */
function addMins(time: string, delta: number): string {
  return minsToTime(timeToMins(time) + delta);
}

/** Minutes from `from` to `to`, always positive (wraps midnight). */
function gapMins(from: string, to: string): number {
  return ((timeToMins(to) - timeToMins(from)) + 1440) % 1440;
}

// ─── Event builder helpers ────────────────────────────────────────────────────

function pushGymEvents(
  events:   ScheduleEvent[],
  gymTime:  string,
  gymSplit: GymSplit | null,
): void {
  events.push({
    time:         gymTime,
    label:        `GYM – ${gymSplit?.workoutType ?? 'Training'}`,
    type:         'gym',
    duration:     `${GYM_DURATION_MINS} min`,
    detail:       gymSplit ? (WORKOUT_DETAIL[gymSplit.workoutType] ?? '') : '',
    workoutType:  gymSplit?.workoutType,
    workoutFocus: gymSplit?.workoutFocus,
  });
  events.push({
    time:         addMins(gymTime, GYM_DURATION_MINS + 5),
    label:        'Post-workout shake',
    type:         'shake',
    recipeId:     'recovery',
    recipeType:   'shake',
    alternatives: ['green', 'fruity'],
    detail:       'The 30-minute post-workout window is when muscles are most primed to absorb protein and replenish glycogen. Don\'t skip this.',
  });
}

// ─── Event builder ────────────────────────────────────────────────────────────

function buildDayEvents(
  wakeTime:    string,
  sleepTime:   string,
  isWorkDay:   boolean,
  workStart:   string,
  workEnd:     string,
  isGymDay:    boolean,
  gymSplit:    GymSplit | null,
  isSaturday:  boolean,
  isSunday:    boolean,
): ScheduleEvent[] {
  const events: ScheduleEvent[] = [];

  const awakeMin     = gapMins(wakeTime, sleepTime);   // total awake window
  const preWorkMin   = isWorkDay ? gapMins(wakeTime, workStart) : 0;
  const workDuration = isWorkDay ? gapMins(workStart, workEnd)  : 0;

  // Gym is placed EARLY (soon after wake) when:
  //   - it's not a work day (free schedule), OR
  //   - there's ≥ 3 h of pre-work time to fit a session
  // Otherwise it goes 30 min after work ends.
  const gymEarly = isGymDay && (!isWorkDay || preWorkMin >= 180);
  const gymTime: string | null = isGymDay
    ? (gymEarly
        ? addMins(wakeTime, isWorkDay ? 60 : 90)
        : addMins(workEnd, 30))
    : null;

  // Meal times as fractions of the total awake window, with minimums so
  // events don't collide when the awake window is short.
  const breakfastTime = addMins(wakeTime, 30);
  const lunchTime     = addMins(wakeTime, Math.max(150, Math.round(awakeMin * 0.35)));
  const dinnerTime    = addMins(wakeTime, Math.max(240, Math.round(awakeMin * 0.60)));

  // ── Wake ────────────────────────────────────────────────────────────────────
  events.push({
    time:   wakeTime,
    label:  'Wake up',
    type:   'wake',
    detail: 'Drink 500ml water + 2-min light stretch. Sleeping dehydrates you — this water kickstarts metabolism and clears brain fog before your day begins.',
  });

  // ── Supplements ─────────────────────────────────────────────────────────────
  events.push({
    time:   addMins(wakeTime, 15),
    label:  'Supplements',
    type:   'supplement',
    detail: 'Vitamin D3 (2000 IU) + Omega-3 (1g fish oil). D3 supports immunity, mood and testosterone — most people are deficient without realising. Omega-3 reduces inflammation and accelerates muscle repair. Both are fat-soluble, so take with food.',
  });

  // ── Breakfast (meal slot 1) ──────────────────────────────────────────────────
  events.push({
    time:       breakfastTime,
    label:      gymEarly ? 'Breakfast – pre-workout fuel' : 'Breakfast',
    type:       'meal',
    recipeType: 'meal',
    detail:     gymEarly ? 'Eat 45–60 min before training for peak energy.' : undefined,
  });

  // ── Gym early + post-workout shake ──────────────────────────────────────────
  if (isGymDay && gymEarly && gymTime) {
    pushGymEvents(events, gymTime, gymSplit);
  }

  // ── Lunch (meal slot 2) ─────────────────────────────────────────────────────
  events.push({
    time:       lunchTime,
    label:      'Lunch',
    type:       'meal',
    recipeType: 'meal',
  });

  // ── Work day events ─────────────────────────────────────────────────────────
  if (isWorkDay) {
    events.push({
      time:     workStart,
      label:    'WORK BEGINS',
      type:     'work',
      duration: `${Math.floor(workDuration / 60)} hrs`,
      detail:   'Keep water on desk — aim for 250ml per hour.',
    });

    events.push({
      time:   addMins(workStart, Math.round(workDuration * 0.20)),
      label:  'Water check',
      type:   'water',
      detail: 'Drink 250ml water + stand up and stretch for 2 minutes. Sitting for hours compresses your spine and stiffens your hips — these short breaks add up to real injury prevention.',
    });

    events.push({
      time:       addMins(workStart, Math.round(workDuration * 0.30)),
      label:      'Mid-work snack',
      type:       'snack',
      recipeType: 'meal',
      detail:     'High-protein snack to sustain energy through the shift.',
    });

    // ── Dinner (meal slot 3, work day) ────────────────────────────────────────
    events.push({
      time:       dinnerTime,
      label:      'Dinner',
      type:       'meal',
      recipeType: 'meal',
    });

    events.push({
      time:   addMins(workStart, Math.round(workDuration * 0.65)),
      label:  'Water check',
      type:   'water',
      detail: 'Drink 250ml water + walk around for 5 minutes. You\'re in the home stretch — staying hydrated now prevents the late-shift energy crash.',
    });

    events.push({
      time:       addMins(workEnd, -60),
      label:      'Pre-sleep snack',
      type:       'snack',
      recipeId:   'cottage-cheese',
      recipeType: 'meal',
      detail:     'Light and easy to digest. Won\'t disrupt sleep or recovery.',
    });

    events.push({
      time:   workEnd,
      label:  'WORK ENDS',
      type:   'work',
      detail: 'Log off, close laptop. Gentle 5-minute neck and shoulder stretch.',
    });

    // ── Gym post-work + shake ─────────────────────────────────────────────────
    if (isGymDay && !gymEarly && gymTime) {
      pushGymEvents(events, gymTime, gymSplit);
    }
  } else {
    // ── Non-work day ─────────────────────────────────────────────────────────

    // ── Dinner (meal slot 3, non-work day) ────────────────────────────────────
    events.push({
      time:       dinnerTime,
      label:      'Dinner',
      type:       'meal',
      recipeType: 'meal',
    });

    // Active recovery on pure rest days (no gym, no work)
    if (!isGymDay) {
      events.push({
        time:     addMins(wakeTime, Math.round(awakeMin * 0.40)),
        label:    'Active recovery',
        type:     'yoga',
        duration: '30 min',
        detail:   'Pick one — even 20 minutes makes a real difference:\n• 20-min brisk walk (outside if possible)\n• Yoga flow: sun salutations ×5 → pigeon pose → child\'s pose\n• Foam roll: quads, hamstrings, glutes, upper back\nRest days aren\'t off days — active recovery reduces soreness and keeps momentum.',
      });
    }
  }

  // ── Saturday: review next week's plan ───────────────────────────────────────
  if (isSaturday) {
    events.push({
      time:   addMins(wakeTime, Math.round(awakeMin * 0.40)),
      label:  'Review next week\'s meal plan',
      type:   'plan-review',
      detail: 'Swap meals, get coaching tips, and approve your plan for next week.',
    });
  }

  // ── Sunday meal prep ────────────────────────────────────────────────────────
  // Label must match WeeklyPlanContext's Sunday-prep update logic exactly.
  if (isSunday) {
    events.push({
      time:     addMins(wakeTime, Math.round(awakeMin * 0.45)),
      label:    'Meal prep for the week',
      type:     'prep',
      duration: '1.5–2 hrs',
      detail:   'Sunday batch cook (1.5–2 hrs):', // buildOverlaySchedule replaces this
    });
  }

  // ── Magnesium ───────────────────────────────────────────────────────────────
  events.push({
    time:   addMins(sleepTime, -30),
    label:  'Magnesium supplement',
    type:   'supplement',
    detail: 'Magnesium Glycinate (300mg) + final glass of water. Magnesium reduces muscle tension, deepens sleep quality and supports recovery overnight. Glycinate is the most bioavailable form — far better absorbed than oxide and gentle on the stomach.',
  });

  // ── Wind down ───────────────────────────────────────────────────────────────
  events.push({
    time:   addMins(sleepTime, -10),
    label:  'Wind down',
    type:   'sleep',
    detail: '• Face routine\n• Blackout blinds or eye mask\n• Cool room (16–18°C is optimal)\n• Phone on silent or do not disturb\nLowering your room temperature signals to your body that it\'s time to sleep — it\'s one of the highest-impact sleep hacks.',
  });

  // ── Sleep ───────────────────────────────────────────────────────────────────
  events.push({
    time:     sleepTime,
    label:    'SLEEP',
    type:     'sleep',
    duration: '7–8 hrs',
    detail:   'Target 7–8 hours of quality sleep.',
  });

  // ── Sort chronologically relative to wake time (handles midnight crossing) ──
  const wakeRef = timeToMins(wakeTime);
  events.sort((a, b) => {
    const aN = ((timeToMins(a.time) - wakeRef) + 1440) % 1440;
    const bN = ((timeToMins(b.time) - wakeRef) + 1440) % 1440;
    return aN - bN;
  });

  return events;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Builds a Mon-first DaySchedule[7] from a UserProfile.
 *
 * Call this once per week (or when the profile changes) and use the result
 * as the base schedule for buildOverlaySchedule in WeeklyPlanContext.
 */
export function generateScheduleSkeleton(profile: UserProfile): DaySchedule[] {
  let gymSplitIdx = 0;

  return Array.from({ length: 7 }, (_, monFirstIdx): DaySchedule => {
    // Convert Mon-first index → JS day (0 = Sun … 6 = Sat)
    const jsDay      = (monFirstIdx + 1) % 7;
    const dayProfile = profile.weekSchedule[jsDay];
    const isGymDay   = profile.gymDays.includes(jsDay);
    const isWorkDay  = dayProfile?.isWorkDay ?? false;
    const isSunday   = monFirstIdx === 6;

    const wakeTime  = dayProfile?.wakeTime  ?? '7:00 AM';
    const sleepTime = dayProfile?.sleepTime ?? '11:00 PM';
    const workStart = dayProfile?.workStart ?? '9:00 AM';
    const workEnd   = dayProfile?.workEnd   ?? '5:00 PM';

    const gymSplit    = isGymDay ? GYM_SPLITS[gymSplitIdx++ % GYM_SPLITS.length] : null;
    const isRestDay   = !isGymDay && !isWorkDay;
    const isSaturday  = monFirstIdx === 5;

    const workoutType  = gymSplit?.workoutType
      ?? (isRestDay ? 'Rest & Recovery' : 'Active Recovery');
    const workoutFocus = gymSplit?.workoutFocus
      ?? (isRestDay ? 'Recovery · Recharge · Reset' : 'Keep Moving · Stay Active');

    const events = buildDayEvents(
      wakeTime, sleepTime,
      isWorkDay, workStart, workEnd,
      isGymDay, gymSplit,
      isSaturday,
      isSunday,
    );

    return {
      id:           MON_FIRST_IDS[monFirstIdx]!,
      name:         MON_FIRST_NAMES[monFirstIdx]!,
      shortName:    MON_FIRST_SHORT[monFirstIdx]!,
      date:         `Day ${monFirstIdx + 1}`,
      isGymDay,
      isRestDay,
      workoutType,
      workoutFocus,
      events,
    };
  });
}
