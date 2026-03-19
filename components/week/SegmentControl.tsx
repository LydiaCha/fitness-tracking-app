import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { WeekStyles } from '@/app/(tabs)/week.styles';
import { AppThemeType } from '@/constants/theme';

export type Segment = 'meals' | 'grocery' | 'workout';

const SEGMENT_COLOR: Record<Segment, keyof AppThemeType> = {
  meals:   'meal',
  grocery: 'meal',
  workout: 'gym',
};

export function SegmentControl({
  segment,
  onSelect,
  theme,
  s,
}: {
  segment: Segment;
  onSelect: (s: Segment) => void;
  theme: AppThemeType;
  s: WeekStyles;
}) {
  // Only show the two main segments — grocery is accessed from within Meals
  const pills: { key: Segment; label: string; emoji: string }[] = [
    { key: 'meals',   label: 'Meals',    emoji: '🥗' },
    { key: 'workout', label: 'Workouts', emoji: '🏋️' },
  ];

  return (
    <View style={s.segmentWrapper}>
      <View style={s.segmentRow}>
        {pills.map(p => {
          const active = segment === p.key || (p.key === 'meals' && segment === 'grocery');
          const color  = theme[SEGMENT_COLOR[p.key]] as string;
          return (
            <TouchableOpacity
              key={p.key}
              style={[
                s.segmentPill,
                active && { backgroundColor: color + '22' },
              ]}
              onPress={() => onSelect(p.key)}
              activeOpacity={0.8}>
              <Text style={{ fontSize: 14, marginBottom: 1 }}>{p.emoji}</Text>
              <Text style={[
                s.segmentText,
                active && { color, fontWeight: '700' },
              ]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
