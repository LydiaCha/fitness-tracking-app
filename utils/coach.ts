/**
 * Coach — turns passive data into proactive, personalised coaching insights.
 *
 * Design philosophy:
 *   • Direct and warm, like a PT who knows your data.
 *   • Never alarmist. Always actionable.
 *   • Maximum 3 insights at a time to avoid overload.
 */

import type { TrendResult, WeightEntry } from './weightTrend';
import type { DaySteps } from '@/hooks/useSteps';

export interface CoachInsight {
  id: string;
  icon: string;
  title: string;
  body: string;
  /** Key into AppThemeType for accent colour */
  colorKey: 'primary' | 'success' | 'warning' | 'gym' | 'water' | 'textMuted';
}

export function getCoachInsights(
  trend: TrendResult,
  weights: WeightEntry[],
  workoutStreak: number,
  waterStreak: number,
  weeklySteps: DaySteps[],
  stepGoal: number,
  fitnessGoal: string,
  gymDays: number,
): CoachInsight[] {
  const insights: CoachInsight[] = [];

  // ── 1. Weight insight ────────────────────────────────────────────────────────
  if (trend.checkInCount >= 2) {
    const sorted = [...weights].sort((a, b) => a.date.localeCompare(b.date));
    const recent = sorted.slice(-4);

    // Plateau: last 3+ entries within ±0.5 kg of each other
    const isPlateaued =
      recent.length >= 3 &&
      Math.abs(recent[recent.length - 1].kg - recent[0].kg) < 0.5;

    if (isPlateaued && fitnessGoal === 'lose') {
      insights.push({
        id: 'weight-plateau',
        icon: '📊',
        title: 'Plateau detected',
        body: `Your weight has held within 0.5 kg across your last ${recent.length} check-ins. This is a normal adaptation. Try adding 1,000 daily steps or trimming 100–150 kcal from snacks to break through.`,
        colorKey: 'warning',
      });
    } else if (trend.direction === 'down') {
      const totalKg = Math.abs(trend.totalChange ?? 0);
      const n = trend.checkInCount;
      insights.push({
        id: 'weight-progress',
        icon: '📉',
        title: `Down ${totalKg} kg overall`,
        body: `Across ${n} check-in${n !== 1 ? 's' : ''}, your EMA trend is clearly downward. This is real, sustainable progress — not water-weight noise. Keep the weekly rhythm.`,
        colorKey: 'success',
      });
    } else if (trend.direction === 'up' && trend.confidence === 'high') {
      if (fitnessGoal === 'gain') {
        insights.push({
          id: 'weight-gain-progress',
          icon: '📈',
          title: 'Gaining as planned',
          body: `Your weight trend is moving up — consistent with a muscle-gain goal. Make sure you're pairing this with progressive overload in the gym for quality mass.`,
          colorKey: 'success',
        });
      } else {
        const delta = Math.abs(trend.weeklyChange ?? trend.totalChange ?? 0);
        insights.push({
          id: 'weight-up',
          icon: '📈',
          title: 'Weight trending up',
          body: `EMA has risen ~${delta} kg recently. Worth reviewing your nutrition — particularly late-night snacks and portion sizes. Small, consistent adjustments compound fast.`,
          colorKey: 'warning',
        });
      }
    }
  }

  // ── 2. Gym streak ────────────────────────────────────────────────────────────
  if (workoutStreak >= 7) {
    const goalBody: Record<string, string> = {
      gain:     "Elite consistency. At this length the muscle memory is real — progressive overload now compounds faster. Protect the chain.",
      lose:     "Elite consistency. Every session preserves lean muscle while you're in a deficit. This streak is doing serious work.",
      tone:     "Elite consistency. Your physique is being shaped session by session. Protect the chain.",
      maintain: "Elite consistency. At this length, training is no longer a task — it's part of your identity. Protect the chain.",
    };
    insights.push({
      id: 'gym-streak-elite',
      icon: '🔥',
      title: `${workoutStreak}-session streak`,
      body: goalBody[fitnessGoal] ?? goalBody.maintain,
      colorKey: 'gym',
    });
  } else if (workoutStreak >= 3) {
    const goalBody: Record<string, string> = {
      gain:     "A solid block is building. Stay consistent and the strength gains will start compounding around session 5.",
      lose:     "A streak is building. Consistent training is the single biggest lever for fat loss alongside nutrition.",
      tone:     "A streak is building. The critical moment is around session 5 — that's where the habit locks in.",
      maintain: "A streak is building. The critical moment is around session 5 — that's where the habit locks in.",
    };
    insights.push({
      id: 'gym-streak',
      icon: '💪',
      title: `${workoutStreak} sessions in a row`,
      body: goalBody[fitnessGoal] ?? goalBody.maintain,
      colorKey: 'primary',
    });
  } else if (workoutStreak === 0 && gymDays > 0) {
    // No recent sessions but user has gym days set — gentle re-engagement nudge
    const goalBody: Record<string, string> = {
      gain:  "No recent sessions logged. Muscle is only built under load — one session restarts the chain.",
      lose:  "No recent sessions logged. Training preserves muscle while you lose fat. One session changes the momentum.",
      tone:  "No recent sessions logged. Consistency is what shapes physique over time. One session to restart.",
      maintain: "No recent sessions logged. One session to get back on track.",
    };
    insights.push({
      id: 'gym-streak-zero',
      icon: '🏋️',
      title: 'Time to get back in the gym',
      body: goalBody[fitnessGoal] ?? goalBody.maintain,
      colorKey: 'warning',
    });
  }

  // ── 3. Water streak ──────────────────────────────────────────────────────────
  if (waterStreak >= 7) {
    const body = fitnessGoal === 'gain'
      ? 'Consistent hydration supports protein synthesis and joint health during heavy training. This streak is doing real work.'
      : 'Consistent hydration improves focus, recovery, and performance. This streak is doing real work for you.';
    insights.push({
      id: 'water-streak',
      icon: '💧',
      title: `${waterStreak}-day hydration streak`,
      body,
      colorKey: 'water',
    });
  }

  // ── 4. Steps ─────────────────────────────────────────────────────────────────
  if (weeklySteps.length === 7) {
    const avgSteps = Math.round(weeklySteps.reduce((s, d) => s + d.steps, 0) / 7);
    const daysAtGoal = weeklySteps.filter(d => d.steps >= stepGoal).length;

    if (avgSteps > 0) {
      if (daysAtGoal >= 5) {
        const body = fitnessGoal === 'lose'
          ? `Averaging ${avgSteps.toLocaleString()} steps/day. High NEAT like this can add 200–400 kcal of burn per day — it's one of the most underrated fat-loss tools.`
          : `Averaging ${avgSteps.toLocaleString()} steps/day this week. High NEAT activity like this adds hundreds of extra calories burned — it compounds over weeks.`;
        insights.push({
          id: 'steps-good',
          icon: '🚶',
          title: `${daysAtGoal}/7 days at step goal`,
          body,
          colorKey: 'success',
        });
      } else if (avgSteps < stepGoal * 0.6) {
        const shortfall = (stepGoal - avgSteps).toLocaleString();
        insights.push({
          id: 'steps-low',
          icon: '🚶',
          title: 'Steps below target',
          body: `Averaging ${avgSteps.toLocaleString()} steps — ${shortfall} short of your daily goal. A short walk after meals is the easiest way to close the gap.`,
          colorKey: 'textMuted',
        });
      }
    }
  }

  // Return top 3
  return insights.slice(0, 3);
}

// ── Daily coach note for the Today screen ────────────────────────────────────
export function getDailyCoachNote(
  isGymDay: boolean,
  isRestDay: boolean,
  workoutStreak: number,
  todaySteps: number | null,
  stepGoal: number,
  fitnessGoal: string,
  gymDaysPerWeek: number,
): string | null {
  // Streak milestone on gym day
  if (workoutStreak >= 7 && isGymDay) {
    const goalSuffix: Record<string, string> = {
      gain:     'Progressive overload today keeps the mass coming.',
      lose:     'Every session protects your muscle while you lose fat.',
      tone:     "You're building something real. Make today count.",
      maintain: 'Make today count.',
    };
    return `${workoutStreak}-session streak on the line. ${goalSuffix[fitnessGoal] ?? goalSuffix.maintain}`;
  }

  // First session nudge — vary urgency by how many gym days/week
  if (workoutStreak === 0 && isGymDay) {
    if (gymDaysPerWeek <= 2) {
      return `Gym day — and you only have ${gymDaysPerWeek} this week. This one matters.`;
    }
    const goalNudge: Record<string, string> = {
      gain:     'Gym day. Muscle is only built under load — one session starts the chain.',
      lose:     'Gym day. Training is the single biggest lever alongside nutrition.',
      tone:     'Gym day. One session starts a new streak.',
      maintain: 'Gym day. One session starts a new streak.',
    };
    return goalNudge[fitnessGoal] ?? goalNudge.maintain;
  }

  // Active streak on a gym day
  if (workoutStreak >= 3 && isGymDay) {
    const goalSuffix: Record<string, string> = {
      gain:     'Strength compounds with consistency — keep loading.',
      lose:     'Consistency is your biggest fat-loss asset right now.',
      tone:     'Consistency is what shapes physique. Keep the streak.',
      maintain: 'Consistency is your biggest asset right now.',
    };
    return `${workoutStreak} sessions in a row. ${goalSuffix[fitnessGoal] ?? goalSuffix.maintain}`;
  }

  // Steps close to goal — motivate to finish
  if (todaySteps !== null && todaySteps > 0) {
    if (todaySteps >= stepGoal) {
      return `Step goal reached — ${todaySteps.toLocaleString()} steps. Keep moving if you can.`;
    }
    if (todaySteps >= stepGoal * 0.75) {
      const needed = (stepGoal - todaySteps).toLocaleString();
      return `${todaySteps.toLocaleString()} steps — just ${needed} to hit your goal.`;
    }
  }

  // Rest day — copy varies by goal
  if (isRestDay) {
    const restCopy: Record<string, string> = {
      gain:     'Rest day — muscles grow during recovery, not during the workout. Hit your protein target.',
      lose:     'Rest day — your metabolism stays elevated for 24–48 hrs after training. Trust the process.',
      tone:     'Rest day — active recovery keeps you limber and ready for tomorrow.',
      maintain: 'Rest day — protect your sleep and hit your water target. Recovery is where gains are made.',
    };
    return restCopy[fitnessGoal] ?? restCopy.maintain;
  }

  return null;
}
