import { toKey } from '@/utils/appConstants';

/**
 * Weight trend utilities — smoothing, analysis, and coaching copy.
 *
 * Design philosophy:
 *   • Never highlight the raw delta between two entries (too noisy, discouraging).
 *   • Use an exponential moving average (EMA) to surface the real underlying trend.
 *   • All copy is coach-like: direct, warm, honest, never alarming.
 */

export interface WeightEntry {
  date: string; // YYYY-MM-DD
  kg:   number;
}

export interface TrendResult {
  /** EMA value at each entry, index-aligned with sorted input. */
  emaHistory:   number[];
  /** Most recent EMA value (rounded to 1 dp). */
  currentEMA:   number;
  /** EMA change over the last 7 days (negative = lost weight). Null < 2 entries. */
  weeklyChange: number | null;
  /** Total EMA change from first to last entry. Null < 2 entries. */
  totalChange:  number | null;
  direction:    'down' | 'up' | 'flat';
  /** True if the raw entry went up but the EMA is still going down — normal noise. */
  isFluctuation: boolean;
  confidence:    'high' | 'low'; // high ≥ 3 entries
  checkInCount:  number;
}

// α = 0.3 → smooth but responsive to weekly data.
// Lower = smoother/slower; higher = more reactive.
const EMA_ALPHA = 0.3;

export function calcEMA(values: number[], alpha = EMA_ALPHA): number[] {
  if (values.length === 0) return [];
  const out = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(alpha * values[i] + (1 - alpha) * out[i - 1]);
  }
  return out;
}

export function analyzeTrend(entries: WeightEntry[]): TrendResult {
  const sorted     = [...entries].sort((a, b) => a.date.localeCompare(b.date));

  if (sorted.length === 0) {
    return {
      emaHistory:    [],
      currentEMA:    0,
      weeklyChange:  null,
      totalChange:   null,
      direction:     'flat',
      isFluctuation: false,
      confidence:    'low',
      checkInCount:  0,
    };
  }

  const emaHistory = calcEMA(sorted.map(e => e.kg));
  const currentEMA = emaHistory[emaHistory.length - 1];

  // Weekly change: compare current EMA to the EMA value closest to 7 days ago.
  let weeklyChange: number | null = null;
  if (sorted.length >= 2) {
    const cutoffStr = toKey(new Date(Date.now() - 7 * 86_400_000));
    const idx = sorted.reduce<number>((best, e, i) => (e.date <= cutoffStr ? i : best), -1);
    if (idx >= 0) {
      weeklyChange = Math.round((currentEMA - emaHistory[idx]) * 10) / 10;
    }
  }

  // Total change: first EMA vs last EMA.
  const totalChange =
    sorted.length >= 2
      ? Math.round((currentEMA - emaHistory[0]) * 10) / 10
      : null;

  // Direction: compare last two EMA values.
  const prevEMA  = emaHistory.length >= 2 ? emaHistory[emaHistory.length - 2] : currentEMA;
  const emaDelta = currentEMA - prevEMA;
  const direction: TrendResult['direction'] =
    Math.abs(emaDelta) < 0.15 ? 'flat' : emaDelta < 0 ? 'down' : 'up';

  // Fluctuation: raw entry went up while EMA is still heading down.
  const lastRaw  = sorted[sorted.length - 1].kg;
  const prevRaw  = sorted.length >= 2 ? sorted[sorted.length - 2].kg : lastRaw;
  const isFluctuation = lastRaw > prevRaw && direction !== 'up';

  return {
    emaHistory,
    currentEMA:  Math.round(currentEMA * 10) / 10,
    weeklyChange,
    totalChange,
    direction,
    isFluctuation,
    confidence:   sorted.length >= 3 ? 'high' : 'low',
    checkInCount: sorted.length,
  };
}

// ─── Badge ─────────────────────────────────────────────────────────────────────

export function getWeightBadge(trend: TrendResult): { label: string; color: string } {
  if (trend.checkInCount < 2)         return { label: 'Getting Started', color: '#94a3b8' };
  if (trend.direction === 'down')     return { label: 'Trending Down',   color: '#4ade80' };
  if (trend.direction === 'up')       return { label: 'Trending Up',     color: '#fbbf24' };
  return                                     { label: 'Holding Steady',  color: '#94a3b8' };
}

// ─── Trend stats line ──────────────────────────────────────────────────────────

export function getTrendStatsLine(trend: TrendResult): string {
  const parts: string[] = [];

  if (trend.weeklyChange !== null) {
    const arrow = trend.weeklyChange < 0 ? '↓' : trend.weeklyChange > 0 ? '↑' : '→';
    parts.push(`${arrow} ${Math.abs(trend.weeklyChange)} kg this week`);
  }

  if (trend.totalChange !== null && trend.checkInCount >= 3) {
    const arrow = trend.totalChange < 0 ? '↓' : trend.totalChange > 0 ? '↑' : '→';
    parts.push(`${arrow} ${Math.abs(trend.totalChange)} kg total`);
  }

  if (parts.length === 0) {
    return trend.checkInCount === 1 ? 'First entry — trend builds from here' : 'Building your trend…';
  }
  return parts.join('  ·  ');
}

// ─── Post-log feedback ─────────────────────────────────────────────────────────

export function getPostLogMessage(trend: TrendResult, fitnessGoal = 'lose'): string {
  if (trend.checkInCount === 1) {
    return "First check-in logged ✓\n\nCome back next week — one entry is the seed of your trend. Same time, same conditions gives you the cleanest read.";
  }

  if (trend.isFluctuation) {
    return `Up slightly today — and that's completely normal.\n\nBody weight moves 1–2 kg every day from water, food, and sodium. Your underlying trend is still heading down. Don't let a single number knock you off course.`;
  }

  if (trend.direction === 'down') {
    if (fitnessGoal === 'gain') {
      return "Logged ✓\n\nWeight is trending down — if you're in a muscle-gain phase, consider bumping your daily calories slightly to reverse this.";
    }
    const change = trend.weeklyChange !== null
      ? `You're down ${Math.abs(trend.weeklyChange)} kg over the last 7 days.`
      : 'Your trend is moving in the right direction.';
    return `Logged ✓\n\n${change} That's real, sustainable progress. Keep the consistency going.`;
  }

  if (trend.direction === 'flat') {
    if (fitnessGoal === 'maintain') {
      return "Logged ✓\n\nWeight holding steady — exactly the goal. Keep doing what you're doing.";
    }
    if (fitnessGoal === 'gain') {
      return "Logged ✓\n\nWeight is holding flat. For muscle gain, you need a slight surplus — try adding 100–200 kcal to your post-workout meal.";
    }
    return "Logged ✓\n\nWeight is holding steady. If you're in a deficit, this is a normal plateau — your body is adjusting. Keep going. The scale often lags 1–2 weeks behind actual fat loss.";
  }

  if (trend.confidence === 'low') {
    return "Logged ✓\n\nSlight increase — could be water retention, a bigger meal yesterday, or just the time of day. A few more weekly check-ins will show us the real picture.";
  }

  if (fitnessGoal === 'gain') {
    return "Logged ✓\n\nWeight trending up — right on track for a muscle-gain goal. Make sure you're keeping the training intensity up to make it quality mass.";
  }

  return "Weight has been creeping up slightly. Worth a quick review of your nutrition this week — small, consistent adjustments are all it takes.";
}

// ─── Weekly nudge ──────────────────────────────────────────────────────────────

export function getNudgeMessage(
  _entries: WeightEntry[],
  daysSince: number | null,
): { show: boolean; msg: string } {
  if (daysSince === null) {
    return {
      show: true,
      msg:  "Weigh yourself first thing in the morning — after using the bathroom, before eating or drinking. Same day, same conditions every week. Consistent inputs = reliable trends.",
    };
  }
  if (daysSince < 5) return { show: false, msg: '' };
  if (daysSince < 9) {
    return {
      show: true,
      msg:  "Around time for your weekly check-in. First thing in the morning, before eating or drinking, gives you the most consistent read.",
    };
  }
  if (daysSince < 14) {
    return {
      show: true,
      msg:  `It's been ${daysSince} days. No pressure — whenever you're ready, just drop a number in and we'll keep your trend going.`,
    };
  }
  return {
    show: true,
    msg:  "It's been a while since your last check-in — life happens. Jump back in whenever you're ready and your trend will pick up right where it left off.",
  };
}
