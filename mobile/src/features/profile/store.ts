import { create } from 'zustand';

import { type Profile, type ProfileDraft, emptyDraft, profileSchema } from './schema';
import * as storage from './storage';

type ProfileState = {
  hydrated: boolean;
  profile: Profile | null;
  /** Every saved version, oldest first (lets the planner tell what changed since a plan was built). */
  history: Profile[];
  draft: ProfileDraft;
  hydrate: () => Promise<void>;
  /** Merge answers into the draft and persist it (autosave). */
  update: (patch: Partial<ProfileDraft>) => void;
  /** Start a new questionnaire: from the saved profile (edit) or blank. */
  startDraft: (from: 'profile' | 'blank') => void;
  /** Validate the whole draft and save it as the current profile. */
  complete: () => Promise<{ ok: true } | { ok: false; message: string }>;
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  hydrated: false,
  profile: null,
  history: [],
  draft: emptyDraft(),

  hydrate: async () => {
    const [profile, draft, history] = await Promise.all([
      storage.loadProfile(),
      storage.loadDraft(),
      storage.loadHistory(),
    ]);
    set({ profile, history, draft: draft ?? emptyDraft(), hydrated: true });
  },

  update: (patch) => {
    const draft = { ...get().draft, ...patch };
    set({ draft });
    void storage.saveDraft(draft);
  },

  startDraft: (from) => {
    const { profile } = get();
    const draft: ProfileDraft =
      from === 'profile' && profile
        ? (({ schemaVersion: _v, updatedAt: _u, ...rest }) => rest)(profile)
        : emptyDraft();
    set({ draft });
    void storage.saveDraft(draft);
  },

  complete: async () => {
    const now = new Date().toISOString();
    const { draft } = get();
    const parsed = profileSchema.safeParse({
      ...draft,
      schemaVersion: 1,
      createdAt: draft.createdAt ?? now,
      updatedAt: now,
    });
    if (!parsed.success) {
      return { ok: false, message: parsed.error.issues[0]?.message ?? 'Some answers are missing' };
    }
    await storage.saveProfile(parsed.data);
    set({ profile: parsed.data, history: [...get().history, parsed.data], draft: emptyDraft() });
    return { ok: true };
  },
}));
