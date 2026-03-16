import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ScheduleEvent } from '@/constants/scheduleData';
import { AppThemeType } from '@/constants/theme';
import { EVENT_ICONS } from '@/components/ChecklistItem';

interface Props {
  event: ScheduleEvent;
  onMarkDone: () => void;
  onScrollTo?: () => void;
  theme: AppThemeType;
}

export function NextUpCard({ event, onMarkDone, onScrollTo, theme }: Props) {
  const icon  = EVENT_ICONS[event.type] ?? '•';
  const color = (theme as Record<string, string>)[event.type] ?? theme.primary;

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={onScrollTo}
      style={[styles.card, { backgroundColor: theme.bgCard, borderColor: color + '66' }]}
    >
      {/* Header row */}
      <View style={[styles.headerRow, { borderBottomColor: theme.border }]}>
        <View style={[styles.badge, { backgroundColor: color + '22' }]}>
          <Text style={[styles.badgeText, { color }]}>NEXT UP</Text>
        </View>
        <Text style={[styles.time, { color: theme.textMuted }]}>{event.time}</Text>
      </View>

      {/* Content row */}
      <View style={styles.contentRow}>
        <View style={[styles.iconBox, { backgroundColor: color + '18' }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        <View style={styles.textBlock}>
          <Text style={[styles.label, { color: theme.textPrimary }]} numberOfLines={1}>
            {event.label}
          </Text>
          {!!event.detail && (
            <Text style={[styles.detail, { color: theme.textSecondary }]} numberOfLines={2}>
              {event.detail}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: color }]}
          onPress={onMarkDone}
          activeOpacity={0.8}>
          <Text style={styles.doneBtnText}>Mark done</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 16,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  badge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.2,
  },
  time: {
    fontSize: 13,
    fontWeight: '600',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 22,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
  },
  detail: {
    fontSize: 12,
    lineHeight: 16,
  },
  doneBtn: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
});
