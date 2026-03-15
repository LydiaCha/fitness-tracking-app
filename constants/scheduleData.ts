export type EventType =
  | 'wake'
  | 'sleep'
  | 'work'
  | 'class'
  | 'gym'
  | 'meal'
  | 'snack'
  | 'shake'
  | 'supplement'
  | 'water'
  | 'rest'
  | 'yoga'
  | 'prep'
  | 'free';

export interface ScheduleEvent {
  time: string;
  label: string;
  detail?: string;
  type: EventType;
  duration?: string;
  recipeId?: string;
  recipeType?: 'shake' | 'meal';
}

export interface DaySchedule {
  id: string;
  name: string;
  shortName: string;
  date: string;
  workoutType?: string;
  workoutFocus?: string;
  isRestDay?: boolean;
  isGymDay?: boolean;
  isClassDay?: boolean;
  classTime?: string;
  events: ScheduleEvent[];
}

export const WEEK_SCHEDULE: DaySchedule[] = [
  {
    id: 'monday',
    name: 'Monday',
    shortName: 'MON',
    date: 'Day 1',
    workoutType: 'Upper Push',
    workoutFocus: 'Chest · Shoulders · Triceps',
    isGymDay: true,
    isClassDay: true,
    classTime: '5:00 PM – 8:00 PM',
    events: [
      { time: '4:00 PM', label: 'Wake up', detail: 'Drink 500ml water immediately. 2 min light stretch in bed.', type: 'wake' },
      { time: '4:10 PM', label: 'Quick routine + grab-and-go', detail: 'Get dressed, brush teeth, take Vitamin D3 + Omega-3.\n1 protein bar (20g+ protein) + 1 banana + small handful almonds (~380 kcal, 25g protein)', type: 'supplement' },
      { time: '4:30 PM', label: 'Walk to class', detail: '30-min walk to uni. Eat your grab-and-go on the way. Sip water.', type: 'rest', duration: '30 min' },
      { time: '5:00 PM', label: 'Uni class begins', detail: 'Class runs 5:00 PM – 8:00 PM.', type: 'class', duration: '3 hrs' },
      { time: '8:00 PM', label: 'Class ends → head to gym', detail: 'Travel to gym. Pre-gym snack if needed: 4 rice cakes or a banana.', type: 'class' },
      { time: '8:15 PM', label: 'GYM – Upper Push', detail: 'Warm-up: 5 min treadmill + arm circles\n• Barbell bench press: 4×8\n• Dumbbell shoulder press: 3×10\n• Incline dumbbell press: 3×12\n• Lateral raises: 3×15\n• Tricep rope pushdowns: 3×12\n• Overhead tricep extension: 3×12\nCool-down: 5 min stretching', type: 'gym', duration: '75 min' },
      { time: '9:30 PM', label: 'Post-workout shake', detail: 'Recovery Shake: 1 scoop whey protein + 1 cup milk + 1 banana + 1 tbsp peanut butter + ice. Take creatine (5g).', type: 'shake', recipeId: 'recovery', recipeType: 'shake' },
      { time: '9:45 PM', label: 'Travel home + shower', detail: 'Cool down, shower, change. Face routine.', type: 'rest' },
      { time: '10:30 PM', label: 'Meal 2 – Post-workout dinner', detail: '150g chicken breast + 1 cup brown rice + 1 cup roasted broccoli + olive oil dressing. ~550 kcal, 45g protein.', type: 'meal', recipeId: 'chicken-rice', recipeType: 'meal' },
      { time: '11:15 PM', label: 'Wind down before work', detail: 'Prep work setup, light snack if hungry (Greek yogurt + berries).', type: 'prep' },
      { time: '11:55 PM', label: 'Water + work prep', detail: 'Fill water bottle (1L). Prepare work snacks.', type: 'water' },
      { time: '12:00 AM', label: 'WORK BEGINS', detail: 'Work starts. Keep water on desk – aim for 250ml per hour.', type: 'work', duration: '8 hrs' },
      { time: '1:00 AM', label: 'Water check', detail: 'Drink 250ml water. Stand up, stretch 2 minutes.', type: 'water' },
      { time: '2:00 AM', label: 'Mid-work snack', detail: 'Cottage cheese (100g) + apple slices OR Greek yogurt + almonds. ~200 kcal.', type: 'snack', recipeId: 'cottage-cheese', recipeType: 'meal' },
      { time: '3:30 AM', label: 'Water check', detail: 'Drink 250ml water. Walk around for 5 minutes.', type: 'water' },
      { time: '4:00 AM', label: 'Meal 3 – Work meal', detail: '2 scrambled eggs + 2 slices wholegrain toast + ½ avocado + cherry tomatoes. ~420 kcal, 25g protein.', type: 'meal', recipeId: 'scrambled-salmon', recipeType: 'meal' },
      { time: '6:00 AM', label: 'Pre-sleep wind-down snack', detail: '1 tbsp almond butter + 1 rice cake OR small handful of walnuts. Light, easy to digest.', type: 'snack' },
      { time: '7:30 AM', label: 'Final water + supplement', detail: 'Drink 250ml water. Take Magnesium Glycinate (300mg).', type: 'supplement' },
      { time: '8:00 AM', label: 'WORK ENDS', detail: 'Log off, close laptop. Gentle 5-minute shoulder/neck stretch.', type: 'work' },
      { time: '8:30 AM', label: 'Prep for sleep', detail: 'Face routine. Blackout blinds, phone on silent. Chamomile tea optional.', type: 'sleep' },
      { time: '9:00 AM', label: 'SLEEP', detail: 'Target: 7.5 hours. Sleep until 4:30 PM.', type: 'sleep', duration: '7.5 hrs' },
    ],
  },
  {
    id: 'tuesday',
    name: 'Tuesday',
    shortName: 'TUE',
    date: 'Day 2',
    workoutType: 'Lower Body',
    workoutFocus: 'Glutes · Quads · Hamstrings',
    isGymDay: true,
    isClassDay: true,
    classTime: '5:30 PM – 7:20 PM',
    events: [
      { time: '4:30 PM', label: 'Wake up', detail: 'Drink 500ml water. 2-min light stretch / foam roll legs.', type: 'wake' },
      { time: '4:40 PM', label: 'Quick routine + grab-and-go', detail: 'Get dressed, brush teeth, take Vitamin D3 + Omega-3.\n1 protein bar (20g+ protein) + 1 banana + small handful almonds (~380 kcal, 25g protein)', type: 'supplement' },
      { time: '5:00 PM', label: 'Walk to class', detail: '30-min walk to uni. Eat your grab-and-go on the way. Sip water.', type: 'rest', duration: '30 min' },
      { time: '5:30 PM', label: 'Uni class begins', detail: 'Class runs 5:30 PM – 7:20 PM.', type: 'class', duration: '1 hr 50 min' },
      { time: '7:20 PM', label: 'Class ends → gym', detail: 'Head straight to gym. Quick hydrate (250ml water).', type: 'class' },
      { time: '7:35 PM', label: 'GYM – Lower Body', detail: 'Warm-up: 5 min bike or leg swings\n• Barbell squats: 4×8\n• Romanian deadlifts: 3×10\n• Hip thrusts: 4×12\n• Leg press: 3×15\n• Walking lunges: 3×12 each leg\n• Glute kickbacks (cable): 3×15\nCool-down: 10 min stretch, foam roll', type: 'gym', duration: '85 min' },
      { time: '9:00 PM', label: 'Post-workout shake', detail: 'Green Goddess Shake: 1 scoop vanilla protein + 1 cup frozen mango + 1 cup coconut water + handful spinach + ginger. Take creatine (5g).', type: 'shake', recipeId: 'green', recipeType: 'shake' },
      { time: '9:30 PM', label: 'Home + shower', detail: 'Shower, change, relax briefly. Face routine.', type: 'rest' },
      { time: '10:00 PM', label: 'Meal 2 – Post-workout dinner', detail: '150g salmon fillet + ½ cup quinoa + 1 cup steamed broccoli + lemon. ~520 kcal, 42g protein.', type: 'meal', recipeId: 'salmon-quinoa', recipeType: 'meal' },
      { time: '11:00 PM', label: 'Prep for work', detail: 'Pack night snacks, fill water bottle, light stretching.', type: 'prep' },
      { time: '11:55 PM', label: 'Water + work prep', detail: 'Large glass of water before work. Creatine if not taken post-workout.', type: 'water' },
      { time: '12:00 AM', label: 'WORK BEGINS', detail: 'Work starts. Hydrate consistently.', type: 'work', duration: '8 hrs' },
      { time: '1:00 AM', label: 'Water check', detail: '250ml water. Neck and shoulder rolls.', type: 'water' },
      { time: '2:00 AM', label: 'Mid-work snack', detail: '1 banana + 20g mixed nuts OR protein bar (20g+ protein). ~250 kcal.', type: 'snack' },
      { time: '3:30 AM', label: 'Water check', detail: '250ml water. Stand and walk.', type: 'water' },
      { time: '4:00 AM', label: 'Meal 3 – Work meal', detail: 'Tuna (150g) + wholegrain crackers + sliced cucumber + hummus. ~380 kcal, 35g protein.', type: 'meal', recipeId: 'tuna-crackers', recipeType: 'meal' },
      { time: '6:00 AM', label: 'Pre-sleep snack', detail: 'Casein bedtime shake OR cottage cheese (100g) + drizzle honey. Slow-digesting, aids overnight muscle repair.', type: 'shake', recipeId: 'bedtime', recipeType: 'shake' },
      { time: '7:30 AM', label: 'Magnesium supplement', detail: 'Magnesium Glycinate 300mg + last water of the night.', type: 'supplement' },
      { time: '8:00 AM', label: 'WORK ENDS', detail: 'Close work. 5-min hip flexor stretch (from all that sitting + lower body workout).', type: 'work' },
      { time: '8:30 AM', label: 'Wind-down', detail: 'Face routine. Blackout blinds, cool room, phone silent.', type: 'sleep' },
      { time: '9:00 AM', label: 'SLEEP', detail: 'Target: 7.5 hours. Sleep until 4:30 PM.', type: 'sleep', duration: '7.5 hrs' },
    ],
  },
  {
    id: 'wednesday',
    name: 'Wednesday',
    shortName: 'WED',
    date: 'Day 3',
    workoutType: 'Upper Pull',
    workoutFocus: 'Back · Biceps · Rear Delts',
    isGymDay: true,
    isClassDay: true,
    classTime: '5:30 PM – 7:20 PM',
    events: [
      { time: '4:30 PM', label: 'Wake up', detail: '500ml water. Gentle back stretch — cat-cow, child\'s pose, thoracic rotation.', type: 'wake' },
      { time: '4:40 PM', label: 'Quick routine + grab-and-go', detail: 'Get dressed, brush teeth, take Vitamin D3 + Omega-3.\n1 protein bar (20g+ protein) + 1 banana + small handful almonds (~380 kcal, 25g protein)', type: 'supplement' },
      { time: '5:00 PM', label: 'Walk to class', detail: '30-min walk to uni. Eat your grab-and-go on the way. Sip water.', type: 'rest', duration: '30 min' },
      { time: '5:30 PM', label: 'Uni class begins', detail: 'Class runs 5:30 PM – 7:20 PM.', type: 'class', duration: '1 hr 50 min' },
      { time: '7:20 PM', label: 'Class ends → gym', detail: 'Head to gym. Sip water on the way.', type: 'class' },
      { time: '7:35 PM', label: 'GYM – Upper Pull', detail: 'Warm-up: 5 min row machine + shoulder circles\n• Lat pulldown: 4×10\n• Seated cable row: 3×12\n• Single-arm dumbbell row: 3×10 each\n• Face pulls (cable): 3×15\n• Rear delt fly (dumbbells): 3×12\n• Bicep curls (barbell): 3×10\n• Hammer curls: 3×12\nCool-down: 10 min lat + bicep stretch', type: 'gym', duration: '85 min' },
      { time: '9:00 PM', label: 'Post-workout shake', detail: 'Recovery Shake: 1 scoop chocolate whey + 1 cup milk + 1 banana + 1 tbsp peanut butter. Take creatine (5g).', type: 'shake', recipeId: 'recovery', recipeType: 'shake' },
      { time: '9:30 PM', label: 'Home + shower', detail: 'Rest and recover. Face routine.', type: 'rest' },
      { time: '10:00 PM', label: 'Meal 2 – Dinner', detail: '150g turkey mince stir-fry + 1 cup brown rice + mixed vegetables (capsicum, snap peas, bok choy) + soy sauce + sesame oil. ~500 kcal, 40g protein.', type: 'meal', recipeId: 'turkey-stir', recipeType: 'meal' },
      { time: '11:00 PM', label: 'Prep for work', detail: 'Prep snacks, fill water bottle.', type: 'prep' },
      { time: '12:00 AM', label: 'WORK BEGINS', detail: 'Work starts.', type: 'work', duration: '8 hrs' },
      { time: '1:00 AM', label: 'Water check', detail: '250ml water. Wrist + hand stretches (typing fatigue).', type: 'water' },
      { time: '2:00 AM', label: 'Mid-work snack', detail: 'String cheese × 2 + 10 wholegrain crackers + handful grapes. ~220 kcal.', type: 'snack' },
      { time: '3:30 AM', label: 'Water check', detail: '250ml water. Eye rest (20-20-20 rule).', type: 'water' },
      { time: '4:00 AM', label: 'Meal 3 – Work meal', detail: 'Leftover stir-fry OR overnight oats (½ cup oats + milk + 1 scoop protein powder + berries, prepped earlier). ~380 kcal.', type: 'meal', recipeId: 'overnight-oats', recipeType: 'meal' },
      { time: '6:00 AM', label: 'Pre-sleep snack', detail: 'Casein shake OR 100g cottage cheese with cinnamon.', type: 'shake', recipeId: 'bedtime', recipeType: 'shake' },
      { time: '7:30 AM', label: 'Magnesium supplement', detail: 'Magnesium Glycinate 300mg + water.', type: 'supplement' },
      { time: '8:00 AM', label: 'WORK ENDS', detail: 'Log off. 5-min stretch.', type: 'work' },
      { time: '8:30 AM', label: 'Wind-down', detail: 'Face routine. Blackout, cool room.', type: 'sleep' },
      { time: '9:00 AM', label: 'SLEEP', detail: 'Sleep until 4:30 PM.', type: 'sleep', duration: '7.5 hrs' },
    ],
  },
  {
    id: 'thursday',
    name: 'Thursday',
    shortName: 'THU',
    date: 'Day 4',
    workoutType: 'HIIT + Core',
    workoutFocus: 'Cardio · Abs · Obliques',
    isGymDay: true,
    isClassDay: false,
    events: [
      { time: '4:30 PM', label: 'Wake up', detail: '500ml water. Foam roll legs + lower back (still sore from Monday/Tuesday/Wednesday).', type: 'wake' },
      { time: '5:00 PM', label: 'Meal 1 + supplements', detail: 'Smoothie bowl: 1 scoop protein powder blended with frozen banana + milk, topped with granola + sliced strawberries. ~450 kcal.\nTake Vitamin D3 + Omega-3.', type: 'meal' },
      { time: '5:45 PM', label: 'Travel to gym', detail: 'Prep gym bag. Sip water or have a small pre-workout coffee.', type: 'prep' },
      { time: '6:00 PM', label: 'GYM – HIIT + Core', detail: 'Warm-up: 5 min jog\nHIIT Block (20 min): 30s on / 15s off\n• Burpees, jump squats, mountain climbers, high knees, box jumps\nCore Block (25 min):\n• Plank: 4×45s\n• Cable crunches: 3×15\n• Hanging knee raises: 3×12\n• Russian twists: 3×20\n• Side plank: 3×30s each\nCool-down: 10 min stretching + breathing', type: 'gym', duration: '60 min' },
      { time: '7:15 PM', label: 'Post-workout shake', detail: 'Night Shift Energy Shake: 1 scoop whey + 1 cup oat milk + ½ cup oats + 1 tbsp almond butter + 1 tsp cacao. Take creatine (5g).', type: 'shake', recipeId: 'nightshift', recipeType: 'shake' },
      { time: '7:45 PM', label: 'Home + shower', detail: 'Recover and relax. Face routine.', type: 'rest' },
      { time: '8:30 PM', label: 'Meal 2 – Dinner', detail: 'Lean beef mince (150g) taco bowls: brown rice + black beans + capsicum + sour cream + salsa. ~580 kcal, 45g protein.', type: 'meal', recipeId: 'taco-bowl', recipeType: 'meal' },
      { time: '10:00 PM', label: 'Free time / study', detail: 'Relax, study, or personal time. Limit screens 1 hour before "pre-sleep" wind down.', type: 'free' },
      { time: '11:00 PM', label: 'Light snack', detail: 'Apple + 2 tbsp almond butter OR rice cakes with cottage cheese.', type: 'snack', recipeId: 'cottage-cheese', recipeType: 'meal' },
      { time: '11:55 PM', label: 'Water + work prep', detail: 'Fill water bottle. Night snacks ready.', type: 'water' },
      { time: '12:00 AM', label: 'WORK BEGINS', detail: 'Work starts.', type: 'work', duration: '8 hrs' },
      { time: '2:00 AM', label: 'Mid-work snack', detail: 'Mixed nuts (30g) + a piece of dark chocolate (20g). ~240 kcal.', type: 'snack' },
      { time: '4:00 AM', label: 'Meal 3 – Work meal', detail: 'Sweet potato (1 medium, roasted) + 2 boiled eggs + side salad. ~400 kcal.', type: 'meal' },
      { time: '6:00 AM', label: 'Pre-sleep snack', detail: 'Casein shake or cottage cheese.', type: 'shake', recipeId: 'cottage-cheese', recipeType: 'meal' },
      { time: '7:30 AM', label: 'Magnesium supplement', detail: 'Magnesium Glycinate 300mg.', type: 'supplement' },
      { time: '8:00 AM', label: 'WORK ENDS', detail: 'Log off. Light stretch.', type: 'work' },
      { time: '8:30 AM', label: 'Wind-down', detail: 'Face routine. Blackout blinds, cool room.', type: 'sleep' },
      { time: '9:00 AM', label: 'SLEEP', detail: 'Sleep until 4:30 PM.', type: 'sleep', duration: '7.5 hrs' },
    ],
  },
  {
    id: 'friday',
    name: 'Friday',
    shortName: 'FRI',
    date: 'Day 5',
    workoutType: 'Active Recovery',
    workoutFocus: 'Yoga · Mobility · Stretch',
    isGymDay: false,
    isRestDay: true,
    isClassDay: false,
    events: [
      { time: '4:30 PM', label: 'Wake up', detail: '500ml water. Slow morning — this is your rest day. No rush.', type: 'wake' },
      { time: '5:00 PM', label: 'Morning routine + supplements', detail: 'Take Vitamin D3 + Omega-3. Light, nourishing Meal 1.', type: 'supplement' },
      { time: '5:15 PM', label: 'Meal 1 – Relaxed breakfast', detail: 'Avocado toast × 2 + 2 poached eggs + grilled tomatoes + feta. ~480 kcal, 28g protein.', type: 'meal', recipeId: 'egg-avo-toast', recipeType: 'meal' },
      { time: '6:00 PM', label: 'Yoga & Mobility (30 min)', detail: 'At-home yoga flow:\n• Sun salutations (5 rounds)\n• Warrior 1 & 2\n• Pigeon pose (hip flexors!)\n• Seated spinal twist\n• Child\'s pose\n• Legs up the wall (5 min)\nFocus on tight areas: hips, hamstrings, chest from upper push day.', type: 'yoga', duration: '30 min' },
      { time: '6:30 PM', label: 'Free time', detail: 'Enjoy your evening. Social time, hobbies, TV, study catch-up.', type: 'free' },
      { time: '7:30 PM', label: 'Meal 2 – Dinner', detail: 'Baked chicken thighs + roasted sweet potato wedges + steamed green beans + garlic butter. ~550 kcal, 40g protein.', type: 'meal', recipeId: 'chicken-rice', recipeType: 'meal' },
      { time: '9:00 PM', label: 'Free time', detail: 'Relaxed evening. Limit blue light 30 min before work starts.', type: 'free' },
      { time: '11:00 PM', label: 'Light snack + creatine', detail: 'Banana + peanut butter OR protein bar. Creatine (5g) — take daily, even on rest days.', type: 'snack' },
      { time: '11:55 PM', label: 'Work prep', detail: 'Water bottle, snacks ready.', type: 'water' },
      { time: '12:00 AM', label: 'WORK BEGINS', detail: 'Work starts.', type: 'work', duration: '8 hrs' },
      { time: '2:00 AM', label: 'Mid-work snack', detail: 'Cottage cheese + berries + granola. ~200 kcal.', type: 'snack', recipeId: 'cottage-cheese', recipeType: 'meal' },
      { time: '4:00 AM', label: 'Meal 3 – Work meal', detail: 'Greek yogurt (200g) + granola (30g) + mixed berries + drizzle maple syrup + chopped nuts. ~400 kcal.', type: 'meal', recipeId: 'greek-yogurt', recipeType: 'meal' },
      { time: '6:00 AM', label: 'Pre-sleep snack', detail: 'Warm casein milk: 1 scoop casein + warm milk + honey + cinnamon. Soothing and muscle-repairing.', type: 'shake', recipeId: 'warmcasein', recipeType: 'shake' },
      { time: '7:30 AM', label: 'Magnesium supplement', detail: 'Magnesium Glycinate 300mg.', type: 'supplement' },
      { time: '8:00 AM', label: 'WORK ENDS', detail: 'Log off. Grateful it\'s the weekend!', type: 'work' },
      { time: '8:30 AM', label: 'Wind-down', detail: 'Face routine. Blackout blinds, cool room.', type: 'sleep' },
      { time: '9:00 AM', label: 'SLEEP', detail: 'Sleep until 4:30–5:00 PM.', type: 'sleep', duration: '7.5 hrs' },
    ],
  },
  {
    id: 'saturday',
    name: 'Saturday',
    shortName: 'SAT',
    date: 'Day 6',
    workoutType: 'Full Body',
    workoutFocus: 'Compound Lifts · Strength',
    isGymDay: true,
    isClassDay: false,
    events: [
      { time: '5:00 PM', label: 'Wake up (weekend lie-in!)', detail: 'Drink 500ml water. Slightly later wake — you\'ve earned it.', type: 'wake' },
      { time: '5:30 PM', label: 'Morning routine + supplements', detail: 'Get ready. Vitamin D3 + Omega-3.', type: 'supplement' },
      { time: '5:45 PM', label: 'Meal 1 – Pre-workout fuel', detail: 'Chicken + rice bowl: 120g grilled chicken + ½ cup jasmine rice + ½ cup edamame + sesame + soy drizzle. ~480 kcal, 40g protein.', type: 'meal', recipeId: 'chicken-rice', recipeType: 'meal' },
      { time: '6:30 PM', label: 'Travel to gym', detail: 'Pre-workout coffee if needed (not within 5 hrs of sleep). Sip water.', type: 'prep' },
      { time: '6:45 PM', label: 'GYM – Full Body (Compound)', detail: 'Warm-up: 8 min full-body dynamic warm-up\n• Deadlifts: 4×6 (heavy)\n• Barbell back squat: 3×8\n• Bench press: 3×8\n• Dumbbell lunges: 3×12\n• Pull-ups or lat pulldown: 3×10\n• Shoulder press: 3×10\n• Farmer\'s carries: 3×30m\nCool-down: 10 min full-body stretch', type: 'gym', duration: '90 min' },
      { time: '8:15 PM', label: 'Post-workout shake', detail: 'Recovery Shake: 1 scoop whey + 1 cup milk + 1 banana + 1 tbsp peanut butter. Creatine (5g).', type: 'shake', recipeId: 'recovery', recipeType: 'shake' },
      { time: '8:45 PM', label: 'Home + shower', detail: 'Rest and recover. Great workout! Face routine.', type: 'rest' },
      { time: '9:30 PM', label: 'Meal 2 – Substantial dinner', detail: 'Steak (150g sirloin) + roasted baby potatoes + asparagus + mushrooms + peppercorn sauce. ~620 kcal, 48g protein. Treat yourself!', type: 'meal', recipeId: 'steak-potatoes', recipeType: 'meal' },
      { time: '11:00 PM', label: 'Relax / free time', detail: 'Weekend evening. Watch something, socialise, or study.', type: 'free' },
      { time: '11:30 PM', label: 'Light snack + creatine', detail: 'Grapes + string cheese OR small bowl of cereal + milk.', type: 'snack' },
      { time: '12:00 AM', label: 'WORK BEGINS', detail: 'Work starts — even on weekends. Stay hydrated.', type: 'work', duration: '8 hrs' },
      { time: '2:00 AM', label: 'Mid-work snack', detail: 'Protein bar OR mixed nuts + dark chocolate. ~220 kcal.', type: 'snack' },
      { time: '4:00 AM', label: 'Meal 3 – Work meal', detail: 'Wholegrain wrap: tuna + cream cheese + cucumber + spinach + lemon. ~380 kcal.', type: 'meal', recipeId: 'tuna-wrap', recipeType: 'meal' },
      { time: '6:00 AM', label: 'Pre-sleep snack', detail: 'Casein shake or cottage cheese.', type: 'shake', recipeId: 'cottage-cheese', recipeType: 'meal' },
      { time: '7:30 AM', label: 'Magnesium supplement', detail: 'Magnesium Glycinate 300mg.', type: 'supplement' },
      { time: '8:00 AM', label: 'WORK ENDS', detail: 'Log off. Great week!', type: 'work' },
      { time: '8:30 AM', label: 'Wind-down', detail: 'Face routine. Blackout blinds, cool room.', type: 'sleep' },
      { time: '9:00 AM', label: 'SLEEP', detail: 'Sleep until 4:30–5:00 PM.', type: 'sleep', duration: '7.5 hrs' },
    ],
  },
  {
    id: 'sunday',
    name: 'Sunday',
    shortName: 'SUN',
    date: 'Day 7',
    workoutType: 'Rest & Prep',
    workoutFocus: 'Recovery · Batch Cook · Plan',
    isGymDay: false,
    isRestDay: true,
    isClassDay: false,
    events: [
      { time: '5:00 PM', label: 'Wake up', detail: '500ml water. Gentle Sunday wake-up. Roll shoulders, neck circles.', type: 'wake' },
      { time: '5:30 PM', label: 'Supplements + Meal 1', detail: 'Vitamin D3, Omega-3.\nFull Sunday brekkie: 3 eggs scrambled + smoked salmon + 2 slices rye toast + avocado + spinach. ~550 kcal, 42g protein.', type: 'meal', recipeId: 'scrambled-salmon', recipeType: 'meal' },
      { time: '6:30 PM', label: '20-min gentle walk', detail: 'Active recovery walk (outside preferred). Boosts circulation, aids muscle repair, supports vitamin D if sun is out.', type: 'rest' },
      { time: '7:00 PM', label: 'Meal prep for the week', detail: 'Sunday batch cook (1.5–2 hrs):\n• Cook 4–5 chicken breasts\n• Cook a large pot of brown rice\n• Roast a tray of vegetables\n• Boil 8 eggs\n• Pre-portion snacks (nuts, crackers, cottage cheese)\n• Prep overnight oats for 2-3 days\nThis sets you up for the whole week!', type: 'prep', duration: '1.5–2 hrs' },
      { time: '9:00 PM', label: 'Meal 2 – Relaxed dinner', detail: 'Pasta (100g dry) with homemade tomato sauce + lean mince + zucchini + parmesan. ~580 kcal, 38g protein.', type: 'meal', recipeId: 'sunday-pasta', recipeType: 'meal' },
      { time: '10:30 PM', label: 'Plan the week ahead', detail: 'Review this week\'s schedule. Check class times, note gym days, plan meals. Set workout clothes out for Monday.', type: 'prep' },
      { time: '11:30 PM', label: 'Creatine + light snack', detail: 'Orange + 100g cottage cheese. Creatine (5g).', type: 'snack', recipeId: 'cottage-cheese', recipeType: 'meal' },
      { time: '12:00 AM', label: 'WORK BEGINS', detail: 'Work starts. New week, new goals.', type: 'work', duration: '8 hrs' },
      { time: '2:00 AM', label: 'Mid-work snack', detail: 'Overnight oats prepped earlier OR Greek yogurt + granola. ~300 kcal.', type: 'snack', recipeId: 'overnight-oats', recipeType: 'meal' },
      { time: '4:00 AM', label: 'Meal 3 – Work meal', detail: 'Batch-cooked chicken + roasted veg (from Sunday prep!) + rice. ~420 kcal, 40g protein.', type: 'meal', recipeId: 'chicken-rice', recipeType: 'meal' },
      { time: '6:00 AM', label: 'Pre-sleep snack', detail: 'Casein shake or casein-rich cottage cheese.', type: 'shake', recipeId: 'cottage-cheese', recipeType: 'meal' },
      { time: '7:30 AM', label: 'Magnesium supplement', detail: 'Magnesium Glycinate 300mg.', type: 'supplement' },
      { time: '8:00 AM', label: 'WORK ENDS', detail: 'New week begins soon. Great work this week, Lydia!', type: 'work' },
      { time: '8:30 AM', label: 'Wind-down', detail: 'Face routine. Blackout blinds, cool room.', type: 'sleep' },
      { time: '9:00 AM', label: 'SLEEP', detail: 'Sleep. Ready to crush another week.', type: 'sleep', duration: '7.5 hrs' },
    ],
  },
];
