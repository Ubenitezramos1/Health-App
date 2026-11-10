import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router/js-tabs';
import type { ComponentProps } from 'react';
import { type ColorValue, Platform } from 'react-native';

import { Colors } from '@/constants/theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName, active: IconName) {
  function TabIcon({ color, focused, size }: { color: ColorValue; focused: boolean; size: number }) {
    // The tab bar passes plain color strings (our tint colors above).
    return <Ionicons name={focused ? active : name} color={String(color)} size={size} />;
  }
  return TabIcon;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarStyle: {
          backgroundColor: Colors.background,
          borderTopColor: Colors.border,
          // Web has no safe-area inset to grow into, so give labels room explicitly.
          ...(Platform.OS === 'web' ? { height: 72, paddingTop: 4, paddingBottom: 6 } : null),
        },
        tabBarItemStyle: Platform.OS === 'web' ? { paddingVertical: 2 } : undefined,
        tabBarLabelStyle: { fontSize: 12, lineHeight: 16, fontWeight: '600' },
        sceneStyle: { backgroundColor: Colors.background },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Today', tabBarIcon: icon('home-outline', 'home') }} />
      <Tabs.Screen name="plan" options={{ title: 'Plan', tabBarIcon: icon('barbell-outline', 'barbell') }} />
      <Tabs.Screen name="progress" options={{ title: 'Progress', tabBarIcon: icon('stats-chart-outline', 'stats-chart') }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: icon('person-outline', 'person') }} />
    </Tabs>
  );
}
