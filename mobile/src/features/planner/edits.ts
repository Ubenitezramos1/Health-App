import type { Goal } from '@/features/profile/options';

import { estimateMinutes, makeId, weeklyVolume } from './engine';
import { getExercise, isUnloaded } from './exercises';
import { MUSCLES, type Muscle } from './muscles';
import { goalProfileOf, prescription, setBounds } from './rules';
import type { Plan, PlanDay, PlanExercise } from './types';

/** Re-derive volume and session minutes after any edit. Pure: returns a new plan. */
export function refresh(plan: Plan, days: PlanDay[]): Plan {
  const v = weeklyVolume(days);
  const volume = Object.fromEntries(MUSCLES.map((m) => [m, { ...plan.volume[m], sets: v[m] }])) as Plan['volume'];
  return {
    ...plan,
    days: days.map((d) => ({ ...d, estMinutes: estimateMinutes(d) })),
    volume,
    customized: true,
    updatedAt: new Date().toISOString(),
  };
}

function mapExercise(plan: Plan, dayId: string, exId: string, fn: (pe: PlanExercise) => PlanExercise | null): Plan {
  const days = plan.days.map((d) => {
    if (d.id !== dayId) return d;
    const exercises: PlanExercise[] = [];
    for (const pe of d.exercises) {
      if (pe.id !== exId) {
        exercises.push(pe);
        continue;
      }
      const next = fn(pe);
      if (next) exercises.push(next);
      else if (pe.supersetGroup) {
        // removing half of a superset leaves the partner as a normal exercise
        const partner = d.exercises.find((x) => x.supersetGroup === pe.supersetGroup && x.id !== pe.id);
        if (partner) {
          const i = exercises.findIndex((x) => x.id === partner.id);
          if (i >= 0) exercises[i] = { ...exercises[i], supersetGroup: undefined };
        }
      }
    }
    // also clear the partner if it comes after the removed exercise
    const groups = new Map<string, number>();
    exercises.forEach((x) => x.supersetGroup && groups.set(x.supersetGroup, (groups.get(x.supersetGroup) ?? 0) + 1));
    return {
      ...d,
      exercises: exercises.map((x) => (x.supersetGroup && groups.get(x.supersetGroup) === 1 ? { ...x, supersetGroup: undefined } : x)),
    };
  });
  return refresh(plan, days);
}

export const swapExercise = (plan: Plan, dayId: string, exId: string, newExerciseId: string) =>
  mapExercise(plan, dayId, exId, (pe) => {
    const next = getExercise(newExerciseId);
    const prev = getExercise(pe.exerciseId);
    if (next.timed === prev.timed && isUnloaded(next) === isUnloaded(prev))
      return { ...pe, exerciseId: newExerciseId, notes: [], tempo: undefined };
    // Switching between loaded, bodyweight and timed work changes how reps and effort are prescribed.
    const rx = prescription(plan.goal ?? 'hypertrophy', plan.settings.style, pe.role, {
      timed: next.timed,
      unloaded: isUnloaded(next),
    });
    const sets = setBounds(plan.settings.style, pe.role, isUnloaded(next));
    return {
      ...pe,
      exerciseId: newExerciseId,
      ...rx,
      sets: Math.min(Math.max(pe.sets, sets.min), sets.max),
      notes: [],
      tempo: undefined,
    };
  });

export const setSets = (plan: Plan, dayId: string, exId: string, sets: number) =>
  mapExercise(plan, dayId, exId, (pe) => ({ ...pe, sets: Math.max(1, Math.min(6, sets)) }));

export const setReps = (plan: Plan, dayId: string, exId: string, repMin: number, repMax: number) =>
  mapExercise(plan, dayId, exId, (pe) => {
    const min = Math.max(1, Math.min(50, repMin));
    return { ...pe, repMin: min, repMax: Math.max(min, Math.min(60, repMax)) };
  });

export const removeExercise = (plan: Plan, dayId: string, exId: string) => mapExercise(plan, dayId, exId, () => null);

export function moveExercise(plan: Plan, dayId: string, exId: string, delta: -1 | 1): Plan {
  const days = plan.days.map((d) => {
    if (d.id !== dayId) return d;
    const i = d.exercises.findIndex((x) => x.id === exId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= d.exercises.length) return d;
    const exercises = [...d.exercises];
    [exercises[i], exercises[j]] = [exercises[j], exercises[i]];
    return { ...d, exercises };
  });
  return refresh(plan, days);
}

export function addExercise(plan: Plan, dayId: string, exerciseId: string, primaryGoal: Goal): Plan {
  const e = getExercise(exerciseId);
  const role = e.kind === 'compound' ? 'secondary' : 'accessory';
  const pe: PlanExercise = {
    id: makeId('ex'),
    exerciseId,
    role,
    sets: setBounds(plan.settings.style, role, isUnloaded(e)).base,
    ...prescription(goalProfileOf(primaryGoal), plan.settings.style, role, { timed: e.timed, unloaded: isUnloaded(e) }),
    notes: [],
  };
  return refresh(
    plan,
    plan.days.map((d) => (d.id === dayId ? { ...d, exercises: [...d.exercises, pe] } : d)),
  );
}

export const volumeStatus = (plan: Plan, m: Muscle) => {
  const v = plan.volume[m];
  if (v.sets < v.floor) return 'low' as const;
  if (v.sets < v.target) return 'under' as const;
  if (v.sets > v.ceiling) return 'over' as const;
  return 'ok' as const;
};

/* ---------- Bodyweight steps (apply to every day the exercise appears on) ---------- */

function mapByExercise(plan: Plan, exerciseId: string, fn: (pe: PlanExercise) => PlanExercise): Plan {
  return refresh(
    plan,
    plan.days.map((d) => ({ ...d, exercises: d.exercises.map((pe) => (pe.exerciseId === exerciseId ? fn(pe) : pe)) })),
  );
}

/** Turn the slow-lowering stage on or off. Starts a fresh stage so older sessions don't count toward the next step. */
export const setTempo = (plan: Plan, exerciseId: string, on: boolean) =>
  mapByExercise(plan, exerciseId, (pe) => ({
    ...pe,
    tempo: on || undefined,
    stageSince: new Date().toISOString(),
    stepUpSnoozedAt: undefined,
  }));

/** Move to the next (or previous) variation on every day it appears. */
export function changeVariation(plan: Plan, fromId: string, toId: string): Plan {
  let next = plan;
  for (const d of plan.days)
    for (const pe of d.exercises) if (pe.exerciseId === fromId) next = swapExercise(next, d.id, pe.id, toId);
  return mapByExercise(next, toId, (pe) => ({ ...pe, stageSince: new Date().toISOString(), stepUpSnoozedAt: undefined }));
}

/** "Not yet": stop offering the step-up until another session is logged. */
export const snoozeStepUp = (plan: Plan, exerciseId: string) =>
  mapByExercise(plan, exerciseId, (pe) => ({ ...pe, stepUpSnoozedAt: new Date().toISOString() }));
