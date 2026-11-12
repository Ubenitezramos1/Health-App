import { describe, expect, it } from '@jest/globals';

import { changeVariation, setTempo, snoozeStepUp } from '@/features/planner/edits';
import { defaultSettings, generatePlan } from '@/features/planner/engine';
import { getExercise } from '@/features/planner/exercises';
import type { PlanExercise } from '@/features/planner/types';

import { withProfile } from '../../planner/__fixtures__';
import { type Performance, suggest } from '../progression';
import { stepOfferFor } from '../sessions';
import type { SetLog } from '../types';

const rx = { sets: 3, repMin: 8, repMax: 25 };
const bw = { load: 'bodyweight' as const, unit: 'lb' as const, smallSteps: false, unloaded: true };
const set = (reps: number, weight: number | null = null): SetLog => ({ weight, reps, unit: 'lb' });
const session = (...reps: number[]): Performance => ({ sets: reps.map((r) => set(r)), requiredSets: reps.length });

describe('bodyweight progression (agreed rule)', () => {
  it('adds about a rep per set, with no ceiling at the top of the window', () => {
    expect(suggest([session(12, 11, 10)], rx, bw).reps).toEqual([13, 12, 11]);
    expect(suggest([session(26, 27, 26)], rx, bw).reps).toEqual([27, 28, 27]);
  });

  it('only offers a step up after 2 sessions in a row with every set past the top', () => {
    expect(suggest([session(26, 26, 26)], rx, bw).stepUp).toBe(false); // one good day isn't mastery
    expect(suggest([session(26, 26, 24), session(27, 26, 26)], rx, bw).stepUp).toBe(false); // one set short
    expect(suggest([session(26, 26, 26), session(27, 26, 26)], rx, bw).stepUp).toBe(true);
  });

  it('suggests stepping back when a step gives fewer than 6 reps', () => {
    expect(suggest([session(5, 4, 4)], rx, bw).stepBack).toBe(true);
    expect(suggest([session(8, 7, 6)], rx, bw).stepBack).toBe(false);
  });

  it('keeps loaded lifts on normal double progression', () => {
    const loaded = suggest([{ sets: [set(10, 40), set(10, 40)], requiredSets: 2 }], { sets: 2, repMin: 6, repMax: 10 }, {
      load: 'dumbbell',
      unit: 'lb',
      smallSteps: false,
    });
    expect(loaded).toMatchObject({ reason: 'add_weight', weight: 45, stepUp: false });
  });
});

describe('which step is offered', () => {
  const pushUp = getExercise('push_up');
  const pe = (patch: Partial<PlanExercise> = {}): PlanExercise => ({
    id: 'x', exerciseId: 'push_up', role: 'main', sets: 3, repMin: 8, repMax: 25, rir: '', restSec: 90, notes: [], ...patch,
  });
  const mastered = suggest([session(26, 26, 26), session(27, 27, 26)], rx, bw);
  const step = { allowed: () => true, canAddWeight: true };

  it('goes slow lowering → added weight → next variation, one at a time', () => {
    expect(stepOfferFor(pe(), pushUp, mastered, '2026-11-10', step)).toEqual({ direction: 'up', kind: 'tempo' });
    expect(stepOfferFor(pe({ tempo: true }), pushUp, mastered, '2026-11-10', step)).toEqual({ direction: 'up', kind: 'add_weight' });
    const withWeight = suggest([session(26, 26, 26), { sets: [set(26, 10), set(26, 10), set(27, 10)], requiredSets: 3 }], rx, bw);
    expect(stepOfferFor(pe({ tempo: true }), pushUp, withWeight, '2026-11-10', step)).toMatchObject({
      kind: 'variation',
      to: { id: 'deficit_push_up' },
    });
    expect(stepOfferFor(pe({ tempo: true }), pushUp, mastered, '2026-11-10', { ...step, canAddWeight: false })).toMatchObject({
      kind: 'variation',
    });
  });

  it('respects "Not yet" until another session is logged', () => {
    const snoozed = pe({ stepUpSnoozedAt: '2026-11-10T12:00:00Z' });
    expect(stepOfferFor(snoozed, pushUp, mastered, '2026-11-10T10:00:00Z', step)).toBeNull();
    expect(stepOfferFor(snoozed, pushUp, mastered, '2026-11-11T10:00:00Z', step)).not.toBeNull();
  });

  it('steps back by undoing slow lowering first, then one variation', () => {
    const tooHard = suggest([session(5, 4, 3)], rx, bw);
    expect(stepOfferFor(pe({ tempo: true }), pushUp, tooHard, '2026-11-10', step)).toEqual({ direction: 'down', kind: 'tempo_off' });
    expect(stepOfferFor(pe(), pushUp, tooHard, '2026-11-10', step)).toMatchObject({ kind: 'variation', to: { id: 'incline_push_up' } });
  });

  it('never offers steps for loaded or timed exercises', () => {
    expect(stepOfferFor(pe({ exerciseId: 'db_bench_press' }), getExercise('db_bench_press'), mastered, null, step)).toBeNull();
    expect(stepOfferFor(pe({ exerciseId: 'plank' }), getExercise('plank'), mastered, null, step)).toBeNull();
  });
});

describe('applying a step to the plan', () => {
  const profile = withProfile({ equipment: { access: 'none', items: [] } });
  const plan = generatePlan(profile, defaultSettings(profile), null);
  const ids = (p: typeof plan) => p.days.flatMap((d) => d.exercises.map((x) => x.exerciseId));

  it('slow lowering applies everywhere the exercise appears and starts a fresh stage', () => {
    const id = plan.days.flatMap((d) => d.exercises).find((x) => getExercise(x.exerciseId).load === 'bodyweight')!.exerciseId;
    const next = setTempo(plan, id, true);
    const all = next.days.flatMap((d) => d.exercises).filter((x) => x.exerciseId === id);
    expect(all.every((x) => x.tempo && x.stageSince)).toBe(true);
  });

  it('switching variation swaps every occurrence and keeps 3 sets', () => {
    expect(ids(plan)).toContain('push_up');
    const next = changeVariation(plan, 'push_up', 'deficit_push_up');
    expect(ids(next)).not.toContain('push_up');
    expect(next.days.flatMap((d) => d.exercises).filter((x) => x.exerciseId === 'deficit_push_up').every((x) => x.sets === 3)).toBe(true);
  });

  it('"Not yet" is recorded on the exercise', () => {
    const next = snoozeStepUp(plan, 'push_up');
    expect(next.days.flatMap((d) => d.exercises).filter((x) => x.exerciseId === 'push_up').every((x) => x.stepUpSnoozedAt)).toBe(true);
  });
});
