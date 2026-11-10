import { z } from 'zod';

/** Muscle groups — must match mobile/src/features/planner/muscles.ts. */
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

const Rating = z.enum(['lagging', 'balanced', 'strong', 'not_visible']);

const MuscleAssessment = z.object({
  rating: Rating,
  note: z.string().describe('One short, neutral sentence about what is visible. No judgments about attractiveness or weight.'),
});

/** What the model returns. Validated again on the client before it touches the plan. */
export const ScanAnalysis = z.object({
  quality: z.object({
    usable: z.boolean().describe('False if either photo cannot support an assessment (not a full body, not a person, too dark, heavy clothing, multiple people, appears under 18).'),
    issues: z.array(z.string()).describe('Specific, fixable problems, e.g. "Back photo cuts off below the knees". Empty if none.'),
  }),
  muscles: z.object(Object.fromEntries(MUSCLES.map((m) => [m, MuscleAssessment])) as Record<(typeof MUSCLES)[number], typeof MuscleAssessment>),
  asymmetries: z.array(
    z.object({
      region: z.enum(['arms', 'chest', 'shoulders', 'legs', 'glutes', 'back']),
      weakerSide: z.enum(['left', 'right']).describe("The person's own left or right (mirror-corrected: in a front photo their left appears on the viewer's right)."),
      note: z.string(),
    }),
  ),
  postureFlags: z.array(
    z.object({
      flag: z.enum(['rounded_shoulders', 'anterior_pelvic_tilt']),
      note: z.string(),
    }),
  ),
  strengths: z.array(z.string()).describe('2–4 short, encouraging points about well-developed areas.'),
  focusAreas: z.array(z.string()).describe('2–4 short points on what to prioritize in training and why.'),
  summary: z.string().describe('2–3 sentences, encouraging and specific, in plain language.'),
});

export type ScanAnalysis = z.infer<typeof ScanAnalysis>;

const Base64Jpeg = z
  .string()
  .min(1000, 'Photo is missing or too small')
  .max(8_000_000, 'Photo is too large — resize before sending');

export const ScanRequest = z.object({
  front: Base64Jpeg,
  back: Base64Jpeg,
  context: z.object({
    sex: z.enum(['male', 'female', 'unspecified']),
    age: z.number().int().min(18).max(110),
    heightCm: z.number().min(100).max(250),
    weightKg: z.number().min(25).max(350),
    experience: z.string().max(40),
    goals: z.array(z.string().max(60)).max(12),
  }),
});

export type ScanRequest = z.infer<typeof ScanRequest>;
