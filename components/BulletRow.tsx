import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ChecklistItemStyles } from './ChecklistItem.styles';

interface BulletRowProps {
  text:         string;
  isCrossed:    boolean;
  onPress:      () => void;
  successColor: string;
  s: Pick<ChecklistItemStyles, 'bulletRow' | 'bulletDot' | 'bulletCheck' | 'bulletText' | 'bulletCrossed'>;
}

export function BulletRow({ text, isCrossed, onPress, successColor, s }: BulletRowProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.65} style={s.bulletRow}>
      <View style={[s.bulletDot, isCrossed && { backgroundColor: successColor, borderColor: successColor }]}>
        {isCrossed && <Text style={s.bulletCheck}>✓</Text>}
      </View>
      <Text style={[s.bulletText, isCrossed && s.bulletCrossed]}>{text}</Text>
    </TouchableOpacity>
  );
}
