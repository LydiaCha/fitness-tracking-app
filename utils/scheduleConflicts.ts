/**
 * PeakRoutine — Schedule Conflict Detection
 *
 * Pure utility — no React, no side effects.
 * Detects cases where work hours overlap with sleep or wake windows.
 */

import { UserProfile } from '@/constants/userProfile';
import { DAY_NAMES } from '@/constants/userProfile';

function timeToMins(time: string): number {
  const parts  = time.trim().split(' ');
  const period = parts[1] ?? 'AM';
  const [hStr, mStr = '0'] = (parts[0] ?? '0:0').split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return h * 60 + m;
}

/** Minutes from `from` to `to`, always positive (wraps midnight). */
function gapMins(from: string, to: string): number {
  return ((timeToMins(to) - timeToMins(from)) + 1440) % 1440;
}

export type ConflictType = 'work-before-wake' | 'work-past-sleep';

export interface ScheduleConflict {
  jsDay:       number;        // 0 = Sun … 6 = Sat
  dayName:     string;
  type:        ConflictType;
  description: string;        // human-readable, shown in UI
}

/**
 * Returns one conflict entry per affected work day.
 * Returns [] when the schedule is clean.
 */
export function detectScheduleConflicts(profile: UserProfile): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  profile.weekSchedule.forEach((day, jsDay) => {
    if (!day.isWorkDay) return;

    const awakeWindow       = gapMins(day.wakeTime,  day.sleepTime);
    const workStartRelative = gapMins(day.wakeTime,  day.workStart);
    const workEndRelative   = gapMins(day.wakeTime,  day.workEnd);
    const dayName           = DAY_NAMES[jsDay] ?? 'Unknown';

    if (workStartRelative > awakeWindow) {
      conflicts.push({
        jsDay,
        dayName,
        type:        'work-before-wake',
        description: `${dayName}: work starts at ${day.workStart} before your wake time (${day.wakeTime})`,
      });
    } else if (workEndRelative > awakeWindow) {
      conflicts.push({
        jsDay,
        dayName,
        type:        'work-past-sleep',
        description: `${dayName}: work ends at ${day.workEnd} after your sleep time (${day.sleepTime})`,
      });
    }
  });

  return conflicts;
}

/** Returns the conflict for a specific JS day, or null. */
export function getTodayConflict(profile: UserProfile): ScheduleConflict | null {
  const jsDay = new Date().getDay();
  return detectScheduleConflicts(profile).find(c => c.jsDay === jsDay) ?? null;
}
