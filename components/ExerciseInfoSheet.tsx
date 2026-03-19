import React from 'react';
import {
  View, Text, Modal, TouchableOpacity, ScrollView,
  SafeAreaView, StatusBar,
} from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';
import { Exercise } from '@/constants/exerciseRegistry';

const EQUIPMENT_EMOJI: Record<string, string> = {
  barbell:    '🏋️',
  dumbbell:   '💪',
  cable:      '🔗',
  bodyweight: '🤸',
  machine:    '⚙️',
};

interface Props {
  exercise: Exercise | null;
  onClose:  () => void;
}

export function ExerciseInfoSheet({ exercise, onClose }: Props) {
  const { theme, isDark } = useAppTheme();
  const color = theme.gym;

  return (
    <Modal
      visible={!!exercise}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* ── Handle + Close ── */}
        <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
          <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: theme.border }} />
        </View>
        <TouchableOpacity
          onPress={onClose}
          activeOpacity={0.7}
          style={{ position: 'absolute', top: 16, right: 16, padding: 8 }}>
          <Text style={{ fontSize: 16, color: theme.textMuted }}>✕</Text>
        </TouchableOpacity>

        {!exercise ? null : (
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 48, paddingTop: 8 }}
            showsVerticalScrollIndicator={false}>

            {/* ── Header ── */}
            <View style={{ marginBottom: 20 }}>
              <Text style={{ fontSize: 24, fontWeight: '800', color: theme.textPrimary, letterSpacing: -0.3, marginBottom: 8 }}>
                {exercise.name}
              </Text>

              {/* Chips row */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: color + '18', borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 5,
                  borderWidth: 1, borderColor: color + '44',
                }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color }}>💪 {exercise.primaryMuscle}</Text>
                </View>

                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  backgroundColor: theme.bgCard, borderRadius: 8,
                  paddingHorizontal: 10, paddingVertical: 5,
                  borderWidth: 1, borderColor: theme.border,
                }}>
                  <Text style={{ fontSize: 12, color: theme.textSecondary }}>
                    {EQUIPMENT_EMOJI[exercise.equipment]} {exercise.equipment.charAt(0).toUpperCase() + exercise.equipment.slice(1)}
                  </Text>
                </View>

                {exercise.isCompound && (
                  <View style={{
                    backgroundColor: theme.bgCard, borderRadius: 8,
                    paddingHorizontal: 10, paddingVertical: 5,
                    borderWidth: 1, borderColor: theme.border,
                  }}>
                    <Text style={{ fontSize: 12, color: theme.textMuted, fontWeight: '600' }}>Compound</Text>
                  </View>
                )}
              </View>
            </View>

            {/* ── Sets & Reps ── */}
            <View style={{
              flexDirection: 'row', gap: 12, marginBottom: 24,
            }}>
              <View style={{
                flex: 1, backgroundColor: theme.bgCard, borderRadius: 12,
                padding: 14, alignItems: 'center',
                borderWidth: 1, borderColor: theme.border,
              }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color, marginBottom: 2 }}>
                  {exercise.defaultSets}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Sets
                </Text>
              </View>
              <View style={{
                flex: 2, backgroundColor: theme.bgCard, borderRadius: 12,
                padding: 14, alignItems: 'center',
                borderWidth: 1, borderColor: theme.border,
              }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color, marginBottom: 2 }}>
                  {exercise.defaultRepsRange}
                </Text>
                <Text style={{ fontSize: 11, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Reps / Duration
                </Text>
              </View>
            </View>

            {/* ── Where to find it ── */}
            <View style={{
              flexDirection: 'row', alignItems: 'flex-start', gap: 10,
              backgroundColor: theme.bgCard, borderRadius: 12,
              padding: 14, marginBottom: 24,
              borderWidth: 1, borderColor: theme.border,
            }}>
              <Text style={{ fontSize: 18 }}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 }}>
                  Where to find it
                </Text>
                <Text style={{ fontSize: 14, color: theme.textPrimary, lineHeight: 20 }}>
                  {exercise.location}
                </Text>
              </View>
            </View>

            {/* ── Form cues ── */}
            <View>
              <Text style={{ fontSize: 11, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 }}>
                Form cues
              </Text>
              <View style={{ gap: 10 }}>
                {exercise.cues.map((cue, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                    <View style={{
                      width: 22, height: 22, borderRadius: 11,
                      backgroundColor: color + '22', borderWidth: 1, borderColor: color + '55',
                      alignItems: 'center', justifyContent: 'center', marginTop: 1,
                      flexShrink: 0,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color }}>{i + 1}</Text>
                    </View>
                    <Text style={{ flex: 1, fontSize: 14, color: theme.textPrimary, lineHeight: 21 }}>
                      {cue}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
