import { StyleSheet } from 'react-native';
import { AppThemeType } from '@/constants/theme';

export function createProfileStyles(theme: AppThemeType) {
  return StyleSheet.create({
    safe:         { flex: 1, backgroundColor: theme.bg },
    scroll:       { flex: 1 },
    content:      { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 },

    headerRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 4 },
    headerTitle:  { fontSize: 22, fontWeight: '800', color: theme.textPrimary },
    avatarRow:    { alignItems: 'center', paddingVertical: 24 },
    avatar:       { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.primary + '33', alignItems: 'center', justifyContent: 'center', marginBottom: 12, borderWidth: 2, borderColor: theme.primary + '55' },
    avatarEmoji:  { fontSize: 38 },
    name:         { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
    tagline:      { fontSize: 13, color: theme.textSecondary },

    statsRow:     { flexDirection: 'row', gap: 10, marginBottom: 24 },
    statChip:     { flex: 1, backgroundColor: theme.bgCard, borderRadius: 12, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    statValue:    { fontSize: 20, fontWeight: '800', marginBottom: 2 },
    statLabel:    { fontSize: 10, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },

    sectionLabel: { fontSize: 11, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8, marginTop: 8 },
    card:         { backgroundColor: theme.bgCard, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },

    row:          { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border + '55' },
    rowLast:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
    rowOpen:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.border },
    rowIcon:      { fontSize: 18, width: 32 },
    rowLabel:     { flex: 1, fontSize: 15, color: theme.textPrimary, fontWeight: '500' },
    rowValue:     { fontSize: 13, color: theme.textMuted, maxWidth: 180, textAlign: 'right' },
    chevron:      { fontSize: 12, color: theme.textMuted, marginLeft: 8 },

    expandArea:     { backgroundColor: theme.bgCardAlt, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: theme.border + '55' },
    expandAreaLast: { backgroundColor: theme.bgCardAlt, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 14 },

    timeLabel:    { fontSize: 10, color: theme.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },

    // Gym day toggles
    daysRow:      { flexDirection: 'row', gap: 6, marginBottom: 12 },
    dayBtn:       { flex: 1, aspectRatio: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: theme.border, backgroundColor: theme.bgCard },
    dayBtnOn:     { backgroundColor: theme.primary + '22', borderColor: theme.primary },
    dayText:      { fontSize: 12, fontWeight: '700', color: theme.textMuted },
    dayTextOn:    { color: theme.primary },

    // Macro display
    macroDisplayGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: 14, gap: 8 },
    macroDisplayItem: { width: '47%', backgroundColor: theme.bgCardAlt, borderRadius: 10, padding: 12 },
    macroDisplayVal:  { fontSize: 22, fontWeight: '800', marginBottom: 2 },
    macroDisplayLbl:  { fontSize: 11, color: theme.textMuted },

    macroGrid:    { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 12 },
    macroField:   { width: '47%' },
    macroInput:   { backgroundColor: theme.bgCard, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, fontSize: 18, fontWeight: '700', color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },

    // Save row
    saveRow:      { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
    saveBtn:      { backgroundColor: theme.primary, borderRadius: 8, paddingHorizontal: 18, paddingVertical: 8 },
    saveBtnText:  { fontSize: 13, fontWeight: '700', color: '#fff' },
    cancelBtn:    { borderRadius: 8, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: theme.border },
    cancelBtnText:{ fontSize: 13, color: theme.textMuted },

    // Pill options
    pillRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
    pill:         { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgCard },
    pillOn:       { backgroundColor: theme.primary + '22', borderColor: theme.primary },
    pillText:     { fontSize: 13, color: theme.textMuted, fontWeight: '500' },
    pillTextOn:   { color: theme.primary, fontWeight: '700' },

    // Metric inputs
    metricGrid:   { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 14 },
    metricField:  { width: '47%' },
    metricInput:  { backgroundColor: theme.bgCard, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, fontSize: 16, fontWeight: '700', color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },

    calcBtn:      { backgroundColor: theme.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 4 },
    calcBtnText:  { fontSize: 14, fontWeight: '700', color: '#fff' },

    // Weekly schedule day rows
    dayRow:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border + '55' },
    dayRowOpen:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
    dayRowLast:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
    dayName:      { fontSize: 13, fontWeight: '700', color: theme.textPrimary, width: 36 },
    todayBadge:   { backgroundColor: theme.primary + '33', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, marginRight: 6 },
    todayText:    { fontSize: 9, fontWeight: '800', color: theme.primary, textTransform: 'uppercase' },
    dayTags:      { flex: 1, flexDirection: 'row', gap: 4, flexWrap: 'wrap' },
    dayTag:       { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: theme.bgCardAlt },
    dayTagText:   { fontSize: 10, fontWeight: '600', color: theme.textMuted },
    daySleep:     { fontSize: 11, color: theme.textMuted, marginLeft: 4 },

    workToggleRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
    workToggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: theme.border, backgroundColor: theme.bgCard },
    workToggleBtnOn: { backgroundColor: theme.primary + '22', borderColor: theme.primary },
    workToggleText:  { fontSize: 13, fontWeight: '600', color: theme.textMuted },
    workToggleTextOn:{ color: theme.primary },

    // Switch rows
    rowSwitch:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: theme.border + '55' },
    rowSwitchLast:{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13 },
    switchSub:    { fontSize: 12, color: theme.textMuted, marginTop: 1 },

    // Achievements
    badgeScroll:        { marginBottom: 20 },
    badgeScrollContent: { paddingRight: 16, gap: 10, flexDirection: 'row' },
    badgeCard:          { width: 72, alignItems: 'center', backgroundColor: theme.bgCard, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 6, borderWidth: 1.5, borderColor: theme.border },
    badgeCardEarned:    { borderColor: theme.primary, backgroundColor: theme.primary + '12' },
    badgeEmoji:         { fontSize: 28, marginBottom: 6 },
    badgeLocked:        { opacity: 0.25 },
    badgeName:          { fontSize: 10, textAlign: 'center', lineHeight: 13 },
    badgeNameEarned:    { color: theme.textPrimary, fontWeight: '700' },
    badgeNameLocked:    { color: theme.textMuted },
    badgeDot:           { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.primary, marginTop: 5 },

    dangerText:   { fontSize: 15, color: theme.error, fontWeight: '500' },
    versionText:  { fontSize: 12, color: theme.textMuted, textAlign: 'center', marginTop: 16 },
    groceryCta:   { backgroundColor: theme.meal + '20', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: theme.meal + '60' },
    groceryCtaText: { fontSize: 14, fontWeight: '700', color: theme.meal },
  });
}

export type ProfileStyles = ReturnType<typeof createProfileStyles>;
