import type { BodyFocus } from '@/features/profile/options';

/** Muscle groups the planner budgets weekly volume for (and the scanner rates). */
export const MUSCLES = [
  'chest',
  'back',
  'side_delts',
  'rear_delts',
  'biceps',
  'triceps',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'core',
] as const;

export type Muscle = (typeof MUSCLES)[number];

/** Front delts get credit from pressing but have no weekly target of their own. */
export type CreditMuscle = Muscle | 'front_delts' | 'forearms';

export const MUSCLE_LABELS: Record<Muscle, string> = {
  chest: 'Chest',
  back: 'Back',
  side_delts: 'Side delts',
  rear_delts: 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  glutes: 'Glutes',
  calves: 'Calves',
  core: 'Core',
};

/** Questionnaire focus areas → muscles they cover. */
export const FOCUS_TO_MUSCLES: Record<BodyFocus, Muscle[]> = {
  chest: ['chest'],
  back: ['back'],
  shoulders: ['side_delts', 'rear_delts'],
  arms: ['biceps', 'triceps'],
  core: ['core'],
  glutes: ['glutes'],
  legs: ['quads', 'hamstrings'],
  calves: ['calves'],
  posture: ['rear_delts', 'back'],
};

export type Tier = 'priority' | 'standard' | 'maintain';

export const TIER_LABELS: Record<Tier, string> = {
  priority: 'Priority',
  standard: 'Standard',
  maintain: 'Maintain',
};

/* ---------- Physique scan result (produced by the scanner module, consumed here) ---------- */

export type ScanRating = 'lagging' | 'balanced' | 'strong';
export type AsymmetryRegion = 'arms' | 'chest' | 'shoulders' | 'legs' | 'glutes' | 'back';

export type ScanResult = {
  takenAt: string;
  muscles: Partial<Record<Muscle, ScanRating>>;
  asymmetries: { region: AsymmetryRegion; weakerSide: 'left' | 'right' }[];
  postureFlags: ('rounded_shoulders' | 'anterior_pelvic_tilt')[];
};
