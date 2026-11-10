import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { Profile } from '@/features/profile/schema';
import { latestUsableScan, useScanStore } from '@/features/scanner/store';

import { generatePlan } from './engine';
import type { ScanResult } from './muscles';
import type { Plan, PlanSettings } from './types';

const KEYS = { current: 'plan.current.v1', history: 'plan.history.v1' } as const;

async function read<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

type PlanState = {
  hydrated: boolean;
  plan: Plan | null;
  hydrate: () => Promise<void>;
  /**
   * Build a fresh plan; the previous one is archived (the tracker keeps history against it).
   * `scan` defaults to the latest usable physique scan; pass null to ignore scans.
   */
  build: (profile: Profile, settings: PlanSettings, scan?: ScanResult | null) => Plan;
  /** Persist a hand-edited plan. */
  save: (plan: Plan) => void;
};

export const usePlanStore = create<PlanState>((set, get) => ({
  hydrated: false,
  plan: null,

  hydrate: async () => {
    set({ plan: await read<Plan>(KEYS.current), hydrated: true });
  },

  build: (profile, settings, scan) => {
    const previous = get().plan;
    // Default to the latest usable physique scan, so every rebuild reflects it.
    const effectiveScan = scan === undefined ? (latestUsableScan(useScanStore.getState().scans)?.result ?? null) : scan;
    const plan = generatePlan(profile, settings, effectiveScan);
    set({ plan });
    void (async () => {
      if (previous) {
        const history = (await read<Plan[]>(KEYS.history)) ?? [];
        await AsyncStorage.setItem(KEYS.history, JSON.stringify([...history, previous]));
      }
      await AsyncStorage.setItem(KEYS.current, JSON.stringify(plan));
    })();
    return plan;
  },

  save: (plan) => {
    set({ plan });
    void AsyncStorage.setItem(KEYS.current, JSON.stringify(plan));
  },
}));
