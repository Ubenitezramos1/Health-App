import { describe, expect, it } from '@jest/globals';

import { defaultSettings, generatePlan } from '@/features/planner/engine';
import { newLog, sessionTargets } from '@/features/tracker/sessions';

import { baseProfile } from '../../planner/__fixtures__';
import { nextWorkout, topTips, weekdayIndex } from '../today';

const settings = { smallSteps: false, extraDeloads: {} };
const plan = generatePlan(baseProfile, defaultSettings(baseProfile));

const done = (dayIndex: number) => {
  const d = plan.days[dayIndex];
  const log = newLog(plan, d, 1, sessionTargets(d, null, [], { unit: 'lb', smallSteps: false, deload: false }), 'lb', null, null, false, `l${dayIndex}`);
  return { ...log, completedAt: '2026-11-09T10:00:00Z' };
};

describe('today', () => {
  it('points at the first unfinished workout, then reports the week done', () => {
    expect(nextWorkout(plan, [], settings)).toMatchObject({ week: 1, dayNumber: 1, doneThisWeek: 0 });
    expect(nextWorkout(plan, [done(0)], settings).day?.id).toBe(plan.days[1].id);
    const all = plan.days.map((_, i) => done(i));
    // A finished week rolls the tracker to week 2, Day 1
    expect(nextWorkout(plan, all, settings)).toMatchObject({ week: 2, dayNumber: 1 });
  });

  it('knows rest days on a set-day schedule', () => {
    const scheduled = { ...plan, settings: { ...plan.settings, scheduleType: 'days' as const, weekdays: [0, 2, 4] } };
    const tuesday = new Date(2026, 10, 10); // Tue
    expect(weekdayIndex(tuesday)).toBe(1);
    expect(nextWorkout(scheduled, [], settings, tuesday).schedule).toMatchObject({ todayIsTraining: false, nextTrainingDay: 'Wednesday' });
  });

  it('suggests a first scan, and a rescan once the last one is older than a block', () => {
    expect(topTips(plan, [], settings, 'lb', undefined)[0]?.action).toBe('scan');
    const old = { id: 's', takenAt: '2026-01-01T00:00:00Z', analysis: {} as never };
    expect(topTips(plan, [], settings, 'lb', old, new Date('2026-11-09'))[0]?.title).toMatch(/new scan/);
  });
});
