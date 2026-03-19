/**
 * PeakRoutine — Claude Output Validators
 *
 * Lightweight schema validators for every Claude output shape.
 * Called immediately after extractJSON() on every AI response.
 * Returns the typed value on success, null on any validation failure.
 *
 * Never trust raw Claude output without passing it through these first.
 */

import { WorkoutDay } from '@/context/WorkoutPlanContext';

// ─── Meal plan selections ──────────────────────────────────────────────────

export interface MealSelection {
  slotIndex:         number;
  mealId:            string;
  portionMultiplier: number;
}

export function validateMealSelections(parsed: unknown): MealSelection[] | null {
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  for (const item of parsed) {
    if (typeof item !== 'object' || item === null)       return null;
    if (typeof (item as MealSelection).slotIndex         !== 'number') return null;
    if (typeof (item as MealSelection).mealId            !== 'string') return null;
    if (typeof (item as MealSelection).portionMultiplier !== 'number') return null;
    // Sanity bounds
    if ((item as MealSelection).slotIndex < 0)                  return null;
    if ((item as MealSelection).portionMultiplier < 0.5)        return null;
    if ((item as MealSelection).portionMultiplier > 2.0)        return null;
  }

  return parsed as MealSelection[];
}

// ─── Workout plan ──────────────────────────────────────────────────────────

export function validateWorkoutPlan(parsed: unknown): WorkoutDay[] | null {
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  for (const day of parsed) {
    if (typeof day !== 'object' || day === null) return null;

    const d = day as WorkoutDay;
    if (typeof d.gymDayIndex !== 'number')  return null;
    if (typeof d.split       !== 'string')  return null;
    if (typeof d.focus       !== 'string')  return null;
    if (typeof d.warmup      !== 'string')  return null;
    if (typeof d.cooldown    !== 'string')  return null;
    if (!Array.isArray(d.exercises) || d.exercises.length < 2) return null;

    for (const ex of d.exercises) {
      if (typeof ex !== 'object' || ex === null) return null;
      if (typeof ex.exerciseId !== 'string')     return null;
      if (typeof ex.name       !== 'string')     return null;
      if (typeof ex.sets       !== 'number')     return null;
      if (typeof ex.reps       !== 'string')     return null;
      if (typeof ex.rest       !== 'string')     return null;
      if (ex.sets < 1 || ex.sets > 8)            return null;
    }
  }

  return parsed as WorkoutDay[];
}

