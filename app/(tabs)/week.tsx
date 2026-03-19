/**
 * PeakRoutine — Plan Tab
 * Screen shell. All sub-components live in components/week/.
 */

import React, { useState, useMemo, useRef } from 'react';
import { ScrollView, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';
import { useAppTheme } from '@/context/ThemeContext';
import { useUserProfile } from '@/context/UserProfileContext';
import { createWeekStyles } from '@/styles/week.styles';
import { SegmentControl, Segment } from '@/components/week/SegmentControl';
import { MealsContent } from '@/components/week/MealsContent';
import { GroceryContent } from '@/components/week/GroceryContent';
import { WorkoutContent } from '@/components/week/WorkoutContent';

export default function PlanScreen() {
  const { theme, isDark } = useAppTheme();
  const s = useMemo(() => createWeekStyles(theme), [theme]);

  const [segment, setSegment] = useState<Segment>('meals');

  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);

  const { profile } = useUserProfile();

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
          <GroceryContent theme={theme} s={s} onBack={() => setSegment('meals')} />
        )}

        {segment === 'workout' && (
          <WorkoutContent theme={theme} s={s} />
        )}

      </ScrollView>
    </SafeAreaView>
  );
}
