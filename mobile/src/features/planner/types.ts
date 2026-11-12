import type { Muscle, Tier } from './muscles';
import type { GoalProfile } from './rules';

export type PlanStyle = 'efficient' | 'full';
export type ScheduleType = 'loose' | 'days' | 'exact';
export type DayType = 'full_a' | 'full_b' | 'upper' | 'lower' | 'push' | 'pull' | 'legs' | 'recovery';
export type SlotRole = 'main' | 'secondary' | 'accessory';

export type PlanSettings = {
  style: PlanStyle;
  daysPerWeek: number;
  scheduleType: ScheduleType;
  /** Training weekdays, 0 = Monday … 6 = Sunday. Length equals daysPerWeek. */
  weekdays: number[];
  /** Weekday → "HH:MM" (exact schedule only). */
  times: Record<number, string>;
  deloadEnabled: boolean;
  /** User-chosen tiers; always win over scan/questionnaire. */
  tierOverrides: Partial<Record<Muscle, Tier>>;
  /** User confirmed medical clearance (unlocks higher-risk lifts). */
  clearanceConfirmed: boolean;
};

export type PlanExercise = {
  id: string;
  exerciseId: string;
  role: SlotRole;
  sets: number;
  repMin: number;
  repMax: number;
  rir: string;
  restSec: number;
  /** Exercises sharing a group are done as a superset (alternate sets, rest after the pair). */
  supersetGroup?: string;
  notes: string[];
  /** Slow-lowering stage (3-second lowering) — a bodyweight step-up before a harder variation. */
  tempo?: boolean;
  /** When the current step (variation or tempo) started; only sessions after it count toward the next step. */
  stageSince?: string;
  /** User tapped "Not yet" on a step-up; ask again after their next session. */
  stepUpSnoozedAt?: string;
};

export type PlanDay = {
  id: string;
  type: DayType;
  label: string;
  exercises: PlanExercise[];
  estMinutes: number;
};

export type MuscleVolume = {
  tier: Tier;
  reasons: string[];
  /** Weekly fractional sets the plan aims for / never exceeds / never drops below. */
  target: number;
  ceiling: number;
  floor: number;
  /** Weekly fractional sets the plan currently delivers. */
  sets: number;
};

export type Plan = {
  id: string;
  createdAt: string;
  updatedAt: string;
  /** Profile version this plan was built from (to offer a rebuild when it changes). */
  profileUpdatedAt: string;
  scanTakenAt?: string;
  settings: PlanSettings;
  days: PlanDay[];
  volume: Record<Muscle, MuscleVolume>;
  sessionBudgetMin: number;
  /** Rep/effort profile from the main goal (older plans may lack it). */
  goal?: GoalProfile;
  blockWeeks: number;
  deloadWeek: number | null;
  why: string[];
  warnings: string[];
  restDay: string;
  cardio: string;
  /** True once the user hand-edits exercises (rebuilding would discard edits). */
  customized: boolean;
  /** Set when the plan was replaced and moved to past plans. */
  archivedAt?: string;
};
