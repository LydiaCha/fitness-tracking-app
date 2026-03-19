import { UserProfile } from './userProfile';

export interface Supplement {
  id: string;
  name: string;
  emoji: string;
  dose: string;
  timing: string;
  timingDetail: string;
  color: string;
  category: 'recovery' | 'performance' | 'health' | 'sleep';
  benefit: string;
  scienceNote: string;
  brand?: string;
  withFood: boolean;
}

export const SUPPLEMENTS: Supplement[] = [
  {
    id: 'creatine',
    name: 'Creatine Monohydrate',
    emoji: '💥',
    dose: '5g daily',
    timing: 'Post-workout or with any meal',
    timingDetail: 'Take post-workout on gym days. Any time on rest days — consistency matters more than timing.',
    color: '#a855f7',
    category: 'performance',
    benefit: 'Increases muscle power, strength, and lean muscle retention during toning. The most-studied performance supplement in history.',
    scienceNote: 'Meta-analyses show 5–15% strength increases and enhanced body composition at 3–5g/day. Safe for long-term use.',
    withFood: false,
  },
  {
    id: 'whey',
    name: 'Whey Protein',
    emoji: '🥤',
    dose: '1 scoop (25–30g protein)',
    timing: 'Post-workout within 30 min',
    timingDetail: 'Critical post-gym window. Also use as a meal supplement when protein goals are hard to hit through food.',
    color: '#22d3ee',
    category: 'recovery',
    benefit: 'Rapidly delivers amino acids to muscles after training. Supports muscle repair, toning and recovery for your next session.',
    scienceNote: 'Whey is a complete protein with high leucine content — the key amino acid that triggers muscle protein synthesis.',
    withFood: false,
  },
  {
    id: 'casein',
    name: 'Casein Protein',
    emoji: '🌙',
    dose: '1 scoop (25g protein)',
    timing: 'Before sleep (9 AM)',
    timingDetail: 'Take in your pre-sleep shake or mixed with warm milk. Ideal before your 7.5-hour sleep window.',
    color: '#6366f1',
    category: 'recovery',
    benefit: 'Slow-digesting protein that feeds muscles over 6–8 hours during sleep. Critical for overnight muscle repair given your long sleep window.',
    scienceNote: 'Research shows pre-sleep casein increases overnight muscle protein synthesis. Especially beneficial after heavy training days.',
    withFood: false,
  },
  {
    id: 'magnesium',
    name: 'Magnesium Glycinate',
    emoji: '😴',
    dose: '300–400mg',
    timing: '30–45 min before sleep (8–8:30 AM)',
    timingDetail: 'Take every morning before your 9 AM sleep. Magnesium glycinate is the most bioavailable and gentlest form.',
    color: '#8b5cf6',
    category: 'sleep',
    benefit: 'Improves sleep quality, reduces muscle cramps and soreness. Essential for night shift workers whose circadian rhythm is disrupted.',
    scienceNote: 'Magnesium activates GABA receptors in the brain (the same receptor targeted by sleep aids), promoting deeper, more restorative sleep.',
    withFood: false,
  },
  {
    id: 'vitaminD',
    name: 'Vitamin D3',
    emoji: '☀️',
    dose: '2000 IU (50mcg)',
    timing: 'With Meal 1 (wake-up meal ~4:30–5 PM)',
    timingDetail: 'Take with your first meal of the day. Vitamin D is fat-soluble — always take with food containing fat.',
    color: '#f59e0b',
    category: 'health',
    benefit: 'Night shift workers are at high risk of deficiency due to minimal sun exposure. Critical for bone density, immune function, mood regulation, and muscle strength.',
    scienceNote: 'Studies show night shift workers have 35–60% lower Vitamin D levels than day workers. Deficiency is linked to fatigue, low mood, and weakened immunity.',
    withFood: true,
  },
  {
    id: 'omega3',
    name: 'Omega-3 Fish Oil',
    emoji: '🐠',
    dose: '1–2g EPA/DHA combined',
    timing: 'With Meal 1 (with food)',
    timingDetail: 'Take with your wake-up meal to reduce the fishy aftertaste. Store in the fridge.',
    color: '#06b6d4',
    category: 'health',
    benefit: 'Reduces post-workout muscle soreness and inflammation, supports heart health, brain function, and joint mobility — important for frequent gym-goers.',
    scienceNote: 'EPA/DHA supplementation reduces inflammatory markers (CRP, IL-6) by up to 30%. Particularly important for women during intense training cycles.',
    withFood: true,
  },
  {
    id: 'vitaminC',
    name: 'Vitamin C',
    emoji: '🍊',
    dose: '500–1000mg',
    timing: 'With any meal',
    timingDetail: 'Split into two 500mg doses if taking 1000mg — morning and evening. Take with food to avoid stomach upset.',
    color: '#f97316',
    category: 'health',
    benefit: 'Supports immune system (night shift disrupts immunity), collagen synthesis for joint health, and helps with iron absorption from plant-based foods.',
    scienceNote: 'Shift workers show higher rates of immune suppression. Vitamin C has been shown to reduce the duration and severity of common illnesses by 14%.',
    withFood: true,
  },
  {
    id: 'electrolytes',
    name: 'Electrolytes',
    emoji: '⚡',
    dose: '1 sachet / tablet',
    timing: 'During and after gym sessions',
    timingDetail: 'Mix into your gym water bottle. Especially important on humid days or after intense sessions.',
    color: '#10b981',
    category: 'performance',
    benefit: 'Replaces sodium, potassium, and magnesium lost through sweat. Prevents cramping, maintains performance, and speeds rehydration.',
    scienceNote: 'Losing as little as 2% body weight in sweat can reduce strength output by 10–15%. Electrolytes help maintain hydration status during training.',
    withFood: false,
  },
];

/**
 * Returns the subset of supplements relevant to this user's profile.
 *
 * Rules:
 *  - creatine:    gym days required; not shown for fat-loss goal (it's a performance, not weight-loss tool)
 *  - whey/casein: gym days required; hidden for vegan or dairy-free users
 *  - omega3:      hidden for vegan users (fish oil); plant-based omega-3 is out of scope for now
 *  - electrolytes: gym days required; not useful for sedentary users
 *  - vitaminD / vitaminC / magnesium: universally recommended
 */
export function getRelevantSupplements(profile: UserProfile): Supplement[] {
  const { fitnessGoal, activityLevel, gymDays, dietaryRestrictions } = profile;
  const isVegan      = dietaryRestrictions.includes('vegan');
  const isDairyFree  = dietaryRestrictions.includes('dairy-free');
  const hasGymDays   = gymDays.length > 0;
  const isSedentary  = activityLevel === 'sedentary';

  return SUPPLEMENTS.filter(s => {
    switch (s.id) {
      case 'creatine':
        return hasGymDays && fitnessGoal !== 'lose';
      case 'whey':
      case 'casein':
        return hasGymDays && !isVegan && !isDairyFree;
      case 'omega3':
        return !isVegan;
      case 'electrolytes':
        return hasGymDays && !isSedentary;
      default:
        return true; // vitaminD, vitaminC, magnesium — always relevant
    }
  });
}

/**
 * Returns the schedule builder detail string for the morning supplement event,
 * personalised by dietary restrictions.
 */
export function getMorningSupplementDetail(profile: UserProfile): string {
  const isVegan = profile.dietaryRestrictions.includes('vegan');
  const omega3  = isVegan
    ? 'Algae Omega-3 (250mg DHA/EPA — plant-based alternative to fish oil)'
    : 'Omega-3 Fish Oil (1g EPA/DHA — reduces inflammation and accelerates muscle repair)';
  return `Vitamin D3 (2000 IU) + ${omega3}. D3 supports immunity, mood and testosterone — most people are deficient without realising. Both are fat-soluble, so take with food.`;
}

/**
 * Returns the schedule builder detail string for the pre-sleep supplement event,
 * personalised by gym days and dietary restrictions.
 */
export function getEveningSupplementDetail(profile: UserProfile): string {
  const isVegan     = profile.dietaryRestrictions.includes('vegan');
  const isDairyFree = profile.dietaryRestrictions.includes('dairy-free');
  const hasGymDays  = profile.gymDays.length > 0;

  const lines: string[] = [
    'Magnesium Glycinate (300mg) + final glass of water. Magnesium reduces muscle tension, deepens sleep quality and supports overnight recovery. Glycinate is the most bioavailable form — gentle on the stomach.',
  ];

  if (hasGymDays && !isVegan && !isDairyFree) {
    lines.push('Casein protein (25g) — slow-digesting protein that feeds your muscles over 6–8 hours while you sleep. Take with warm milk or water.');
  }

  return lines.join('\n\n');
}

