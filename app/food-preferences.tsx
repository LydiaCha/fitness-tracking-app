import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Animated, View, Text, StyleSheet, ActivityIndicator,
  TouchableOpacity, ScrollView, TextInput, StatusBar, Keyboard,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '@/context/ThemeContext';
import { AppThemeType } from '@/constants/theme';
import { useUserProfile } from '@/context/UserProfileContext';
import { useMealPlan } from '@/context/MealPlanContext';
import {
  saveUserProfile,
  DietaryRestriction, UserProfile,
  RESTRICTION_OPTIONS, PREP_OPTIONS, toggleDietaryRestriction,
} from '@/constants/userProfile';
import { MEAL_DATABASE } from '@/constants/mealDatabase';
import { GroceryCategory } from '@/types/meal';
import { logger } from '@/utils/logger';

// ─── Ingredient data ──────────────────────────────────────────────────────────

interface Ingredient {
  id:       string;
  name:     string;
  category: GroceryCategory;
}

const ALL_INGREDIENTS: Ingredient[] = (() => {
  const seen = new Map<string, Ingredient>();
  for (const meal of MEAL_DATABASE) {
    for (const ing of meal.ingredients) {
      if (!seen.has(ing.ingredientId)) {
        seen.set(ing.ingredientId, {
          id:       ing.ingredientId,
          name:     ing.name,
          category: ing.groceryCategory,
        });
      }
    }
  }
  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
})();

const TOTAL_MEAL_COUNT = MEAL_DATABASE.length;

const CATEGORY_META: Record<GroceryCategory, { label: string; emoji: string }> = {
  protein:     { label: 'Protein',        emoji: '🥩' },
  dairy:       { label: 'Dairy',          emoji: '🥛' },
  carbs:       { label: 'Carbs & Grains', emoji: '🌾' },
  vegetables:  { label: 'Vegetables',     emoji: '🥦' },
  fruit:       { label: 'Fruit',          emoji: '🍌' },
  frozen:      { label: 'Frozen',         emoji: '🧊' },
  pantry:      { label: 'Pantry',         emoji: '🫙' },
  drinks:      { label: 'Drinks',         emoji: '🥤' },
  supplements: { label: 'Supplements',    emoji: '💊' },
};

const CATEGORY_ORDER: GroceryCategory[] = [
  'protein', 'dairy', 'carbs', 'vegetables', 'fruit', 'frozen', 'pantry', 'drinks', 'supplements',
];

// Categories already hard-excluded by a given restriction
const RESTRICTION_EXCLUDED_CATEGORIES: Partial<Record<DietaryRestriction, GroceryCategory[]>> = {
  'dairy-free': ['dairy'],
};

// ─── Option lists ─────────────────────────────────────────────────────────────

// ─── Match highlight ──────────────────────────────────────────────────────────

function HighlightText({ text, query, baseStyle, highlightColor }: {
  text: string;
  query: string;
  baseStyle: object;
  highlightColor: string;
}) {
  if (!query) return <Text style={baseStyle}>{text}</Text>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <Text style={baseStyle}>{text}</Text>;
  return (
    <Text style={baseStyle}>
      {text.slice(0, idx)}
      <Text style={{ color: highlightColor, fontWeight: '700' }}>{text.slice(idx, idx + query.length)}</Text>
      {text.slice(idx + query.length)}
    </Text>
  );
}

// ─── Toast hook ───────────────────────────────────────────────────────────────

function useToast() {
  const opacity = useRef(new Animated.Value(0)).current;
  const [msg, setMsg] = useState('');

  const show = useCallback((message: string) => {
    setMsg(message);
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.delay(1200),
      Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [opacity]);

  return { opacity, msg, show };
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function useStyles(theme: AppThemeType) {
  return useMemo(() => StyleSheet.create({
    safe:         { flex: 1, backgroundColor: theme.bg },
    headerRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4 },
    backBtn:      { marginRight: 12, padding: 4 },
    headerTitle:  { flex: 1, fontSize: 22, fontWeight: '800', color: theme.textPrimary },
    headerSub:    { fontSize: 13, color: theme.textMuted, paddingHorizontal: 16, paddingBottom: 12 },

    content:      { paddingHorizontal: 16, paddingBottom: 160 },
    sectionHeader:{ flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 6 },
    sectionLabel: { flex: 1, fontSize: 11, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
    sectionClear: { fontSize: 13, color: theme.primary, fontWeight: '600' },
    sectionSub:   { fontSize: 13, color: theme.textMuted, marginBottom: 10, marginTop: -2 },
    card:         { backgroundColor: theme.bgCard, borderRadius: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },

    // Restriction section header
    strictBadge: {
      flexDirection: 'row', alignItems: 'center', gap: 4,
      backgroundColor: theme.warning + '20',
      borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3,
      borderWidth: 1, borderColor: theme.warning + '55',
    },
    strictBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6, color: theme.warning, textTransform: 'uppercase' },

    // Restriction card — amber left accent when any restriction active
    restrictionCard:        { backgroundColor: theme.bgCard, borderRadius: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
    restrictionCardActive:  { backgroundColor: theme.bgCard, borderRadius: 16, borderWidth: 1, borderColor: theme.warning + '55', overflow: 'hidden', borderLeftWidth: 3, borderLeftColor: theme.warning },

    // Restriction rows
    restrictionRow: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: theme.border + '55',
    },
    restrictionRowLast: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
    },
    restrictionRowImplied: {
      flexDirection: 'row', alignItems: 'center',
      paddingHorizontal: 16, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: theme.border + '55',
      opacity: 0.5,
    },
    restrictionEmoji: { fontSize: 20, width: 32 },
    restrictionLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: theme.textPrimary },
    impliedBadge:     { fontSize: 11, color: theme.textMuted, fontStyle: 'italic', marginRight: 8 },
    checkCircle:      { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
    checkCircleOn:    { backgroundColor: theme.primary, borderColor: theme.primary },
    checkCircleImplied: { backgroundColor: theme.textMuted, borderColor: theme.textMuted },
    checkMark:        { color: '#fff', fontSize: 13, fontWeight: '800' },

    // Meal count + warning
    mealCountRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
    mealCountText:  { fontSize: 13, fontWeight: '600' },
    warningBanner:  {
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      backgroundColor: theme.warning + '18',
      borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
      marginTop: 8, borderWidth: 1, borderColor: theme.warning + '44',
    },
    warningText:    { flex: 1, fontSize: 13, color: theme.warning, lineHeight: 18 },

    // Cuisine chips
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.bgCard, borderRadius: 24,
      paddingVertical: 10, paddingHorizontal: 14,
      borderWidth: 2, borderColor: theme.border,
    },
    chipSelected:      { borderColor: theme.primary, backgroundColor: theme.primary + '14' },
    chipEmoji:         { fontSize: 17 },
    chipLabel:         { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
    chipLabelSelected: { color: theme.primary },

    // Prep time pills
    prepRow:              { flexDirection: 'row', gap: 10 },
    prepPill:             { flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: theme.bgCard, borderRadius: 12, borderWidth: 2, borderColor: theme.border },
    prepPillSelected:     { borderColor: theme.primary, backgroundColor: theme.primary + '14' },
    prepPillText:         { fontSize: 13, fontWeight: '600', color: theme.textMuted },
    prepPillTextSelected: { color: theme.primary },

    // Ingredient search
    searchRow:    { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    searchInput:  {
      flex: 1,
      backgroundColor: theme.bgCard, borderRadius: 12,
      paddingHorizontal: 14, paddingVertical: 10,
      fontSize: 15, color: theme.textPrimary,
      borderWidth: 1, borderColor: theme.border,
    },
    clearAllBtn:  { paddingHorizontal: 12, paddingVertical: 10 },
    clearAllText: { fontSize: 13, color: theme.error, fontWeight: '600' },
    veganNote:    {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: theme.bgCard, borderRadius: 10,
      paddingHorizontal: 12, paddingVertical: 8,
      marginBottom: 8, borderWidth: 1, borderColor: theme.border,
    },
    veganNoteText: { flex: 1, fontSize: 12, color: theme.textMuted, lineHeight: 17 },
    disclaimer:    { fontSize: 11, color: theme.textMuted, opacity: 0.7, marginBottom: 8, marginTop: 2, lineHeight: 16 },

    // Ingredient rows
    catHeader:        { fontSize: 12, fontWeight: '700', color: theme.textMuted, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
    ingRow:           { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.border + '44' },
    ingName:          { flex: 1, fontSize: 15, color: theme.textPrimary },
    ingNameDisliked:  { color: theme.primary, fontWeight: '600' },
    ingNameDimmed:    { color: theme.textMuted },
    ingRowDisliked:   { backgroundColor: theme.primary + '0d' },
    ingExcludedBadge: { fontSize: 11, color: theme.textMuted, fontStyle: 'italic', marginLeft: 6 },
    ingCatBadge:      { fontSize: 11, color: theme.textMuted, marginRight: 8 },

    // Empty state
    emptyState:     { alignItems: 'center', paddingVertical: 32, gap: 6 },
    emptyStateText: { fontSize: 15, color: theme.textMuted, textAlign: 'center', lineHeight: 22 },

    // Sticky footer
    footer: {
      position: 'absolute', bottom: 0, left: 0, right: 0,
      paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12,
      backgroundColor: theme.bg,
      borderTopWidth: 1, borderTopColor: theme.border + '55',
      gap: 8,
    },
    mealCountFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingBottom: 2 },
    saveBtn:     { backgroundColor: theme.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
    saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
    saveOnlyBtn: { alignItems: 'center', paddingVertical: 6 },
    saveOnlyText:{ fontSize: 14, color: theme.textMuted },

    // Toast
    toast: {
      position: 'absolute', bottom: 110, alignSelf: 'center',
      backgroundColor: theme.success,
      paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20,
    },
    toastText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  }), [theme]);
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function FoodPreferencesScreen() {
  const { theme, isDark }              = useAppTheme();
  const { profile, updateProfile }     = useUserProfile();
  const { generatePlan }               = useMealPlan();
  const router                         = useRouter();
  const s                              = useStyles(theme);
  const toast                          = useToast();

  const [restrictions, setRestrictions] = useState<DietaryRestriction[]>(profile.dietaryRestrictions   ?? []);
  const [maxPrepMins,  setMaxPrepMins]  = useState<number>(profile.maxPrepMins                         ?? 30);
  const [disliked,     setDisliked]     = useState<string[]>(profile.dislikedIngredientIds             ?? []);
  const [ingSearch,    setIngSearch]    = useState('');
  const [saving,       setSaving]       = useState(false);

  // ── Auto-save on every change (debounced 600ms, silent) ───────────────────
  const isFirstRender  = useRef(true);
  const autoSaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const planIsStale    = useRef(false); // true once user has changed anything

  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return; }
    planIsStale.current = true;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(async () => {
      const updated: UserProfile = {
        ...profile,
        dietaryRestrictions:   restrictions,
        cuisinePreferences:    profile.cuisinePreferences ?? [],
        maxPrepMins,
        dislikedIngredientIds: disliked,
      };
      try {
        await saveUserProfile(updated);
        updateProfile(updated);
      } catch (e) {
        logger.error('storage', 'food-preferences', 'Auto-save failed', { error: String(e) });
      }
    }, 600);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [restrictions, maxPrepMins, disliked]);

  // ── Live available meal count ─────────────────────────────────────────────
  // cuisine is a soft signal (scoring bonus), not a hard filter — intentionally excluded from deps
  const dislikedSet = useMemo(() => new Set(disliked), [disliked]);
  const availableMealCount = useMemo(() => {
    return MEAL_DATABASE.filter(meal => {
      if (restrictions.includes('gluten-free') && !meal.isGlutenFree) return false;
      if (restrictions.includes('dairy-free')  && !meal.isDairyFree)  return false;
      if (restrictions.includes('vegetarian')  && !meal.isVegetarian) return false;
      if (restrictions.includes('vegan')       && !meal.isVegan)      return false;
      if (restrictions.includes('nut-free')    && !meal.isNutFree)    return false;
      if (meal.totalMins > maxPrepMins)                                return false;
      if (meal.ingredients.some(i => dislikedSet.has(i.ingredientId))) return false;
      return true;
    }).length;
  }, [restrictions, dislikedSet, maxPrepMins]);

  const isTooRestrictive = availableMealCount < 10;
  const mealCountColor   = availableMealCount >= 20 ? theme.success
                         : availableMealCount >= 10 ? theme.warning
                         : theme.error;

  // ── Back button ───────────────────────────────────────────────────────────
  const handleBack = useCallback(() => router.back(), [router]);

  // ── Restriction toggle (vegan ↔ vegetarian sync) ──────────────────────────
  const toggleRestriction = useCallback((r: DietaryRestriction) => {
    setRestrictions(cur => toggleDietaryRestriction(cur, r));
  }, []);

  // ── Dislike toggle ────────────────────────────────────────────────────────
  const toggleDislike = useCallback((id: string) =>
    setDisliked(cur => cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id]),
  []);

  // ── Categories already excluded by active restrictions ────────────────────
  const excludedCategories = useMemo(() => {
    const cats = new Set<GroceryCategory>();
    for (const r of restrictions) {
      for (const c of RESTRICTION_EXCLUDED_CATEGORIES[r] ?? []) cats.add(c);
    }
    return cats;
  }, [restrictions]);

  // ── Vegan/vegetarian note for ingredient search ───────────────────────────
  const showVeganNote = restrictions.includes('vegetarian') || restrictions.includes('vegan');

  // ── Ingredient sections ───────────────────────────────────────────────────
  const hasSearch = ingSearch.trim().length > 0;

  // No search → flat list of disliked items, most recently added first
  const excludedItems = useMemo(() => {
    if (hasSearch) return [];
    return disliked
      .slice()
      .reverse()
      .map(id => ALL_INGREDIENTS.find(i => i.id === id))
      .filter((i): i is Ingredient => i !== undefined);
  }, [hasSearch, disliked]);

  // With search → grouped by category
  const searchSections = useMemo(() => {
    const q = ingSearch.trim().toLowerCase();
    if (!q) return [];
    const filtered = ALL_INGREDIENTS.filter(i => i.name.toLowerCase().includes(q));
    const groups = new Map<GroceryCategory, Ingredient[]>();
    for (const ing of filtered) {
      if (!groups.has(ing.category)) groups.set(ing.category, []);
      groups.get(ing.category)!.push(ing);
    }
    return CATEGORY_ORDER
      .map(cat => ({ cat, items: groups.get(cat) ?? [] }))
      .filter(g => g.items.length > 0);
  }, [ingSearch]);

  // ── Restriction options — Vegetarian shown as implied (locked) when Vegan active ──
  const displayedRestrictions = useMemo(() =>
    RESTRICTION_OPTIONS.map(opt => ({
      ...opt,
      implied: opt.value === 'vegetarian' && restrictions.includes('vegan'),
    })),
  [restrictions]);

  // ── Regenerate plan ───────────────────────────────────────────────────────
  const handleRegenerate = async () => {
    setSaving(true);
    try {
      const updated: UserProfile = {
        ...profile,
        dietaryRestrictions:   restrictions,
        cuisinePreferences:    profile.cuisinePreferences ?? [],
        maxPrepMins,
        dislikedIngredientIds: disliked,
      };
      planIsStale.current = false;
      toast.show('Regenerating your meal plan…');
      generatePlan(updated).catch((err) => console.warn('[FoodPreferences] generatePlan:', err));
      setTimeout(() => router.back(), 800);
    } catch (e) {
      logger.error('storage', 'food-preferences', 'Failed to regenerate', { error: String(e) });
      Alert.alert('Error', 'Could not regenerate plan. Please try again.');
      setSaving(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      {/* Header */}
      <View style={s.headerRow}>
        <TouchableOpacity style={s.backBtn} onPress={handleBack} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Food Preferences</Text>
      </View>
      <Text style={s.headerSub}>Tell us what works for your body — we'll build a plan around it. ✨</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >

          {/* ── Dietary restrictions ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>Dietary restrictions</Text>
            <View style={s.strictBadge}>
              <Text style={s.strictBadgeText}>STRICT</Text>
            </View>
          </View>
          <Text style={s.sectionSub}>We will never include meals that break these rules.</Text>
          <Text style={s.disclaimer}>This is a meal planning tool, not a medical device. Always check labels if you have a medical allergy.</Text>
          <View style={restrictions.length > 0 ? s.restrictionCardActive : s.restrictionCard}>
            {displayedRestrictions.map((opt, i) => {
              const on     = restrictions.includes(opt.value);
              const isLast = i === displayedRestrictions.length - 1;
              if (opt.implied) {
                return (
                  <View key={opt.value} style={s.restrictionRowImplied}>
                    <Text style={s.restrictionEmoji}>{opt.emoji}</Text>
                    <Text style={s.restrictionLabel}>{opt.label}</Text>
                    <Text style={s.impliedBadge}>Included in Vegan</Text>
                    <View style={[s.checkCircle, s.checkCircleImplied]}>
                      <Text style={s.checkMark}>✓</Text>
                    </View>
                  </View>
                );
              }
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={isLast ? s.restrictionRowLast : s.restrictionRow}
                  onPress={() => toggleRestriction(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text style={s.restrictionEmoji}>{opt.emoji}</Text>
                  <Text style={s.restrictionLabel}>{opt.label}</Text>
                  <View style={[s.checkCircle, on && s.checkCircleOn]}>
                    {on && <Text style={s.checkMark}>✓</Text>}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* ── Ingredients to avoid ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>Ingredients to avoid</Text>
          </View>
          <Text style={s.sectionSub}>
            {disliked.length > 0
              ? `${disliked.length} ingredient${disliked.length > 1 ? 's' : ''} excluded from your plan. Tap any to remove.`
              : "We'll avoid meals with these ingredients."}
          </Text>

          <View style={s.searchRow}>
            <TextInput
              style={s.searchInput}
              value={ingSearch}
              onChangeText={text => { setIngSearch(text); if (!text) Keyboard.dismiss(); }}
              placeholder="Search ingredients…"
              placeholderTextColor={theme.textMuted}
              clearButtonMode="while-editing"
            />
            {disliked.length > 0 && (
              <TouchableOpacity style={s.clearAllBtn} onPress={() => setDisliked([])} activeOpacity={0.7}>
                <Text style={s.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            )}
          </View>

          {showVeganNote && (
            <View style={s.veganNote}>
              <Ionicons name="information-circle-outline" size={15} color={theme.textMuted} />
              <Text style={s.veganNoteText}>
                Animal products are already excluded by your{' '}
                {restrictions.includes('vegan') ? 'vegan' : 'vegetarian'} restriction.
              </Text>
            </View>
          )}

          {/* Ingredient list */}
          {!hasSearch ? (
            excludedItems.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 28 }}>🔍</Text>
                <Text style={s.emptyStateText}>
                  Search above to exclude specific ingredients.{'\n'}Nothing excluded yet.
                </Text>
              </View>
            ) : (
              <View style={s.card}>
                {excludedItems.map((ing, i) => (
                  <TouchableOpacity
                    key={ing.id}
                    style={[s.ingRow, s.ingRowDisliked, i === excludedItems.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => toggleDislike(ing.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[s.ingName, s.ingNameDisliked]}>{ing.name}</Text>
                    <Text style={s.ingCatBadge}>{CATEGORY_META[ing.category].emoji}</Text>
                    <Ionicons name="checkmark-circle" size={18} color={theme.primary} />
                  </TouchableOpacity>
                ))}
              </View>
            )
          ) : (
            searchSections.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={s.emptyStateText}>No ingredients match "{ingSearch}"</Text>
              </View>
            ) : (
              <View style={s.card}>
                {searchSections.map(({ cat, items }) => (
                  <View key={cat}>
                    <Text style={s.catHeader}>
                      {CATEGORY_META[cat].emoji}  {CATEGORY_META[cat].label}
                    </Text>
                    {items.map((ing, i) => {
                      const isDisliked = disliked.includes(ing.id);
                      const isExcluded = excludedCategories.has(ing.category);
                      return (
                        <TouchableOpacity
                          key={ing.id}
                          style={[s.ingRow, isDisliked && s.ingRowDisliked, i === items.length - 1 && { borderBottomWidth: 0 }]}
                          onPress={() => !isExcluded && toggleDislike(ing.id)}
                          activeOpacity={isExcluded ? 1 : 0.7}
                        >
                          <HighlightText
                            text={ing.name}
                            query={ingSearch.trim()}
                            baseStyle={[s.ingName, isDisliked && s.ingNameDisliked, isExcluded && s.ingNameDimmed]}
                            highlightColor={isExcluded ? theme.textMuted : theme.primary}
                          />
                          {isExcluded && <Text style={s.ingExcludedBadge}>excluded by restriction</Text>}
                          {isDisliked && !isExcluded && <Ionicons name="checkmark-circle" size={18} color={theme.primary} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            )
          )}

          {/* ── Max prep time ── */}
          <View style={s.sectionHeader}>
            <Text style={s.sectionLabel}>Max prep time per meal</Text>
          </View>
          <Text style={s.sectionSub}>How long do you want to spend cooking?</Text>
          <View style={s.prepRow}>
            {PREP_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[s.prepPill, maxPrepMins === opt.value && s.prepPillSelected]}
                onPress={() => setMaxPrepMins(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[s.prepPillText, maxPrepMins === opt.value && s.prepPillTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Too restrictive warning — shown inline near the bottom of the form */}
          {isTooRestrictive && (
            <View style={[s.warningBanner, { marginTop: 16 }]}>
              <Ionicons name="warning-outline" size={16} color={theme.warning} />
              <Text style={s.warningText}>
                Only {availableMealCount} meal{availableMealCount !== 1 ? 's' : ''} match your current settings.
                Your plan may feel repetitive. Consider relaxing some restrictions.
              </Text>
            </View>
          )}

        </ScrollView>

        {/* Sticky save footer */}
        <View style={s.footer}>
          {/* Live meal count */}
          <View style={s.mealCountFooterRow}>
            <Ionicons name="restaurant-outline" size={13} color={mealCountColor} />
            <Text style={[s.mealCountText, { color: mealCountColor }]}>
              {availableMealCount} of {TOTAL_MEAL_COUNT} meals match your settings
            </Text>
          </View>

          <TouchableOpacity
            style={[s.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleRegenerate}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <ActivityIndicator size="small" color="#fff" />
                <Text style={s.saveBtnText}>Regenerating…</Text>
              </View>
            ) : (
              <Text style={s.saveBtnText}>Regenerate plan</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Toast */}
      <Animated.View style={[s.toast, { opacity: toast.opacity }]} pointerEvents="none">
        <Text style={s.toastText}>{toast.msg}</Text>
      </Animated.View>
    </SafeAreaView>
  );
}
