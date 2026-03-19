import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './appConstants';
import { ScheduleEvent } from '@/constants/scheduleData';

export interface CustomActivity {
  id: string;
  label: string;
  emoji: string;
  /** JS getDay() convention: 0 = Sun, 1 = Mon … 6 = Sat */
  daysOfWeek: number[];
  time: string; // "H:MM AM/PM"
  durationMin?: number;
}

export async function loadCustomActivities(): Promise<CustomActivity[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_ACTIVITIES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveCustomActivities(activities: CustomActivity[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_ACTIVITIES, JSON.stringify(activities));
}

export function customToEvent(a: CustomActivity): ScheduleEvent {
  return {
    type: 'custom',
    label: a.label,
    time: a.time,
    duration: a.durationMin ? `${a.durationMin} min` : undefined,
  };
}
