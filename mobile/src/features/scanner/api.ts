import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { EXPERIENCE_LEVELS, GOALS, labelOf } from '@/features/profile/options';
import type { Profile } from '@/features/profile/schema';
import { ageFromDob } from '@/features/profile/units';

import { type ScanAnalysis, scanAnalysisSchema } from './types';

/**
 * The scan server keeps the API key off the device. Set EXPO_PUBLIC_SCAN_API_URL for a phone
 * (a phone can't reach your computer's "localhost"; use its LAN address or a deployed URL).
 */
const BASE_URL = process.env.EXPO_PUBLIC_SCAN_API_URL ?? 'http://localhost:8787';
const APP_TOKEN = process.env.EXPO_PUBLIC_SCAN_APP_TOKEN;
const TIMEOUT_MS = 120_000;

export class ScanError extends Error {}

/** Downscale to ~1080 px wide JPEG: plenty for analysis, and keeps uploads small. */
async function prepare(uri: string): Promise<string> {
  const image = await ImageManipulator.manipulate(uri, { maxWidth: 1080 }).renderAsync();
  const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
  if (!saved.base64) throw new ScanError("Couldn't read that photo. Try another one.");
  return saved.base64;
}

export async function analyzePhotos(frontUri: string, backUri: string, profile: Profile): Promise<ScanAnalysis> {
  const [front, back] = await Promise.all([prepare(frontUri), prepare(backUri)]);
  const body = {
    front,
    back,
    context: {
      sex: profile.sex,
      age: ageFromDob(profile.dob) ?? 30,
      heightCm: profile.heightCm,
      weightKg: profile.weightKg,
      experience: labelOf(EXPERIENCE_LEVELS, profile.experience),
      goals: profile.goals.map((g) => labelOf(GOALS, g)),
    },
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/scan`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(APP_TOKEN ? { 'x-app-token': APP_TOKEN } : {}) },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    throw new ScanError("Couldn't reach the scan service. Check your connection and try again.");
  } finally {
    clearTimeout(timer);
  }

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message = (json as { error?: string } | null)?.error;
    throw new ScanError(message ?? 'The scan failed. Try again.');
  }
  const parsed = scanAnalysisSchema.safeParse(json);
  if (!parsed.success) throw new ScanError('The scan returned an unexpected result. Try again.');
  return parsed.data;
}
