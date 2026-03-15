import { StyleSheet } from 'react-native';
import { AppThemeType } from '@/constants/theme';

export function createNutritionStyles(theme: AppThemeType) {
  return StyleSheet.create({
    safe:         { flex: 1, backgroundColor: theme.bg },
    scroll:       { flex: 1 },
    scrollContent:{ paddingHorizontal: 16, paddingTop: 8 },
    header:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 },
    headerText:   { flex: 1 },
    title:        { fontSize: 24, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
    subtitle:     { fontSize: 13, color: theme.textSecondary },
    themeBtn:     { padding: 6, marginTop: 2 },
    themeBtnText: { fontSize: 20 },

    // Score Card
    scoreCard:      { backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    periodRow:      { flexDirection: 'row', gap: 8, marginBottom: 16 },
    periodPill:     { flex: 1, paddingVertical: 6, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    periodText:     { fontSize: 12, fontWeight: '600', color: theme.textMuted },
    scoreMain:      { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
    scorePct:       { fontSize: 48, fontWeight: '800', lineHeight: 54 },
    scoreRight:     { flex: 1 },
    scoreBarBg:     { height: 8, backgroundColor: theme.bgCardAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
    scoreBarFill:   { height: 8, borderRadius: 4 },
    scoreCount:     { fontSize: 13, color: theme.textSecondary, marginBottom: 6 },
    scoreBreakdown: { fontSize: 12, color: theme.textMuted, lineHeight: 18 },
    streakChip:     { backgroundColor: theme.gym + '20', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start', borderWidth: 1, borderColor: theme.gym + '44' },
    streakChipText: { fontSize: 12, color: theme.gym, fontWeight: '600' },

    // Card
    card:         { backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    cardTitle:    { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 12 },

    // Grid
    gridRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    gridIcon:      { width: 28, fontSize: 16, textAlign: 'center' },
    gridCell:      { flex: 1, alignItems: 'center' },
    gridDayLetter: { fontSize: 10, color: theme.textMuted, fontWeight: '600' },
    gridDate:      { fontSize: 9, color: theme.textMuted, marginTop: 1, marginBottom: 4 },
    gridDot:       { width: 18, height: 18, borderRadius: 9, backgroundColor: theme.bgCardAlt },
    gridDash:      { fontSize: 12, color: theme.border, marginTop: 5 },

    // Weight
    weightSummary:  { flexDirection: 'row', alignItems: 'baseline', gap: 12, marginBottom: 4 },
    weightCurrent:  { fontSize: 30, fontWeight: '800' },
    weightDelta:    { fontSize: 14, fontWeight: '600' },
    weightInputRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
    weightInput:    { flex: 1, backgroundColor: theme.bgCardAlt, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 16, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
    weightBtn:      { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 16, justifyContent: 'center' },
    weightBtnText:  { fontSize: 14, fontWeight: '700', color: '#fff' },
    weightHistory:  { marginTop: 14, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 12 },
    historyLabel:   { fontSize: 11, color: theme.textMuted, marginBottom: 8, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    historyRow:     { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: theme.border + '55' },
    historyDate:    { fontSize: 13, color: theme.textSecondary },
    historyKg:      { fontSize: 13, fontWeight: '700', color: theme.textPrimary },
    historyHint:    { fontSize: 10, color: theme.textMuted, marginTop: 8, textAlign: 'center' },
    emptyText:      { fontSize: 13, color: theme.textMuted, textAlign: 'center', marginTop: 16, lineHeight: 20 },

    summaryRow:   { flexDirection: 'row', justifyContent: 'space-around', marginTop: 4 },
    summaryItem:  { alignItems: 'center' },
    summaryValue: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
    summaryLabel: { fontSize: 10, color: theme.textSecondary, textAlign: 'center' },
  });
}

export type NutritionStyles = ReturnType<typeof createNutritionStyles>;
