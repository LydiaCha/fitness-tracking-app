import { STORAGE_KEYS } from './appConstants';
import { safeGetItem, safeSetItem, safeParseJSON } from './storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SetRecord {
  exerciseId: string;
  setNumber:  number;
  reps:       number;
  weightKg:   number;
}

export interface WorkoutLog {
  date:  string; // YYYY-MM-DD
  focus: string; // e.g. "Upper Push – Chest, Shoulders, Triceps"
  sets:  SetRecord[];
}

export interface StrengthSnapshot {
  exerciseId:    string;
  date:          string;
  estimatedE1RM: number; // Epley: weight × (1 + reps/30)
  volumeKg:      number; // Σ sets × reps × weight for this exercise in this session
}

// ─── Math ─────────────────────────────────────────────────────────────────────

/** Epley formula. Returns 0 for invalid inputs. */
export function calcE1RM(weightKg: number, reps: number): number {
  if (weightKg <= 0 || reps <= 0) return 0;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

export async function loadWorkoutLogs(): Promise<WorkoutLog[]> {
  const raw = await safeGetItem(STORAGE_KEYS.STRENGTH_LOGS);
  return safeParseJSON<WorkoutLog[]>(raw, []);
}

export async function loadTodayLog(date: string): Promise<WorkoutLog | null> {
  const logs = await loadWorkoutLogs();
  return logs.find(l => l.date === date) ?? null;
}

export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  const logs = await loadWorkoutLogs();
  const idx  = logs.findIndex(l => l.date === log.date);
  if (idx >= 0) {
    logs[idx] = log;
  } else {
    logs.push(log);
  }
  await safeSetItem(STORAGE_KEYS.STRENGTH_LOGS, JSON.stringify(logs));
}

/**
 * Returns the sets from the most recent session that included a given exercise.
 * Used to auto-fill "same as last time".
 */
export async function getLastSets(exerciseId: string): Promise<SetRecord[]> {
  const logs   = await loadWorkoutLogs();
  const sorted = [...logs].sort((a, b) => b.date.localeCompare(a.date));
  for (const log of sorted) {
    const sets = log.sets.filter(s => s.exerciseId === exerciseId);
    if (sets.length > 0) return sets;
  }
  return [];
}

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * Derives per-exercise e1RM snapshots from a list of workout logs.
 * Takes the best e1RM set per exercise per session.
 * Returns sorted by date ascending.
 */
export function computeStrengthSnapshots(logs: WorkoutLog[]): StrengthSnapshot[] {
  // exerciseId:date → best snapshot
  const map = new Map<string, StrengthSnapshot>();

  for (const log of logs) {
    // Group sets by exercise
    const byExercise = new Map<string, SetRecord[]>();
    for (const set of log.sets) {
      const arr = byExercise.get(set.exerciseId) ?? [];
      arr.push(set);
      byExercise.set(set.exerciseId, arr);
    }

    for (const [exerciseId, sets] of byExercise) {
      const bestE1RM = Math.max(...sets.map(s => calcE1RM(s.weightKg, s.reps)));
      const volume   = sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0);
      const key      = `${exerciseId}:${log.date}`;
      map.set(key, {
        exerciseId,
        date:          log.date,
        estimatedE1RM: bestE1RM,
        volumeKg:      Math.round(volume),
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

/** Returns the e1RM history for a single exercise, date-ascending. */
export function getE1RMHistory(
  snapshots: StrengthSnapshot[],
  exerciseId: string,
): { date: string; e1rm: number }[] {
  return snapshots
    .filter(s => s.exerciseId === exerciseId)
    .map(s => ({ date: s.date, e1rm: s.estimatedE1RM }));
}

/** All exercises that have at least one logged session. */
export function getLoggedExerciseIds(snapshots: StrengthSnapshot[]): string[] {
  return [...new Set(snapshots.map(s => s.exerciseId))];
}
