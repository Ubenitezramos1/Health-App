import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';

import { MUSCLES, ScanAnalysis, type ScanRequest } from './schema.js';

const MODEL = 'claude-opus-5-5';

const SYSTEM = `You are a strength coach reviewing two progress photos (front and back, relaxed pose) to help plan someone's training.

Your job: rate how developed each muscle group looks RELATIVE TO THE REST OF THIS PERSON'S OWN PHYSIQUE — proportional balance, not comparison to athletes or ideals.
- "lagging": noticeably less developed than their other muscle groups.
- "strong": noticeably more developed than their other muscle groups.
- "balanced": in line with the rest. Most groups are usually balanced — use lagging/strong only for clear differences.
- "not_visible": the photos don't show it well enough to judge (clothing, angle, cropping).

Also note clear left/right size differences (use the person's own left/right — in the front photo their left side is on the viewer's right) and possible posture patterns, framed as "possible", never as a diagnosis.

Tone and limits:
- Neutral, specific and encouraging. Describe muscle development only.
- Never comment on attractiveness, body fat, weight, skin, or anything unrelated to training.
- No medical claims. Posture notes are observations for training emphasis only.
- If either photo isn't usable (not a single adult person, not full body head-to-feet, too dark, bulky clothing), set quality.usable to false, explain the fix in quality.issues, and rate the affected groups "not_visible".
- If the person appears to be under 18, set quality.usable to false with the issue "This scan is for adults only" and rate everything "not_visible".`;

function contextText(c: ScanRequest['context']) {
  return [
    `About this person (from their questionnaire): sex ${c.sex}, age ${c.age}, height ${Math.round(c.heightCm)} cm, weight ${Math.round(c.weightKg)} kg.`,
    `Training experience: ${c.experience}. Goals: ${c.goals.join(', ') || 'not specified'}.`,
    `Image 1 is the FRONT photo; image 2 is the BACK photo.`,
    `Rate these muscle groups: ${MUSCLES.join(', ')}.`,
  ].join('\n');
}

export class ScanRefusedError extends Error {}

/**
 * One Claude vision call with a structured output. Photos are sent once and never stored by this server.
 * Refusal fallbacks are on: if a safety classifier declines, the API retries on Anthropic's recommended model.
 */
export async function analyzeScan(client: Anthropic, req: ScanRequest): Promise<ScanAnalysis> {
  const response = await client.beta.messages.parse({
    model: MODEL,
    max_tokens: 16000,
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    output_config: { effort: 'medium', format: betaZodOutputFormat(ScanAnalysis) },
    system: SYSTEM,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: req.front } },
          { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: req.back } },
          { type: 'text', text: contextText(req.context) },
        ],
      },
    ],
  });

  if (response.stop_reason === 'refusal') throw new ScanRefusedError('The photos could not be analyzed.');
  if (!response.parsed_output) throw new Error(`No structured output (stop_reason: ${response.stop_reason})`);
  return response.parsed_output;
}

/** Deterministic result for UI development without an API key (SCAN_MOCK=1). */
export function mockScan(): ScanAnalysis {
  const muscles = Object.fromEntries(
    MUSCLES.map((m) => [m, { rating: 'balanced' as const, note: 'In line with the rest of your physique.' }]),
  ) as ScanAnalysis['muscles'];
  muscles.back = { rating: 'lagging', note: 'Upper back and lats look less developed than chest and arms.' };
  muscles.side_delts = { rating: 'lagging', note: 'Shoulders look narrow relative to the arms.' };
  muscles.chest = { rating: 'strong', note: 'Chest is one of your most developed areas.' };
  return {
    quality: { usable: true, issues: [] },
    muscles,
    asymmetries: [{ region: 'arms', weakerSide: 'left', note: 'Left arm looks slightly smaller than the right.' }],
    postureFlags: [{ flag: 'rounded_shoulders', note: 'Shoulders appear to round forward slightly in the side profile of the front photo.' }],
    strengths: ['Well-developed chest', 'Balanced legs front to back'],
    focusAreas: ['Upper back and lats for width and posture', 'Side delts for shoulder width'],
    summary: 'Solid base with a strong chest. Bringing up your back and side delts will balance your upper body and help posture. (Sample result — mock mode.)',
  };
}
