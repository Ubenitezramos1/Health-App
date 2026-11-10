import type { WeightUnit } from '@/features/profile/units';

import { convertWeight } from './progression';
import type { SetLog } from './types';

export const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));

export const fmtWeight = (w: number | null, unit: WeightUnit) => (w === null ? 'Bodyweight' : `${fmtNum(w)} ${unit}`);

/** "35×6, 35×5" in the user's unit; bodyweight sets show reps only. */
export function fmtSets(sets: SetLog[], unit: WeightUnit): string {
  const done = sets.filter((s) => s.reps);
  if (!done.length) return '—';
  return done
    .map((s) => (s.weight === null ? `${s.reps} reps` : `${fmtNum(convertWeight(s.weight, s.unit, unit))}×${s.reps}`))
    .join(', ');
}

export function fmtTarget(weight: number | null, reps: number[], unit: WeightUnit, timed = false): string {
  const repText = reps.every((r) => r === reps[0]) ? `${reps.length} × ${reps[0]}` : reps.join(', ');
  const suffix = timed ? ' s' : '';
  return weight === null ? `${repText}${suffix}` : `${fmtNum(weight)} ${unit} · ${repText}${suffix}`;
}

export const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
