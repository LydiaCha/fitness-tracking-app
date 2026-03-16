import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, Share } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppThemeType } from '@/constants/theme';
import { useMealPlan } from '@/context/MealPlanContext';
import { GroceryCategory, GroceryItem, GrocerySection, categoryAccent, formatGroceryList } from '@/utils/groceryList';
import { PlanStyles } from '@/app/(tabs)/plan.styles';
import { STORAGE_KEYS, toKey, getWeekDatesMonFirst } from '@/utils/appConstants';
import { safeGetItem, safeSetItem, safeParseJSON } from '@/utils/storage';

interface PersistedChecked {
  weekStart: string;
  ids: string[];
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function weekRangeLabel(): string {
  const dates = getWeekDatesMonFirst();
  const start = dates[0];
  const end   = dates[6];
  const sMonth = MONTHS[start.getMonth()];
  const eMonth = MONTHS[end.getMonth()];
  if (sMonth === eMonth) return `${sMonth} ${start.getDate()}–${end.getDate()}`;
  return `${sMonth} ${start.getDate()} – ${eMonth} ${end.getDate()}`;
}

function ItemRow({
  item, isChecked, isLast, onToggle, accent, s,
}: {
  item: GroceryItem;
  isChecked: boolean;
  isLast: boolean;
  onToggle: (id: string) => void;
  accent: string;
  s: PlanStyles;
}) {
  return (
    <>
      <TouchableOpacity
        style={[s.itemRow, isChecked && s.itemRowChecked]}
        onPress={() => onToggle(item.id)}
        activeOpacity={0.7}>
        <View style={[
          s.checkbox,
          {
            borderColor:     isChecked ? accent : accent + '55',
            backgroundColor: isChecked ? accent : 'transparent',
          },
        ]}>
          {isChecked && <Text style={s.checkmark}>✓</Text>}
        </View>
        <Text style={[s.itemName, isChecked && s.itemNameChecked]}>{item.name}</Text>
        {item.quantity ? (
          <View style={s.qtyBadge}><Text style={s.qtyText}>{item.quantity}</Text></View>
        ) : null}
      </TouchableOpacity>
      {!isLast && <View style={s.itemRowSep} />}
    </>
  );
}

function SectionCard({
  section, checkedIds, isCollapsed, onToggleCollapse, onToggleItem, theme, s,
}: {
  section: GrocerySection;
  checkedIds: Set<string>;
  isCollapsed: boolean;
  onToggleCollapse: (cat: GroceryCategory) => void;
  onToggleItem: (id: string) => void;
  theme: AppThemeType;
  s: PlanStyles;
}) {
  const accent       = categoryAccent(section.category, theme);
  const checkedCount = section.items.filter(i => checkedIds.has(i.id)).length;
  const allDone      = checkedCount === section.items.length;

  return (
    <View style={s.sectionWrapper}>
      <TouchableOpacity
        style={s.sectionHeader}
        onPress={() => onToggleCollapse(section.category)}
        activeOpacity={0.8}>
        <View style={[s.emojiCircle, { backgroundColor: accent + '22' }]}>
          <Text style={s.emojiText}>{section.emoji}</Text>
        </View>
        <Text style={s.sectionTitle}>{section.label}</Text>
        {allDone ? (
          <View style={s.sectionDoneBadge}>
            <Text style={s.sectionDoneCheck}>✓</Text>
          </View>
        ) : (
          <Text style={s.sectionCount}>
            {checkedCount > 0 ? `${checkedCount} / ` : ''}{section.items.length} items
          </Text>
        )}
        <Text style={s.chevron}>{isCollapsed ? '›' : '⌄'}</Text>
      </TouchableOpacity>

      {!isCollapsed && (
        <>
          <View style={s.divider} />
          {section.items.map((item, index) => (
            <ItemRow
              key={item.id}
              item={item}
              isChecked={checkedIds.has(item.id)}
              isLast={index === section.items.length - 1}
              onToggle={onToggleItem}
              accent={accent}
              s={s}
            />
          ))}
        </>
      )}
    </View>
  );
}

export function GroceryContent({
  theme,
  s,
}: {
  theme: AppThemeType;
  s: PlanStyles;
}) {
  const { groceryList: planGroceryList, weeklyPlan } = useMealPlan();

  const sections = useMemo((): GrocerySection[] =>
    planGroceryList.map(sec => ({
      category: sec.category,
      label:    sec.label,
      emoji:    sec.emoji,
      items:    sec.items.map(item => ({
        id:       item.ingredientId,
        name:     item.name,
        quantity: `${item.totalQty % 1 === 0 ? item.totalQty : item.totalQty.toFixed(1)} ${item.unit}`,
        qty:      item.totalQty,
        unit:     item.unit,
        category: sec.category,
        checked:  false,
      })),
    })),
  [planGroceryList]);

  const weekStart  = useMemo(() => toKey(getWeekDatesMonFirst()[0]), []);
  const weekRange  = useMemo(() => weekRangeLabel(), []);

  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [collapsed,  setCollapsed]  = useState<Set<GroceryCategory>>(new Set());

  // Load persisted checks; discard if from a previous week
  useEffect(() => {
    safeGetItem(STORAGE_KEYS.GROCERY_CHECKED).then(raw => {
      const stored = safeParseJSON<PersistedChecked>(raw, { weekStart: '', ids: [] });
      if (stored.weekStart === weekStart) {
        setCheckedIds(new Set(stored.ids));
      }
    });
  }, [weekStart]);

  const saveChecked = useCallback((next: Set<string>) => {
    safeSetItem(
      STORAGE_KEYS.GROCERY_CHECKED,
      JSON.stringify({ weekStart, ids: [...next] }),
    );
  }, [weekStart]);

  const totalItems   = useMemo(() => sections.reduce((acc, sec) => acc + sec.items.length, 0), [sections]);
  const checkedCount = checkedIds.size;
  const progressPct  = totalItems > 0 ? checkedCount / totalItems : 0;

  const toggleItem = useCallback((id: string) => {
    setCheckedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      saveChecked(next);
      return next;
    });
  }, [saveChecked]);

  const toggleCollapse = useCallback((cat: GroceryCategory) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      next.has(cat) ? next.delete(cat) : next.add(cat);
      return next;
    });
  }, []);

  const handleShare = useCallback(async () => {
    try { await Share.share({ message: formatGroceryList(sections, checkedIds) }); } catch (_) {}
  }, [sections, checkedIds]);

  if (weeklyPlan.length === 0) {
    return (
      <View style={s.emptyCard}>
        <Text style={s.emptyEmoji}>🛒</Text>
        <Text style={s.emptyTitle}>No grocery list yet</Text>
        <Text style={s.emptyBody}>
          Generate your AI meal plan first — the grocery list builds automatically from it.
        </Text>
      </View>
    );
  }

  const allDone = checkedCount === totalItems && totalItems > 0;

  return (
    <>
      {/* ── Instruction header ── */}
      <LinearGradient
        colors={['#10b981', '#0891b2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.groceryHeader}
      >
        {/* Diagonal shine — same as home hero */}
        <View style={s.groceryHeaderShine} />
        <View style={s.groceryHeaderTop}>
          <View style={s.groceryHeaderTextCol}>
            <Text style={s.groceryHeaderTitle}>
              {allDone ? '✅ All done — great shop!' : 'Your ingredients for this week\'s meals.'}
            </Text>
          </View>
          <View style={s.groceryHeaderMeta}>
            <Text style={s.groceryHeaderWeek}>{weekRange}</Text>
            <TouchableOpacity onPress={handleShare} activeOpacity={0.7} style={s.groceryShareBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={s.groceryShareIcon}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {!allDone && (
          <View style={s.groceryCoachLines}>
            <Text style={s.groceryCoachLine}>
              <Text style={s.groceryCoachCheck}>✓</Text>
              {'  Check off what you already have at home'}
            </Text>
            <Text style={s.groceryCoachLine}>
              {'🛒  Buy the remaining items when you go shopping'}
            </Text>
          </View>
        )}

        <View style={s.groceryProgressRow}>
          <View style={s.groceryProgressTrack}>
            <View style={[
              s.groceryProgressFill,
              {
                width: `${Math.round(progressPct * 100)}%` as any,
                backgroundColor: allDone ? '#4ade80' : '#fff',
              },
            ]} />
          </View>
          <Text style={s.groceryProgressLabel}>
            {checkedCount} / {totalItems} items
          </Text>
        </View>
      </LinearGradient>


      {/* ── Sections ── */}
      {sections.map(section => (
        <SectionCard
          key={section.category}
          section={section}
          checkedIds={checkedIds}
          isCollapsed={collapsed.has(section.category)}
          onToggleCollapse={toggleCollapse}
          onToggleItem={toggleItem}
          theme={theme}
          s={s}
        />
      ))}

      {/* ── Completion card ── */}
      {allDone && (
        <LinearGradient
          colors={['#10b981', '#0891b2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.groceryCompleteCard}
        >
          <View style={s.groceryHeaderShine} />
          <Text style={s.groceryCompleteEmoji}>💪</Text>
          <Text style={s.groceryCompleteTitle}>You're set for this week's meals.</Text>
          <Text style={s.groceryCompleteSub}>
            All {totalItems} ingredients accounted for.{'\n'}You're ready for the week.
          </Text>
        </LinearGradient>
      )}
    </>
  );
}
