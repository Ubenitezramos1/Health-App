import { describe, expect, it } from '@jest/globals';

import {
  basicsSchema,
  equipmentSchema,
  goalsSchema,
  needsMedicalClearance,
  profileSchema,
  welcomeSchema,
} from '../schema';
import { useProfileStore } from '../store';
import * as storage from '../storage';
import { ageFromDob, cmToFeetInches, feetInchesToCm, kgToLb, lbToKg, parseIsoDate } from '../units';

const TODAY = new Date(2026, 10, 4); // Nov 4, 2026

describe('units', () => {
  it('round-trips height and weight', () => {
    expect(cmToFeetInches(feetInchesToCm(5, 10))).toEqual({ feet: 5, inches: 10 });
    expect(Math.round(kgToLb(lbToKg(185)))).toBe(185);
  });

  it('rejects impossible dates', () => {
    expect(parseIsoDate('2001-02-30')).toBeNull();
    expect(parseIsoDate('2001-13-01')).toBeNull();
    expect(parseIsoDate('2001-02-28')).not.toBeNull();
  });

  it('computes age around the birthday', () => {
    expect(ageFromDob('2008-11-04', TODAY)).toBe(18);
    expect(ageFromDob('2008-11-05', TODAY)).toBe(17);
  });
});

describe('welcome step (age gate + disclaimer)', () => {
  const base = { units: { weight: 'lb', length: 'imperial' }, disclaimerAccepted: true };
  it('blocks under-18 users', () => {
    const dob = new Date();
    const r = welcomeSchema.safeParse({ ...base, dob: `${dob.getFullYear() - 17}-01-01` });
    expect(r.success).toBe(false);
  });
  it('requires the disclaimer', () => {
    const r = welcomeSchema.safeParse({ ...base, disclaimerAccepted: undefined, dob: '1995-06-15' });
    expect(r.success).toBe(false);
  });
  it('accepts an adult who accepted the disclaimer', () => {
    expect(welcomeSchema.safeParse({ ...base, dob: '1995-06-15' }).success).toBe(true);
  });
});

describe('step rules', () => {
  it('rejects implausible height', () => {
    expect(basicsSchema.safeParse({ heightCm: 50, weightKg: 80, sex: 'male' }).success).toBe(false);
  });
  it('requires the main goal to be one of the selected goals', () => {
    const r = goalsSchema.safeParse({ goals: ['build_muscle'], goalsOther: '', primaryGoal: 'lose_fat' });
    expect(r.success).toBe(false);
  });
  it('requires items when equipment is limited', () => {
    expect(equipmentSchema.safeParse({ equipment: { access: 'limited', items: [] } }).success).toBe(false);
    expect(equipmentSchema.safeParse({ equipment: { access: 'full', items: [] } }).success).toBe(true);
  });
});

describe('medical clearance', () => {
  it('flags severe current injuries and listed conditions only', () => {
    expect(needsMedicalClearance({ injuries: [{ area: 'knee', status: 'past', severity: 'severe' }] })).toBe(false);
    expect(needsMedicalClearance({ injuries: [{ area: 'knee', status: 'current', severity: 'severe' }] })).toBe(true);
    expect(needsMedicalClearance({ conditions: ['asthma'] })).toBe(false);
    expect(needsMedicalClearance({ conditions: ['heart'] })).toBe(true);
  });
});

const completeDraft = {
  dob: '1995-06-15',
  disclaimerAccepted: true as const,
  units: { weight: 'lb' as const, length: 'imperial' as const },
  heightCm: 178,
  weightKg: 82,
  sex: 'male' as const,
  activityLevel: 'moderate' as const,
  activities: ['weightlifting' as const],
  activitiesOther: '',
  experience: 'intermediate' as const,
  focus: { body: ['back' as const], skills: [], health: [], other: '' },
  goals: ['build_muscle' as const, 'get_stronger' as const],
  goalsOther: '',
  primaryGoal: 'build_muscle' as const,
  injuries: [],
  conditions: [],
  conditionsOther: '',
  wellbeing: { mood: 4, energy: 3, sleepQuality: 3, sleepHours: '7-8' as const },
  availability: 'low' as const,
  sessionLength: 'short' as const,
  equipment: { access: 'full' as const, items: [] },
};

describe('profile store', () => {
  it('validates the whole draft, saves it, and keeps history', async () => {
    useProfileStore.setState({ draft: { ...completeDraft, sessionLength: undefined } });
    expect((await useProfileStore.getState().complete()).ok).toBe(false);

    useProfileStore.getState().update({ sessionLength: 'short' });
    expect((await useProfileStore.getState().complete()).ok).toBe(true);

    const saved = await storage.loadProfile();
    expect(saved && profileSchema.safeParse(saved).success).toBe(true);
    expect(await storage.loadDraft()).toBeNull();

    useProfileStore.getState().startDraft('profile');
    useProfileStore.getState().update({ weightKg: 80 });
    await useProfileStore.getState().complete();
    const history = await storage.loadHistory();
    expect(history.map((p) => p.weightKg)).toEqual([82, 80]);
    expect(history[1].createdAt).toBe(history[0].createdAt);
  });
});
