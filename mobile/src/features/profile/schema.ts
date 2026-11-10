import { z } from 'zod';

import {
  ACTIVITIES,
  ACTIVITY_LEVELS,
  AVAILABILITY,
  CLEARANCE_CONDITIONS,
  CONDITIONS,
  EQUIPMENT_ACCESS,
  EQUIPMENT_ITEMS,
  EXPERIENCE_LEVELS,
  FOCUS_BODY,
  FOCUS_HEALTH,
  FOCUS_SKILLS,
  GOALS,
  INJURY_AREAS,
  INJURY_SEVERITY,
  INJURY_SIDES,
  INJURY_STATUS,
  SESSION_LENGTHS,
  SEX_OPTIONS,
  SLEEP_HOURS,
  ids,
} from './options';
import { ageFromDob } from './units';

export const MIN_AGE = 18;
const OTHER_MAX = 120;

const otherText = z.string().trim().max(OTHER_MAX, { error: `Keep it under ${OTHER_MAX} characters` });
const rating = z.number().int().min(1).max(5);

/* ---------- Per-step schemas (each step validates only its own fields) ---------- */

export const welcomeSchema = z.object({
  dob: z.string({ error: 'Enter your date of birth' }).min(1, { error: 'Enter your date of birth' }).refine((v) => ageFromDob(v) !== null, { error: 'Enter a real date' }).refine(
    (v) => (ageFromDob(v) ?? 0) >= MIN_AGE,
    { error: `You need to be ${MIN_AGE} or older to use this app` },
  ).refine((v) => (ageFromDob(v) ?? 0) <= 110, { error: 'Check the year' }),
  disclaimerAccepted: z.literal(true, { error: 'Accept the health disclaimer to continue' }),
  units: z.object({
    weight: z.enum(['lb', 'kg']),
    length: z.enum(['imperial', 'metric']),
  }),
});

export const basicsSchema = z.object({
  heightCm: z.number({ error: 'Enter your height' }).min(120, { error: 'Check your height' }).max(230, {
    error: 'Check your height',
  }),
  weightKg: z.number({ error: 'Enter your weight' }).min(30, { error: 'Check your weight' }).max(300, {
    error: 'Check your weight',
  }),
  sex: z.enum(ids(SEX_OPTIONS), { error: 'Pick an option' }),
});

export const activitySchema = z.object({
  activityLevel: z.enum(ids(ACTIVITY_LEVELS), { error: 'Pick your activity level' }),
  activities: z.array(z.enum(ids(ACTIVITIES))),
  activitiesOther: otherText,
  experience: z.enum(ids(EXPERIENCE_LEVELS), { error: 'Pick your training experience' }),
});

export const focusSchema = z.object({
  focus: z.object({
    body: z.array(z.enum(ids(FOCUS_BODY))),
    skills: z.array(z.enum(ids(FOCUS_SKILLS))),
    health: z.array(z.enum(ids(FOCUS_HEALTH))),
    other: otherText,
  }),
});

export const goalsSchema = z
  .object({
    goals: z.array(z.enum(ids(GOALS))).min(1, { error: 'Pick at least one goal from the list' }),
    goalsOther: otherText,
    primaryGoal: z.enum(ids(GOALS), { error: 'Pick your main goal' }),
  })
  .refine((v) => v.goals.includes(v.primaryGoal), {
    error: 'Your main goal must be one of your selected goals',
    path: ['primaryGoal'],
  });

export const injurySchema = z.object({
  area: z.enum(ids(INJURY_AREAS)),
  side: z.enum(ids(INJURY_SIDES)).optional(),
  status: z.enum(ids(INJURY_STATUS)),
  severity: z.enum(ids(INJURY_SEVERITY)),
});

export const healthSchema = z.object({
  injuries: z.array(injurySchema),
  conditions: z.array(z.enum(ids(CONDITIONS))),
  conditionsOther: otherText,
});

export const wellbeingSchema = z.object({
  wellbeing: z.object({
    mood: rating,
    energy: rating,
    sleepQuality: rating,
    sleepHours: z.enum(ids(SLEEP_HOURS)),
  }, { error: 'Answer each question' }),
});

export const availabilitySchema = z.object({
  availability: z.enum(ids(AVAILABILITY), { error: 'Pick your availability' }),
});

export const sessionSchema = z.object({
  sessionLength: z.enum(ids(SESSION_LENGTHS), { error: 'Pick a session length' }),
});

export const equipmentSchema = z
  .object({
    equipment: z.object({
      access: z.enum(ids(EQUIPMENT_ACCESS), { error: 'Pick your equipment access' }),
      items: z.array(z.enum(ids(EQUIPMENT_ITEMS))),
      maxDumbbellKg: z.number().positive().max(100).optional(),
    }),
  })
  .refine((v) => v.equipment.access !== 'limited' || v.equipment.items.length > 0, {
    error: 'Pick the equipment you have',
    path: ['equipment', 'items'],
  });

/* ---------- Full profile ---------- */

export const profileSchema = z
  .object({
    schemaVersion: z.literal(1),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .and(welcomeSchema)
  .and(basicsSchema)
  .and(activitySchema)
  .and(focusSchema)
  .and(goalsSchema)
  .and(healthSchema)
  .and(wellbeingSchema)
  .and(availabilitySchema)
  .and(sessionSchema)
  .and(equipmentSchema);

export type Profile = z.infer<typeof profileSchema>;
export type Injury = z.infer<typeof injurySchema>;

/** Draft = everything optional while the user is mid-questionnaire. */
export type ProfileDraft = Partial<Omit<Profile, 'schemaVersion' | 'createdAt' | 'updatedAt'>> & {
  createdAt?: string;
};

export function emptyDraft(): ProfileDraft {
  return {
    units: { weight: 'lb', length: 'imperial' },
    activities: [],
    activitiesOther: '',
    focus: { body: [], skills: [], health: [], other: '' },
    goals: [],
    goalsOther: '',
    injuries: [],
    conditions: [],
    conditionsOther: '',
  };
}

/** True when the answers suggest the user should check with a doctor before training. */
export function needsMedicalClearance(p: Pick<ProfileDraft, 'injuries' | 'conditions'>): boolean {
  const severeCurrent = (p.injuries ?? []).some((i) => i.status === 'current' && i.severity === 'severe');
  const flagged = (p.conditions ?? []).some((c) =>
    (CLEARANCE_CONDITIONS as readonly string[]).includes(c),
  );
  return severeCurrent || flagged;
}

/** First error message per field path, for showing inline under controls. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
