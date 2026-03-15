import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { PlanStyles } from '@/app/(tabs)/plan.styles';
import { AppThemeType } from '@/constants/theme';

export type Segment = 'meals' | 'grocery' | 'habits';

export function SegmentControl({
  segment,
  onSelect,
  theme: _theme,
  s,
}: {
  segment: Segment;
  onSelect: (s: Segment) => void;
  theme: AppThemeType;
  s: PlanStyles;
}) {
  const pills: { key: Segment; label: string }[] = [
    { key: 'meals',   label: 'Weekly Plan' },
    { key: 'grocery', label: 'Grocery List' },
    { key: 'habits',  label: 'Habits' },
  ];

  return (
    <View style={s.segmentWrapper}>
      <View style={s.segmentRow}>
        {pills.map(p => (
          <TouchableOpacity
            key={p.key}
            style={[s.segmentPill, segment === p.key && s.segmentPillActive]}
            onPress={() => onSelect(p.key)}
            activeOpacity={0.8}>
            <Text style={[s.segmentText, segment === p.key && s.segmentTextActive]}>
              {p.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
