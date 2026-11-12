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
  /** Every plan the user has replaced, oldest first. All are kept so any can be restored. */
  history: Plan[];
  hydrate: () => Promise<void>;
  /**
   * Build a fresh plan; the previous one moves to history (its workout logs stay attached to it).
   * `scan` defaults to the latest usable physique scan; pass null to ignore scans.
   */
  build: (profile: Profile, settings: PlanSettings, scan?: ScanResult | null) => Plan;
  /** Persist a hand-edited plan. */
  save: (plan: Plan) => void;
  /** Make a past plan current again; the current one moves to history. */
  restore: (planId: string) => void;
  /** Permanently delete a past plan. Workout logs are kept (they feed lift history and suggestions). */
  removePast: (planId: string) => void;
};

export const usePlanStore = create<PlanState>((set, get) => {
  const persist = () => {
    const { plan, history } = get();
    void AsyncStorage.multiSet([
      [KEYS.current, JSON.stringify(plan)],
      [KEYS.history, JSON.stringify(history)],
    ]);
  };
  const archive = (p: Plan | null) => (p ? [{ ...p, archivedAt: new Date().toISOString() }] : []);

  return {
    hydrated: false,
    plan: null,
    history: [],

    hydrate: async () => {
      const [plan, history] = await Promise.all([read<Plan>(KEYS.current), read<Plan[]>(KEYS.history)]);
      set({ plan, history: history ?? [], hydrated: true });
    },

    build: (profile, settings, scan) => {
      // Default to the latest usable physique scan, so every rebuild reflects it.
      const effectiveScan = scan === undefined ? (latestUsableScan(useScanStore.getState().scans)?.result ?? null) : scan;
      const plan = generatePlan(profile, settings, effectiveScan);
      set({ plan, history: [...get().history, ...archive(get().plan)] });
      persist();
      return plan;
    },

    save: (plan) => {
      set({ plan });
      persist();
    },

    restore: (planId) => {
      const { plan, history } = get();
      const target = history.find((p) => p.id === planId);
      if (!target) return;
      const { archivedAt: _archivedAt, ...restored } = target;
      set({ plan: restored, history: [...history.filter((p) => p.id !== planId), ...archive(plan)] });
      persist();
    },

    removePast: (planId) => {
      set({ history: get().history.filter((p) => p.id !== planId) });
      persist();
    },
  };
});
