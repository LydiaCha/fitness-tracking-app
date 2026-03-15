import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScannedProduct, fetchProduct, identifyFoodFromPhoto } from '@/utils/foodApi';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useScrollToTop } from '@react-navigation/native';
import { createIndexStyles } from './index.styles';
import { useAppTheme } from '@/context/ThemeContext';
import { WEEK_SCHEDULE, DaySchedule, ScheduleEvent } from '@/constants/scheduleData';
import { useWeeklyPlan } from '@/context/WeeklyPlanContext';
import { useMealPlan } from '@/context/MealPlanContext';
import { getMeal } from '@/constants/mealDatabase';
import { MACRO_TARGETS, SHAKE_RECIPES, MEAL_IDEAS } from '@/constants/nutritionData';
import { getTodayId, STORAGE_KEYS, toKey } from '@/utils/appConstants';
import { loadUserProfile } from '@/constants/userProfile';
import { loadStreak } from '@/utils/streak';
import { ChecklistItem } from '@/components/ChecklistItem';
import { safeMergeItem } from '@/utils/storage';
import { Confetti } from '@/components/Confetti';
import { TodayMealsCard } from '@/components/TodayMealsCard';
import { NextUpCard } from '@/components/NextUpCard';
import { LinearGradient } from 'expo-linear-gradient';

// Returns ml of water this event represents (water + wake events only)

// Returns macros for a meal/shake event
function getEventMacros(event: ScheduleEvent): { calories: number; protein: number; carbs: number; fat: number } {
  if (event.recipeId) {
    // Check AI meal database first (overlay meals use MealRecord IDs)
    const aiMeal = getMeal(event.recipeId);
    if (aiMeal) return { calories: aiMeal.calories, protein: aiMeal.protein, carbs: aiMeal.carbs, fat: aiMeal.fat };

    const recipe = event.recipeType === 'shake'
      ? SHAKE_RECIPES.find(r => r.id === event.recipeId)
      : MEAL_IDEAS.find(r => r.id === event.recipeId);
    if (recipe) return { calories: recipe.calories, protein: recipe.protein, carbs: recipe.carbs, fat: recipe.fat };
  }
  if (event.type !== 'meal' && event.type !== 'shake') return { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const d = event.detail ?? '';
  const calMatch  = d.match(/~?(\d+)\s*kcal/i);
  const protMatch = d.match(/(\d+)g\s*protein/i);
  const carbMatch = d.match(/(\d+)g\s*carbs?/i);
  const fatMatch  = d.match(/(\d+)g\s*fat/i);
  return {
    calories: calMatch  ? parseInt(calMatch[1],  10) : 0,
    protein:  protMatch ? parseInt(protMatch[1], 10) : 0,
    carbs:    carbMatch ? parseInt(carbMatch[1], 10) : 0,
    fat:      fatMatch  ? parseInt(fatMatch[1],  10) : 0,
  };
}


function buildDailyFocus(day: DaySchedule): string {
  const parts: string[] = [];
  if (day.isGymDay && day.workoutFocus) parts.push(day.workoutFocus);
  else if (day.isGymDay) parts.push('Gym');
  else if (day.isRestDay) parts.push('Rest day');
  if (day.isClassDay && day.classTime) parts.push(`Class ${day.classTime}`);
  parts.push('2.5L water');
  return parts.join(' · ');
}

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 4 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 21) return 'Good evening';
  return 'Late night hustle';
}

function getMotivation() {
  const phrases = [
    'Every rep counts. Every meal matters.',
    "Your future self is watching. Make her proud.",
    'Night shift strength. Day off gains.',
    'Consistency beats perfection.',
    'Strong body, sharp mind.',
    'Fuel the work. Earn the rest.',
    "You showed up. That's already a win.",
  ];
  return phrases[new Date().getDay()];
}


// ─── Main screen ─────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const scrollRef = useRef<ScrollView>(null);
  useScrollToTop(scrollRef);
  const { theme, isDark } = useAppTheme();
  const s = useMemo(() => createIndexStyles(theme), [theme]);

  const { weeklySchedule, isGenerating: scheduleGenerating, error: scheduleError, generateWeeklyPlan } = useWeeklyPlan();
  const { progress } = useMealPlan();

  const [allCheckedEvents, setAllCheckedEvents] = useState<Record<string, Set<number>>>({});
  const [showConfetti,   setShowConfetti]   = useState(false);
  const [quickLogOpen,   setQuickLogOpen]   = useState<'menu' | 'log-meal' | 'log-water' | null>(null);
  const [quickWaterMl,   setQuickWaterMl]   = useState(0);
  const [quickMealName,  setQuickMealName]  = useState('');
  const [quickMealCal,   setQuickMealCal]   = useState('');
  const [quickMealProt,  setQuickMealProt]  = useState('');
  const [profileName, setProfileName] = useState('');
  const [streak, setStreak] = useState(0);
  useEffect(() => {
    loadUserProfile().then(p => setProfileName(p.name)).catch(() => {});
  }, []);

  const prevDoneRef = useRef(0);
  const todayId = getTodayId();
  const [selectedDayId, setSelectedDayId] = useState(todayId);
  const schedule = weeklySchedule ?? WEEK_SCHEDULE; // hooks need non-null; loading gate below hides WEEK_SCHEDULE from users
  const today = schedule.find((d: DaySchedule) => d.id === todayId) ?? schedule[0];
  const selectedDay = schedule.find((d: DaySchedule) => d.id === selectedDayId) ?? today;
  const checkedEvents = allCheckedEvents[selectedDayId] ?? new Set<number>();
  const total = selectedDay.events.length;
  const done = checkedEvents.size;
  const isViewingToday = selectedDayId === todayId;

  useEffect(() => {
    if (isViewingToday && total > 0 && done === total && prevDoneRef.current !== total) {
      setShowConfetti(true);
      const t = setTimeout(() => setShowConfetti(false), 5500);
      return () => clearTimeout(t);
    }
    prevDoneRef.current = done;
  }, [done, total, isViewingToday]);

  const QUICK_WATER_KEY = '@peakroutine/quick_water';

  useFocusEffect(useCallback(() => {
    const key = toKey(new Date());
    AsyncStorage.getItem(QUICK_WATER_KEY).then(raw => {
      if (!raw) return;
      const data: Record<string, number> = JSON.parse(raw);
      setQuickWaterMl(data[key] ?? 0);
    }).catch(() => {});
    loadStreak().then(setStreak).catch(() => {});
  }, []));

  const gymIdx  = useMemo(() => today.events.findIndex(e => e.type === 'gym'), [today.events]);

  const addQuickWater = useCallback(async (ml: number) => {
    const key = toKey(new Date());
    const next = Math.max(0, quickWaterMl + ml);
    setQuickWaterMl(next);
    const raw  = await AsyncStorage.getItem(QUICK_WATER_KEY).catch(() => null);
    const data: Record<string, number> = raw ? JSON.parse(raw) : {};
    data[key] = next;
    await AsyncStorage.setItem(QUICK_WATER_KEY, JSON.stringify(data)).catch(() => {});
    safeMergeItem(STORAGE_KEYS.WATER, JSON.stringify({ [key]: next >= 2500 }));
  }, [quickWaterMl]);

  const logQuickWorkout = useCallback(() => {
    if (gymIdx === -1) return;
    const daySet = new Set(allCheckedEvents[todayId] ?? []);
    daySet.has(gymIdx) ? daySet.delete(gymIdx) : daySet.add(gymIdx);
    setAllCheckedEvents(prev => ({ ...prev, [todayId]: daySet }));
    safeMergeItem(STORAGE_KEYS.WORKOUTS, JSON.stringify({ [toKey(new Date())]: daySet.has(gymIdx) }));
  }, [gymIdx, allCheckedEvents, todayId]);

  const [permission, requestPermission] = useCameraPermissions();
  const [showScanner,     setShowScanner]     = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [scanLoading,     setScanLoading]     = useState(false);
  const [photoLoading,    setPhotoLoading]    = useState(false);
  const scannedRef = useRef(false);

  const autoLogProduct = useCallback(async (product: ScannedProduct) => {
    const key  = toKey(new Date());
    const entry = { id: `scan-${Date.now()}`, name: product.name, emoji: product.emoji,
      calories: product.calories, protein: product.protein, carbs: product.carbs,
      fat: product.fat, servingLabel: product.servingLabel };
    const raw  = await AsyncStorage.getItem(STORAGE_KEYS.MEAL_LOGS).catch(() => null);
    const data: Record<string, typeof entry[]> = raw ? JSON.parse(raw) : {};
    data[key]  = [...(data[key] ?? []), entry];
    await AsyncStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(data)).catch(() => {});
    setQuickLogOpen(null);
  }, []);

  const handleBarcode = useCallback(async (barcode: string) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    setScanLoading(true);
    try {
      const product = await fetchProduct(barcode);
      setShowScanner(false);
      if (product) await autoLogProduct(product);
    } catch {
      setShowScanner(false);
    } finally {
      setScanLoading(false);
      scannedRef.current = false;
    }
  }, [autoLogProduct]);

  const handleFoodPhoto = useCallback(async (base64: string) => {
    setPhotoLoading(true);
    try {
      const product = await identifyFoodFromPhoto(base64);
      setShowPhotoCapture(false);
      if (product) await autoLogProduct(product);
    } catch {
      setShowPhotoCapture(false);
    } finally {
      setPhotoLoading(false);
    }
  }, [autoLogProduct]);

  const logQuickMeal = useCallback(async () => {
    if (!quickMealName.trim()) return;
    const key   = toKey(new Date());
    const entry = { id: `quick-${Date.now()}`, name: quickMealName.trim(), emoji: '🍽️',
      calories: parseInt(quickMealCal) || 0, protein: parseInt(quickMealProt) || 0, carbs: 0, fat: 0 };
    const raw  = await AsyncStorage.getItem(STORAGE_KEYS.MEAL_LOGS).catch(() => null);
    const data: Record<string, typeof entry[]> = raw ? JSON.parse(raw) : {};
    data[key] = [...(data[key] ?? []), entry];
    await AsyncStorage.setItem(STORAGE_KEYS.MEAL_LOGS, JSON.stringify(data)).catch(() => {});
    setQuickMealName(''); setQuickMealCal(''); setQuickMealProt('');
    setQuickLogOpen(null);
  }, [quickMealName, quickMealCal, quickMealProt]);

  const consumed = useMemo(() => selectedDay.events.reduce(
    (acc, e, i) => {
      if (!checkedEvents.has(i)) return acc;
      const m = getEventMacros(e);
      return {
        water:    acc.water,  // water tracked separately via unified quickWaterMl
        calories: acc.calories + m.calories,
        protein:  acc.protein  + m.protein,
        carbs:    acc.carbs    + m.carbs,
        fat:      acc.fat      + m.fat,
      };
    },
    { water: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
  ), [selectedDay.events, checkedEvents]);

  const nextUpIdx = useMemo(() => {
    if (!isViewingToday) return -1;
    for (let i = 0; i < selectedDay.events.length; i++) {
      if (!checkedEvents.has(i)) return i;
    }
    return -1;
  }, [selectedDay.events, checkedEvents, isViewingToday]);

  const consumedWithQuick = useMemo(() => ({
    ...consumed,
    water: isViewingToday ? quickWaterMl : 0,
  }), [consumed, quickWaterMl, isViewingToday]);

  const toggleEvent = useCallback((idx: number) => {
    const daySet = new Set(allCheckedEvents[selectedDayId] ?? []);
    daySet.has(idx) ? daySet.delete(idx) : daySet.add(idx);
    setAllCheckedEvents(prev => ({ ...prev, [selectedDayId]: daySet }));

    if (selectedDayId === todayId) {
      const todayKey = toKey(new Date());
      const event = selectedDay.events[idx];

      if (event.type === 'gym') {
        safeMergeItem(STORAGE_KEYS.WORKOUTS, JSON.stringify({ [todayKey]: daySet.has(idx) }));
      }
    }
  }, [allCheckedEvents, selectedDayId, todayId, selectedDay.events]);

  // ── Loading / error gate ─────────────────────────────────────────────────
  if (!weeklySchedule) {
    const progressLabel =
      progress <= 1  ? 'Filtering & scoring meals…' :
      progress <= 10 ? 'Asking Claude to plan your week…' :
                       `Selecting meals… ${Math.round(progress)}%`;

    return (
      <SafeAreaView style={s.safe}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
        <ScrollView contentContainerStyle={[s.content, { flexGrow: 1, justifyContent: 'center' }]}>
          <LinearGradient
            colors={['#c026d3', '#a855f7', '#7c3aed']}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[s.heroCard, { marginBottom: 0 }]}>
            <View style={s.heroShine} />
            <Text style={[s.heroGreeting, { marginBottom: 8 }]}>{getGreeting()}</Text>
            <Text style={[s.heroName, { marginBottom: 4 }]}>
              {scheduleGenerating ? 'Building your week…' : 'Something went wrong'}
            </Text>
            <Text style={[s.heroMotivation, { marginBottom: 20 }]}>
              {scheduleGenerating
                ? progressLabel
                : scheduleError ?? 'Could not generate your plan.'}
            </Text>

            {scheduleGenerating ? (
              <>
                <View style={{ height: 6, backgroundColor: '#ffffff25', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: '#fff', width: `${Math.max(progress, 4)}%` as any }} />
                </View>
                <ActivityIndicator color="#ffffffaa" size="small" style={{ marginTop: 8 }} />
              </>
            ) : (
              <TouchableOpacity
                onPress={() => generateWeeklyPlan()}
                activeOpacity={0.8}
                style={{ backgroundColor: '#ffffff33', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: 4 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Try Again</Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // After this point weeklySchedule is guaranteed non-null
  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />
      <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Hero Card ── */}
        <LinearGradient
          colors={['#c026d3', '#a855f7', '#7c3aed']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.heroCard}
        >
          <View style={s.heroShine} />
          <View style={s.heroTopRow}>
            <View>
              <Text style={s.heroGreeting}>{getGreeting()},</Text>
              <Text style={s.heroName}>{profileName || 'there'} 👋</Text>
              <Text style={s.heroMotivation}>{getMotivation()}</Text>
            </View>
            <View style={s.heroBadges}>
              {streak >= 2 && <View style={s.heroBadge}><Text style={s.heroBadgeText}>🔥 {streak}-day streak</Text></View>}
              {selectedDay.isGymDay && <View style={s.heroBadge}><Text style={s.heroBadgeText}>🏋️ Gym</Text></View>}
              {selectedDay.isRestDay && <View style={s.heroBadge}><Text style={s.heroBadgeText}>😌 Rest</Text></View>}
              {selectedDay.isClassDay && <View style={s.heroBadge}><Text style={s.heroBadgeText}>📚 Class</Text></View>}
            </View>
          </View>

          <View style={s.heroDivider} />

          <Text style={s.heroFocusLabel}>DAILY FOCUS</Text>
          <Text style={s.heroFocus}>{buildDailyFocus(isViewingToday ? today : selectedDay)}</Text>

          <View style={s.heroBarRow}>
            <View style={s.heroSegments}>
              {Array.from({ length: 10 }, (_, i) => {
                const filled = total > 0 && i < Math.round((done / total) * 10);
                return <View key={i} style={[s.heroSegment, filled && s.heroSegmentFilled]} />;
              })}
            </View>
            <Text style={s.heroPct}>{total > 0 ? Math.round((done / total) * 100) : 0}%</Text>
          </View>
        </LinearGradient>

        {/* ── Next Up ── */}
        {isViewingToday && nextUpIdx !== -1 && (
          <NextUpCard
            event={selectedDay.events[nextUpIdx]}
            onMarkDone={() => toggleEvent(nextUpIdx)}
            theme={theme}
          />
        )}

        {/* ── Today's AI Meals ── */}
        <TodayMealsCard theme={theme} s={s} />

        {/* ── Schedule checklist ── */}
        {!isViewingToday && (
          <TouchableOpacity
            style={s.backToTodayBtn}
            onPress={() => setSelectedDayId(todayId)}
            activeOpacity={0.7}>
            <Text style={[s.backToTodayText, { color: theme.primary }]}>← Back to today</Text>
          </TouchableOpacity>
        )}
        <View style={s.section}>
          <View style={s.checklistTitleRow}>
            <Text style={s.sectionTitle}>
              📋 {isViewingToday ? "Today's Schedule" : `${selectedDay.name}'s Schedule`}
            </Text>
            <Text style={s.checklistProgress}>{done}/{total} done</Text>
          </View>

          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: `${total > 0 ? (done / total) * 100 : 0}%` as any }]} />
          </View>

          {done === total && total > 0 && (
            <View style={s.allDone}>
              <Text style={s.allDoneText}>
                {isViewingToday ? '🎉 You crushed it today, Lydia!' : `🎉 All done for ${selectedDay.name}!`}
              </Text>
            </View>
          )}

          <View style={s.timeline}>
            {selectedDay.events.map((event, idx) => (
              <ChecklistItem
                key={`${selectedDayId}-${idx}`}
                event={event}
                done={checkedEvents.has(idx)}
                isLast={idx === total - 1}
                isNextUp={idx === nextUpIdx}
                onToggle={() => toggleEvent(idx)}
              />
            ))}
          </View>
        </View>

        {/* ── Daily Targets ── */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📊 Daily Targets</Text>
          <View style={s.targetsCard}>
            {[
              { label: 'Calories', emoji: '🔥', color: theme.meal,
                consumed: consumedWithQuick.calories, target: MACRO_TARGETS.calories,
                valueStr: `${consumedWithQuick.calories}`, targetStr: `${MACRO_TARGETS.calories} kcal` },
              { label: 'Protein',  emoji: '💪', color: theme.primary,
                consumed: consumedWithQuick.protein,  target: MACRO_TARGETS.protein,
                valueStr: `${consumedWithQuick.protein}g`, targetStr: `${MACRO_TARGETS.protein}g` },
              { label: 'Carbs',    emoji: '🌾', color: theme.water,
                consumed: consumedWithQuick.carbs,    target: MACRO_TARGETS.carbs,
                valueStr: `${consumedWithQuick.carbs}g`, targetStr: `${MACRO_TARGETS.carbs}g` },
              { label: 'Fat',      emoji: '🧈', color: theme.supplement,
                consumed: consumedWithQuick.fat,      target: MACRO_TARGETS.fat,
                valueStr: `${consumedWithQuick.fat}g`, targetStr: `${MACRO_TARGETS.fat}g` },
              { label: 'Water',    emoji: '💧', color: theme.secondary,
                consumed: consumedWithQuick.water,    target: MACRO_TARGETS.water,
                valueStr: `${(consumedWithQuick.water / 1000).toFixed(1)}L`, targetStr: `${MACRO_TARGETS.water / 1000}L` },
            ].map((item, idx, arr) => {
              const pct = Math.min((item.consumed / item.target) * 100, 100);
              const isLast = idx === arr.length - 1;
              return (
                <View key={item.label} style={[s.targetRow, !isLast && s.targetRowBorder]}>
                  <Text style={s.targetRowEmoji}>{item.emoji}</Text>
                  <Text style={s.targetRowLabel}>{item.label}</Text>
                  <View style={s.targetRowBar}>
                    <View style={[s.targetRowFill, { width: `${pct}%` as any, backgroundColor: item.color }]} />
                  </View>
                  <Text style={[s.targetRowValue, { color: item.consumed > 0 ? item.color : theme.textSecondary }]}>
                    {item.valueStr}
                    <Text style={s.targetRowSep}> / </Text>
                    <Text style={s.targetRowTotal}>{item.targetStr}</Text>
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.bottomPad} />
      </ScrollView>
      <Confetti visible={showConfetti} />

      {/* ── FAB ── */}
      <TouchableOpacity
        style={[s.fab, { backgroundColor: theme.primary }]}
        onPress={() => setQuickLogOpen('menu')}
        activeOpacity={0.85}>
        <Text style={s.fabPlus}>+</Text>
        <Text style={s.fabLabel}>Log</Text>
      </TouchableOpacity>

      {/* ── Log Bottom Sheet ── */}
      <Modal
        visible={quickLogOpen !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setQuickLogOpen(null)}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={s.sheetScrim} activeOpacity={1} onPress={() => setQuickLogOpen(null)} />
          <View style={[s.sheet, { backgroundColor: theme.bgCard }]}>
            <View style={[s.sheetHandle, { backgroundColor: theme.border }]} />

            {quickLogOpen === 'menu' && (
              <>
                <Text style={[s.sheetTitle, { color: theme.textPrimary }]}>Log</Text>
                {[
                  { key: 'log-meal',    emoji: '🍽️', label: 'Log meal',         sub: 'Enter name, kcal & protein',      color: theme.meal },
                  { key: 'scan',        emoji: '📷', label: 'Scan barcode',      sub: 'Packaged food & drinks',          color: theme.meal },
                  { key: 'photo',       emoji: '📸', label: 'AI food scan',      sub: 'Point camera at your plate',      color: theme.meal },
                  { key: 'log-water',   emoji: '💧', label: 'Log water',         sub: 'Track your daily hydration',      color: theme.secondary },
                  { key: 'log-workout', emoji: '🏋️', label: 'Log workout',       sub: "Mark today's session done",       color: theme.gym },
                ].map(({ key, emoji, label, sub, color }) => (
                  <TouchableOpacity
                    key={key}
                    style={[s.sheetRow, { borderBottomColor: theme.border }]}
                    activeOpacity={0.7}
                    onPress={() => {
                      if (key === 'scan') {
                        scannedRef.current = false;
                        setQuickLogOpen(null);
                        setTimeout(() => setShowScanner(true), 300);
                      } else if (key === 'photo') {
                        setQuickLogOpen(null);
                        setTimeout(() => setShowPhotoCapture(true), 300);
                      } else if (key === 'log-workout') {
                        logQuickWorkout();
                        setQuickLogOpen(null);
                      } else {
                        setQuickLogOpen(key as any);
                      }
                    }}>
                    <View style={[s.sheetRowIcon, { backgroundColor: color + '18' }]}>
                      <Text style={s.sheetRowEmoji}>{emoji}</Text>
                    </View>
                    <View style={s.sheetRowText}>
                      <Text style={[s.sheetRowLabel, { color: theme.textPrimary }]}>{label}</Text>
                      <Text style={[s.sheetRowSub, { color: theme.textMuted }]}>{sub}</Text>
                    </View>
                    <Text style={[s.sheetRowChevron, { color: theme.textMuted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </>
            )}

            {quickLogOpen === 'log-meal' && (
              <>
                <TouchableOpacity onPress={() => setQuickLogOpen('menu')} style={s.sheetBack}>
                  <Text style={[s.sheetBackText, { color: theme.primary }]}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={[s.sheetTitle, { color: theme.textPrimary }]}>Log meal</Text>
                <TextInput
                  style={[s.quickInput, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.bgCardAlt }]}
                  placeholder="Meal name…"
                  placeholderTextColor={theme.textMuted}
                  value={quickMealName}
                  onChangeText={setQuickMealName}
                  returnKeyType="next"
                />
                <View style={s.quickInputRow}>
                  <TextInput
                    style={[s.quickInput, { flex: 1, color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.bgCardAlt }]}
                    placeholder="kcal"
                    placeholderTextColor={theme.textMuted}
                    value={quickMealCal}
                    onChangeText={setQuickMealCal}
                    keyboardType="numeric"
                    returnKeyType="next"
                  />
                  <TextInput
                    style={[s.quickInput, { flex: 1, color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.bgCardAlt }]}
                    placeholder="protein (g)"
                    placeholderTextColor={theme.textMuted}
                    value={quickMealProt}
                    onChangeText={setQuickMealProt}
                    keyboardType="numeric"
                    returnKeyType="done"
                    onSubmitEditing={logQuickMeal}
                  />
                </View>
                <TouchableOpacity style={[s.quickSubmitBtn, { backgroundColor: theme.meal }]} onPress={logQuickMeal} activeOpacity={0.8}>
                  <Text style={s.quickSubmitText}>Add Meal</Text>
                </TouchableOpacity>
              </>
            )}

            {quickLogOpen === 'log-water' && (
              <>
                <TouchableOpacity onPress={() => setQuickLogOpen('menu')} style={s.sheetBack}>
                  <Text style={[s.sheetBackText, { color: theme.primary }]}>‹ Back</Text>
                </TouchableOpacity>
                <Text style={[s.sheetTitle, { color: theme.textPrimary }]}>Log water</Text>
                <View style={s.waterPillRow}>
                  {[250, 500, 750, 1000].map(ml => (
                    <TouchableOpacity
                      key={ml}
                      style={[s.waterPill, { backgroundColor: theme.bgCardAlt, borderColor: theme.border }]}
                      onPress={() => { addQuickWater(ml); setQuickLogOpen(null); }}
                      activeOpacity={0.7}>
                      <Text style={[s.waterPillText, { color: theme.secondary }]}>{ml < 1000 ? `${ml}ml` : '1L'}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={[s.waterTotal, { color: theme.textMuted }]}>
                  {((consumed.water + quickWaterMl) / 1000).toFixed(1)}L logged today
                </Text>
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Barcode Scanner Modal ── */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => !scanLoading && setShowScanner(false)}>
        <View style={s.camOverlay}>
          {!permission?.granted ? (
            <View style={s.camPermBox}>
              <Text style={{ fontSize: 48 }}>📷</Text>
              <Text style={s.camPermText}>Camera access is needed to scan barcodes.</Text>
              <TouchableOpacity style={s.camPermBtn} onPress={requestPermission}>
                <Text style={s.camPermBtnText}>Allow Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowScanner(false)} style={{ marginTop: 8 }}>
                <Text style={{ color: '#ffffff88', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <CameraView
                style={{ flex: 1 }}
                facing="back"
                barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
                onBarcodeScanned={scanLoading ? undefined : e => handleBarcode(e.data)}
              />
              <View style={s.camScanFrame}>
                <View style={s.camCornerTL} />
                <View style={s.camCornerTR} />
                <View style={s.camCornerBL} />
                <View style={s.camCornerBR} />
              </View>
              {scanLoading ? (
                <View style={{ position: 'absolute', top: '30%', left: '10%', right: '10%', height: 160, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
                  <ActivityIndicator size="large" color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Looking up product…</Text>
                </View>
              ) : (
                <Text style={s.camLabel}>Point camera at the barcode</Text>
              )}
              {!scanLoading && (
                <TouchableOpacity style={s.camClose} onPress={() => setShowScanner(false)}>
                  <Text style={s.camCloseText}>✕ Close</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </Modal>

      {/* ── Food Photo Capture Modal ── */}
      <Modal visible={showPhotoCapture} animationType="slide" onRequestClose={() => !photoLoading && setShowPhotoCapture(false)}>
        <PhotoCaptureModal
          onCapture={handleFoodPhoto}
          onClose={() => setShowPhotoCapture(false)}
          loading={photoLoading}
          permission={permission}
          requestPermission={requestPermission}
          styles={s}
        />
      </Modal>
    </SafeAreaView>
  );
}

// ─── Photo capture sub-component (needs cameraRef) ───────────────────────────
function PhotoCaptureModal({ onCapture, onClose, loading, permission, requestPermission, styles: s }: {
  onCapture: (base64: string) => void;
  onClose: () => void;
  loading: boolean;
  permission: ReturnType<typeof useCameraPermissions>[0];
  requestPermission: ReturnType<typeof useCameraPermissions>[1];
  styles: ReturnType<typeof createIndexStyles>;
}) {
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || capturing || loading) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6, exif: false });
      if (photo?.base64) onCapture(photo.base64);
    } catch {
      setCapturing(false);
    }
  }, [capturing, loading, onCapture]);

  if (!permission?.granted) {
    return (
      <View style={s.camOverlay}>
        <View style={s.camPermBox}>
          <Text style={{ fontSize: 48 }}>📷</Text>
          <Text style={s.camPermText}>Camera access is needed to photograph food.</Text>
          <TouchableOpacity style={s.camPermBtn} onPress={requestPermission}>
            <Text style={s.camPermBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 8 }}>
            <Text style={{ color: '#ffffff88', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.camOverlay}>
      <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />
      {loading || capturing ? (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#00000066' }}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
            {capturing ? 'Capturing…' : 'Identifying food…'}
          </Text>
        </View>
      ) : (
        <>
          <Text style={s.camHint}>Point at your plate or meal — AI will identify it</Text>
          <TouchableOpacity style={s.camCaptureBtn} onPress={takePhoto} activeOpacity={0.8}>
            <View style={s.camCaptureDot} />
          </TouchableOpacity>
          <TouchableOpacity style={s.camClose} onPress={onClose}>
            <Text style={s.camCloseText}>✕ Close</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}
