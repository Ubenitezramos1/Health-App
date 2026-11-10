import type { WeightUnit } from '@/features/profile/units';

export type SetLog = {
  /** Null for bodyweight / band work. */
  weight: number | null;
  reps: number | null;
  unit: WeightUnit;
};

export type ExerciseLog = {
  /** Plan exercise this log belongs to (stable within one plan). */
  planExerciseId: string;
  /** Library exercise — history and progression follow this across plans and days. */
  exerciseId: string;
  sets: SetLog[];
};

export type CheckIn = {
  energy: number; // 1–5
  sleep: number; // 1–5
  soreness: number; // 1–5 (5 = very sore)
};

/** Session adjustment the user accepted after a check-in. Never applied automatically. */
export type Adjustment = 'drop_last_set' | 'easier_rir' | null;

export type WorkoutLog = {
  id: string;
  planId: string;
  dayId: string;
  /** Training week within the plan, starting at 1. */
  week: number;
  startedAt: string;
  completedAt: string | null;
  deload: boolean;
  checkIn: CheckIn | null;
  adjustment: Adjustment;
  entries: ExerciseLog[];
};

export type TrackerSettings = {
  /** Use the smallest plates (2.5 lb / 1.25 kg) for weight jumps. */
  smallSteps: boolean;
  /** Extra deload weeks the user accepted from a suggestion, per plan. */
  extraDeloads: Record<string, number[]>;
};
