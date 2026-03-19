import { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { toKey } from '@/utils/appConstants';

const STEPS_CONNECTED_KEY  = 'stepsConnected';
const STEPS_MANUAL_PREFIX  = 'stepsManual_';
export const DEFAULT_STEP_GOAL = 8000;

export type StepsSource = 'sensor' | 'manual' | null;

export interface DaySteps {
  dateKey: string;
  steps: number;
}

export interface UseStepsResult {
  /** Whether the user has agreed to use the device motion sensor */
  isConnected: boolean;
  /** Whether CoreMotion / Android step counter is actually available */
  isAvailable: boolean;
  /** Source of today's step data */
  source: StepsSource;
  todaySteps: number | null;
  weeklySteps: DaySteps[];
  goal: number;
  loading: boolean;
  connectSensor: () => Promise<boolean>;
  logManual: (steps: number) => Promise<void>;
  resetManual: () => Promise<void>;
  disconnect: () => Promise<void>;
  refresh: () => Promise<void>;
}

async function fetchSensorData(): Promise<{ today: number; weekly: DaySteps[] } | null> {
  try {
    const { Pedometer } = await import('expo-sensors');
    const available = await Pedometer.isAvailableAsync();
    if (!available) return null;

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    const todayResult = await Pedometer.getStepCountAsync(todayStart, now);

    const weekly: DaySteps[] = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const result = await Pedometer.getStepCountAsync(dayStart, dayEnd > now ? now : dayEnd);
      weekly.push({ dateKey: toKey(dayStart), steps: result.steps });
    }

    return { today: todayResult.steps, weekly };
  } catch {
    return null;
  }
}

export function useSteps(): UseStepsResult {
  const [isConnected, setIsConnected] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);
  const [source,      setSource]      = useState<StepsSource>(null);
  const [todaySteps,  setTodaySteps]  = useState<number | null>(null);
  const [weeklySteps, setWeeklySteps] = useState<DaySteps[]>([]);
  const [loading,     setLoading]     = useState(true);

  const todayKey = toKey(new Date());

  // Load persisted state on mount
  useEffect(() => {
    async function load() {
      const [connected, manualStr] = await Promise.all([
        AsyncStorage.getItem(STEPS_CONNECTED_KEY),
        AsyncStorage.getItem(STEPS_MANUAL_PREFIX + todayKey),
      ]);
      if (connected === 'true') setIsConnected(true);
      if (manualStr !== null && connected !== 'true') {
        // Manual entry exists and no sensor connection — show manual data
        setTodaySteps(parseInt(manualStr));
        setSource('manual');
      }
      setLoading(false);
    }
    load();
  }, []);

  const refresh = useCallback(async () => {
    const data = await fetchSensorData();
    if (data) {
      setIsAvailable(true);
      setTodaySteps(data.today);
      setWeeklySteps(data.weekly);
      setSource('sensor');
    } else {
      setIsAvailable(false);
      // Fall back to manual entry for today if available
      const manualStr = await AsyncStorage.getItem(STEPS_MANUAL_PREFIX + todayKey);
      if (manualStr !== null) {
        setTodaySteps(parseInt(manualStr));
        setSource('manual');
      }
    }
  }, [todayKey]);

  useEffect(() => {
    if (isConnected) refresh();
  }, [isConnected, refresh]);

  const connectSensor = useCallback(async (): Promise<boolean> => {
    try {
      const { Pedometer } = await import('expo-sensors');
      const { status } = await Pedometer.requestPermissionsAsync();
      if (status === 'granted') {
        await AsyncStorage.setItem(STEPS_CONNECTED_KEY, 'true');
        setIsConnected(true);
        return true;
      }
    } catch {
      // expo-sensors not installed
    }
    return false;
  }, []);

  const logManual = useCallback(async (stepsToAdd: number) => {
    const existing = await AsyncStorage.getItem(STEPS_MANUAL_PREFIX + todayKey);
    const newTotal = Math.max(0, (existing !== null ? parseInt(existing) : 0) + stepsToAdd);
    await AsyncStorage.setItem(STEPS_MANUAL_PREFIX + todayKey, String(newTotal));
    setTodaySteps(newTotal);
    setSource('manual');
    setWeeklySteps(prev => {
      const updated = prev.length === 7 ? [...prev] : Array.from({ length: 7 }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - i));
        return { dateKey: toKey(d), steps: 0 };
      });
      updated[6] = { dateKey: todayKey, steps: newTotal };
      return updated;
    });
  }, [todayKey]);

  const resetManual = useCallback(async () => {
    await AsyncStorage.removeItem(STEPS_MANUAL_PREFIX + todayKey);
    setTodaySteps(null);
    setSource(null);
    setWeeklySteps(prev => {
      if (prev.length !== 7) return prev;
      const updated = [...prev];
      updated[6] = { ...updated[6], steps: 0 };
      return updated;
    });
  }, [todayKey]);

  const disconnect = useCallback(async () => {
    await AsyncStorage.multiRemove([STEPS_CONNECTED_KEY, STEPS_MANUAL_PREFIX + todayKey]);
    setIsConnected(false);
    setIsAvailable(false);
    setSource(null);
    setTodaySteps(null);
    setWeeklySteps([]);
  }, [todayKey]);

  return {
    isConnected,
    isAvailable,
    source,
    todaySteps,
    weeklySteps,
    goal: DEFAULT_STEP_GOAL,
    loading,
    connectSensor,
    logManual,
    resetManual,
    disconnect,
    refresh,
  };
}
