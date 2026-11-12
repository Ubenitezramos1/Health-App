import { describe, expect, it } from '@jest/globals';

import { withProfile } from '@/features/planner/__fixtures__';
import { defaultSettings, generatePlan } from '@/features/planner/engine';
import { getExercise } from '@/features/planner/exercises';

import { effectiveItems, recognizeEquipment } from '../equipment-text';
import { equipmentSchema } from '../schema';

describe('typed-in equipment', () => {
  it('recognizes common items in free text', () => {
    expect(recognizeEquipment('TRX, EZ bar and a pair of dumbbells')).toEqual(
      expect.arrayContaining(['suspension', 'barbell', 'dumbbells']),
    );
    expect(recognizeEquipment('old backpack full of books, 2 gallon jugs')).toEqual(
      expect.arrayContaining(['loaded_bag', 'water_jugs']),
    );
    expect(recognizeEquipment('kettlebell; pull-up bar in the doorway')).toEqual(
      expect.arrayContaining(['kettlebell', 'pullup_bar', 'table_doorframe']),
    );
  });

  it('ignores things it does not know, without false matches', () => {
    expect(recognizeEquipment('foam roller and a yoga mat')).toEqual([]);
    expect(recognizeEquipment('')).toEqual([]);
    expect(recognizeEquipment(undefined)).toEqual([]);
  });

  it('merges ticked and recognized items', () => {
    expect(effectiveItems({ items: ['bands'], other: 'TRX' }).sort()).toEqual(['bands', 'suspension']);
  });

  it('accepts "Some equipment" with only typed-in text', () => {
    expect(equipmentSchema.safeParse({ equipment: { access: 'limited', items: [], other: 'TRX' } }).success).toBe(true);
    expect(equipmentSchema.safeParse({ equipment: { access: 'limited', items: [] } }).success).toBe(false);
  });
});

describe('everyday items in the plan', () => {
  const exercisesFor = (equipment: Parameters<typeof withProfile>[0]['equipment']) => {
    const profile = withProfile({ equipment });
    return generatePlan(profile, defaultSettings(profile), null).days.flatMap((d) => d.exercises.map((x) => getExercise(x.exerciseId)));
  };

  it('uses a loaded backpack and water jugs when "No equipment" lists them', () => {
    const ids = exercisesFor({ access: 'none', items: ['loaded_bag', 'water_jugs', 'chair_step', 'table_doorframe'] }).map((e) => e.id);
    expect(ids.some((id) => id.startsWith('bag_') || id.startsWith('jug_'))).toBe(true);
  });

  it('only uses items the user actually has', () => {
    const allowed = new Set(['loaded_bag']);
    for (const e of exercisesFor({ access: 'none', items: ['loaded_bag'] }))
      for (const req of e.equipment) expect((Array.isArray(req) ? req : [req]).some((r) => allowed.has(r))).toBe(true);
  });

  it('uses typed-in equipment the app recognizes', () => {
    const ids = exercisesFor({ access: 'limited', items: [], other: 'TRX straps' }).map((e) => e.id);
    expect(ids.some((id) => id.startsWith('suspension_'))).toBe(true);
  });
});
