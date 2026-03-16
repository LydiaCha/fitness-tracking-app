import { StyleSheet } from 'react-native';
import { AppThemeType } from '@/constants/theme';

export function createChecklistItemStyles(theme: AppThemeType) {
  return StyleSheet.create({
    // ── Outer wrapper ──────────────────────────────────────────────────────
    row:          { flexDirection: 'row', gap: 12 },

    // ── Vertical spine ────────────────────────────────────────────────────
    spine:        { alignItems: 'center', width: 18, paddingTop: 6 },
    dot:          { width: 10, height: 10, borderRadius: 5, zIndex: 1 },
    dotDone:      { width: 8, height: 8, borderRadius: 4 },
    line:         { flex: 1, width: 2, marginTop: 3, borderRadius: 1 },

    // ── DONE (compact) ────────────────────────────────────────────────────
    doneRow:      { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, marginBottom: 2 },
    doneCheck:    { fontSize: 11, color: theme.success, fontWeight: '800' },
    doneTime:     { fontSize: 11, color: theme.textMuted, fontWeight: '600', minWidth: 52 },
    doneLine:     { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
    doneIcon:     { fontSize: 13 },
    doneLabel:    { fontSize: 13, color: theme.textMuted, textDecorationLine: 'line-through', flex: 1 },

    // ── SKIPPED (compact) ─────────────────────────────────────────────────
    skippedRow:   { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 5, paddingHorizontal: 8, marginBottom: 2, borderRadius: 8, backgroundColor: '#f59e0b14' },
    skippedDash:  { fontSize: 12, color: '#f59e0b', fontWeight: '700' },
    skippedLabel: { fontSize: 13, color: theme.textMuted, textDecorationLine: 'line-through', opacity: 0.6, flex: 1 },

    // ── UPCOMING (standard card) ───────────────────────────────────────────
    upcomingWrapper: { flex: 1, marginBottom: 6 },
    upcomingTime:    { fontSize: 12, fontWeight: '700', color: theme.textSecondary, marginBottom: 6, letterSpacing: 0.2 },
    upcomingCard:    { backgroundColor: theme.bgCard, borderRadius: 12, padding: 12, borderLeftWidth: 3, borderWidth: 1, borderColor: theme.border },
    upcomingTopRow:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
    upcomingIcon:    { fontSize: 17 },
    upcomingLabel:   { fontSize: 14, fontWeight: '600', color: theme.textPrimary, flex: 1 },
    upcomingDur:     { borderRadius: 5, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
    upcomingDurText: { fontSize: 10, fontWeight: '700' },
    upcomingDetail:  { fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginTop: 6 },
    checkboxRow:     { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
    checkbox:        { width: 20, height: 20, borderRadius: 6, borderWidth: 2, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
    checkmark:       { fontSize: 11, color: '#fff', fontWeight: '700' },
    skipBtn:         { marginLeft: 'auto' as any, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.border },
    skipBtnText:     { fontSize: 12, color: theme.textMuted, fontWeight: '600' },

    // ── Bullet detail (shared) ─────────────────────────────────────────────
    detailBlock:  { marginTop: 6, gap: 2 },
    detailLine:   { fontSize: 12, color: theme.textSecondary, lineHeight: 18, paddingLeft: 2 },
    bulletRow:    { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 },
    bulletDot:    { width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: theme.border, justifyContent: 'center', alignItems: 'center' },
    bulletCheck:  { fontSize: 9, color: '#fff', fontWeight: '700' },
    bulletText:   { flex: 1, fontSize: 12, color: theme.textSecondary, lineHeight: 18 },
    bulletCrossed:{ textDecorationLine: 'line-through', color: theme.textMuted, opacity: 0.55 },

    // ── Recipe card (shared) ───────────────────────────────────────────────
    rcCard:       { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border },
    rcHeader:     { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    rcEmoji:      { fontSize: 22 },
    rcInfo:       { flex: 1 },
    rcName:       { fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginBottom: 1 },
    rcTiming:     { fontSize: 11, color: theme.textSecondary },
    rcArrow:      { fontSize: 11, color: theme.textMuted },
    rcMacros:     { flexDirection: 'row', gap: 10, flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 8, marginBottom: 2 },
    rcMacro:      { fontSize: 12, fontWeight: '600' },
    rcBody:       { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: theme.border },
    rcDesc:       { fontSize: 12, color: theme.textSecondary, lineHeight: 18, marginBottom: 10 },
    rcSection:    { fontSize: 11, fontWeight: '700', color: theme.textSecondary, letterSpacing: 0.5, marginBottom: 6 },
    rcMethod:     { fontSize: 12, color: theme.textSecondary, lineHeight: 18 },
    rcTip:        { backgroundColor: theme.primary + '18', borderRadius: 8, padding: 10, marginTop: 10, borderWidth: 1, borderColor: theme.primary + '40' },
    rcTipText:    { fontSize: 12, color: theme.primaryLight, lineHeight: 17 },
  });
}

export type ChecklistItemStyles = ReturnType<typeof createChecklistItemStyles>;
