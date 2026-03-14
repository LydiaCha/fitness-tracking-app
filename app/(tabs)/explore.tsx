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
import { useRouter } from 'expo-router';
import { AppThemeType } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { WEEK_SCHEDULE } from '@/constants/scheduleData';
import { getTodayId } from '@/utils/appConstants';
import { EVENT_ICONS } from '@/components/ChecklistItem';

const HIGHLIGHT_TYPES = ['gym', 'class', 'meal', 'shake', 'snack', 'supplement'] as const;

function useStyles(theme: AppThemeType) {
  return useMemo(() => StyleSheet.create({
    safe:         { flex: 1, backgroundColor: theme.bg },
    header:       { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
    title:        { fontSize: 24, fontWeight: '800', color: theme.textPrimary },

    pillScroll:   { flexGrow: 0 },
    pillRow:      { paddingHorizontal: 16, gap: 8, paddingBottom: 16 },
    pill:         { alignItems: 'center', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: theme.bgCard, borderWidth: 1, borderColor: theme.border, minWidth: 52 },
    pillSel:      { backgroundColor: theme.primary, borderColor: theme.primary },
    pillToday:    { borderColor: theme.primary },
    pillText:     { fontSize: 11, fontWeight: '700', color: theme.textMuted, letterSpacing: 0.5 },
    pillTextSel:  { color: '#fff' },
    todayDot:     { width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary, marginTop: 3 },
    todayDotSel:  { backgroundColor: '#fff' },

    scroll:        { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingBottom: 24 },

    card:         { backgroundColor: theme.bgCard, borderRadius: 18, padding: 20, borderWidth: 1, borderColor: theme.border },
    cardToday:    { borderColor: theme.primary, borderWidth: 2 },
    cardTop:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
    dayName:      { fontSize: 28, fontWeight: '800', color: theme.textPrimary },
    todayTag:     { backgroundColor: theme.primary + '30', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.primary },
    todayTagText: { fontSize: 10, fontWeight: '700', color: theme.primary, letterSpacing: 1.5 },

    badges:       { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    badge:        { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5, borderWidth: 1 },
    badgeText:    { fontSize: 12, fontWeight: '600' },
    focus:        { fontSize: 13, color: theme.textSecondary, marginBottom: 16 },

    typesRow:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    typeChip:     { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: theme.bgCardAlt, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
    typeDot:      { width: 7, height: 7, borderRadius: 3.5 },
    typeText:     { fontSize: 12, color: theme.textSecondary },

    count:        { fontSize: 12, color: theme.textMuted, marginBottom: 16 },

    cta:          { backgroundColor: theme.primary + '20', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.primary + '60' },
    ctaText:      { fontSize: 14, fontWeight: '700', color: theme.primary },
  }), [theme]);
}

export default function CalendarScreen() {
  const router = useRouter();
  const { theme } = useAppTheme();
  const s = useStyles(theme);
  const todayId = getTodayId();
  const [selectedId, setSelectedId] = useState(todayId);

  const day = WEEK_SCHEDULE.find(d => d.id === selectedId) ?? WEEK_SCHEDULE[0];
  const presentTypes = HIGHLIGHT_TYPES.filter(t => day.events.some(e => e.type === t));

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={theme.bg === '#F8F9FA' ? 'dark-content' : 'light-content'} backgroundColor={theme.bg} />

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

          <View style={s.cardTop}>
            <Text style={s.dayName}>{day.name}</Text>
            {selectedId === todayId && (
              <View style={s.todayTag}>
                <Text style={s.todayTagText}>TODAY</Text>
              </View>
            )}
          </View>

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

          {day.workoutFocus && <Text style={s.focus}>Focus: {day.workoutFocus}</Text>}

          <View style={s.typesRow}>
            {presentTypes.map(t => (
              <View key={t} style={s.typeChip}>
                <View style={[s.typeDot, { backgroundColor: (theme as Record<string, string>)[t] ?? theme.primary }]} />
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
