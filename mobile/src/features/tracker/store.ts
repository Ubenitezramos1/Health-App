import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { SetLog, TrackerSettings, WorkoutLog } from './types';

/**
 * Workout logs, kept on the device. A year of training is a few thousand sets (well under
 * a megabyte of JSON), so key-value storage is fine for now; this store is the only place
 * that touches storage, so moving to SQLite later is a contained change.
 */
const KEY = 'tracker.v1';

type Persisted = { logs: WorkoutLog[]; settings: TrackerSettings };

const DEFAULT_SETTINGS: TrackerSettings = { smallSteps: false, extraDeloads: {} };

type TrackerState = Persisted & {
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addLog: (log: WorkoutLog) => void;
  updateSet: (logId: string, entryIndex: number, setIndex: number, patch: Partial<SetLog>) => void;
  addSet: (logId: string, entryIndex: number) => void;
  removeSet: (logId: string, entryIndex: number, setIndex: number) => void;
  setCompleted: (logId: string, completed: boolean) => void;
  deleteLog: (logId: string) => void;
  setSmallSteps: (on: boolean) => void;
  addDeloadWeek: (planId: string, week: number) => void;
};

export const useTrackerStore = create<TrackerState>((set, get) => {
  const persist = () => {
    const { logs, settings } = get();
    void AsyncStorage.setItem(KEY, JSON.stringify({ logs, settings } satisfies Persisted));
  };
  const mapLog = (logId: string, fn: (l: WorkoutLog) => WorkoutLog) => {
    set({ logs: get().logs.map((l) => (l.id === logId ? fn(l) : l)) });
    persist();
  };
  const mapSets = (logId: string, entryIndex: number, fn: (sets: SetLog[]) => SetLog[]) =>
    mapLog(logId, (l) => ({
      ...l,
      entries: l.entries.map((e, i) => (i === entryIndex ? { ...e, sets: fn(e.sets) } : e)),
    }));

  return {
    hydrated: false,
    logs: [],
    settings: DEFAULT_SETTINGS,

    hydrate: async () => {
      try {
        const raw = await AsyncStorage.getItem(KEY);
        const data = raw ? (JSON.parse(raw) as Persisted) : null;
        set({ logs: data?.logs ?? [], settings: { ...DEFAULT_SETTINGS, ...data?.settings }, hydrated: true });
      } catch {
        set({ hydrated: true });
      }
    },

    addLog: (log) => {
      set({ logs: [...get().logs, log] });
      persist();
    },

    updateSet: (logId, entryIndex, setIndex, patch) =>
      mapSets(logId, entryIndex, (sets) => sets.map((s, i) => (i === setIndex ? { ...s, ...patch } : s))),

    addSet: (logId, entryIndex) =>
      mapSets(logId, entryIndex, (sets) => [...sets, { weight: sets.at(-1)?.weight ?? null, reps: null, unit: sets.at(-1)?.unit ?? 'lb' }]),

    removeSet: (logId, entryIndex, setIndex) =>
      mapSets(logId, entryIndex, (sets) => (sets.length > 1 ? sets.filter((_, i) => i !== setIndex) : sets)),

    setCompleted: (logId, completed) =>
      mapLog(logId, (l) => ({ ...l, completedAt: completed ? (l.completedAt ?? new Date().toISOString()) : null })),

    deleteLog: (logId) => {
      set({ logs: get().logs.filter((l) => l.id !== logId) });
      persist();
    },

    setSmallSteps: (on) => {
      set({ settings: { ...get().settings, smallSteps: on } });
      persist();
    },

    addDeloadWeek: (planId, week) => {
      const { settings } = get();
      const weeks = new Set([...(settings.extraDeloads[planId] ?? []), week]);
      set({ settings: { ...settings, extraDeloads: { ...settings.extraDeloads, [planId]: [...weeks] } } });
      persist();
    },
  };
});
