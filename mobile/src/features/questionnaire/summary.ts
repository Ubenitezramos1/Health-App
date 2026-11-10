import {
  ACTIVITIES,
  ACTIVITY_LEVELS,
  AVAILABILITY,
  CONDITIONS,
  EQUIPMENT_ACCESS,
  EQUIPMENT_ITEMS,
  EXPERIENCE_LEVELS,
  FOCUS_BODY,
  FOCUS_HEALTH,
  FOCUS_SKILLS,
  GOALS,
  INJURY_AREAS,
  SESSION_LENGTHS,
  SEX_OPTIONS,
  SLEEP_HOURS,
  labelOf,
  type Option,
} from '@/features/profile/options';
import type { ProfileDraft } from '@/features/profile/schema';
import { ageFromDob, formatHeight, formatWeight } from '@/features/profile/units';

export type SummarySection = { stepId: string; title: string; rows: { label: string; value: string }[] };

const list = (options: readonly Option[], values: readonly string[] | undefined, other?: string) => {
  const labels = (values ?? []).map((v) => labelOf(options, v));
  if (other?.trim()) labels.push(other.trim());
  return labels.length ? labels.join(', ') : 'None';
};

/** Human-readable summary of a draft/profile, grouped by questionnaire step. */
export function summarize(d: ProfileDraft): SummarySection[] {
  const units = d.units ?? { weight: 'lb', length: 'imperial' };
  const w = d.wellbeing;
  return [
    {
      stepId: 'basics',
      title: 'Basics',
      rows: [
        { label: 'Age', value: d.dob ? String(ageFromDob(d.dob) ?? '—') : '—' },
        { label: 'Height', value: d.heightCm ? formatHeight(d.heightCm, units.length) : '—' },
        { label: 'Weight', value: d.weightKg ? formatWeight(d.weightKg, units.weight) : '—' },
        { label: 'Sex', value: labelOf(SEX_OPTIONS, d.sex) || '—' },
      ],
    },
    {
      stepId: 'activity',
      title: 'Activity',
      rows: [
        { label: 'Day to day', value: labelOf(ACTIVITY_LEVELS, d.activityLevel) || '—' },
        { label: 'Activities', value: list(ACTIVITIES, d.activities, d.activitiesOther) },
        { label: 'Experience', value: labelOf(EXPERIENCE_LEVELS, d.experience) || '—' },
      ],
    },
    {
      stepId: 'focus',
      title: 'Focus areas',
      rows: [
        { label: 'Body', value: list(FOCUS_BODY, d.focus?.body) },
        { label: 'Skills', value: list(FOCUS_SKILLS, d.focus?.skills) },
        { label: 'Health', value: list(FOCUS_HEALTH, d.focus?.health, d.focus?.other) },
      ],
    },
    {
      stepId: 'goals',
      title: 'Goals',
      rows: [
        { label: 'Main goal', value: labelOf(GOALS, d.primaryGoal) || '—' },
        { label: 'All goals', value: list(GOALS, d.goals, d.goalsOther) },
      ],
    },
    {
      stepId: 'health',
      title: 'Injuries and health',
      rows: [
        {
          label: 'Injuries',
          value: d.injuries?.length
            ? d.injuries
                .map(
                  (i) =>
                    `${i.side && i.side !== 'both' ? `${i.side} ` : ''}${labelOf(INJURY_AREAS, i.area).toLowerCase()} (${i.status}, ${i.severity})`,
                )
                .join(', ')
            : 'None',
        },
        { label: 'Conditions', value: list(CONDITIONS, d.conditions, d.conditionsOther) },
      ],
    },
    {
      stepId: 'wellbeing',
      title: 'Wellbeing',
      rows: [
        { label: 'Mood', value: w?.mood ? `${w.mood}/5` : '—' },
        { label: 'Energy', value: w?.energy ? `${w.energy}/5` : '—' },
        { label: 'Sleep quality', value: w?.sleepQuality ? `${w.sleepQuality}/5` : '—' },
        { label: 'Sleep', value: w?.sleepHours ? `${labelOf(SLEEP_HOURS, w.sleepHours)} hours` : '—' },
      ],
    },
    {
      stepId: 'schedule',
      title: 'Schedule',
      rows: [
        {
          label: 'Availability',
          value: d.availability
            ? `${labelOf(AVAILABILITY, d.availability)} · ${AVAILABILITY.find((a) => a.id === d.availability)?.description}`
            : '—',
        },
      ],
    },
    {
      stepId: 'session',
      title: 'Session length',
      rows: [
        {
          label: 'Time per session',
          value: d.sessionLength
            ? (SESSION_LENGTHS.find((s) => s.id === d.sessionLength)?.description.split(' · ')[0] ?? '')
            : '—',
        },
      ],
    },
    {
      stepId: 'equipment',
      title: 'Equipment',
      rows: [
        { label: 'Access', value: labelOf(EQUIPMENT_ACCESS, d.equipment?.access) || '—' },
        ...(d.equipment?.access === 'limited'
          ? [
              { label: 'Items', value: list(EQUIPMENT_ITEMS, d.equipment.items) },
              ...(d.equipment.maxDumbbellKg
                ? [{ label: 'Heaviest dumbbell', value: formatWeight(d.equipment.maxDumbbellKg, units.weight) }]
                : []),
            ]
          : []),
      ],
    },
  ];
}
