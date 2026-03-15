import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from './appConstants';

export interface ScannedProduct {
  name:         string;
  brand:        string;
  calories:     number;
  protein:      number;
  carbs:        number;
  fat:          number;
  servingLabel: string;
  emoji:        string;
}

// ─── Barcode cache ────────────────────────────────────────────────────────────
const memCache = new Map<string, ScannedProduct>();

async function loadBarcodeCache() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.BARCODE_CACHE);
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
    const entries = Array.from(memCache.entries()).slice(-200);
    await AsyncStorage.setItem(STORAGE_KEYS.BARCODE_CACHE, JSON.stringify(entries));
  } catch {}
}

// ─── Open Food Facts ──────────────────────────────────────────────────────────
const OFF_FIELDS = 'product_name,abbreviated_product_name,brands,nutriments,serving_quantity,serving_size';

export async function fetchProduct(barcode: string): Promise<ScannedProduct | null> {
  if (memCache.has(barcode)) return memCache.get(barcode)!;

  const res  = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json?fields=${OFF_FIELDS}`);
  const json = await res.json();
  if (json.status !== 1 || !json.product) return null;

  const p = json.product;
  const n = p.nutriments ?? {};

  const servingQty   = parseFloat(p.serving_quantity ?? '0');
  const useServing   = servingQty > 0;
  const factor       = useServing ? servingQty / 100 : 1;
  const servingLabel = useServing ? (p.serving_size ?? `${servingQty}g`) : 'per 100g';

  const calories = Math.round((n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0) * factor);
  const protein  = Math.round((n['proteins_100g']       ?? 0) * factor * 10) / 10;
  const carbs    = Math.round((n['carbohydrates_100g']   ?? 0) * factor * 10) / 10;
  const fat      = Math.round((n['fat_100g']             ?? 0) * factor * 10) / 10;

  if (calories === 0 && protein === 0) return null;

  const product: ScannedProduct = {
    name: p.product_name || p.abbreviated_product_name || 'Unknown product',
    brand: p.brands || '',
    calories, protein, carbs, fat, servingLabel, emoji: '🏷️',
  };
  saveBarcodeCache(barcode, product);
  return product;
}

// ─── Claude Food Vision ───────────────────────────────────────────────────────
export async function identifyFoodFromPhoto(base64: string): Promise<ScannedProduct | null> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === 'your_api_key_here') throw new Error('API key not configured');

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 256,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: base64 } },
          { type: 'text', text: 'Identify the food in this photo and estimate nutrition for the visible portion. Return ONLY a JSON object — no markdown, no explanation: {"name":string,"brand":string,"calories":number,"protein":number,"carbs":number,"fat":number,"servingLabel":string}. For servingLabel describe the portion (e.g. "1 medium apple ~182g"). If no food is visible return {"error":"no food detected"}.' },
        ],
      }],
    }),
  });

  if (!res.ok) throw new Error(`API error ${res.status}`);
  const json = await res.json();
  const text: string = json.content?.[0]?.text ?? '';
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const parsed  = JSON.parse(cleaned);
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
