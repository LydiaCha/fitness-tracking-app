import React, { useState, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { AppThemeType } from '@/constants/theme';
import { useAppTheme } from '@/context/ThemeContext';
import { STORAGE_KEYS, toKey } from '@/utils/appConstants';
import { MEAL_IDEAS, MACRO_TARGETS, Meal } from '@/constants/nutritionData';
import { loadUserProfile, buildAISystemPrompt } from '@/constants/userProfile';

// ─── Types ───────────────────────────────────────────────────────────────────
interface LoggedMeal {
  id: string;
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingLabel?: string;
}

interface ScannedProduct {
  name: string;
  brand: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingLabel: string;
  emoji: string;
}

type DayMeals = { [dateKey: string]: LoggedMeal[] };
const STORAGE_KEY    = STORAGE_KEYS.MEAL_LOGS;
const CACHE_KEY      = STORAGE_KEYS.BARCODE_CACHE;
const AI_MEALS_KEY   = STORAGE_KEYS.AI_MEALS;
const AI_ENABLED_KEY = STORAGE_KEYS.AI_ENABLED;

// In-memory cache so repeat scans within a session are instant
const memCache = new Map<string, ScannedProduct>();

async function loadBarcodeCache() {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const entries: [string, ScannedProduct][] = JSON.parse(raw);
      entries.forEach(([k, v]) => memCache.set(k, v));
    }
  } catch {}
}
loadBarcodeCache();

async function saveBarcodeCache(barcode: string, product: ScannedProduct) {
  memCache.set(barcode, product);
  try {
    // Keep last 200 entries to avoid unbounded growth
    const entries = Array.from(memCache.entries()).slice(-200);
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entries));
  } catch {}
}

// ─── Claude Food Vision ───────────────────────────────────────────────────────
async function identifyFoodFromPhoto(base64: string): Promise<ScannedProduct | null> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') throw new Error('API key not configured');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: 'image/jpeg', data: base64 },
          },
          {
            type: 'text',
            text: 'Identify the food in this photo and estimate nutrition for the visible portion. Return ONLY a JSON object — no markdown, no explanation: {"name":string,"brand":string,"calories":number,"protein":number,"carbs":number,"fat":number,"servingLabel":string}. For servingLabel describe the portion (e.g. "1 medium apple ~182g"). If no food is visible return {"error":"no food detected"}.',
          },
        ],
      }],
    }),
  });

  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  const text: string = json.content?.[0]?.text ?? '';

  // Strip any accidental markdown fences
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed = JSON.parse(cleaned);
  if (parsed.error) return null;

  return {
    name:         parsed.name         || 'Unknown food',
    brand:        parsed.brand        || '',
    calories:     Math.round(parsed.calories || 0),
    protein:      Math.round((parsed.protein || 0) * 10) / 10,
    carbs:        Math.round((parsed.carbs   || 0) * 10) / 10,
    fat:          Math.round((parsed.fat     || 0) * 10) / 10,
    servingLabel: parsed.servingLabel || 'estimated serving',
    emoji:        '🤖',
  };
}

// ─── AI Meal Generator ────────────────────────────────────────────────────────
async function generateAIMeals(userPrompt: string): Promise<Meal[]> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') throw new Error('API key not configured');

  // Load the live user profile so the AI reflects any schedule changes
  const profile = await loadUserProfile();
  const systemPrompt = buildAISystemPrompt(profile);

  const request = userPrompt.trim()
    ? `Special request: ${userPrompt.trim()}`
    : 'Generate varied, practical, high-protein meals that suit a night shift worker lifestyle.';

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `Generate 6 meal ideas as a JSON array. Each item must have these exact fields:
{ "id": string, "name": string, "emoji": string, "calories": number, "protein": number, "carbs": number, "fat": number, "timing": string, "category": "pre-workout"|"post-workout"|"main"|"snack"|"night-shift", "description": string, "ingredients": string[], "tip": string }

${request}
Return ONLY the JSON array — no markdown, no explanation.`,
      }],
    }),
  });

  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  const text: string = json.content?.[0]?.text ?? '';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const meals: Meal[] = JSON.parse(cleaned);
  // Prefix IDs so they never clash with hardcoded ones
  return meals.map((m, i) => ({ ...m, id: `ai-${Date.now()}-${i}` }));
}

// ─── Open Food Facts ──────────────────────────────────────────────────────────
const OFF_FIELDS = 'product_name,abbreviated_product_name,brands,nutriments,serving_quantity,serving_size';

async function fetchProduct(barcode: string): Promise<ScannedProduct | null> {
  if (memCache.has(barcode)) return memCache.get(barcode)!;

  const res = await fetch(
    `https://world.openfoodfacts.org/api/v0/product/${barcode}.json?fields=${OFF_FIELDS}`
  );
  const json = await res.json();
  if (json.status !== 1 || !json.product) return null;

  const p = json.product;
  const n = p.nutriments ?? {};

  // Prefer per-serving values if serving quantity exists, otherwise per 100g
  const servingQty = parseFloat(p.serving_quantity ?? '0');
  const useServing = servingQty > 0;
  const factor = useServing ? servingQty / 100 : 1;
  const servingLabel = useServing
    ? (p.serving_size ?? `${servingQty}g`)
    : 'per 100g';

  const calories = Math.round((n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0) * factor);
  const protein  = Math.round((n['proteins_100g']       ?? 0) * factor * 10) / 10;
  const carbs    = Math.round((n['carbohydrates_100g']   ?? 0) * factor * 10) / 10;
  const fat      = Math.round((n['fat_100g']             ?? 0) * factor * 10) / 10;

  if (calories === 0 && protein === 0) return null; // no useful data

  const product: ScannedProduct = {
    name: p.product_name || p.abbreviated_product_name || 'Unknown product',
    brand: p.brands || '',
    calories,
    protein,
    carbs,
    fat,
    servingLabel,
    emoji: '🏷️',
  };
  saveBarcodeCache(barcode, product);
  return product;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function sumMacros(meals: LoggedMeal[]) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein:  acc.protein  + m.protein,
      carbs:    acc.carbs    + m.carbs,
      fat:      acc.fat      + m.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

function clamp(val: number, max: number) {
  return Math.min(100, Math.round((val / max) * 100));
}

// ─── Macro Bar ────────────────────────────────────────────────────────────────
function MacroBar({ label, value, target, unit, color, theme }: {
  label: string; value: number; target: number; unit: string; color: string; theme: AppThemeType;
}) {
  const p = clamp(value, target);
  const over = value > target;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
        <Text style={{ fontSize: 13, color: theme.textSecondary, fontWeight: '600' }}>{label}</Text>
        <Text style={{ fontSize: 13, fontWeight: '700', color: over ? theme.warning : theme.textPrimary }}>
          {value}{unit}{' '}
          <Text style={{ color: theme.textMuted, fontWeight: '400' }}>/ {target}{unit}</Text>
        </Text>
      </View>
      <View style={{ height: 6, backgroundColor: theme.bgCardAlt, borderRadius: 3, overflow: 'hidden' }}>
        <View style={{ height: 6, width: `${p}%`, backgroundColor: over ? theme.warning : color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
function useStyles(theme: AppThemeType) {
  return useMemo(() => StyleSheet.create({
    safe:          { flex: 1, backgroundColor: theme.bg },
    scroll:        { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
    title:         { fontSize: 24, fontWeight: '800', color: theme.textPrimary, marginBottom: 4 },
    subtitle:      { fontSize: 13, color: theme.textSecondary, marginBottom: 16 },
    card:          { backgroundColor: theme.bgCard, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border },
    cardTitle:     { fontSize: 16, fontWeight: '700', color: theme.textPrimary, marginBottom: 12 },
    calorieRow:    { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 16 },
    calValue:      { fontSize: 42, fontWeight: '800', color: theme.primary, lineHeight: 48 },
    calTarget:     { fontSize: 14, color: theme.textMuted },
    btnRow:        { flexDirection: 'row', gap: 10, marginBottom: 8 },
    addBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 12, gap: 6 },
    scanBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgCard, borderRadius: 12, paddingVertical: 12, gap: 6, borderWidth: 1, borderColor: theme.border },
    btnText:       { fontSize: 14, fontWeight: '700', color: '#fff' },
    scanBtnText:   { fontSize: 14, fontWeight: '700', color: theme.textPrimary },
    mealRow:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.border + '55' },
    mealEmoji:     { fontSize: 22, width: 36, textAlign: 'center' },
    mealInfo:      { flex: 1 },
    mealName:      { fontSize: 14, fontWeight: '600', color: theme.textPrimary },
    mealMacros:    { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    mealCal:       { fontSize: 13, fontWeight: '700', color: theme.textSecondary },
    emptyText:     { fontSize: 13, color: theme.textMuted, textAlign: 'center', paddingVertical: 16 },
    hint:          { fontSize: 11, color: theme.textMuted, textAlign: 'center', marginTop: 6 },

    // Shared modal bottom sheet
    overlay:       { flex: 1, backgroundColor: '#000000aa', justifyContent: 'flex-end' },
    sheet:         { backgroundColor: theme.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, maxHeight: '90%' },
    handle:        { width: 36, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
    sheetTitle:    { fontSize: 18, fontWeight: '800', color: theme.textPrimary, paddingHorizontal: 16, marginBottom: 12 },

    // Meal picker
    categoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
    chip:          { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: theme.border },
    chipText:      { fontSize: 12, fontWeight: '600', color: theme.textMuted },
    mealOption:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: theme.border + '55' },
    mealOptEmoji:  { fontSize: 24, width: 40 },
    mealOptInfo:   { flex: 1 },
    mealOptName:   { fontSize: 15, fontWeight: '600', color: theme.textPrimary },
    mealOptSub:    { fontSize: 12, color: theme.textMuted, marginTop: 2 },
    mealOptCal:    { fontSize: 14, fontWeight: '700', color: theme.primary },

    // Camera
    cameraOverlay: { flex: 1, backgroundColor: '#000' },
    cameraBg:      { flex: 1 },
    scanFrame:     {
      position: 'absolute', top: '30%', left: '10%', right: '10%', height: 160,
      borderRadius: 16, borderWidth: 2, borderColor: '#fff',
    },
    scanCornerTL:  { position: 'absolute', top: -2, left: -2, width: 24, height: 24, borderTopWidth: 4, borderLeftWidth: 4, borderColor: theme.primary, borderTopLeftRadius: 14 },
    scanCornerTR:  { position: 'absolute', top: -2, right: -2, width: 24, height: 24, borderTopWidth: 4, borderRightWidth: 4, borderColor: theme.primary, borderTopRightRadius: 14 },
    scanCornerBL:  { position: 'absolute', bottom: -2, left: -2, width: 24, height: 24, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: theme.primary, borderBottomLeftRadius: 14 },
    scanCornerBR:  { position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderBottomWidth: 4, borderRightWidth: 4, borderColor: theme.primary, borderBottomRightRadius: 14 },
    scanLabel:     { position: 'absolute', top: '58%', left: 0, right: 0, textAlign: 'center', color: '#ffffffcc', fontSize: 14 },
    cameraClose:   { position: 'absolute', top: 56, right: 20, backgroundColor: '#00000099', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
    cameraCloseText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Confirm sheet
    productName:   { fontSize: 18, fontWeight: '800', color: theme.textPrimary, paddingHorizontal: 16, marginBottom: 4 },
    productBrand:  { fontSize: 13, color: theme.textMuted, paddingHorizontal: 16, marginBottom: 16 },
    macroGrid:     { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginBottom: 20 },
    macroItem:     { alignItems: 'center' },
    macroValue:    { fontSize: 22, fontWeight: '800', color: theme.textPrimary, marginBottom: 2 },
    macroLabel:    { fontSize: 11, color: theme.textMuted },
    servingLabel:  { fontSize: 12, color: theme.textMuted, textAlign: 'center', marginBottom: 20 },

    // Quantity row
    qtyRow:        { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, marginBottom: 20 },
    qtyLabel:      { fontSize: 14, color: theme.textSecondary, fontWeight: '600' },
    qtyInput:      { flex: 1, backgroundColor: theme.bgCardAlt, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, fontSize: 16, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
    qtyUnit:       { fontSize: 13, color: theme.textMuted },

    confirmBtn:    { marginHorizontal: 16, backgroundColor: theme.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginBottom: 8 },
    confirmBtnText:{ fontSize: 16, fontWeight: '700', color: '#fff' },
    cancelBtn:     { marginHorizontal: 16, paddingVertical: 10, alignItems: 'center', marginBottom: 16 },
    cancelBtnText: { fontSize: 14, color: theme.textMuted },

    permBox:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 32 },
    permText:      { fontSize: 15, color: '#fff', textAlign: 'center', lineHeight: 22 },
    permBtn:       { backgroundColor: theme.primary, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12 },
    permBtnText:   { fontSize: 14, fontWeight: '700', color: '#fff' },

    // Picker tabs
    pickerTabRow:   { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 12 },
    pickerTabBtn:   { flex: 1, paddingVertical: 8, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: theme.border },
    pickerTabText:  { fontSize: 13, fontWeight: '600', color: theme.textMuted },

    // AI section
    aiPromptRow:    { flexDirection: 'row', gap: 10, paddingHorizontal: 16, marginBottom: 12 },
    aiPromptInput:  { flex: 1, backgroundColor: theme.bgCardAlt, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: theme.textPrimary, borderWidth: 1, borderColor: theme.border },
    aiGenBtn:       { backgroundColor: theme.primary, borderRadius: 10, paddingHorizontal: 14, justifyContent: 'center' },
    aiGenBtnText:   { fontSize: 13, fontWeight: '700', color: '#fff' },
    aiToggleRow:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.border + '55', marginTop: 4 },
    aiToggleLabel:  { fontSize: 13, color: theme.textMuted },
    aiEmptyBox:     { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 8 },
    aiEmptyText:    { fontSize: 14, color: theme.textMuted, textAlign: 'center', lineHeight: 20 },
    aiTagBadge:     { fontSize: 10, color: theme.primary, fontWeight: '700', backgroundColor: theme.primary + '22', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1, overflow: 'hidden', alignSelf: 'flex-start', marginTop: 2 },

    // Photo capture
    captureBtn:    { position: 'absolute', bottom: 60, alignSelf: 'center', width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff22' },
    captureDot:    { width: 54, height: 54, borderRadius: 27, backgroundColor: '#fff' },
    photoHint:     { position: 'absolute', bottom: 150, left: 0, right: 0, textAlign: 'center', color: '#ffffffcc', fontSize: 13 },
  }), [theme]);
}

const CATEGORIES = ['all', 'pre-workout', 'post-workout', 'main', 'snack', 'night-shift'] as const;
type Category = typeof CATEGORIES[number];

// ─── Confirm Sheet ────────────────────────────────────────────────────────────
function ConfirmSheet({ product, onLog, onCancel, theme, s }: {
  product: ScannedProduct;
  onLog: (p: ScannedProduct, servings: number) => void;
  onCancel: () => void;
  theme: AppThemeType;
  s: ReturnType<typeof useStyles>;
}) {
  const [servings, setServings] = useState('1');
  const qty = Math.max(0.1, parseFloat(servings) || 1);
  const scaled = {
    calories: Math.round(product.calories * qty),
    protein:  Math.round(product.protein  * qty * 10) / 10,
    carbs:    Math.round(product.carbs    * qty * 10) / 10,
    fat:      Math.round(product.fat      * qty * 10) / 10,
  };

  return (
    <>
      <View style={s.handle} />
      <Text style={s.productName}>{product.name}</Text>
      {product.brand ? <Text style={s.productBrand}>{product.brand}</Text> : null}

      <View style={s.macroGrid}>
        <View style={s.macroItem}>
          <Text style={[s.macroValue, { color: theme.primary }]}>{scaled.calories}</Text>
          <Text style={s.macroLabel}>kcal</Text>
        </View>
        <View style={s.macroItem}>
          <Text style={[s.macroValue, { color: theme.gym }]}>{scaled.protein}g</Text>
          <Text style={s.macroLabel}>protein</Text>
        </View>
        <View style={s.macroItem}>
          <Text style={[s.macroValue, { color: theme.class }]}>{scaled.carbs}g</Text>
          <Text style={s.macroLabel}>carbs</Text>
        </View>
        <View style={s.macroItem}>
          <Text style={[s.macroValue, { color: theme.warning }]}>{scaled.fat}g</Text>
          <Text style={s.macroLabel}>fat</Text>
        </View>
      </View>

      <View style={s.qtyRow}>
        <Text style={s.qtyLabel}>Servings</Text>
        <TextInput
          style={s.qtyInput}
          value={servings}
          onChangeText={setServings}
          keyboardType="decimal-pad"
          returnKeyType="done"
          selectTextOnFocus
        />
        <Text style={s.qtyUnit}>× {product.servingLabel}</Text>
      </View>

      <TouchableOpacity style={s.confirmBtn} onPress={() => onLog(product, qty)} activeOpacity={0.8}>
        <Text style={s.confirmBtnText}>Log this meal</Text>
      </TouchableOpacity>
      <TouchableOpacity style={s.cancelBtn} onPress={onCancel}>
        <Text style={s.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </>
  );
}

// ─── Camera Scanner ───────────────────────────────────────────────────────────
function BarcodeScanner({ onScanned, onClose, loading, theme, s }: {
  onScanned: (barcode: string) => void;
  onClose: () => void;
  loading: boolean;
  theme: AppThemeType;
  s: ReturnType<typeof useStyles>;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  // Reset lock when loading finishes (e.g. not found, allowing retry)
  React.useEffect(() => { if (!loading) scannedRef.current = false; }, [loading]);

  const handleBarcode = useCallback(({ data }: { data: string }) => {
    if (scannedRef.current) return;
    scannedRef.current = true;
    onScanned(data);
  }, [onScanned]);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={s.cameraOverlay}>
        <View style={s.permBox}>
          <Text style={{ fontSize: 48 }}>📷</Text>
          <Text style={s.permText}>Camera access is needed to scan barcodes.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 8 }}>
            <Text style={{ color: '#ffffff88', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.cameraOverlay}>
      <CameraView
        style={s.cameraBg}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'] }}
        onBarcodeScanned={loading ? undefined : handleBarcode}
      />
      <View style={s.scanFrame}>
        <View style={s.scanCornerTL} />
        <View style={s.scanCornerTR} />
        <View style={s.scanCornerBL} />
        <View style={s.scanCornerBR} />
      </View>
      {loading ? (
        <View style={{ position: 'absolute', top: '30%', left: '10%', right: '10%', height: 160, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: '#fff', fontSize: 14, fontWeight: '600' }}>Looking up product…</Text>
        </View>
      ) : (
        <Text style={s.scanLabel}>Point camera at the barcode</Text>
      )}
      {!loading && (
        <TouchableOpacity style={s.cameraClose} onPress={onClose}>
          <Text style={s.cameraCloseText}>✕ Close</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Food Photo Capture ───────────────────────────────────────────────────────
function FoodPhotoCapture({ onCapture, onClose, loading, theme, s }: {
  onCapture: (base64: string) => void;
  onClose: () => void;
  loading: boolean;
  theme: AppThemeType;
  s: ReturnType<typeof useStyles>;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [capturing, setCapturing] = useState(false);

  const takePhoto = useCallback(async () => {
    if (!cameraRef.current || capturing || loading) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.6, exif: false });
      if (photo?.base64) onCapture(photo.base64);
    } catch {
      Alert.alert('Error', 'Could not take photo. Please try again.');
      setCapturing(false);
    }
  }, [capturing, loading, onCapture]);

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <View style={s.cameraOverlay}>
        <View style={s.permBox}>
          <Text style={{ fontSize: 48 }}>📷</Text>
          <Text style={s.permText}>Camera access is needed to photograph food.</Text>
          <TouchableOpacity style={s.permBtn} onPress={requestPermission}>
            <Text style={s.permBtnText}>Allow Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onClose} style={{ marginTop: 8 }}>
            <Text style={{ color: '#ffffff88', fontSize: 14 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={s.cameraOverlay}>
      <CameraView ref={cameraRef} style={s.cameraBg} facing="back" />

      {loading || capturing ? (
        <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', gap: 14, backgroundColor: '#00000066' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '600' }}>
            {capturing ? 'Capturing…' : 'Identifying food…'}
          </Text>
        </View>
      ) : (
        <>
          <Text style={s.photoHint}>Point camera at food and tap to capture</Text>
          <TouchableOpacity style={s.captureBtn} onPress={takePhoto} activeOpacity={0.8}>
            <View style={s.captureDot} />
          </TouchableOpacity>
          <TouchableOpacity style={s.cameraClose} onPress={onClose}>
            <Text style={s.cameraCloseText}>✕ Close</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function MealTrackerScreen() {
  const { theme, isDark } = useAppTheme();
  const s = useStyles(theme);

  const [dayMeals,      setDayMeals]      = useState<DayMeals>({});
  const [showPicker,      setShowPicker]      = useState(false);
  const [showScanner,     setShowScanner]     = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [scannedProduct,  setScannedProduct]  = useState<ScannedProduct | null>(null);
  const [scanLoading,     setScanLoading]     = useState(false);
  const [photoLoading,    setPhotoLoading]    = useState(false);
  const [filterCat,       setFilterCat]       = useState<Category>('all');
  const [loading,         setLoading]         = useState(true);
  const [aiEnabled,       setAiEnabled]       = useState(true);
  const [aiMeals,         setAiMeals]         = useState<Meal[]>([]);
  const [aiPrompt,        setAiPrompt]        = useState('');
  const [aiGenerating,    setAiGenerating]    = useState(false);
  const [pickerTab,       setPickerTab]       = useState<'standard' | 'ai'>('standard');

  const todayKey   = toKey(new Date());
  const todayMeals = dayMeals[todayKey] ?? [];
  const totals     = useMemo(() => sumMacros(todayMeals), [todayMeals]);

  useFocusEffect(useCallback(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY),
      AsyncStorage.getItem(AI_MEALS_KEY),
      AsyncStorage.getItem(AI_ENABLED_KEY),
    ]).then(([meals, aiM, aiE]) => {
      if (meals) setDayMeals(JSON.parse(meals));
      if (aiM)   setAiMeals(JSON.parse(aiM));
      if (aiE !== null) setAiEnabled(JSON.parse(aiE));
    }).catch(console.error).finally(() => setLoading(false));
  }, []));

  const saveDayMeals = useCallback(async (data: DayMeals) => {
    setDayMeals(data);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, []);

  const addMealEntry = useCallback((entry: LoggedMeal) => {
    const updated = { ...dayMeals, [todayKey]: [...(dayMeals[todayKey] ?? []), entry] };
    saveDayMeals(updated);
  }, [dayMeals, todayKey, saveDayMeals]);

  const logFromPicker = useCallback((meal: Meal) => {
    addMealEntry({
      id: `${meal.id}-${Date.now()}`,
      name: meal.name, emoji: meal.emoji,
      calories: meal.calories, protein: meal.protein, carbs: meal.carbs, fat: meal.fat,
    });
    setShowPicker(false);
  }, [addMealEntry]);

  const logFromScan = useCallback((product: ScannedProduct, servings: number) => {
    addMealEntry({
      id: `scan-${Date.now()}`,
      name: product.name, emoji: product.emoji,
      calories: Math.round(product.calories * servings),
      protein:  Math.round(product.protein  * servings * 10) / 10,
      carbs:    Math.round(product.carbs    * servings * 10) / 10,
      fat:      Math.round(product.fat      * servings * 10) / 10,
      servingLabel: product.servingLabel,
    });
    setScannedProduct(null);
  }, [addMealEntry]);

  const toggleAI = useCallback(async (val: boolean) => {
    setAiEnabled(val);
    await AsyncStorage.setItem(AI_ENABLED_KEY, JSON.stringify(val));
    if (!val) setPickerTab('standard');
  }, []);

  const handleGenerate = useCallback(async () => {
    setAiGenerating(true);
    try {
      const meals = await generateAIMeals(aiPrompt);
      setAiMeals(meals);
      await AsyncStorage.setItem(AI_MEALS_KEY, JSON.stringify(meals));
    } catch (e: any) {
      const msg = e?.message?.includes('API key not configured')
        ? 'Add your Anthropic API key to the .env file.'
        : 'Could not generate meals. Check your connection.';
      Alert.alert('Generation failed', msg);
    } finally {
      setAiGenerating(false);
    }
  }, [aiPrompt]);

  const handleBarcode = useCallback(async (barcode: string) => {
    // Stay on camera screen and show spinner — fetch happens in parallel
    setScanLoading(true);
    try {
      const product = await fetchProduct(barcode);
      setShowScanner(false);
      if (!product) {
        Alert.alert('Not found', 'This product wasn\'t found in the database. Try another barcode or add it manually.', [{ text: 'OK' }]);
      } else {
        setScannedProduct(product);
      }
    } catch {
      setShowScanner(false);
      Alert.alert('Error', 'Could not fetch product data. Check your internet connection.');
    } finally {
      setScanLoading(false);
    }
  }, []);

  const handleFoodPhoto = useCallback(async (base64: string) => {
    setPhotoLoading(true);
    try {
      const product = await identifyFoodFromPhoto(base64);
      setShowPhotoCapture(false);
      if (!product) {
        Alert.alert('No food detected', 'Couldn\'t identify food in the photo. Try again with better lighting or a closer shot.');
      } else {
        setScannedProduct(product);
      }
    } catch (e: any) {
      setShowPhotoCapture(false);
      const msg = e?.message?.includes('API key not configured')
        ? 'Add your Anthropic API key to the .env file to use this feature.'
        : 'Could not identify food. Check your internet connection.';
      Alert.alert('Error', msg);
    } finally {
      setPhotoLoading(false);
    }
  }, []);

  const deleteMeal = useCallback((id: string) => {
    Alert.alert('Remove meal', 'Remove this meal from today\'s log?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => {
        const updated = { ...dayMeals, [todayKey]: todayMeals.filter(m => m.id !== id) };
        saveDayMeals(updated);
      }},
    ]);
  }, [dayMeals, todayKey, todayMeals, saveDayMeals]);

  const filteredMeals = useMemo(() =>
    filterCat === 'all' ? MEAL_IDEAS : MEAL_IDEAS.filter(m => m.category === filterCat),
    [filterCat]);

  if (loading) return <SafeAreaView style={s.safe}><StatusBar barStyle="light-content" /></SafeAreaView>;

  const calRemaining = MACRO_TARGETS.calories - totals.calories;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.bg} />

      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={s.title}>Meal Tracker</Text>
        <Text style={s.subtitle}>Track your daily food & macros</Text>

        {/* ── Calorie Summary ── */}
        <View style={s.card}>
          <View style={s.calorieRow}>
            <Text style={s.calValue}>{totals.calories}</Text>
            <Text style={s.calTarget}>
              / {MACRO_TARGETS.calories} kcal · {calRemaining >= 0 ? `${calRemaining} remaining` : `${Math.abs(calRemaining)} over`}
            </Text>
          </View>
          <MacroBar label="Protein" value={totals.protein} target={MACRO_TARGETS.protein} unit="g" color={theme.gym}     theme={theme} />
          <MacroBar label="Carbs"   value={totals.carbs}   target={MACRO_TARGETS.carbs}   unit="g" color={theme.class}   theme={theme} />
          <MacroBar label="Fat"     value={totals.fat}     target={MACRO_TARGETS.fat}      unit="g" color={theme.warning} theme={theme} />
        </View>

        {/* ── Today's Meals ── */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Today's Meals</Text>
          {todayMeals.length === 0
            ? <Text style={s.emptyText}>No meals logged yet. Scan a barcode or add a meal below!</Text>
            : todayMeals.map(meal => (
              <TouchableOpacity key={meal.id} style={s.mealRow} onLongPress={() => deleteMeal(meal.id)} activeOpacity={0.7}>
                <Text style={s.mealEmoji}>{meal.emoji}</Text>
                <View style={s.mealInfo}>
                  <Text style={s.mealName}>{meal.name}</Text>
                  <Text style={s.mealMacros}>P {meal.protein}g · C {meal.carbs}g · F {meal.fat}g{meal.servingLabel ? ` · ${meal.servingLabel}` : ''}</Text>
                </View>
                <Text style={s.mealCal}>{meal.calories} kcal</Text>
              </TouchableOpacity>
            ))
          }
        </View>

        {/* ── Action Buttons ── */}
        <View style={s.btnRow}>
          <TouchableOpacity style={s.scanBtn} onPress={() => setShowScanner(true)} activeOpacity={0.8}>
            {scanLoading
              ? <ActivityIndicator size="small" color={theme.textPrimary} />
              : <Text style={{ fontSize: 16 }}>📷</Text>
            }
            <Text style={s.scanBtnText}>{scanLoading ? 'Looking up…' : 'Scan'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.scanBtn} onPress={() => setShowPhotoCapture(true)} activeOpacity={0.8}>
            <Text style={{ fontSize: 16 }}>🤖</Text>
            <Text style={s.scanBtnText}>AI Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
            <Text style={{ fontSize: 16 }}>🍽️</Text>
            <Text style={s.btnText}>Add Meal</Text>
          </TouchableOpacity>
        </View>
        <Text style={s.hint}>Long-press a logged meal to remove it</Text>
      </ScrollView>

      {/* ── Barcode Camera Modal ── */}
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <BarcodeScanner
          onScanned={handleBarcode}
          onClose={() => setShowScanner(false)}
          loading={scanLoading}
          theme={theme}
          s={s}
        />
      </Modal>

      {/* ── Food Photo Capture Modal ── */}
      <Modal visible={showPhotoCapture} animationType="slide" onRequestClose={() => !photoLoading && setShowPhotoCapture(false)}>
        <FoodPhotoCapture
          onCapture={handleFoodPhoto}
          onClose={() => setShowPhotoCapture(false)}
          loading={photoLoading}
          theme={theme}
          s={s}
        />
      </Modal>

      {/* ── Scanned Product Confirm Sheet ── */}
      <Modal visible={!!scannedProduct} transparent animationType="slide" onRequestClose={() => setScannedProduct(null)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setScannedProduct(null)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
            {scannedProduct && (
              <ConfirmSheet
                product={scannedProduct}
                onLog={logFromScan}
                onCancel={() => setScannedProduct(null)}
                theme={theme}
                s={s}
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Meal Picker ── */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setShowPicker(false)}>
          <TouchableOpacity style={s.sheet} activeOpacity={1} onPress={() => {}}>
            <View style={s.handle} />
            <Text style={s.sheetTitle}>Choose a Meal</Text>

            {/* Tab switcher */}
            <View style={s.pickerTabRow}>
              <TouchableOpacity
                style={[s.pickerTabBtn, pickerTab === 'standard' && { backgroundColor: theme.primary + '22', borderColor: theme.primary }]}
                onPress={() => setPickerTab('standard')}>
                <Text style={[s.pickerTabText, pickerTab === 'standard' && { color: theme.primary }]}>Standard</Text>
              </TouchableOpacity>
              {aiEnabled && (
                <TouchableOpacity
                  style={[s.pickerTabBtn, pickerTab === 'ai' && { backgroundColor: theme.primary + '22', borderColor: theme.primary }]}
                  onPress={() => setPickerTab('ai')}>
                  <Text style={[s.pickerTabText, pickerTab === 'ai' && { color: theme.primary }]}>✨ AI Suggestions</Text>
                </TouchableOpacity>
              )}
              {!aiEnabled && (
                <TouchableOpacity
                  style={[s.pickerTabBtn, { borderStyle: 'dashed' }]}
                  onPress={() => toggleAI(true)}>
                  <Text style={s.pickerTabText}>✨ Enable AI</Text>
                </TouchableOpacity>
              )}
            </View>

            {pickerTab === 'standard' ? (
              <>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.categoryChips}>
                  {CATEGORIES.map(cat => (
                    <TouchableOpacity
                      key={cat}
                      style={[s.chip, filterCat === cat && { backgroundColor: theme.primary + '33', borderColor: theme.primary }]}
                      onPress={() => setFilterCat(cat)}>
                      <Text style={[s.chipText, filterCat === cat && { color: theme.primary }]}>
                        {cat === 'all' ? 'All' : cat.replace('-', ' ')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <FlatList
                  data={filteredMeals}
                  keyExtractor={item => item.id}
                  style={{ maxHeight: 380 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={s.mealOption} onPress={() => logFromPicker(item)} activeOpacity={0.7}>
                      <Text style={s.mealOptEmoji}>{item.emoji}</Text>
                      <View style={s.mealOptInfo}>
                        <Text style={s.mealOptName}>{item.name}</Text>
                        <Text style={s.mealOptSub}>P {item.protein}g · C {item.carbs}g · F {item.fat}g · {item.timing}</Text>
                      </View>
                      <Text style={s.mealOptCal}>{item.calories}</Text>
                    </TouchableOpacity>
                  )}
                />
              </>
            ) : (
              <>
                {/* Prompt input */}
                <View style={s.aiPromptRow}>
                  <TextInput
                    style={s.aiPromptInput}
                    value={aiPrompt}
                    onChangeText={setAiPrompt}
                    placeholder='e.g. "high protein", "quick night snacks", "no chicken"'
                    placeholderTextColor={theme.textMuted}
                    returnKeyType="done"
                    onSubmitEditing={handleGenerate}
                  />
                  <TouchableOpacity style={s.aiGenBtn} onPress={handleGenerate} disabled={aiGenerating} activeOpacity={0.8}>
                    {aiGenerating
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={s.aiGenBtnText}>Generate</Text>
                    }
                  </TouchableOpacity>
                </View>

                {/* AI meal list */}
                {aiMeals.length === 0 ? (
                  <View style={s.aiEmptyBox}>
                    <Text style={{ fontSize: 32 }}>✨</Text>
                    <Text style={s.aiEmptyText}>
                      {aiGenerating
                        ? 'Generating personalised meals for you…'
                        : 'Tap Generate to get AI-powered meal suggestions tailored to your profile and goals.'}
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={aiMeals}
                    keyExtractor={item => item.id}
                    style={{ maxHeight: 320 }}
                    renderItem={({ item }) => (
                      <TouchableOpacity style={s.mealOption} onPress={() => logFromPicker(item)} activeOpacity={0.7}>
                        <Text style={s.mealOptEmoji}>{item.emoji}</Text>
                        <View style={s.mealOptInfo}>
                          <Text style={s.mealOptName}>{item.name}</Text>
                          <Text style={s.mealOptSub}>P {item.protein}g · C {item.carbs}g · F {item.fat}g · {item.timing}</Text>
                          <Text style={s.aiTagBadge}>✨ AI</Text>
                        </View>
                        <Text style={s.mealOptCal}>{item.calories}</Text>
                      </TouchableOpacity>
                    )}
                  />
                )}

                {/* Opt-out toggle */}
                <View style={s.aiToggleRow}>
                  <Text style={s.aiToggleLabel}>AI Suggestions enabled</Text>
                  <Switch
                    value={aiEnabled}
                    onValueChange={toggleAI}
                    trackColor={{ false: theme.border, true: theme.primary + '88' }}
                    thumbColor={aiEnabled ? theme.primary : theme.textMuted}
                  />
                </View>
              </>
            )}
            <View style={{ height: 8 }} />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}
