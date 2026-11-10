import {
  activitySchema,
  availabilitySchema,
  basicsSchema,
  equipmentSchema,
  focusSchema,
  goalsSchema,
  healthSchema,
  sessionSchema,
  wellbeingSchema,
  welcomeSchema,
} from '@/features/profile/schema';

import { ActivityStep, BasicsStep, WelcomeStep } from './steps/about-you';
import { FocusStep, GoalsStep } from './steps/goals';
import { HealthStep, WellbeingStep } from './steps/health';
import { AvailabilityStep, EquipmentStep, SessionStep } from './steps/training';
import type { StepDef } from './types';

/** Questionnaire order. The review screen is a separate route at the end. */
export const STEPS: StepDef[] = [
  {
    id: 'welcome',
    title: "Let's get to know you",
    subtitle: 'About 3 minutes. Your answers stay on this device.',
    schema: welcomeSchema,
    Component: WelcomeStep,
  },
  { id: 'basics', title: 'The basics', schema: basicsSchema, Component: BasicsStep },
  { id: 'activity', title: 'Your activity', schema: activitySchema, Component: ActivityStep },
  {
    id: 'focus',
    title: 'What do you want to improve?',
    subtitle: 'Pick as many as you like.',
    schema: focusSchema,
    Component: FocusStep,
  },
  { id: 'goals', title: 'Your goals', schema: goalsSchema, Component: GoalsStep },
  {
    id: 'health',
    title: 'Injuries and health',
    subtitle: 'Your plan avoids exercises that could aggravate these.',
    schema: healthSchema,
    Component: HealthStep,
  },
  {
    id: 'wellbeing',
    title: 'How are you feeling?',
    subtitle: 'A baseline. You can check in daily later.',
    schema: wellbeingSchema,
    Component: WellbeingStep,
  },
  {
    id: 'schedule',
    title: 'How many days a week can you train?',
    schema: availabilitySchema,
    Component: AvailabilityStep,
  },
  {
    id: 'session',
    title: 'How long can each workout be?',
    schema: sessionSchema,
    Component: SessionStep,
  },
  { id: 'equipment', title: 'Your equipment', schema: equipmentSchema, Component: EquipmentStep },
];

export const stepIndex = (id: string) => STEPS.findIndex((s) => s.id === id);
