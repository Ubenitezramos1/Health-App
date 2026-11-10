import type { Goal } from '@/features/profile/options';

import { estimateMinutes, makeId, weeklyVolume } from './engine';
import { getExercise } from './exercises';
import { MUSCLES, type Muscle } from './muscles';
import { goalProfileOf, prescription } from './rules';
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
    const timed = getExercise(newExerciseId).timed;
    if (timed === getExercise(pe.exerciseId).timed) return { ...pe, exerciseId: newExerciseId, notes: [] };
    // Timed holds use seconds, so switching to/from one resets the range.
    const { repMin, repMax } = prescription('hypertrophy', plan.settings.style, pe.role, timed);
    return { ...pe, exerciseId: newExerciseId, repMin, repMax, notes: [] };
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
    sets: plan.settings.style === 'efficient' ? 2 : 3,
    ...prescription(goalProfileOf(primaryGoal), plan.settings.style, role, e.timed),
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
