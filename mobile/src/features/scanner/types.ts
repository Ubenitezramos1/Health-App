import { z } from 'zod';

import { MUSCLES, type Muscle, type ScanResult } from '@/features/planner/muscles';

/** Mirrors server/src/schema.ts. The client re-validates every response before using it. */
const Assessment = z.object({
  rating: z.enum(['lagging', 'balanced', 'strong', 'not_visible']),
  note: z.string(),
});

export const scanAnalysisSchema = z.object({
  quality: z.object({ usable: z.boolean(), issues: z.array(z.string()) }),
  muscles: z.object(Object.fromEntries(MUSCLES.map((m) => [m, Assessment])) as Record<Muscle, typeof Assessment>),
  asymmetries: z.array(
    z.object({
      region: z.enum(['arms', 'chest', 'shoulders', 'legs', 'glutes', 'back']),
      weakerSide: z.enum(['left', 'right']),
      note: z.string(),
    }),
  ),
  postureFlags: z.array(z.object({ flag: z.enum(['rounded_shoulders', 'anterior_pelvic_tilt']), note: z.string() })),
  strengths: z.array(z.string()),
  focusAreas: z.array(z.string()),
  summary: z.string(),
});

export type ScanAnalysis = z.infer<typeof scanAnalysisSchema>;
export type Rating = ScanAnalysis['muscles'][Muscle]['rating'];

/** A saved scan: results only — the photos are never stored. */
export type ScanRecord = { id: string; takenAt: string; analysis: ScanAnalysis };

/** What the planner consumes. Unusable scans and "not visible" muscles contribute nothing. */
export function toPlannerScan(record: ScanRecord): ScanResult | null {
  const a = record.analysis;
  if (!a.quality.usable) return null;
  const muscles: ScanResult['muscles'] = {};
  for (const m of MUSCLES) {
    const r = a.muscles[m].rating;
    if (r !== 'not_visible') muscles[m] = r;
  }
  return {
    takenAt: record.takenAt,
    muscles,
    asymmetries: a.asymmetries.map(({ region, weakerSide }) => ({ region, weakerSide })),
    postureFlags: a.postureFlags.map((p) => p.flag),
  };
}

export const POSTURE_LABELS: Record<ScanAnalysis['postureFlags'][number]['flag'], string> = {
  rounded_shoulders: 'Possible rounded shoulders',
  anterior_pelvic_tilt: 'Possible anterior pelvic tilt',
};
