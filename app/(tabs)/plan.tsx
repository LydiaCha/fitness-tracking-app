/**
 * PeakRoutine — Plan Tab
 * Screen shell. All sub-components live in components/plan/.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import { ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { useScrollToTop } from '@react-navigation/native';
import { useAppTheme } from '@/context/ThemeContext';
import { loadUserProfile, UserProfile } from '@/constants/userProfile';
import { createPlanStyles } from './plan.styles';
import { useHabits } from '@/hooks/useHabits';
import { SegmentControl, Segment } from '@/components/plan/SegmentControl';
import { MealsContent } from '@/components/plan/MealsContent';
import { GroceryContent } from '@/components/plan/GroceryContent';
import { HabitsContent } from '@/components/plan/HabitsContent';

export default function PlanScreen() {
  const { theme, isDark } = useAppTheme();
  const s = useMemo(() => createPlanStyles(theme), [theme]);

  const [segment, setSegment] = useState<Segment>('meals');

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  useFocusEffect(
    useCallback(() => {
      loadUserProfile().then(setProfile).catch(() => {});
    }, []),
  );

  const { habitData, habitsLoaded, habitStreaks, toggleHabit, todayKey, weekDates } = useHabits();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      <SegmentControl segment={segment} onSelect={setSegment} theme={theme} s={s} />

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}>

        {segment === 'meals' && (
          <MealsContent
            theme={theme}
            s={s}
            profile={profile}
            onViewGrocery={() => setSegment('grocery')}
          />
        )}

        {segment === 'grocery' && (
          <GroceryContent theme={theme} s={s} />
        )}

        {segment === 'habits' && habitsLoaded && (
          <HabitsContent
            habitData={habitData}
            toggleHabit={toggleHabit}
            habitStreaks={habitStreaks}
            weekDates={weekDates}
            todayKey={todayKey}
            theme={theme}
            s={s}
          />
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
