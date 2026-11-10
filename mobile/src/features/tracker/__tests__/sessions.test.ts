import { describe, expect, it } from '@jest/globals';

import { defaultSettings, generatePlan } from '@/features/planner/engine';

import { baseProfile } from '../../planner/__fixtures__';
import { adviceFor, currentWeek, isDeloadWeek, lowCheckInStreak, newLog, sessionTargets } from '../sessions';
import type { WorkoutLog } from '../types';

const plan = generatePlan(baseProfile, defaultSettings(baseProfile));
const day = plan.days[0];
const opts = { unit: 'lb' as const, smallSteps: false, deload: false };

function logDay(week: number, dayIndex: number, reps: number, at: string, weight = 35): WorkoutLog {
  const d = plan.days[dayIndex];
  const targets = sessionTargets(d, null, [], opts);
  const log = newLog(plan, d, week, targets, 'lb', null, null, false, `log-${week}-${dayIndex}`);
  return {
    ...log,
    startedAt: at,
    completedAt: at,
    entries: log.entries.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, weight, reps })) })),
  };
}

describe('weeks', () => {
  it('starts at week 1 and moves on once every day of the week is done', () => {
    expect(currentWeek(plan, [])).toBe(1);
    const week1 = plan.days.map((_, i) => logDay(1, i, 6, `2026-11-0${i + 1}T10:00:00Z`));
    expect(currentWeek(plan, week1.slice(0, 2))).toBe(1);
    expect(currentWeek(plan, week1)).toBe(2);
  });

  it('marks planned and accepted deload weeks', () => {
    const settings = { smallSteps: false, extraDeloads: { [plan.id]: [3] } };
    expect(isDeloadWeek(plan, plan.blockWeeks, settings)).toBe(true);
    expect(isDeloadWeek(plan, 3, settings)).toBe(true);
    expect(isDeloadWeek(plan, 2, settings)).toBe(false);
  });
});

describe('session targets', () => {
  it('suggest +1 rep the next time the same exercise comes up', () => {
    const logs = [logDay(1, 0, 6, '2026-11-01T10:00:00Z')];
    const t = sessionTargets(day, null, logs, opts)[0];
    expect(t.weight).toBe(35);
    expect(t.reps.every((r) => r === Math.min(t.pe.repMax, 7))).toBe(true);
  });

  it('past sessions only see the history before them (so editing week 1 updates week 2)', () => {
    const w1 = logDay(1, 0, 6, '2026-11-01T10:00:00Z');
    const w2 = logDay(2, 0, 7, '2026-11-08T10:00:00Z');
    const t2 = sessionTargets(day, w2, [w1, w2], opts)[0];
    expect(t2.reps[0]).toBe(7);
    const edited = { ...w1, entries: w1.entries.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, reps: 9 })) })) };
    expect(sessionTargets(day, w2, [edited, w2], opts)[0].reps[0]).toBe(10);
  });

  it('applies an accepted "drop last set" only to that session', () => {
    const targets = sessionTargets(day, null, [], opts);
    const log = newLog(plan, day, 1, targets, 'lb', { energy: 1, sleep: 2, soreness: 2 }, 'drop_last_set', false, 'x');
    expect(log.entries[0].sets.length).toBe(Math.max(1, targets[0].reps.length - 1));
  });

  it('halves sets on deload weeks', () => {
    const t = sessionTargets(day, null, [logDay(1, 0, 6, '2026-11-01T10:00:00Z', 100)], { ...opts, deload: true })[0];
    expect(t.reps.length).toBe(Math.ceil(t.pe.sets / 2));
    expect(t.rir).toMatch(/deload/);
  });
});

describe('check-in', () => {
  it('suggests (not applies) a lighter day when energy or sleep is low', () => {
    expect(adviceFor({ energy: 2, sleep: 4, soreness: 2 }).adjustment).toBe('drop_last_set');
    expect(adviceFor({ energy: 4, sleep: 4, soreness: 5 }).adjustment).toBe('easier_rir');
    expect(adviceFor({ energy: 4, sleep: 4, soreness: 2 }).adjustment).toBeNull();
  });

  it('flags three low check-ins in a row', () => {
    const low = (i: number): WorkoutLog => ({ ...logDay(1, 0, 6, `2026-11-0${i}T10:00:00Z`), id: `l${i}`, checkIn: { energy: 1, sleep: 2, soreness: 3 } });
    expect(lowCheckInStreak([low(1), low(2)])).toBe(false);
    expect(lowCheckInStreak([low(1), low(2), low(3)])).toBe(true);
  });
});
