import { describe, expect, it } from '@jest/globals';

import { addExercise, removeExercise, setSets, swapExercise } from '../edits';
import { computeTiers, defaultSettings, generatePlan, weeklyVolume } from '../engine';
import { getExercise } from '../exercises';
import { MUSCLES } from '../muscles';
import { PULL_PATTERNS, PUSH_PATTERNS } from '../rules';
import { weekView } from '../schedule';
import type { Plan } from '../types';
import { baseProfile, scan, withProfile } from '../__fixtures__';

const build = (profile = baseProfile, s: Parameters<typeof generatePlan>[2] = null, patch = {}) =>
  generatePlan(profile, { ...defaultSettings(profile), ...patch }, s);

const allExercises = (p: Plan) => p.days.flatMap((d) => d.exercises.map((x) => getExercise(x.exerciseId)));

describe('defaults', () => {
  it('picks the efficient style for short sessions or low availability', () => {
    expect(defaultSettings(baseProfile).style).toBe('efficient');
    expect(defaultSettings(withProfile({ availability: 'medium', sessionLength: 'medium' })).style).toBe('full');
  });
});

describe('well-rounded guarantee', () => {
  const cases: [string, Parameters<typeof build>][] = [
    ['efficient 3-day full gym', [baseProfile]],
    ['full 4-day', [withProfile({ availability: 'medium', sessionLength: 'medium' })]],
    ['6-day full volume', [withProfile({ availability: 'high', sessionLength: 'long' })]],
    ['beginner 2-day dumbbells', [withProfile({ experience: 'none', equipment: { access: 'limited', items: ['dumbbells', 'bench'] } }), null, { daysPerWeek: 2 }]],
    ['strong chest from scan', [baseProfile, scan({ muscles: { chest: 'strong', back: 'lagging' } })]],
  ];
  it.each(cases)('%s: every muscle stays at or above its floor', (_name, args) => {
    const plan = build(...args);
    for (const m of MUSCLES) expect(plan.volume[m].sets).toBeGreaterThanOrEqual(plan.volume[m].floor);
  });

  it('keeps an over-developed chest on maintenance, not zero', () => {
    const plan = build(baseProfile, scan({ muscles: { chest: 'strong' } }));
    expect(plan.volume.chest.tier).toBe('maintain');
    expect(plan.volume.chest.sets).toBeGreaterThan(0);
    expect(plan.volume.chest.sets).toBeLessThanOrEqual(plan.volume.chest.ceiling + 2); // compounds may carry a bit extra
  });

  it('pulls at least as much as it pushes', () => {
    for (const plan of [build(), build(withProfile({ availability: 'high', sessionLength: 'long' }))]) {
      const sets = (patterns: string[]) =>
        plan.days.flatMap((d) => d.exercises).filter((x) => patterns.includes(getExercise(x.exerciseId).pattern)).reduce((n, x) => n + x.sets, 0);
      expect(sets(PULL_PATTERNS)).toBeGreaterThanOrEqual(sets(PUSH_PATTERNS));
    }
  });
});

describe('tiers', () => {
  it('raises lagging and focus muscles to priority, max 3', () => {
    const profile = withProfile({ focus: { body: ['arms', 'legs'], skills: [], health: [], other: '' } });
    const tiers = computeTiers(profile, scan({ muscles: { back: 'lagging' } }), {});
    const priority = MUSCLES.filter((m) => tiers[m].tier === 'priority');
    expect(priority).toHaveLength(3);
    expect(priority).toContain('back'); // scan-lagging ranks first
  });

  it('never lowers a muscle the user asked to focus on', () => {
    const profile = withProfile({ focus: { body: ['chest'], skills: [], health: [], other: '' } });
    expect(computeTiers(profile, scan({ muscles: { chest: 'strong' } }), {}).chest.tier).toBe('priority');
  });

  it('counts user-chosen priorities toward the cap of 3', () => {
    const profile = withProfile({ focus: { body: ['arms', 'back'], skills: [], health: [], other: '' } });
    const tiers = computeTiers(profile, scan({ muscles: { side_delts: 'lagging' } }), { chest: 'priority', quads: 'priority' });
    expect(MUSCLES.filter((m) => tiers[m].tier === 'priority')).toHaveLength(3);
    expect(tiers.chest.tier).toBe('priority');
    expect(tiers.quads.tier).toBe('priority');
  });

  it('applies user overrides last', () => {
    expect(computeTiers(baseProfile, scan({ muscles: { chest: 'lagging' } }), { chest: 'maintain' }).chest.tier).toBe('maintain');
  });

  it('gives priority muscles more weekly sets than standard ones', () => {
    const plan = build(baseProfile, scan({ muscles: { side_delts: 'lagging' } }));
    expect(plan.volume.side_delts.sets).toBeGreaterThan(plan.volume.biceps.sets);
  });
});

describe('efficient style ("less is more")', () => {
  it('uses 2 sets on compounds and at most 3 on accessories', () => {
    const plan = build();
    for (const pe of plan.days.flatMap((d) => d.exercises)) {
      if (pe.role === 'accessory') expect(pe.sets).toBeLessThanOrEqual(3);
      else expect(pe.sets).toBe(2);
    }
  });

  it('fits sessions in the time budget', () => {
    for (const plan of [build(), build(withProfile({ availability: 'medium', sessionLength: 'short' }), null, { daysPerWeek: 4 })]) {
      for (const d of plan.days) expect(d.estMinutes).toBeLessThanOrEqual(plan.sessionBudgetMin + 5);
    }
  });
});

describe('safety and equipment', () => {
  it('never uses equipment the user lacks', () => {
    const plan = build(withProfile({ equipment: { access: 'none', items: [] } }));
    for (const e of allExercises(plan)) expect(e.equipment).toEqual([]);
    expect(plan.days.every((d) => d.exercises.length > 0)).toBe(true);
  });

  it('skips exercises that load a current injury', () => {
    const plan = build(withProfile({ injuries: [{ area: 'shoulder', side: 'right', status: 'current', severity: 'moderate' }] }));
    for (const e of allExercises(plan)) expect(e.avoid ?? []).not.toContain('shoulder');
  });

  it('allows them again once the injury is in the past', () => {
    const plan = build(withProfile({ injuries: [{ area: 'shoulder', side: 'right', status: 'past', severity: 'moderate' }] }));
    expect(allExercises(plan).some((e) => e.avoid?.includes('shoulder'))).toBe(true);
  });

  it('uses lower-risk lifts until medical clearance is confirmed', () => {
    const flagged = withProfile({ conditions: ['blood_pressure'], primaryGoal: 'get_stronger', goals: ['get_stronger'] });
    expect(allExercises(build(flagged)).some((e) => e.highRisk)).toBe(false);
    expect(build(flagged).warnings.join(' ')).toMatch(/clearance/);
  });
});

describe('scan details', () => {
  it('adds unilateral work and a weaker-side note for asymmetries', () => {
    const plan = build(baseProfile, scan({ asymmetries: [{ region: 'arms', weakerSide: 'left' }] }));
    const notes = plan.days.flatMap((d) => d.exercises.flatMap((x) => x.notes));
    expect(notes.some((n) => n.includes('left side'))).toBe(true);
  });
});

describe('goal prescriptions', () => {
  it('uses heavier rep ranges for strength', () => {
    const plan = build(withProfile({ primaryGoal: 'get_stronger', goals: ['get_stronger'] }));
    const main = plan.days.flatMap((d) => d.exercises).find((x) => x.role === 'main')!;
    expect([main.repMin, main.repMax]).toEqual([3, 6]);
    expect(main.rir).toBe('2–3');
  });
});

describe('edits', () => {
  it('swaps, changes sets, removes and adds while keeping volume in sync', () => {
    let plan = build();
    const day = plan.days[0];
    const first = day.exercises[0];
    plan = swapExercise(plan, day.id, first.id, 'goblet_squat');
    expect(plan.days[0].exercises[0].exerciseId).toBe('goblet_squat');
    plan = setSets(plan, day.id, first.id, 4);
    expect(plan.days[0].exercises[0].sets).toBe(4);
    plan = removeExercise(plan, day.id, first.id);
    expect(plan.days[0].exercises.find((x) => x.id === first.id)).toBeUndefined();
    plan = addExercise(plan, day.id, 'leg_extension', 'build_muscle');
    expect(plan.days[0].exercises.at(-1)?.exerciseId).toBe('leg_extension');
    expect(plan.volume.quads.sets).toBe(weeklyVolume(plan.days).quads);
    expect(plan.customized).toBe(true);
  });
});

describe('schedule', () => {
  it('lays out training and rest days for each schedule type', () => {
    const loose = weekView(build());
    expect(loose.filter((s) => s.day)).toHaveLength(3);
    expect(loose[0].title).toBe('Day 1');
    const exact = weekView(build(baseProfile, null, { scheduleType: 'exact', times: { 0: '06:30' } }));
    expect(exact[0]).toMatchObject({ title: 'Monday', time: '6:30 AM' });
  });
});
