import { describe, expect, it } from '@jest/globals';

import { withProfile } from '../__fixtures__';
import { defaultSettings, generatePlan } from '../engine';
import { bwIntensity, getExercise, isUnloaded, ladderStep, primaryMuscle } from '../exercises';
import { UNLOADED_RIR } from '../rules';

const plan = (patch: Parameters<typeof withProfile>[0]) => {
  const p = withProfile(patch);
  return generatePlan(p, defaultSettings(p), null);
};
const all = (pl: ReturnType<typeof plan>) => pl.days.flatMap((d) => d.exercises.map((pe) => ({ pe, e: getExercise(pe.exerciseId), day: d })));

describe('bodyweight prescriptions', () => {
  it('gives bodyweight work 3 sets of 8–25 reps near failure, and loaded work normal ranges', () => {
    for (const { pe, e } of all(plan({ equipment: { access: 'none', items: ['loaded_bag'] } }))) {
      if (isUnloaded(e) && !e.timed) {
        expect(pe.sets).toBe(3);
        expect([pe.repMin, pe.repMax]).toEqual([8, 25]);
        expect(pe.rir).toBe(UNLOADED_RIR);
      } else if (!isUnloaded(e)) {
        expect(pe.repMax).toBeLessThanOrEqual(15);
      }
    }
  });

  it('uses a lower window for strength goals', () => {
    const pl = plan({ primaryGoal: 'get_stronger', goals: ['get_stronger'], equipment: { access: 'none', items: [] } });
    const bw = all(pl).find(({ e }) => isUnloaded(e) && !e.timed)!;
    expect([bw.pe.repMin, bw.pe.repMax]).toEqual([5, 15]);
  });
});

describe('matching difficulty to experience', () => {
  it('does not give an intermediate lifter warm-up-level or skill-ceiling moves as main lifts', () => {
    for (const { pe, e } of all(plan({ equipment: { access: 'none', items: [] } }))) {
      if (pe.role === 'accessory') continue;
      expect(bwIntensity(e)).not.toBe('easy');
      expect(e.level).toBeLessThan(3);
    }
  });

  it('keeps beginners off the hardest bodyweight moves', () => {
    for (const { e } of all(plan({ experience: 'none', equipment: { access: 'none', items: ['chair_step', 'table_doorframe'] } })))
      expect(bwIntensity(e)).not.toBe('hard');
  });

  it('in a full gym: loaded main lifts, real pull-ups for advanced lifters, no gimmick bodyweight presses', () => {
    const pl = plan({ experience: 'advanced', availability: 'medium', sessionLength: 'medium' });
    const ex = all(pl);
    expect(ex.filter(({ pe }) => pe.role === 'main').every(({ e }) => !isUnloaded(e))).toBe(true);
    expect(ex.some(({ e }) => e.id === 'pull_up' || e.id === 'chin_up')).toBe(true);
    expect(ex.some(({ e }) => ['shrimp_squat', 'archer_push_up', 'suspension_push_up', 'elevated_pike_push_up'].includes(e.id))).toBe(false);
  });
});

describe('sessions stay sensible', () => {
  it('fits the time budget even when a muscle is short on options', () => {
    const pl = plan({ experience: 'none', equipment: { access: 'none', items: ['chair_step', 'table_doorframe'] } });
    for (const d of pl.days) expect(d.estMinutes).toBeLessThanOrEqual(pl.sessionBudgetMin + 5);
  });

  it('never puts upper-body extras on a lower-body day', () => {
    const lowerOnly = new Set(['quads', 'hamstrings', 'glutes', 'calves', 'core']);
    for (const patch of [{}, { equipment: { access: 'none' as const, items: [] } }, { availability: 'medium' as const, sessionLength: 'medium' as const }])
      for (const { e, day } of all(plan(patch)))
        if (day.type === 'lower' || day.type === 'legs') expect(lowerOnly.has(primaryMuscle(e)!)).toBe(true);
  });
});

describe('ladders', () => {
  const any = () => true;
  it('moves one step at a time and skips steps the user cannot do', () => {
    expect(ladderStep('push_up', 1, any)?.id).toBe('deficit_push_up');
    expect(ladderStep('push_up', -1, any)?.id).toBe('incline_push_up');
    expect(ladderStep('push_up', -1, (e) => e.id !== 'incline_push_up')?.id).toBe('knee_push_up');
    expect(ladderStep('archer_push_up', 1, any)).toBeNull();
    expect(ladderStep('db_bench_press', 1, any)).toBeNull();
  });
});
