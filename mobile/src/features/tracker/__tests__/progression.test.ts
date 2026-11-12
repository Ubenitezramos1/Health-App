import { describe, expect, it } from '@jest/globals';

import { type Performance, deloadVersion, suggest, weightStep } from '../progression';
import type { SetLog } from '../types';

const rx = { sets: 2, repMin: 5, repMax: 8 };
const ctx = { load: 'dumbbell' as const, unit: 'lb' as const, smallSteps: false };
const s = (weight: number | null, reps: number | null): SetLog => ({ weight, reps, unit: 'lb' });
const perf = (...sets: SetLog[]): Performance => ({ sets, requiredSets: sets.length });

describe('double progression (user example: DB incline press, 2 × 5–8)', () => {
  it('asks for a starting weight the first time', () => {
    const r = suggest([], rx, ctx);
    expect(r.reason).toBe('first_time');
    expect(r.weight).toBeNull();
    expect(r.reps).toEqual([5, 5]);
  });

  it('35 lb × 5 → next time 35 lb × 6', () => {
    const r = suggest([perf(s(35, 5), s(35, 5))], rx, ctx);
    expect(r).toMatchObject({ weight: 35, reps: [6, 6], reason: 'add_reps' });
  });

  it('keeps adding a rep per set until the top of the range', () => {
    const history = [perf(s(35, 5), s(35, 5)), perf(s(35, 6), s(35, 6)), perf(s(35, 7), s(35, 7))];
    expect(suggest(history, rx, ctx).reps).toEqual([8, 8]);
  });

  it('adds the smallest weight step and resets to the bottom once EVERY set hits the top', () => {
    const r = suggest([perf(s(35, 8), s(35, 8))], rx, ctx);
    expect(r).toMatchObject({ weight: 40, reps: [5, 5], reason: 'add_weight' });
  });

  it('does not add weight when only some sets hit the top', () => {
    const r = suggest([perf(s(35, 8), s(35, 6))], rx, ctx);
    expect(r).toMatchObject({ weight: 35, reps: [8, 7], reason: 'add_reps' });
  });

  it('uses 2.5 lb jumps when small steps are on', () => {
    expect(suggest([perf(s(35, 8), s(35, 8))], rx, { ...ctx, smallSteps: true }).weight).toBe(37.5);
  });

  it('repeats a missed target instead of moving on', () => {
    const history = [perf(s(35, 5), s(35, 5)), perf(s(35, 6), s(35, 5))];
    const r = suggest(history, rx, ctx);
    expect(r).toMatchObject({ reps: [7, 6], reason: 'repeat_missed' });
  });

  it('suggests going lighter when clearly below the range at a new weight', () => {
    expect(suggest([perf(s(50, 3), s(50, 2))], rx, ctx)).toMatchObject({ weight: 45, reason: 'too_heavy' });
  });

  it('keeps the weight when only one rep short of the range', () => {
    expect(suggest([perf(s(35, 4), s(35, 4))], rx, ctx)).toMatchObject({ weight: 35, reps: [5, 5], reason: 'add_reps' });
  });

  it('flags a stall after two sessions without progress', () => {
    const flat = perf(s(35, 6), s(35, 6));
    expect(suggest([flat, flat], rx, ctx).stalled).toBe(false);
    expect(suggest([flat, flat, flat], rx, ctx).stalled).toBe(true);
  });

  it('converts units when the user switches lb ↔ kg', () => {
    const r = suggest([perf({ weight: 20, reps: 5, unit: 'kg' }, { weight: 20, reps: 5, unit: 'kg' })], rx, ctx);
    expect(r.weight).toBe(44);
  });

  it('progresses bodyweight work by reps, then says to make it harder', () => {
    const bw = { ...ctx, load: 'bodyweight' as const };
    expect(suggest([perf(s(null, 6), s(null, 5))], rx, bw)).toMatchObject({ weight: null, reps: [7, 6] });
    expect(suggest([perf(s(null, 8), s(null, 8))], rx, bw).reason).toBe('make_harder');
  });

  it('only requires the sets the user was asked to do (dropped-set days still count)', () => {
    const r = suggest([{ sets: [s(35, 8)], requiredSets: 1 }], rx, ctx);
    expect(r.reason).toBe('add_weight');
  });

  it('recomputes from history, so editing an old session changes later suggestions', () => {
    const edited = [perf(s(35, 8), s(35, 8)), perf(s(40, 5), s(40, 5))];
    expect(suggest(edited, rx, ctx)).toMatchObject({ weight: 40, reps: [6, 6] });
  });
});

describe('deload and steps', () => {
  it('halves sets and lightens ~10%', () => {
    const d = deloadVersion({ weight: 100, reps: [5, 5, 5], reason: 'add_reps', stalled: false, last: null, stepUp: false, stepBack: false }, { sets: 3, repMin: 5, repMax: 8 }, 'barbell', 'lb');
    expect(d).toEqual({ weight: 90, reps: [5, 5] });
  });

  it('has no plate step for bodyweight or bands', () => {
    expect(weightStep('bodyweight', 'lb', false)).toBeNull();
    expect(weightStep('band', 'kg', true)).toBeNull();
    expect(weightStep('barbell', 'kg', true)).toBe(1.25);
  });
});
