import AsyncStorage from '@react-native-async-storage/async-storage';

import { type Profile, type ProfileDraft, profileSchema } from './schema';

/**
 * On-device persistence for the profile.
 * - current: the latest completed profile
 * - history: every completed version (so later modules can show change over time)
 * - draft: an in-progress questionnaire, saved as the user goes
 *
 * The profile is a single document, so key-value storage fits. The tracker (many rows,
 * queries by exercise/week) will get SQLite behind its own repository.
 */
const KEYS = {
  current: 'profile.current.v1',
  history: 'profile.history.v1',
  draft: 'profile.draft.v1',
} as const;

async function readJson<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export async function loadProfile(): Promise<Profile | null> {
  const raw = await readJson<unknown>(KEYS.current);
  const parsed = profileSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function loadHistory(): Promise<Profile[]> {
  return (await readJson<Profile[]>(KEYS.history)) ?? [];
}

export async function saveProfile(profile: Profile): Promise<void> {
  const history = await loadHistory();
  await AsyncStorage.multiSet([
    [KEYS.current, JSON.stringify(profile)],
    [KEYS.history, JSON.stringify([...history, profile])],
  ]);
  await AsyncStorage.removeItem(KEYS.draft);
}

export async function loadDraft(): Promise<ProfileDraft | null> {
  return readJson<ProfileDraft>(KEYS.draft);
}

export async function saveDraft(draft: ProfileDraft): Promise<void> {
  await AsyncStorage.setItem(KEYS.draft, JSON.stringify(draft));
}

export async function clearDraft(): Promise<void> {
  await AsyncStorage.removeItem(KEYS.draft);
}
