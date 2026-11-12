/**
 * Double progression (rules §7, approved):
 *  - Add a rep per set each session until EVERY set reaches the top of the range.
 *  - Then add the smallest weight step and drop back to the bottom of the range.
 *  - Missed a target? Repeat it next time.
 *  - Two sessions in a row without progress = stalled → suggest a fix.
 * Everything is recomputed from history, so editing an old session updates later suggestions.
 */
import type { LoadType } from '@/features/planner/exercises';
import { type WeightUnit, kgToLb, lbToKg } from '@/features/profile/units';

import type { SetLog } from './types';

export type Rx = { sets: number; repMin: number; repMax: number };

/** One past session of one exercise, oldest first when passed to `suggest`. */
export type Performance = {
  sets: SetLog[];
  /** Sets the user was asked to do that day (fewer if they accepted "drop last set"). */
  requiredSets: number;
};

export type SuggestionReason =
  | 'first_time'
  | 'add_reps'
  | 'repeat_missed'
  | 'add_weight'
  | 'too_heavy'
  | 'make_harder';

export type Suggestion = {
  /** Null = bodyweight or no history yet. */
  weight: number | null;
  /** Target reps per set. */
  reps: number[];
  reason: SuggestionReason;
  stalled: boolean;
  /** Last session's sets, for "Last time: …". */
  last: SetLog[] | null;
  /** Bodyweight/band: every set went past the top of the window for 2 sessions in a row → offer one step up. */
  stepUp: boolean;
  /** Bodyweight/band: the last session came in under ~6 reps → this step looks too hard, offer one step back. */
  stepBack: boolean;
};

const STEPS: Record<WeightUnit, Partial<Record<LoadType, { normal: number; small: number }>>> = {
  lb: {
    barbell: { normal: 5, small: 2.5 },
    dumbbell: { normal: 5, small: 2.5 },
    machine: { normal: 5, small: 2.5 },
    cable: { normal: 5, small: 2.5 },
    kettlebell: { normal: 9, small: 9 }, // kettlebells jump ~4 kg
    household: { normal: 5, small: 2.5 }, // add a book or a bottle of water
  },
  kg: {
    barbell: { normal: 2.5, small: 1.25 },
    dumbbell: { normal: 2, small: 1 },
    machine: { normal: 2.5, small: 1.25 },
    cable: { normal: 2.5, small: 1.25 },
    kettlebell: { normal: 4, small: 4 },
    household: { normal: 2, small: 1 },
  },
};

/** Smallest sensible weight jump, or null when the load isn't added in plates (bodyweight, bands). */
export function weightStep(load: LoadType, unit: WeightUnit, small: boolean): number | null {
  const s = STEPS[unit][load];
  return s ? (small ? s.small : s.normal) : null;
}

const roundHalf = (n: number) => Math.round(n * 2) / 2;

export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit) {
  if (from === to) return weight;
  return roundHalf(to === 'lb' ? kgToLb(weight) : lbToKg(weight));
}

/** Completed working sets in `unit`. */
const done = (sets: SetLog[], unit: WeightUnit) =>
  sets
    .filter((s) => s.reps !== null && s.reps > 0)
    .map((s) => ({ weight: s.weight === null ? null : convertWeight(s.weight, s.unit, unit), reps: s.reps as number }));

/** Epley estimated 1-rep max — used for charts only. */
export const estimated1RM = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

const fill = (n: number, v: number) => Array.from({ length: Math.max(1, n) }, () => v);

type State = { weight: number | null; reps: number[] };

export function suggest(
  history: Performance[],
  rx: Rx,
  ctx: { load: LoadType; unit: WeightUnit; smallSteps: boolean; unloaded?: boolean },
): Suggestion {
  const step = weightStep(ctx.load, ctx.unit, ctx.smallSteps);
  let state: State | null = null;
  let reason: SuggestionReason = 'first_time';
  let last: SetLog[] | null = null;
  // (weight, total reps) per session, for stall detection
  const marks: { weight: number; total: number }[] = [];
  // Bodyweight/band sessions: did every set pass the top of the window? And the best set, for step-back.
  const aboveTop: boolean[] = [];
  let lastBest = Infinity;

  for (const perf of history) {
    const sets = done(perf.sets, ctx.unit);
    if (!sets.length) continue;
    last = perf.sets;

    const topWeight = sets.some((s) => s.weight !== null) ? Math.max(...sets.map((s) => s.weight ?? 0)) : null;
    const atTop = sets.filter((s) => (s.weight ?? 0) === (topWeight ?? 0)).map((s) => s.reps);
    marks.push({ weight: topWeight ?? 0, total: atTop.reduce((a, b) => a + b, 0) });

    const allAtMax = atTop.length >= Math.min(perf.requiredSets, rx.sets) && atTop.every((r) => r >= rx.repMax);
    const targets: number[] | null = state && state.weight === topWeight ? state.reps : null;

    if (ctx.unloaded) {
      // Reps are the overload here: keep adding about one per set, with no ceiling — passing the top of the
      // window only *offers* a harder step (the user decides), it never changes the exercise by itself.
      aboveTop.push(atTop.length >= Math.min(perf.requiredSets, rx.sets) && atTop.every((r) => r > rx.repMax));
      lastBest = Math.max(...atTop);
      let missed = false;
      const next = Array.from({ length: rx.sets }, (_, i): number => {
        const achieved = atTop[i] ?? atTop[atTop.length - 1];
        const target: number | undefined = targets?.[i];
        if (target !== undefined && achieved < target) {
          missed = true;
          return target;
        }
        return achieved + 1;
      });
      state = { weight: topWeight, reps: next };
      reason = missed ? 'repeat_missed' : 'add_reps';
      continue;
    }

    if (allAtMax) {
      if (topWeight !== null && step) {
        state = { weight: roundHalf(topWeight + step), reps: fill(rx.sets, rx.repMin) };
        reason = 'add_weight';
      } else {
        state = { weight: topWeight, reps: fill(rx.sets, rx.repMax) };
        reason = 'make_harder';
      }
      continue;
    }

    if (rx.repMin - Math.max(...atTop) >= 2 && topWeight !== null && step && !targets) {
      // Clearly too heavy (2+ reps short of the range) on a first attempt at this weight.
      // One rep short just means "same weight, aim for the bottom of the range" (handled below).
      state = { weight: roundHalf(Math.max(step, topWeight - step)), reps: fill(rx.sets, rx.repMin) };
      reason = 'too_heavy';
      continue;
    }

    let missed = false;
    const next: number[] = Array.from({ length: rx.sets }, (_, i): number => {
      const achieved = atTop[i] ?? atTop[atTop.length - 1];
      const target: number | undefined = targets?.[i];
      if (target !== undefined && achieved < target) {
        missed = true;
        return target;
      }
      return Math.max(rx.repMin, Math.min(rx.repMax, achieved + 1));
    });
    state = { weight: topWeight, reps: next };
    reason = missed ? 'repeat_missed' : 'add_reps';
  }

  // Stalled: the last two sessions each failed to beat the one before (same or lower weight, no more reps).
  const noGain = (a: (typeof marks)[number], b: (typeof marks)[number]) => b.weight <= a.weight && b.total <= a.total;
  const n = marks.length;
  const stalled = n >= 3 && noGain(marks[n - 3], marks[n - 2]) && noGain(marks[n - 2], marks[n - 1]);

  // Mastery = 2 sessions in a row with every set past the top (one good day isn't enough).
  const k = aboveTop.length;
  const stepUp = !!ctx.unloaded && k >= 2 && aboveTop[k - 1] && aboveTop[k - 2];
  const stepBack = !!ctx.unloaded && k >= 1 && lastBest < Math.min(6, rx.repMin);

  return state
    ? { weight: state.weight, reps: state.reps, reason, stalled: stalled && !ctx.unloaded, last, stepUp, stepBack }
    : {
        weight: null,
        reps: fill(rx.sets, rx.repMin),
        reason: 'first_time',
        stalled: false,
        last: null,
        stepUp: false,
        stepBack: false,
      };
}

/** Deload week: about half the sets, ~10% lighter, easy effort (rules §7). */
export function deloadVersion(s: Suggestion, rx: Rx, load: LoadType, unit: WeightUnit) {
  const step = weightStep(load, unit, true) ?? 1;
  const sets = Math.max(1, Math.ceil(rx.sets / 2));
  const weight = s.weight === null ? null : Math.max(step, Math.round((s.weight * 0.9) / step) * step);
  return { weight, reps: fill(sets, rx.repMin) };
}

export const REASON_TEXT: Record<SuggestionReason, string> = {
  first_time: 'First time: pick a weight you can lift for the rep range with 1–3 reps left in the tank.',
  add_reps: 'Beat last time by one rep per set.',
  repeat_missed: 'Missed a target last time — same goal again.',
  add_weight: 'You hit the top of the range on every set — time to add weight.',
  too_heavy: 'Last time was below the rep range — a little lighter this time.',
  make_harder: 'Top of the range on every set — make it harder: add load, slow the lowering, or pick a harder variation.',
};

/** Bodyweight/band versions of the explanations above. */
export const UNLOADED_REASON_TEXT: Partial<Record<SuggestionReason, string>> = {
  first_time: 'First time: do as many good reps as you can, stopping 1–2 short of failure — that sets your starting point.',
  add_reps: 'Beat last time by about one rep per set.',
  repeat_missed: 'Missed a target last time — same goal again. Bad days happen; consistency wins.',
};

export const STALL_TEXT =
  'Stalled for 2 sessions. Options: keep the weight and focus on form, drop ~10% and build back up, or swap to a similar exercise.';
