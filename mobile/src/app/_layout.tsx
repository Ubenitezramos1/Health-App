import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Colors } from '@/constants/theme';
import { usePlanStore } from '@/features/planner/store';
import { useProfileStore } from '@/features/profile/store';
import { useScanStore } from '@/features/scanner/store';
import { useTrackerStore } from '@/features/tracker/store';

SplashScreen.preventAutoHideAsync();

const theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Colors.background,
    card: Colors.background,
    primary: Colors.accent,
    text: Colors.text,
    border: Colors.border,
  },
};

export default function RootLayout() {
  const profileReady = useProfileStore((s) => s.hydrated);
  const hydrateProfile = useProfileStore((s) => s.hydrate);
  const planReady = usePlanStore((s) => s.hydrated);
  const hydratePlan = usePlanStore((s) => s.hydrate);
  const trackerReady = useTrackerStore((s) => s.hydrated);
  const hydrateTracker = useTrackerStore((s) => s.hydrate);
  const scansReady = useScanStore((s) => s.hydrated);
  const hydrateScans = useScanStore((s) => s.hydrate);
  const hydrated = profileReady && planReady && trackerReady && scansReady;

  useEffect(() => {
    void hydrateProfile();
    void hydratePlan();
    void hydrateTracker();
    void hydrateScans();
  }, [hydrateProfile, hydratePlan, hydrateTracker, hydrateScans]);

  useEffect(() => {
    if (hydrated) void SplashScreen.hideAsync();
  }, [hydrated]);

  if (!hydrated) return null;

  return (
    <ThemeProvider value={theme}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }} />
    </ThemeProvider>
  );
}
