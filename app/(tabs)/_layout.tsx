import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, TouchableOpacity, View, Text } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAppTheme } from '@/context/ThemeContext';
import { logSheetEvents } from '@/utils/logSheetEvents';

function CentreLogButton() {
  const { theme } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={() => logSheetEvents.open()}
      activeOpacity={0.8}
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        top: -20,
      }}>
      <View style={{
        width: 58, height: 58, borderRadius: 29,
        backgroundColor: theme.primary,
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 4,
        borderColor: theme.bgCard,
        shadowColor: theme.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 10,
      }}>
        <Text style={{ fontSize: 30, color: '#fff', fontWeight: '300', lineHeight: 34, marginTop: -1 }}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TabLayout() {
  const { theme } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textMuted,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: theme.bgCard,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingBottom: Platform.OS === 'ios' ? 0 : 4,
          height: Platform.OS === 'ios' ? 84 : 64,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="nutrition"
        options={{
          title: 'Progress',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="chart.bar.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="meal-tracker"
        options={{
          title: '',
          tabBarIcon: () => null,
          tabBarButton: () => <CentreLogButton />,
        }}
      />
      <Tabs.Screen
        name="plan"
        options={{
          title: 'Plan',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="calendar" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <IconSymbol size={26} name="person.circle.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
