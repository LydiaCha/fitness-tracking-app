import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppTheme } from '@/constants/theme';
import { WEEK_SCHEDULE } from '@/constants/scheduleData';
import { getTodayId } from '@/utils/appConstants';
import { EVENT_ICONS } from '@/components/ChecklistItem';

const HIGHLIGHT_TYPES = ['gym', 'class', 'meal', 'shake', 'snack', 'supplement'] as const;

export default function CalendarScreen() {
  const router = useRouter();
  const todayId = getTodayId();
  const [selectedId, setSelectedId] = useState(todayId);

  const day = WEEK_SCHEDULE.find(d => d.id === selectedId) ?? WEEK_SCHEDULE[0];
  const presentTypes = HIGHLIGHT_TYPES.filter(t => day.events.some(e => e.type === t));

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor={AppTheme.bg} />

      <View style={s.header}>
        <Text style={s.title}>Weekly Calendar</Text>
      </View>

      {/* Day pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.pillScroll}
        contentContainerStyle={s.pillRow}
      >
        {WEEK_SCHEDULE.map(d => {
          const sel = d.id === selectedId;
          const isToday = d.id === todayId;
          return (
            <TouchableOpacity
              key={d.id}
              onPress={() => setSelectedId(d.id)}
              style={[s.pill, sel && s.pillSel, !sel && isToday && s.pillToday]}
            >
              <Text style={[s.pillText, sel && s.pillTextSel]}>{d.shortName}</Text>
              {isToday && <View style={[s.todayDot, sel && s.todayDotSel]} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Detail card */}
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[s.card, selectedId === todayId && s.cardToday]}>

          {/* Day name + today tag */}
          <View style={s.cardTop}>
            <Text style={s.dayName}>{day.name}</Text>
            {selectedId === todayId && (
              <View style={s.todayTag}>
                <Text style={s.todayTagText}>TODAY</Text>
              </View>
            )}
          </View>

          {/* Badges */}
          <View style={s.badges}>
            {day.isGymDay && (
              <View style={[s.badge, { backgroundColor: AppTheme.gym + '22', borderColor: AppTheme.gym }]}>
                <Text style={[s.badgeText, { color: AppTheme.gym }]}>🏋️ {day.workoutType}</Text>
              </View>
            )}
            {day.isRestDay && (
              <View style={[s.badge, { backgroundColor: AppTheme.rest + '22', borderColor: AppTheme.rest }]}>
                <Text style={[s.badgeText, { color: AppTheme.rest }]}>🧘 {day.workoutType}</Text>
              </View>
            )}
            {day.isClassDay && (
              <View style={[s.badge, { backgroundColor: AppTheme.class + '22', borderColor: AppTheme.class }]}>
                <Text style={[s.badgeText, { color: AppTheme.class }]}>📚 {day.classTime}</Text>
              </View>
            )}
          </View>

          {day.workoutFocus && <Text style={s.focus}>Focus: {day.workoutFocus}</Text>}

          {/* Event type chips */}
          <View style={s.typesRow}>
            {presentTypes.map(t => (
              <View key={t} style={s.typeChip}>
                <View style={[s.typeDot, { backgroundColor: (AppTheme as Record<string, string>)[t] ?? AppTheme.primary }]} />
                <Text style={s.typeText}>{EVENT_ICONS[t]} {t}</Text>
              </View>
            ))}
          </View>

          <Text style={s.count}>{day.events.length} events</Text>

          <TouchableOpacity style={s.cta} onPress={() => router.push(`/day/${day.id}`)}>
            <Text style={s.ctaText}>View full schedule →</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:         { flex: 1, backgroundColor: AppTheme.bg },
  header:       { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  title:        { fontSize: 24, fontWeight: '800', color: AppTheme.textPrimary },

  pillScroll:   { flexGrow: 0 },
  pillRow:      { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
  pill:         { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: AppTheme.bgCard, borderWidth: 1, borderColor: AppTheme.border, minWidth: 52 },
  pillSel:      { backgroundColor: AppTheme.primary, borderColor: AppTheme.primary },
  pillToday:    { borderColor: AppTheme.primary },
  pillText:     { fontSize: 11, fontWeight: '700', color: AppTheme.textMuted, letterSpacing: 0.5 },
  pillTextSel:  { color: '#fff' },
  todayDot:     { width: 4, height: 4, borderRadius: 2, backgroundColor: AppTheme.primary, marginTop: 3 },
  todayDotSel:  { backgroundColor: '#fff' },

  scroll:        { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },

  card:         { backgroundColor: AppTheme.bgCard, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: AppTheme.border },
  cardToday:    { borderColor: AppTheme.primary, borderWidth: 2 },
  cardTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  dayName:      { fontSize: 28, fontWeight: '800', color: AppTheme.textPrimary },
  todayTag:     { backgroundColor: AppTheme.primary + '30', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: AppTheme.primary },
  todayTagText: { fontSize: 10, fontWeight: '700', color: AppTheme.primary, letterSpacing: 1.5 },

  badges:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  badge:        { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
  badgeText:    { fontSize: 12, fontWeight: '600' },
  focus:        { fontSize: 13, color: AppTheme.textSecondary, marginBottom: 16 },

  typesRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  typeChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: AppTheme.bgCardAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  typeDot:      { width: 7, height: 7, borderRadius: 3.5 },
  typeText:     { fontSize: 12, color: AppTheme.textSecondary },

  count:        { fontSize: 12, color: AppTheme.textMuted, marginBottom: 16 },

  cta:          { backgroundColor: AppTheme.primary + '20', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: AppTheme.primary + '60' },
  ctaText:      { fontSize: 14, fontWeight: '700', color: AppTheme.primary },
});
