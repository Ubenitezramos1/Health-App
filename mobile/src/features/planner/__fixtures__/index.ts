import type { Profile } from '@/features/profile/schema';

import type { ScanResult } from '../muscles';

export const baseProfile: Profile = {
  schemaVersion: 1,
  createdAt: '2026-11-01T00:00:00.000Z',
  updatedAt: '2026-11-01T00:00:00.000Z',
  dob: '1995-06-15',
  disclaimerAccepted: true,
  units: { weight: 'lb', length: 'imperial' },
  heightCm: 178,
  weightKg: 80,
  sex: 'male',
  activityLevel: 'moderate',
  activities: ['weightlifting'],
  activitiesOther: '',
  experience: 'intermediate',
  focus: { body: [], skills: [], health: [], other: '' },
  goals: ['build_muscle'],
  goalsOther: '',
  primaryGoal: 'build_muscle',
  injuries: [],
  conditions: [],
  conditionsOther: '',
  wellbeing: { mood: 4, energy: 4, sleepQuality: 4, sleepHours: '7-8' },
  availability: 'low',
  sessionLength: 'short',
  equipment: { access: 'full', items: [] },
};

export const withProfile = (patch: Partial<Profile>): Profile => ({ ...baseProfile, ...patch });

export const scan = (patch: Partial<ScanResult>): ScanResult => ({
  takenAt: '2026-11-02T00:00:00.000Z',
  muscles: {},
  asymmetries: [],
  postureFlags: [],
  ...patch,
});
