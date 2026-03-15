import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { AppThemeType } from '@/constants/theme';

export function createPlanStyles(theme: AppThemeType) {
  return StyleSheet.create({
    safe:          { flex: 1, backgroundColor: theme.bg },
    scroll:        { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 },

    // Segment control
    segmentWrapper: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 10,
      backgroundColor: theme.bg,
    },
    segmentRow: {
      flexDirection: 'row',
      backgroundColor: theme.bgCardAlt,
      borderRadius: 12,
      padding: 3,
      gap: 2,
    },
    segmentPill: {
      flex: 1,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentPillActive: {
      backgroundColor: theme.primary,
    },
    segmentText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
    },
    segmentTextActive: {
      color: '#fff',
    },

    // ── Meals segment ──────────────────────────────────────────────────────

    mealsHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 2,
    },
    mealsTitle: {
      flex: 1,
      fontSize: 26,
      fontWeight: '800',
      color: theme.textPrimary,
      letterSpacing: -0.3,
    },
    weekNavRow: {
      flexDirection: 'row',
      backgroundColor: theme.bgCardAlt,
      borderRadius: 10,
      padding: 3,
      gap: 2,
    },
    weekNavBtn: {
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
    },
    weekNavBtnActive: {
      backgroundColor: theme.primary,
    },
    weekNavBtnText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textMuted,
    },
    weekNavBtnTextActive: {
      color: '#fff',
    },

    adjustPrefsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 18,
    },
    adjustPrefsText: {
      fontSize: 12,
      color: theme.textMuted,
    },
    adjustPrefsLink: {
      fontSize: 12,
      color: theme.primary,
      fontWeight: '600',
    },

    // Week strip
    weekStrip: {
      flexDirection: 'row',
      marginBottom: 20,
      gap: 5,
    },
    weekDayPill: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
    },
    weekDayPillToday: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    weekDayPillPast: {
      opacity: 0.45,
    },
    weekDayPillName: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.textMuted,
      letterSpacing: 0.3,
      marginBottom: 5,
    },
    weekDayPillNameToday: {
      color: '#fff',
    },
    weekDayPillDate: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    weekDayPillDateToday: {
      color: '#fff',
    },

    progressBarWrapper: {
      marginBottom: 12,
    },
    progressLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      marginBottom: 6,
    },
    progressBarBg: {
      height: 6,
      backgroundColor: theme.bgCardAlt,
      borderRadius: 3,
      overflow: 'hidden',
    },
    progressBarFill: {
      height: 6,
      borderRadius: 3,
      backgroundColor: theme.primary,
    },

    errorBanner: {
      backgroundColor: theme.warning + '22',
      borderColor: theme.warning + '55',
      borderWidth: 1,
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    errorText: {
      fontSize: 13,
      color: theme.warning,
      lineHeight: 18,
    },


    // Day card
    dayCard: {
      backgroundColor: theme.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 14,
      overflow: 'hidden',
    },
    dayCardToday: {
      borderColor: theme.primary,
      borderWidth: 1.5,
    },
    dayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 13,
      backgroundColor: theme.bgCardAlt,
      gap: 6,
    },
    dayHeaderToday: {
      backgroundColor: theme.primary + '16',
    },
    dayName: {
      fontSize: 14,
      fontWeight: '800',
      color: theme.textPrimary,
    },
    dayDate: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.textSecondary,
      flex: 1,
    },
    todayBadge: {
      backgroundColor: theme.primary,
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      marginRight: 4,
    },
    todayBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.5,
    },
    dayKcal: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: '600',
    },
    mealEntryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderTopWidth: 1,
      borderTopColor: theme.border + '66',
      gap: 10,
    },
    mealTypePill: {
      borderRadius: 7,
      paddingHorizontal: 9,
      paddingVertical: 4,
      width: 82,
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    mealTypePillText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.1,
    },
    mealEntryInfo: {
      flex: 1,
    },
    mealEntryName: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.textPrimary,
      marginBottom: 3,
    },
    mealEntryMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    mealEntryMetaText: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: '500',
    },
    mealPortionBadge: {
      borderRadius: 5,
      paddingHorizontal: 7,
      paddingVertical: 2,
      backgroundColor: theme.bgCardAlt,
    },
    mealPortionText: {
      fontSize: 11,
      fontWeight: '600',
      color: theme.textSecondary,
    },

    // Grocery preview card (gradient banner on the weekly plan)
    grocerySectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 18,
      overflow: 'hidden',
      paddingHorizontal: 16,
      paddingVertical: 16,
      marginBottom: 14,
      gap: 10,
    },
    grocerySectionGradient: {
      ...StyleSheet.absoluteFillObject,
    },
    grocerySectionShine: {
      position: 'absolute',
      top: -24,
      right: -24,
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor: '#ffffff12',
    },
    grocerySectionRowExpanded: {
      borderBottomLeftRadius: 0,
      borderBottomRightRadius: 0,
      marginBottom: 0,
    },
    grocerySectionEmoji: { fontSize: 22 },
    grocerySectionTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: '#ffffff',
    },
    grocerySectionCount: {
      fontSize: 13,
      color: '#ffffffcc',
      fontWeight: '500',
    },
    grocerySectionChevron: {
      fontSize: 20,
      color: '#ffffff',
      fontWeight: '600',
    },

    // Empty states
    emptyCard: {
      backgroundColor: theme.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 32,
      alignItems: 'center',
      marginBottom: 12,
    },
    emptyEmoji: {
      fontSize: 40,
      marginBottom: 12,
    },
    emptyTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textPrimary,
      marginBottom: 6,
    },
    emptyBody: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
      marginBottom: 16,
    },
    emptyBtn: {
      backgroundColor: theme.primary,
      borderRadius: 10,
      paddingHorizontal: 20,
      paddingVertical: 10,
    },
    emptyBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },

    generatingState: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 24,
    },
    generatingText: {
      fontSize: 13,
      color: theme.textSecondary,
    },

    // ── Grocery segment ────────────────────────────────────────────────────

    summaryBar: {
      marginBottom: 12,
      backgroundColor: theme.bgCard,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    summaryText: {
      fontSize: 13,
      color: theme.textSecondary,
      textAlign: 'center',
    },
    summaryCount: {
      color: theme.textPrimary,
      fontWeight: '700',
    },
    actionRow: {
      flexDirection: 'row',
      marginBottom: 14,
      gap: 10,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 11,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionBtnPrimary: {
      backgroundColor: theme.primary + '20',
      borderColor: theme.primary + '60',
    },
    actionBtnText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    actionBtnTextPrimary: {
      color: theme.primary,
    },
    sectionWrapper: {
      marginBottom: 14,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 14,
      backgroundColor: theme.bgCardAlt,
      gap: 10,
    },
    emojiCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emojiText: {
      fontSize: 18,
    },
    sectionTitle: {
      flex: 1,
      fontSize: 15,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    sectionCount: {
      fontSize: 13,
      color: theme.textMuted,
      marginRight: 6,
    },
    chevron: {
      fontSize: 14,
      color: theme.textMuted,
    },
    divider: {
      height: 1,
      backgroundColor: theme.border,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 13,
      backgroundColor: theme.bgCard,
      gap: 12,
    },
    itemRowChecked: {
      opacity: 0.4,
    },
    itemRowSep: {
      height: 1,
      backgroundColor: theme.border,
      marginLeft: 60,
    },
    checkbox: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    checkmark: {
      fontSize: 12,
      color: '#fff',
      fontWeight: '800',
    },
    itemName: {
      flex: 1,
      fontSize: 15,
      color: theme.textPrimary,
      fontWeight: '500',
    },
    itemNameChecked: {
      textDecorationLine: 'line-through',
      color: theme.textMuted,
    },
    qtyBadge: {
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
      backgroundColor: theme.bgCardAlt,
    },
    qtyText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
    },

    // ── Habits segment ─────────────────────────────────────────────────────

    progressCard: {
      backgroundColor: theme.bgCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    progressHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    progressTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    progressDate: {
      fontSize: 12,
      color: theme.textMuted,
      marginTop: 2,
    },
    progressPct: {
      fontSize: 36,
      fontWeight: '800',
    },
    habitProgressBarBg: {
      height: 8,
      backgroundColor: theme.bgCardAlt,
      borderRadius: 4,
      overflow: 'hidden',
      marginBottom: 8,
    },
    habitProgressBarFill: {
      height: 8,
      borderRadius: 4,
    },
    progressCount: {
      fontSize: 12,
      color: theme.textSecondary,
    },
    perfectText: {
      fontSize: 13,
      color: theme.meal,
      fontWeight: '600',
      marginTop: 6,
    },
    card: {
      backgroundColor: theme.bgCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.textPrimary,
      marginBottom: 10,
    },
    cardSubtitle: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 14,
      marginTop: -6,
    },
    habitRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 11,
      paddingHorizontal: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 8,
      backgroundColor: theme.bgCardAlt,
    },
    habitCheck: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    habitCheckMark: {
      fontSize: 12,
      color: '#fff',
      fontWeight: '800',
    },
    habitEmoji: {
      fontSize: 18,
    },
    habitLabel: {
      flex: 1,
      fontSize: 14,
      color: theme.textSecondary,
      fontWeight: '500',
    },
    streakBadge: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderWidth: 1,
    },
    streakText: {
      fontSize: 11,
      fontWeight: '700',
    },
    gridHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    gridHabitLabel: {
      width: 32,
    },
    gridDayCell: {
      flex: 1,
      alignItems: 'center',
    },
    gridDayText: {
      fontSize: 10,
      color: theme.textMuted,
      fontWeight: '600',
    },
    gridDateText: {
      fontSize: 9,
      color: theme.textMuted,
      marginTop: 1,
    },
    gridRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 10,
    },
    gridHabitEmoji: {
      fontSize: 16,
    },
    gridDot: {
      width: 18,
      height: 18,
      borderRadius: 9,
      backgroundColor: theme.bgCardAlt,
    },
    streakRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginBottom: 10,
    },
    streakEmoji: {
      fontSize: 16,
      width: 24,
    },
    streakHabitLabel: {
      fontSize: 12,
      color: theme.textSecondary,
      width: 130,
    },
    streakBarBg: {
      flex: 1,
      height: 6,
      backgroundColor: theme.bgCardAlt,
      borderRadius: 3,
      overflow: 'hidden',
    },
    streakBarFill: {
      height: 6,
      borderRadius: 3,
    },
    streakDays: {
      fontSize: 12,
      fontWeight: '700',
      width: 28,
      textAlign: 'right',
    },

  });
}

export type PlanStyles = ReturnType<typeof createPlanStyles>;
