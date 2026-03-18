import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { createChecklistItemStyles } from './ChecklistItem.styles';
import { isBullet, toggleSetItem } from './checklistUtils';
import { BulletRow } from './BulletRow';

interface Props {
  workoutType:  string;
  workoutFocus: string;
  duration?:    string;
  detail:       string;
}

export function WorkoutCard({ workoutType, workoutFocus, duration, detail }: Props) {
  const { theme } = useAppTheme();
  const s = useMemo(() => createChecklistItemStyles(theme), [theme]);
  const [expanded, setExpanded] = useState(false);
  const [crossed, setCrossed] = useState<Set<number>>(new Set());

  const lines = detail.split('\n');

  return (
    <View style={s.rcCard}>
      <TouchableOpacity onPress={() => setExpanded(v => !v)} activeOpacity={0.7} style={s.rcHeader}>
        <Text style={s.rcEmoji}>🏋️</Text>
        <View style={s.rcInfo}>
          <Text style={s.rcName}>{workoutType}</Text>
          <Text style={s.rcTiming} numberOfLines={1}>{workoutFocus}</Text>
        </View>
        {duration && (
          <View style={{ borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, backgroundColor: theme.gym + '30', borderColor: theme.gym }}>
            <Text style={{ fontSize: 9, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, color: theme.gym }}>
              {duration}
            </Text>
          </View>
        )}
        <Text style={s.rcArrow}>{expanded ? '▲' : '▼'}</Text>
      </TouchableOpacity>

      {expanded && (
        <View style={s.rcBody}>
          {lines.map((line, i) => {
            if (!line.trim()) return <View key={i} style={{ height: 4 }} />;
            if (isBullet(line)) {
              return (
                <BulletRow
                  key={i}
                  text={line.trimStart().replace(/^•\s*/, '')}
                  isCrossed={crossed.has(i)}
                  onPress={() => setCrossed(prev => toggleSetItem(prev, i))}
                  successColor={theme.success}
                  s={s}
                />
              );
            }
            return <Text key={i} style={s.detailLine}>{line}</Text>;
          })}
        </View>
      )}
    </View>
  );
}
