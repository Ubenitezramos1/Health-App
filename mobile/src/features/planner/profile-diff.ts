import type { Profile } from '@/features/profile/schema';
import { ageFromDob } from '@/features/profile/units';
import { summarize } from '@/features/questionnaire/summary';

export type PlanChange = { label: string; from: string; to: string };

/** Summary rows that shape the workout plan. Weight, mood, sleep etc. don't change the plan. */
const PLAN_ROWS = new Set([
  'Experience',
  'Body',
  'Main goal',
  'All goals',
  'Injuries',
  'Conditions',
  'Availability',
  'Time per session',
  'Access',
  'Items',
  'Other equipment',
  'Heaviest dumbbell',
]);

/** Plan-relevant answers that differ between two profiles, in readable form. */
export function planChanges(before: Profile, after: Profile): PlanChange[] {
  const rows = (p: Profile) =>
    new Map(summarize(p).flatMap((s) => s.rows.filter((r) => PLAN_ROWS.has(r.label)).map((r) => [r.label, r.value] as const)));
  const a = rows(before);
  const b = rows(after);
  const changes: PlanChange[] = [];
  for (const label of new Set([...a.keys(), ...b.keys()])) {
    const from = a.get(label) ?? '—';
    const to = b.get(label) ?? '—';
    if (from !== to) changes.push({ label: label === 'Access' ? 'Equipment' : label === 'Body' ? 'Focus areas' : label, from, to });
  }
  // Turning 50 raises maintenance volume (older adults need more to keep muscle).
  const crossed50 = ((ageFromDob(before.dob) ?? 0) >= 50) !== ((ageFromDob(after.dob) ?? 0) >= 50);
  if (crossed50) changes.push({ label: 'Age', from: String(ageFromDob(before.dob)), to: String(ageFromDob(after.dob)) });
  return changes;
}

/**
 * Plan-relevant changes since the profile version a plan was built from.
 * Returns null when that version isn't on record (then we can't tell, so callers should assume "maybe").
 */
export function changesSincePlan(
  plan: { profileUpdatedAt: string },
  profile: Profile,
  history: Profile[],
): PlanChange[] | null {
  if (plan.profileUpdatedAt === profile.updatedAt) return [];
  const builtFrom = history.find((p) => p.updatedAt === plan.profileUpdatedAt);
  return builtFrom ? planChanges(builtFrom, profile) : null;
}
