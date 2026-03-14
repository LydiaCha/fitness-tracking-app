import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { AppThemeType } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { WEEK_SCHEDULE } from '@/constants/scheduleData';
import { ChecklistItem, toggleSetItem } from '@/components/ChecklistItem';

function useStyles(theme: AppThemeType) {
  return useMemo(() => StyleSheet.create({
    safe:         { flex: 1, backgroundColor: theme.bg },
    header:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border, backgroundColor: theme.bg },
    backBtn:      { minWidth: 60 },
    backText:     { fontSize: 14, color: theme.primary, fontWeight: '600' },
    headerCenter: { flex: 1, alignItems: 'center' },
    dayName:      { fontSize: 18, fontWeight: '800', color: theme.textPrimary },
    headerRight:  { minWidth: 60 },
    scroll:       { flex: 1 },
    scrollContent:{ paddingHorizontal: 16, paddingTop: 12 },

    heroCard:     { backgroundColor: theme.bgCard, borderRadius: 14, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: theme.border },
    badges:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
    badge:        { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
    badgeText:    { fontSize: 12, fontWeight: '600' },
    workoutFocus: { fontSize: 13, color: theme.textSecondary, marginBottom: 8 },
    eventCount:   { fontSize: 12, color: theme.textSecondary, marginBottom: 6, fontWeight: '600' },
    progressBg:   { height: 4, backgroundColor: theme.bgCardAlt, borderRadius: 2, overflow: 'hidden' },
    progressFill: { height: 4, backgroundColor: theme.primary, borderRadius: 2 },

    timeline:     { paddingLeft: 2 },
  }), [theme]);
}

export default function DayDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { theme } = useAppTheme();
  const s = useStyles(theme);
  const day = WEEK_SCHEDULE.find(d => d.id === id) ?? WEEK_SCHEDULE[0];
  const [checkedEvents, setCheckedEvents] = useState<Set<number>>(new Set());

  function toggleEvent(idx: number) {
    setCheckedEvents(prev => toggleSetItem(prev, idx));
  }

  const total = day.events.length;
  const done  = checkedEvents.size;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={theme.bg === '#F8F9FA' ? 'dark-content' : 'light-content'} backgroundColor={theme.bg} />

      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.dayName}>{day.name}</Text>
        </View>
        <View style={s.headerRight} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={s.heroCard}>
          <View style={s.badges}>
            {day.isGymDay && (
              <View style={[s.badge, { backgroundColor: theme.gym + '22', borderColor: theme.gym }]}>
                <Text style={[s.badgeText, { color: theme.gym }]}>🏋️ {day.workoutType}</Text>
              </View>
            )}
            {day.isRestDay && (
              <View style={[s.badge, { backgroundColor: theme.rest + '22', borderColor: theme.rest }]}>
                <Text style={[s.badgeText, { color: theme.rest }]}>🧘 {day.workoutType}</Text>
              </View>
            )}
            {day.isClassDay && (
              <View style={[s.badge, { backgroundColor: theme.class + '22', borderColor: theme.class }]}>
                <Text style={[s.badgeText, { color: theme.class }]}>📚 {day.classTime}</Text>
              </View>
            )}
          </View>
          {day.workoutFocus && (
            <Text style={s.workoutFocus}>Focus: {day.workoutFocus}</Text>
          )}
          <Text style={s.eventCount}>{done}/{total} done</Text>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${total > 0 ? (done / total) * 100 : 0}%` as any }]} />
          </View>
        </View>

        <View style={s.timeline}>
          {day.events.map((event, idx) => (
            <ChecklistItem
              key={idx}
              event={event}
              done={checkedEvents.has(idx)}
              isLast={idx === total - 1}
              onToggle={() => toggleEvent(idx)}
            />
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
