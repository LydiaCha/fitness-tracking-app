import React, { createContext, useCallback, useContext, useState } from 'react';
import { ActivityLevel, FitnessGoal, Gender, DietaryRestriction, CuisinePreference } from '@/constants/userProfile';

export interface OnboardingData {
  name:          string;
  goal:          FitnessGoal | null;
  gender:        Gender | null;
  age:           string;
  heightCm:      string;
  weightKg:      string;
  activityLevel: ActivityLevel | null;
  gymDaysPerWeek: number;
  dietaryRestrictions: DietaryRestriction[];
  cuisinePreferences:  CuisinePreference[];
  maxPrepMins:         number;
}

const defaults: OnboardingData = {
  name:           '',
  goal:           null,
  gender:         null,
  age:            '',
  heightCm:       '',
  weightKg:       '',
  activityLevel:  null,
  gymDaysPerWeek: 3,
  dietaryRestrictions: [],
  cuisinePreferences:  [],
  maxPrepMins:         30,
};

interface OnboardingCtx {
  data:   OnboardingData;
  update: (patch: Partial<OnboardingData>) => void;
  reset:  () => void;
}

const Ctx = createContext<OnboardingCtx>(null!);

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<OnboardingData>(defaults);

  const update = useCallback((patch: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => setData(defaults), []);

  return <Ctx.Provider value={{ data, update, reset }}>{children}</Ctx.Provider>;
}

export function useOnboarding() { return useContext(Ctx); }
