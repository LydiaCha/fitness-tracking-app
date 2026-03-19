import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PlanGrocerySection } from '@/utils/mealPlanner';
import { WeekStyles } from '@/app/(tabs)/week.styles';

export function ShoppingPreviewCard({
  groceryList,
  onPress,
  s,
}: {
  groceryList: PlanGrocerySection[];
  onPress: () => void;
  s: WeekStyles;
}) {
  const totalItems = groceryList.reduce((sum, sec) => sum + sec.items.length, 0);
  if (totalItems === 0) return null;

  return (
    <TouchableOpacity style={s.grocerySectionRow} onPress={onPress} activeOpacity={0.85}>
      <LinearGradient
        colors={['#10b981', '#0891b2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.grocerySectionGradient}
      />
      <View style={s.grocerySectionShine} />
      <Text style={s.grocerySectionEmoji}>🛒</Text>
      <Text style={s.grocerySectionTitle}>This Week's Groceries</Text>
      <Text style={s.grocerySectionCount}>{totalItems} items</Text>
      <Text style={s.grocerySectionChevron}>›</Text>
    </TouchableOpacity>
  );
}
