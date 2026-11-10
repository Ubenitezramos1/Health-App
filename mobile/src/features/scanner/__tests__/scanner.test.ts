import { describe, expect, it } from '@jest/globals';

import { defaultSettings, generatePlan } from '@/features/planner/engine';
import { MUSCLES } from '@/features/planner/muscles';

import { baseProfile } from '../../planner/__fixtures__';
import { latestUsableScan } from '../store';
import { type ScanAnalysis, type ScanRecord, scanAnalysisSchema, toPlannerScan } from '../types';

function analysis(patch: Partial<ScanAnalysis> = {}): ScanAnalysis {
  const muscles = Object.fromEntries(MUSCLES.map((m) => [m, { rating: 'balanced', note: '' }])) as ScanAnalysis['muscles'];
  muscles.back = { rating: 'lagging', note: 'Back behind' };
  muscles.chest = { rating: 'strong', note: 'Chest ahead' };
  muscles.calves = { rating: 'not_visible', note: 'Cropped' };
  return {
    quality: { usable: true, issues: [] },
    muscles,
    asymmetries: [{ region: 'arms', weakerSide: 'left', note: '' }],
    postureFlags: [{ flag: 'rounded_shoulders', note: '' }],
    strengths: ['Chest'],
    focusAreas: ['Back'],
    summary: 'ok',
    ...patch,
  };
}

const record = (id: string, a: ScanAnalysis, takenAt = '2026-11-09T10:00:00Z'): ScanRecord => ({ id, takenAt, analysis: a });

describe('scan → planner', () => {
  it('validates the server response shape', () => {
    expect(scanAnalysisSchema.safeParse(analysis()).success).toBe(true);
    expect(scanAnalysisSchema.safeParse({ ...analysis(), muscles: {} }).success).toBe(false);
  });

  it('maps ratings, skips "not visible" muscles, and keeps asymmetry and posture', () => {
    const scan = toPlannerScan(record('a', analysis()))!;
    expect(scan.muscles.back).toBe('lagging');
    expect(scan.muscles.chest).toBe('strong');
    expect(scan.muscles.calves).toBeUndefined();
    expect(scan.asymmetries).toEqual([{ region: 'arms', weakerSide: 'left' }]);
    expect(scan.postureFlags).toEqual(['rounded_shoulders']);
  });

  it('ignores unusable scans', () => {
    const bad = record('b', analysis({ quality: { usable: false, issues: ['Too dark'] } }), '2026-11-10T10:00:00Z');
    expect(toPlannerScan(bad)).toBeNull();
    const good = record('a', analysis());
    expect(latestUsableScan([good, bad])?.record.id).toBe('a');
  });

  it('shapes the plan: lagging back becomes priority, strong chest goes to maintenance but stays above zero', () => {
    const scan = toPlannerScan(record('a', analysis()))!;
    const plan = generatePlan(baseProfile, defaultSettings(baseProfile), scan);
    expect(plan.volume.back.tier).toBe('priority');
    expect(plan.volume.chest.tier).toBe('maintain');
    expect(plan.volume.chest.sets).toBeGreaterThanOrEqual(plan.volume.chest.floor);
    expect(plan.scanTakenAt).toBe(scan.takenAt);
  });
});
