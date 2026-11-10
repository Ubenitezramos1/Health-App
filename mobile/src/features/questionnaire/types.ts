import type { ComponentType } from 'react';
import type { z } from 'zod';

import type { ProfileDraft } from '@/features/profile/schema';

export type StepProps = {
  draft: ProfileDraft;
  update: (patch: Partial<ProfileDraft>) => void;
  /** Field path -> first error message (only populated after the user taps Continue). */
  errors: Record<string, string>;
};

export type StepDef = {
  id: string;
  title: string;
  subtitle?: string;
  /** Validates this step's slice of the draft. Omitted for the review step. */
  schema?: z.ZodType;
  Component: ComponentType<StepProps>;
};
