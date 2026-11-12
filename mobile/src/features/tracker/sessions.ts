import { type Exercise, getExercise, isUnloaded, ladderStep } from '@/features/planner/exercises';
import type { Plan, PlanDay, PlanExercise } from '@/features/planner/types';
import type { WeightUnit } from '@/features/profile/units';

import { type Performance, type Suggestion, deloadVersion, suggest } from './progression';
import type { Adjustment, CheckIn, TrackerSettings, WorkoutLog } from './types';

/* ---------- Weeks ---------- */

export const liftingDays = (plan: Plan) => plan.days.filter((d) => d.type !== 'recovery');

export const logsForPlan = (logs: WorkoutLog[], planId: string) => logs.filter((l) => l.planId === planId);

export const findLog = (logs: WorkoutLog[], planId: string, week: number, dayId: string) =>
  logs.find((l) => l.planId === planId && l.week === week && l.dayId === dayId) ?? null;

/** The week to show by default: the latest week with work left, or the next one if it's all done. */
export function currentWeek(plan: Plan, logs: WorkoutLog[]): number {
  const mine = logsForPlan(logs, plan.id);
  if (!mine.length) return 1;
  const latest = Math.max(...mine.map((l) => l.week));
  const allDone = liftingDays(plan).every((d) => findLog(mine, plan.id, latest, d.id)?.completedAt);
  return allDone ? latest + 1 : latest;
}

export function isDeloadWeek(plan: Plan, week: number, settings: TrackerSettings): boolean {
  if (settings.extraDeloads[plan.id]?.includes(week)) return true;
  return plan.deloadWeek !== null && week % plan.blockWeeks === 0;
}

export type DayStatus = 'done' | 'in_progress' | 'todo';

export function dayStatus(log: WorkoutLog | null): DayStatus {
  if (!log) return 'todo';
  return log.completedAt ? 'done' : 'in_progress';
}

/* ---------- Check-in (rules §8: suggest only, the user decides) ---------- */

export type CheckInAdvice = { adjustment: Adjustment; title: string; detail: string };

export function adviceFor(c: CheckIn): CheckInAdvice {
  if (c.energy <= 2 || c.sleep <= 2)
    return {
      adjustment: 'drop_last_set',
      title: 'Lighter day suggested',
      detail: 'Low energy or poor sleep: drop the last set of each exercise. You keep your progress; recovery catches up.',
    };
  if (c.soreness >= 4)
    return {
      adjustment: 'easier_rir',
      title: 'Ease off a little',
      detail: 'Still sore: keep the sets, but stop each one with 1 more rep in the tank than usual.',
    };
  return { adjustment: null, title: "You're good to go", detail: 'Train as planned.' };
}

const isLow = (c: CheckIn) => c.energy <= 2 || c.sleep <= 2;

/** Three low check-ins in a row → suggest a deload. */
export function lowCheckInStreak(logs: WorkoutLog[]): boolean {
  const recent = logs
    .filter((l) => l.checkIn)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 3);
  return recent.length === 3 && recent.every((l) => isLow(l.checkIn!));
}

/* ---------- Targets for a session ---------- */

/** Past performances of one exercise before `before`, oldest first. Deload sessions don't count. */
export function historyFor(
  logs: WorkoutLog[],
  exerciseId: string,
  before: string,
  excludeLogId?: string,
  since = '',
): Performance[] {
  return logs
    .filter((l) => l.id !== excludeLogId && !l.deload && l.startedAt < before && l.startedAt >= since)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .flatMap((l) =>
      l.entries
        .filter((e) => e.exerciseId === exerciseId)
        .map((e) => ({ sets: e.sets, requiredSets: e.sets.length })),
    );
}

export type ExerciseTarget = {
  pe: PlanExercise;
  exercise: Exercise;
  suggestion: Suggestion;
  /** What to show this session (deload / check-in applied). */
  weight: number | null;
  reps: number[];
  rir: string;
  deload: boolean;
  /** Bodyweight/band: a one-step change the user can accept (never applied automatically). */
  stepOffer: StepOffer | null;
};

export type StepOffer =
  | { direction: 'up'; kind: 'tempo' }
  | { direction: 'up'; kind: 'add_weight' }
  | { direction: 'up'; kind: 'variation'; to: Exercise }
  | { direction: 'up'; kind: 'stronger_band' }
  | { direction: 'up'; kind: 'top_of_ladder' }
  | { direction: 'down'; kind: 'tempo_off' }
  | { direction: 'down'; kind: 'variation'; to: Exercise };

/** What the user can do to make (or ease) an exercise — from their equipment and injuries. */
export type StepContext = { allowed: (e: Exercise) => boolean; canAddWeight: boolean };

/** Rules: slow lowering → added weight → next variation, one step at a time; step back if under ~6 reps. */
export function stepOfferFor(
  pe: PlanExercise,
  exercise: Exercise,
  s: Suggestion,
  lastSessionAt: string | null,
  step: StepContext | undefined,
): StepOffer | null {
  if (!step || !isUnloaded(exercise) || exercise.timed) return null;
  // "Not yet" holds until another session is logged.
  if (pe.stepUpSnoozedAt && (!lastSessionAt || lastSessionAt <= pe.stepUpSnoozedAt)) return null;

  if (s.stepBack) {
    if (pe.tempo) return { direction: 'down', kind: 'tempo_off' };
    const easier = ladderStep(exercise.id, -1, step.allowed);
    return easier ? { direction: 'down', kind: 'variation', to: easier } : null;
  }
  if (!s.stepUp) return null;
  if (exercise.load === 'band') return { direction: 'up', kind: 'stronger_band' };
  if (!pe.tempo) return { direction: 'up', kind: 'tempo' };
  const usedAddedWeight = (s.last ?? []).some((set) => (set.weight ?? 0) > 0);
  if (step.canAddWeight && !usedAddedWeight) return { direction: 'up', kind: 'add_weight' };
  const harder = ladderStep(exercise.id, 1, step.allowed);
  return harder ? { direction: 'up', kind: 'variation', to: harder } : { direction: 'up', kind: 'top_of_ladder' };
}

export function sessionTargets(
  day: PlanDay,
  log: WorkoutLog | null,
  logs: WorkoutLog[],
  opts: { unit: WeightUnit; smallSteps: boolean; deload: boolean; step?: StepContext },
): ExerciseTarget[] {
  const before = log?.startedAt ?? '9999';
  return day.exercises.map((pe) => {
    const exercise = getExercise(pe.exerciseId);
    const rx = { sets: pe.sets, repMin: pe.repMin, repMax: pe.repMax };
    const unloaded = isUnloaded(exercise) && !exercise.timed;
    // After a step change (tempo on, new variation), only sessions at the new step count.
    const history = historyFor(logs, pe.exerciseId, before, log?.id, unloaded ? (pe.stageSince ?? '') : '');
    const suggestion = suggest(history, rx, {
      load: exercise.load,
      unit: opts.unit,
      smallSteps: opts.smallSteps,
      unloaded,
    });
    const lastSessionAt =
      logs
        .filter((l) => l.id !== log?.id && l.startedAt < before && l.entries.some((e) => e.exerciseId === pe.exerciseId))
        .map((l) => l.startedAt)
        .sort()
        .at(-1) ?? null;
    const stepOffer = log?.completedAt || opts.deload ? null : stepOfferFor(pe, exercise, suggestion, lastSessionAt, opts.step);
    let { weight, reps } = suggestion;
    let rir = pe.rir;
    if (opts.deload) {
      ({ weight, reps } = deloadVersion(suggestion, rx, exercise.load, opts.unit));
      rir = '3–4 (deload)';
    } else if (log?.adjustment === 'drop_last_set' && reps.length > 1) {
      reps = reps.slice(0, -1);
    } else if (log?.adjustment === 'easier_rir') {
      rir = `${pe.rir} +1`;
    }
    return { pe, exercise, suggestion, weight, reps, rir, deload: opts.deload, stepOffer };
  });
}

/* ---------- Insights for the progress page ---------- */

export type ExerciseInsight = {
  exerciseId: string;
  pe: PlanExercise;
  suggestion: Suggestion;
  sessions: number;
  stepOffer: StepOffer | null;
};

export type DeloadAdvice = { week: number; reason: string } | null;

export function insights(
  plan: Plan,
  logs: WorkoutLog[],
  settings: TrackerSettings,
  unit: WeightUnit,
  step?: StepContext,
): { exercises: ExerciseInsight[]; deload: DeloadAdvice } {
  const seen = new Set<string>();
  const exercises: ExerciseInsight[] = [];
  for (const day of liftingDays(plan))
    for (const pe of day.exercises) {
      if (seen.has(pe.exerciseId)) continue;
      seen.add(pe.exerciseId);
      const exercise = getExercise(pe.exerciseId);
      const unloaded = isUnloaded(exercise) && !exercise.timed;
      const history = historyFor(logs, pe.exerciseId, '9999', undefined, unloaded ? (pe.stageSince ?? '') : '');
      const suggestion = suggest(history, { sets: pe.sets, repMin: pe.repMin, repMax: pe.repMax }, {
        load: exercise.load,
        unit,
        smallSteps: settings.smallSteps,
        unloaded,
      });
      const lastSessionAt =
        logs
          .filter((l) => l.entries.some((e) => e.exerciseId === pe.exerciseId))
          .map((l) => l.startedAt)
          .sort()
          .at(-1) ?? null;
      exercises.push({
        exerciseId: pe.exerciseId,
        pe,
        suggestion,
        sessions: history.filter((h) => h.sets.some((s) => s.reps)).length,
        stepOffer: stepOfferFor(pe, exercise, suggestion, lastSessionAt, step),
      });
    }

  const week = currentWeek(plan, logs);
  const started = logsForPlan(logs, plan.id).some((l) => l.week === week);
  const target = started ? week + 1 : week;
  const stalledCount = exercises.filter((e) => e.suggestion.stalled).length;
  const low = lowCheckInStreak(logsForPlan(logs, plan.id));
  const alreadyEasy = isDeloadWeek(plan, week, settings) || isDeloadWeek(plan, target, settings);
  const reason =
    stalledCount >= 2
      ? `${stalledCount} exercises have stalled for 2 sessions.`
      : low
        ? 'Your last 3 check-ins showed low energy or poor sleep.'
        : null;
  return { exercises, deload: reason && !alreadyEasy ? { week: target, reason } : null };
}

/** A new session log with one empty row per target set. */
export function newLog(
  plan: Plan,
  day: PlanDay,
  week: number,
  targets: ExerciseTarget[],
  unit: WeightUnit,
  checkIn: CheckIn | null,
  adjustment: Adjustment,
  deload: boolean,
  id: string,
): WorkoutLog {
  return {
    id,
    planId: plan.id,
    dayId: day.id,
    week,
    startedAt: new Date().toISOString(),
    completedAt: null,
    deload,
    checkIn,
    adjustment,
    entries: targets.map((t) => {
      const count = adjustment === 'drop_last_set' && !deload ? Math.max(1, t.reps.length - 1) : t.reps.length;
      return {
        planExerciseId: t.pe.id,
        exerciseId: t.pe.exerciseId,
        sets: Array.from({ length: count }, () => ({ weight: null, reps: null, unit })),
      };
    }),
  };
}
