import { StyleSheet } from 'react-native';
import { AppThemeType } from '@/constants/theme';

export function createWeekStyles(theme: AppThemeType) {
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
      paddingVertical: 6,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    segmentPillActive: {
      backgroundColor: theme.primary,
    },
    segmentText: {
      fontSize: 12,
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
      gap: 16,
      marginBottom: 2,
    },
    weekNavBtn: {
      paddingBottom: 6,
      borderBottomWidth: 2,
      borderBottomColor: 'transparent',
    },
    weekNavBtnActive: {
      borderBottomColor: theme.gym,
    },
    weekNavBtnText: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.textMuted,
    },
    weekNavBtnTextActive: {
      color: theme.textPrimary,
      fontWeight: '700',
    },
    weekNavSwipeHint: {
      fontSize: 11,
      color: theme.textMuted,
      marginBottom: 12,
    },

    adjustPrefsRow: {
      marginBottom: 10,
    },
    adjustPrefsText: {
      fontSize: 12,
      color: theme.textMuted,
    },
    adjustCtaRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 18,
    },
    adjustCtaBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 10,
      alignItems: 'center',
      backgroundColor: theme.bgCardAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    adjustCtaText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
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
      backgroundColor: theme.meal,
      borderColor: theme.meal,
    },
    weekDayPillPast: {
      opacity: 0.5,
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
      backgroundColor: theme.meal,
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
      borderColor: theme.meal,
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
      backgroundColor: theme.meal + '16',
    },
    dayName: {
      fontSize: 16,
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
      backgroundColor: theme.meal,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
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
    dayChevron:     { fontSize: 14, color: theme.textMuted, marginLeft: 4 },
    dayChevronOpen: { transform: [{ rotate: '90deg' }] },
    mealEntryRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 11,
      borderTopWidth: 1,
      borderTopColor: theme.border + '55',
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
    mealExpandArrow: {
      fontSize: 14,
      color: theme.textMuted,
      paddingLeft: 4,
    },
    mealExpandArrowOpen: { transform: [{ rotate: '90deg' }] },
    mealExpandedSection: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      paddingTop: 2,
      borderTopWidth: 1,
      borderTopColor: theme.border + '55',
    },
    mealExpandLabel: {
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      color: theme.textMuted,
      marginBottom: 6,
    },
    mealIngredientText: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 20,
    },
    mealInstructionsText: {
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 19,
    },
    mealTipBox: { backgroundColor: theme.meal + '18', borderRadius: 8, padding: 10, marginTop: 10, borderWidth: 1, borderColor: theme.meal + '40' },
    mealTipText: { fontSize: 12, color: theme.meal, lineHeight: 17 },

    groceryBackBtn:     { alignSelf: 'flex-start', marginBottom: 16 },
    groceryBackBtnText: { fontSize: 14, fontWeight: '700' },

    // Grocery preview card (gradient banner on the weekly plan)
    grocerySectionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
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
      fontSize: 16,
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
      backgroundColor: theme.meal,
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

    // Header / instruction card — LinearGradient hero (no backgroundColor)
    groceryHeader: {
      borderRadius: 20,
      paddingHorizontal: 18,
      paddingTop: 18,
      paddingBottom: 16,
      marginBottom: 14,
      overflow: 'hidden',
    },
    groceryHeaderShine: {
      position: 'absolute',
      top: -30,
      left: -20,
      width: 160,
      height: 100,
      backgroundColor: '#ffffff18',
      borderRadius: 60,
      transform: [{ rotate: '-20deg' }],
    },
    groceryHeaderTop: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    groceryHeaderTextCol: { flex: 1, marginRight: 10 },
    groceryHeaderMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    groceryShareBtn: {
      paddingHorizontal: 12,
      paddingVertical: 5,
      borderRadius: 20,
      backgroundColor: 'rgba(255,255,255,0.25)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.35)',
    },
    groceryShareIcon: {
      fontSize: 12,
      fontWeight: '700',
      color: '#fff',
      letterSpacing: 0.2,
    },
    groceryHeaderTitle: {
      fontSize: 17,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: -0.3,
    },
    groceryHeaderSub: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.65)',
      marginTop: 3,
      lineHeight: 17,
    },
    groceryHeaderWeek: {
      fontSize: 11,
      fontWeight: '700',
      color: '#fff',
      backgroundColor: 'rgba(255,255,255,0.18)',
      paddingHorizontal: 9,
      paddingVertical: 4,
      borderRadius: 8,
      overflow: 'hidden',
    },
    groceryCoachLines: {
      gap: 7,
      marginBottom: 14,
    },
    groceryCoachLine: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.8)',
      lineHeight: 18,
    },
    groceryCoachCheck: {
      fontSize: 13,
      fontWeight: '900',
      color: '#fff',
    },

    groceryProgressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    groceryProgressTrack: {
      flex: 1,
      height: 6,
      backgroundColor: 'rgba(255,255,255,0.2)',
      borderRadius: 3,
      overflow: 'hidden',
    },
    groceryProgressFill: {
      height: 6,
      borderRadius: 3,
    },
    groceryProgressLabel: {
      fontSize: 11,
      fontWeight: '700',
      color: 'rgba(255,255,255,0.75)',
      minWidth: 64,
      textAlign: 'right',
    },

    // ── Completion card ──────────────────────────────────────────────────────
    groceryCompleteCard: {
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingVertical: 24,
      marginTop: 6,
      marginBottom: 14,
      alignItems: 'center',
      overflow: 'hidden',
    },
    groceryCompleteEmoji: {
      fontSize: 44,
      marginBottom: 12,
    },
    groceryCompleteTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: '#fff',
      textAlign: 'center',
      letterSpacing: -0.3,
      marginBottom: 6,
    },
    groceryCompleteSub: {
      fontSize: 13,
      color: 'rgba(255,255,255,0.72)',
      textAlign: 'center',
      lineHeight: 18,
    },

    // ── Kitchen Check / phase transition ────────────────────────────────────
    phaseCta: {
      paddingVertical: 14,
      borderRadius: 14,
      alignItems: 'center',
      marginBottom: 14,
    },
    phaseCtaText: {
      fontSize: 15,
      fontWeight: '800',
      color: '#fff',
    },
    phaseCtaSecondary: {
      paddingVertical: 11,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.bgCard,
    },
    phaseCtaSecondaryText: {
      fontSize: 13,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    atHomeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6,
      backgroundColor: theme.success + '20',
    },
    atHomeBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.success,
    },
    itemRowAtHome: {
      opacity: 0.35,
    },

    // Legacy fields kept for compatibility
    summaryBar:   { marginBottom: 0 },
    summaryText:  { fontSize: 13, color: theme.textSecondary },
    summaryCount: { color: theme.textPrimary, fontWeight: '700' },

    actionRow: {
      flexDirection: 'row',
      marginBottom: 14,
      gap: 10,
    },
    actionBtn: {
      flex: 1,
      paddingVertical: 12,
      borderRadius: 12,
      alignItems: 'center',
      backgroundColor: theme.bgCard,
      borderWidth: 1,
      borderColor: theme.border,
    },
    actionBtnPrimary: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    actionBtnText: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textSecondary,
    },
    actionBtnTextPrimary: {
      fontSize: 14,
      fontWeight: '700',
      color: '#fff',
    },
    sectionWrapper: {
      marginBottom: 12,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.border,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 13,
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
      fontSize: 16,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    sectionCount: {
      fontSize: 12,
      color: theme.textMuted,
      fontWeight: '600',
    },
    sectionDoneBadge: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: theme.success,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sectionDoneCheck: {
      fontSize: 10,
      color: '#fff',
      fontWeight: '900',
    },
    chevron: {
      fontSize: 14,
      color: theme.textMuted,
      marginLeft: 4,
    },
    chevronOpen: { transform: [{ rotate: '90deg' }] },
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
      opacity: 0.35,
    },
    itemRowSep: {
      height: 1,
      backgroundColor: theme.border,
      marginLeft: 60,
    },
    checkbox: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
    },
    checkmark: {
      fontSize: 12,
      color: '#fff',
      fontWeight: '900',
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
      borderWidth: 1,
      borderColor: theme.border,
    },
    qtyText: {
      fontSize: 12,
      fontWeight: '700',
      color: theme.textSecondary,
    },

    // ── Workout / Training segment ──────────────────────────────────────────

    woSummaryCard: {
      backgroundColor: theme.bgCard,
      borderRadius: 16,
      padding: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: theme.border,
    },
    woSummaryTitle: {
      fontSize: 16,
      fontWeight: '800',
      color: theme.textPrimary,
      marginBottom: 2,
    },
    woSummaryMeta: {
      fontSize: 12,
      color: theme.textMuted,
      marginBottom: 14,
    },
    woDayPillRow: {
      flexDirection: 'row',
      gap: 6,
    },
    woSummaryDayPill: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
      gap: 4,
    },
    woSummaryDayText: {
      fontSize: 11,
      fontWeight: '800',
    },
    woSummaryDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
    },

    woDayCard: {
      backgroundColor: theme.bgCard,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: theme.border,
      marginBottom: 10,
      overflow: 'hidden',
    },
    woDayCardToday: {
      borderColor: theme.gym,
      borderWidth: 1.5,
    },
    woDayCardDone: {
      opacity: 0.5,
    },
    woDayHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 14,
      paddingVertical: 13,
      gap: 10,
    },
    woDayBadge: {
      width: 40,
      height: 40,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    woDayBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 0.5,
    },
    woWorkoutType: {
      fontSize: 14,
      fontWeight: '700',
      color: theme.textPrimary,
    },
    woTodayBadge: {
      backgroundColor: theme.gym,
      borderRadius: 6,
      paddingHorizontal: 7,
      paddingVertical: 2,
    },
    woTodayBadgeText: {
      fontSize: 10,
      fontWeight: '800',
      color: '#fff',
      letterSpacing: 0.5,
    },
    woCompletedCheck: {
      fontSize: 12,
      fontWeight: '700',
    },
    woMuscles: {
      fontSize: 12,
      color: theme.textSecondary,
      marginTop: 1,
    },
    woDurPill: {
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderWidth: 1,
    },
    woDurText: {
      fontSize: 11,
      fontWeight: '700',
    },
    woChevron: {
      fontSize: 14,
      color: theme.textMuted,
    },
    woChevronOpen: { transform: [{ rotate: '90deg' }] },

    woExerciseBlock: {
      paddingHorizontal: 14,
      paddingBottom: 14,
      paddingTop: 2,
      borderTopWidth: 1,
      borderTopColor: theme.border + '55',
      gap: 2,
    },
    woExerciseSectionLabel: {
      fontSize: 10,
      fontWeight: '700',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
      marginTop: 10,
      marginBottom: 4,
    },
    woExerciseRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 4,
    },
    woExerciseDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      flexShrink: 0,
    },
    woExerciseText: {
      flex: 1,
      fontSize: 13,
      color: theme.textSecondary,
      lineHeight: 18,
    },

    woRestNote: {
      paddingHorizontal: 14,
      paddingBottom: 12,
      paddingTop: 2,
      borderTopWidth: 1,
      borderTopColor: theme.border + '55',
    },
    woRestNoteText: {
      fontSize: 12,
      color: theme.textSecondary,
      lineHeight: 18,
    },

  });
}

export type WeekStyles = ReturnType<typeof createWeekStyles>;
