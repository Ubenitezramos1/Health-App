import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { ScanResult } from '@/features/planner/muscles';

import { type ScanRecord, toPlannerScan } from './types';

const KEY = 'scans.v1';

type ScanState = {
  hydrated: boolean;
  /** Oldest first. Results only — photos are never saved. */
  scans: ScanRecord[];
  hydrate: () => Promise<void>;
  add: (record: ScanRecord) => void;
  remove: (id: string) => void;
};

export const useScanStore = create<ScanState>((set, get) => ({
  hydrated: false,
  scans: [],

  hydrate: async () => {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      set({ scans: raw ? (JSON.parse(raw) as ScanRecord[]) : [], hydrated: true });
    } catch {
      set({ hydrated: true });
    }
  },

  add: (record) => {
    const scans = [...get().scans, record];
    set({ scans });
    void AsyncStorage.setItem(KEY, JSON.stringify(scans));
  },

  remove: (id) => {
    const scans = get().scans.filter((s) => s.id !== id);
    set({ scans });
    void AsyncStorage.setItem(KEY, JSON.stringify(scans));
  },
}));

/** Most recent scan whose photos were usable — the one the planner should use. */
export function latestUsableScan(scans: ScanRecord[]): { record: ScanRecord; result: ScanResult } | null {
  for (let i = scans.length - 1; i >= 0; i--) {
    const result = toPlannerScan(scans[i]);
    if (result) return { record: scans[i], result };
  }
  return null;
}
