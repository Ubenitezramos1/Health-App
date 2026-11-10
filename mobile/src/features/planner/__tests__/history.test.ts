import { describe, expect, it } from '@jest/globals';

import { baseProfile, withProfile } from '../__fixtures__';
import { defaultSettings } from '../engine';
import { changesSincePlan, planChanges } from '../profile-diff';
import { usePlanStore } from '../store';

describe('plan-relevant profile changes', () => {
  it('ignores answers that do not shape the plan', () => {
    expect(planChanges(baseProfile, withProfile({ weightKg: 70, wellbeing: { mood: 1, energy: 1, sleepQuality: 1, sleepHours: 'lt5' } }))).toEqual([]);
  });

  it('reports equipment, availability and injury changes in readable form', () => {
    const after = withProfile({
      equipment: { access: 'none', items: [] },
      availability: 'medium',
      injuries: [{ area: 'knee', side: 'left', status: 'current', severity: 'mild' }],
    });
    const labels = planChanges(baseProfile, after).map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(['Equipment', 'Availability', 'Injuries']));
    expect(planChanges(baseProfile, after).find((c) => c.label === 'Equipment')).toMatchObject({ from: 'Full gym', to: 'No equipment' });
  });

  it('compares against the profile version the plan was built from', () => {
    const v1 = baseProfile;
    const v2 = withProfile({ updatedAt: '2026-11-05T00:00:00.000Z', weightKg: 70 });
    const v3 = withProfile({ updatedAt: '2026-11-06T00:00:00.000Z', equipment: { access: 'none', items: [] } });
    const plan = { profileUpdatedAt: v1.updatedAt };
    expect(changesSincePlan(plan, v2, [v1, v2])).toEqual([]); // weight only
    expect(changesSincePlan(plan, v3, [v1, v2, v3])?.map((c) => c.label)).toEqual(['Equipment']);
    expect(changesSincePlan({ profileUpdatedAt: 'unknown' }, v3, [v3])).toBeNull();
  });
});

describe('past plans', () => {
  it('keeps every replaced plan and can switch back to one', () => {
    usePlanStore.setState({ plan: null, history: [] });
    const first = usePlanStore.getState().build(baseProfile, defaultSettings(baseProfile), null);
    const noGear = withProfile({ equipment: { access: 'none', items: [] } });
    const second = usePlanStore.getState().build(noGear, defaultSettings(noGear), null);

    let { plan, history } = usePlanStore.getState();
    expect(plan?.id).toBe(second.id);
    expect(history.map((p) => p.id)).toEqual([first.id]);
    expect(history[0].archivedAt).toBeDefined();

    usePlanStore.getState().restore(first.id);
    ({ plan, history } = usePlanStore.getState());
    expect(plan?.id).toBe(first.id);
    expect(plan?.archivedAt).toBeUndefined();
    expect(history.map((p) => p.id)).toEqual([second.id]);
  });
});
