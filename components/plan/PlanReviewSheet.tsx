/**
 * PlanReviewSheet — Full-screen modal for reviewing and approving next week's meals.
 *
 * Opens from the Saturday "Review next week's meal plan" checklist event.
 * Lets the user swap any meal for an AI-scored alternative, then approve.
 * On approval, overrides are merged into the persisted next-week plan.
 *
 * AI Suggestions (budget / prep / macro tips) are fetched lazily on open.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, Modal, ScrollView, TouchableOpacity,
  ActivityIndicator, StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMealPlan, MealSwapOverride } from '@/context/MealPlanContext';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { MealRecord, MealType, MEAL_ORDER } from '@/types/meal';
import { callClaude, extractJSON } from '@/utils/claudeApi';
import { MEAL_META } from '@/constants/mealColors';

// ─── Day names (Mon-first) ────────────────────────────────────────────────────

const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MONTHS    = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function nextWeekDate(monFirstIdx: number): string {
  const today = new Date();
  const jsDay = today.getDay();
  const diff  = jsDay === 0 ? -6 : 1 - jsDay;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff + 7); // next week's Monday
  const d = new Date(monday);
  d.setDate(monday.getDate() + monFirstIdx);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

// ─── Suggestion types ─────────────────────────────────────────────────────────

interface Suggestion {
  type:  'budget' | 'prep' | 'macro';
  emoji: string;
  title: string;
  tip:   string;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  visible:    boolean;
  onClose:    () => void;
  onApproved: () => void;  // called after approval — marks the Saturday event as done
}

export function PlanReviewSheet({ visible, onClose, onApproved }: Props) {
  const { theme, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const {
    nextWeekPlan,
    getMealById,
    getNextWeekEntriesForDay,
    getAlternativesForEntry,
    approvePlan,
    isGeneratingNext,
    nextWeekApproved,
  } = useMealPlan();

  const s = useMemo(() => createStyles(theme), [theme]);

  // Local overrides: key = "${day}-${mealType}" → new mealId
  const [overrides, setOverrides] = useState<Record<string, string>>({});

  // AI suggestions state
  const [suggestions, setSuggestions]   = useState<Suggestion[]>([]);
  const [loadingSugs, setLoadingSugs]   = useState(false);

  // Collapsed state per day
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set([1, 2, 3, 4, 5]));

  // Alternatives cached on open
  const [alternatives, setAlternatives] = useState<Record<string, MealRecord[]>>({});

  // Load alternatives + suggestions when sheet opens
  useEffect(() => {
    if (!visible || nextWeekPlan.length === 0) return;

    // Compute alternatives for every entry
    const alts: Record<string, MealRecord[]> = {};
    for (const entry of nextWeekPlan) {
      const key = `${entry.slot.day}-${entry.slot.mealType}`;
      alts[key] = getAlternativesForEntry(entry, 2);
    }
    setAlternatives(alts);

    // Reset overrides & suggestions when reopened
    setOverrides({});
    setSuggestions([]);
    setCollapsed(new Set([1, 2, 3, 4, 5]));

    // Fetch AI suggestions
    setLoadingSugs(true);
    const planSummary = nextWeekPlan
      .slice(0, 14) // first 14 slots for brevity
      .map(e => {
        const meal = getMealById(e.mealId);
        return meal ? `${DAY_NAMES[e.slot.day]} ${e.slot.mealType}: ${meal.name} (${meal.calories}kcal, ${meal.protein}gP)` : null;
      })
      .filter(Boolean)
      .join('\n');

    callClaude({
      systemPrompt: `You are a nutrition coach reviewing a 7-day meal plan.
Return ONLY a JSON array of 3 objects, no prose, no markdown.
Each object: { "type": "budget"|"prep"|"macro", "emoji": "...", "title": "...", "tip": "..." }
- budget: how to spend less on groceries (specific ingredient swap or shopping tip)
- prep: what to batch cook on Sunday to save most time
- macro: one observation about macro balance and how to improve it`,
      userMessage: `Meal plan:\n${planSummary}`,
      maxTokens: 400,
    })
      .then(raw => {
        const parsed = extractJSON<Suggestion[]>(raw);
        if (Array.isArray(parsed) && parsed.length > 0) setSuggestions(parsed);
      })
      .catch(() => {}) // non-critical
      .finally(() => setLoadingSugs(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleSwap = useCallback((day: number, mealType: MealType, mealId: string, originalId: string) => {
    const key = `${day}-${mealType}`;
    setOverrides(prev => ({
      ...prev,
      [key]: mealId === originalId ? '' : mealId,  // toggle off if re-selecting original
    }));
  }, []);

  const handleApprove = useCallback(async () => {
    const swapList: MealSwapOverride[] = Object.entries(overrides)
      .filter(([, v]) => v !== '')
      .map(([key, mealId]) => {
        const [dayStr, mealType] = key.split('-') as [string, MealType];
        return { day: parseInt(dayStr, 10), mealType, mealId };
      });
    await approvePlan(swapList);
    onApproved();
  }, [overrides, approvePlan, onApproved]);

  const noNextWeek = nextWeekPlan.length === 0 && !isGeneratingNext;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[s.container, { paddingTop: insets.top > 0 ? insets.top : 16 }]}>

        {/* ── Header ── */}
        <View style={s.header}>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={s.headerClose}>✕</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Next Week's Plan</Text>
          {nextWeekApproved ? (
            <View style={s.approvedBadge}>
              <Text style={s.approvedBadgeText}>✓ Approved</Text>
            </View>
          ) : (
            <View style={{ width: 72 }} />
          )}
        </View>

        {/* ── Sub-header ── */}
        <Text style={s.subHeader}>
          Swap any meal for an alternative, then approve to lock it in.
        </Text>

        {/* ── Loading / empty states ── */}
        {isGeneratingNext && (
          <View style={s.centerState}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={s.centerStateText}>Building next week's plan…</Text>
          </View>
        )}

        {noNextWeek && (
          <View style={s.centerState}>
            <Text style={s.centerStateEmoji}>📅</Text>
            <Text style={s.centerStateText}>Next week's plan isn't ready yet.</Text>
            <Text style={s.centerStateSub}>Come back once this week's plan has generated.</Text>
          </View>
        )}

        {/* ── Main content ── */}
        {nextWeekPlan.length > 0 && (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.scrollContent}
            showsVerticalScrollIndicator={false}>

            {/* Day sections */}
            {[0, 1, 2, 3, 4, 5, 6].map(dayIdx => {
              const entries = getNextWeekEntriesForDay(dayIdx)
                .slice()
                .sort((a, b) => MEAL_ORDER.indexOf(a.slot.mealType) - MEAL_ORDER.indexOf(b.slot.mealType));

              if (entries.length === 0) return null;

              const isCollapsed = collapsed.has(dayIdx);
              const totalKcal   = Math.round(entries.reduce((s, e) => s + e.actualCalories, 0));

              return (
                <View key={dayIdx} style={s.dayCard}>
                  {/* Day header */}
                  <TouchableOpacity
                    style={s.dayHeader}
                    onPress={() => setCollapsed(prev => {
                      const next = new Set(prev);
                      next.has(dayIdx) ? next.delete(dayIdx) : next.add(dayIdx);
                      return next;
                    })}
                    activeOpacity={0.7}>
                    <View style={s.dayHeaderLeft}>
                      <Text style={s.dayName}>{DAY_NAMES[dayIdx]}</Text>
                      <Text style={s.dayDate}>{nextWeekDate(dayIdx)}</Text>
                    </View>
                    <Text style={s.dayKcal}>{totalKcal} kcal</Text>
                    <Text style={s.dayChevron}>{isCollapsed ? '›' : '⌄'}</Text>
                  </TouchableOpacity>

                  {/* Meal entries */}
                  {!isCollapsed && entries.map(entry => {
                    const overrideKey  = `${entry.slot.day}-${entry.slot.mealType}`;
                    const selectedId   = overrides[overrideKey] || entry.mealId;
                    const displayMeal  = getMealById(selectedId) ?? getMealById(entry.mealId);
                    const alts         = alternatives[overrideKey] ?? [];
                    const meta         = MEAL_META[entry.slot.mealType];
                    const isSwapped    = selectedId !== entry.mealId;

                    if (!displayMeal) return null;

                    return (
                      <View key={overrideKey} style={s.mealRow}>
                        <View style={s.mealRowTop}>
                          {/* Type pill */}
                          <View style={[s.mealPill, { backgroundColor: meta.color + '22' }]}>
                            <Text style={s.mealPillEmoji}>{meta.emoji}</Text>
                            <Text style={[s.mealPillText, { color: meta.color }]}>{meta.label}</Text>
                          </View>

                          {/* Meal name + macros */}
                          <View style={s.mealInfo}>
                            <Text style={s.mealName} numberOfLines={1}>
                              {displayMeal.name}
                              {isSwapped && <Text style={[s.swappedTag, { color: theme.success }]}> ✦ swapped</Text>}
                            </Text>
                            <Text style={s.mealMacros}>
                              {Math.round(entry.actualCalories)} kcal · {Math.round(entry.actualProtein)}g protein
                            </Text>
                          </View>
                        </View>

                        {/* Swap alternatives */}
                        {alts.length > 0 && (
                          <View style={s.swapRow}>
                            <Text style={s.swapLabel}>Choose one</Text>
                            <View style={s.swapPills}>
                              {/* Original option */}
                              {[entry.mealId, ...alts.map(m => m.id)].map(id => {
                                const meal    = getMealById(id);
                                if (!meal) return null;
                                const active  = selectedId === id;
                                return (
                                  <TouchableOpacity
                                    key={id}
                                    onPress={() => handleSwap(entry.slot.day, entry.slot.mealType, id, entry.mealId)}
                                    activeOpacity={0.7}
                                    style={[s.swapPill, active && { borderColor: meta.color, backgroundColor: meta.color + '18' }]}>
                                    <Text style={s.swapPillName} numberOfLines={2}>{meal.name}</Text>
                                    <Text style={[s.swapPillKcal, { color: meta.color }]}>
                                      {meal.calories} kcal
                                    </Text>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              );
            })}

            {/* ── AI Suggestions ── */}
            <View style={s.suggestionsCard}>
              <View style={s.suggestionsHeader}>
                <Text style={s.suggestionsTitle}>🧠 Coach Suggestions</Text>
                {loadingSugs && <ActivityIndicator size="small" color={theme.primary} style={{ marginLeft: 8 }} />}
              </View>

              {suggestions.length === 0 && !loadingSugs && (
                <Text style={s.suggestionsEmpty}>Suggestions unavailable — add an API key to enable.</Text>
              )}

              {suggestions.map((sug, i) => (
                <View key={i} style={[s.suggestionRow, i < suggestions.length - 1 && s.suggestionRowBorder]}>
                  <View style={[s.suggestionIcon, {
                    backgroundColor: sug.type === 'budget' ? theme.wake + '22'
                      : sug.type === 'prep' ? theme.meal + '22' : theme.primary + '22',
                  }]}>
                    <Text style={{ fontSize: 16 }}>{sug.emoji}</Text>
                  </View>
                  <View style={s.suggestionContent}>
                    <Text style={s.suggestionTitle}>{sug.title}</Text>
                    <Text style={s.suggestionTip}>{sug.tip}</Text>
                  </View>
                </View>
              ))}
            </View>

            <View style={{ height: 120 }} />
          </ScrollView>
        )}

        {/* ── Approve button (floating) ── */}
        {nextWeekPlan.length > 0 && !nextWeekApproved && (
          <View style={[s.approveBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <TouchableOpacity style={[s.approveBtn, { backgroundColor: theme.primary }]} onPress={handleApprove} activeOpacity={0.85}>
              <Text style={s.approveBtnText}>
                {Object.values(overrides).filter(Boolean).length > 0
                  ? `Approve Plan (${Object.values(overrides).filter(Boolean).length} swaps)`
                  : 'Approve This Plan'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {nextWeekApproved && (
          <View style={[s.approveBar, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <View style={[s.approveBtn, { backgroundColor: theme.success }]}>
              <Text style={s.approveBtnText}>✓ Plan Approved</Text>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(theme: AppThemeType) {
  return StyleSheet.create({
    container:   { flex: 1, backgroundColor: theme.bg },
    header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 12, gap: 10 },
    headerClose: { fontSize: 18, color: theme.textMuted, fontWeight: '600', minWidth: 28 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: theme.textPrimary, textAlign: 'center', letterSpacing: -0.3 },
    approvedBadge:     { backgroundColor: theme.success + '22', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: theme.success + '44' },
    approvedBadgeText: { fontSize: 11, fontWeight: '700', color: theme.success },
    subHeader:   { fontSize: 12, color: theme.textMuted, textAlign: 'center', marginBottom: 16, paddingHorizontal: 24 },

    centerState:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 32 },
    centerStateEmoji:{ fontSize: 40 },
    centerStateText: { fontSize: 15, fontWeight: '700', color: theme.textPrimary, textAlign: 'center' },
    centerStateSub:  { fontSize: 13, color: theme.textSecondary, textAlign: 'center', lineHeight: 18 },

    scrollContent: { paddingHorizontal: 16, paddingTop: 4 },

    // Day card
    dayCard:      { backgroundColor: theme.bgCard, borderRadius: 16, borderWidth: 1, borderColor: theme.border, marginBottom: 12, overflow: 'hidden' },
    dayHeader:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: theme.bgCardAlt, gap: 8 },
    dayHeaderLeft:{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
    dayName:      { fontSize: 14, fontWeight: '800', color: theme.textPrimary },
    dayDate:      { fontSize: 12, color: theme.textMuted },
    dayKcal:      { fontSize: 12, fontWeight: '600', color: theme.textMuted },
    dayChevron:   { fontSize: 14, color: theme.textMuted, marginLeft: 4 },

    // Meal row
    mealRow:      { paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 1, borderTopColor: theme.border + '66' },
    mealRowTop:   { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
    mealPill:     { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, minWidth: 88, alignSelf: 'flex-start' },
    mealPillEmoji:{ fontSize: 12 },
    mealPillText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.1 },
    mealInfo:     { flex: 1 },
    mealName:     { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
    mealMacros:   { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    swappedTag:   { fontSize: 11, fontWeight: '700' },

    // Swap row
    swapRow:   { marginTop: 10 },
    swapLabel: { fontSize: 10, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
    swapPills: { flexDirection: 'row', gap: 8 },
    swapPill:  { flex: 1, borderRadius: 10, borderWidth: 1.5, borderColor: theme.border, padding: 10, gap: 3, backgroundColor: theme.bgCardAlt },
    swapPillName: { fontSize: 12, fontWeight: '600', color: theme.textPrimary, lineHeight: 16 },
    swapPillKcal: { fontSize: 11, fontWeight: '700' },

    // Suggestions
    suggestionsCard:   { backgroundColor: theme.bgCard, borderRadius: 16, borderWidth: 1, borderColor: theme.border, padding: 16, marginBottom: 12 },
    suggestionsHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
    suggestionsTitle:  { fontSize: 15, fontWeight: '700', color: theme.textPrimary },
    suggestionsEmpty:  { fontSize: 13, color: theme.textMuted, lineHeight: 18 },
    suggestionRow:     { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
    suggestionRowBorder:{ borderBottomWidth: 1, borderBottomColor: theme.border + '66' },
    suggestionIcon:    { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
    suggestionContent: { flex: 1 },
    suggestionTitle:   { fontSize: 13, fontWeight: '700', color: theme.textPrimary, marginBottom: 3 },
    suggestionTip:     { fontSize: 12, color: theme.textSecondary, lineHeight: 17 },

    // Approve bar
    approveBar: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border },
    approveBtn: { borderRadius: 14, paddingVertical: 15, alignItems: 'center' },
    approveBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: -0.2 },
  });
}
