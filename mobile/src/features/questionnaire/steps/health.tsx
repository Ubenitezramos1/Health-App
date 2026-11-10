import { View } from 'react-native';

import {
  AppText,
  Callout,
  Card,
  ChipGroup,
  FieldError,
  RatingScale,
  Section,
  Segmented,
  TextField,
} from '@/components/ui';
import { Spacing } from '@/constants/theme';
import {
  CONDITIONS,
  INJURY_AREAS,
  INJURY_SEVERITY,
  INJURY_SIDES,
  INJURY_STATUS,
  type InjuryArea,
  SIDED_INJURY_AREAS,
  SLEEP_HOURS,
  labelOf,
} from '@/features/profile/options';
import { type Injury, needsMedicalClearance } from '@/features/profile/schema';

import type { StepProps } from '../types';

/* ---------- Injuries & conditions ---------- */

export function HealthStep({ draft, update, errors }: StepProps) {
  const injuries = draft.injuries ?? [];
  const areas = injuries.map((i) => i.area);

  const setAreas = (next: InjuryArea[]) => {
    const kept = injuries.filter((i) => next.includes(i.area));
    const added: Injury[] = next
      .filter((a) => !areas.includes(a))
      .map((area) => ({
        area,
        status: 'current',
        severity: 'mild',
        ...((SIDED_INJURY_AREAS as readonly string[]).includes(area) ? { side: 'right' as const } : {}),
      }));
    update({ injuries: [...kept, ...added] });
  };

  const patchInjury = (area: InjuryArea, patch: Partial<Injury>) =>
    update({ injuries: injuries.map((i) => (i.area === area ? { ...i, ...patch } : i)) });

  return (
    <View>
      <Section title="Any injuries?" hint="Current or past. Skip if none.">
        <ChipGroup options={INJURY_AREAS} value={areas} onChange={setAreas} />
      </Section>

      {injuries.map((injury) => (
        <Card key={injury.area} style={{ marginBottom: Spacing.md, gap: Spacing.sm }}>
          <AppText variant="label">{labelOf(INJURY_AREAS, injury.area)}</AppText>
          {injury.side ? (
            <>
              <AppText variant="small" tone="secondary">
                Side
              </AppText>
              <Segmented
                options={INJURY_SIDES}
                value={injury.side}
                onChange={(side) => patchInjury(injury.area, { side })}
              />
            </>
          ) : null}
          <AppText variant="small" tone="secondary">
            Is it current or in the past?
          </AppText>
          <Segmented
            options={INJURY_STATUS}
            value={injury.status}
            onChange={(status) => patchInjury(injury.area, { status })}
          />
          <AppText variant="small" tone="secondary">
            How bad is it?
          </AppText>
          <Segmented
            options={INJURY_SEVERITY}
            value={injury.severity}
            onChange={(severity) => patchInjury(injury.area, { severity })}
          />
        </Card>
      ))}

      <Section title="Health conditions" hint="Select any that apply. Skip if none.">
        <ChipGroup
          options={CONDITIONS}
          value={draft.conditions ?? []}
          onChange={(conditions) => update({ conditions })}
        />
        <TextField
          placeholder="Other condition"
          value={draft.conditionsOther ?? ''}
          onChangeText={(conditionsOther) => update({ conditionsOther })}
          maxLength={120}
        />
        <FieldError message={errors.conditionsOther} />
      </Section>

      {needsMedicalClearance(draft) ? (
        <Callout tone="warning">
          <AppText variant="label">Check with your doctor first</AppText>
          <AppText variant="small" tone="secondary">
            Based on your answers, get medical clearance before starting. Your plan will stick to
            lower-risk options until you confirm you&apos;re cleared.
          </AppText>
        </Callout>
      ) : null}
    </View>
  );
}

/* ---------- Mood, energy, sleep ---------- */

export function WellbeingStep({ draft, update, errors }: StepProps) {
  const w = draft.wellbeing ?? ({} as Partial<NonNullable<typeof draft.wellbeing>>);
  const set = (patch: Partial<NonNullable<typeof draft.wellbeing>>) =>
    update({ wellbeing: { ...w, ...patch } as NonNullable<typeof draft.wellbeing> });
  const missing = errors.wellbeing ?? errors['wellbeing.mood'] ?? errors['wellbeing.energy'] ??
    errors['wellbeing.sleepQuality'] ?? errors['wellbeing.sleepHours'];

  return (
    <View>
      <Section title="How's your mood lately?">
        <RatingScale
          accessibilityLabel="Mood"
          value={w.mood}
          onChange={(mood) => set({ mood })}
          lowLabel="Low"
          highLabel="Great"
        />
      </Section>
      <Section title="Your daily energy level">
        <RatingScale
          accessibilityLabel="Energy"
          value={w.energy}
          onChange={(energy) => set({ energy })}
          lowLabel="Drained"
          highLabel="Energized"
        />
      </Section>
      <Section title="Your sleep quality">
        <RatingScale
          accessibilityLabel="Sleep quality"
          value={w.sleepQuality}
          onChange={(sleepQuality) => set({ sleepQuality })}
          lowLabel="Poor"
          highLabel="Excellent"
        />
      </Section>
      <Section title="Hours of sleep on a typical night">
        <ChipGroupSingle value={w.sleepHours} onChange={(sleepHours) => set({ sleepHours })} />
      </Section>
      <FieldError message={missing ? 'Answer each question' : undefined} />
    </View>
  );
}

/** Sleep hours read better as chips than cards; single-select variant of ChipGroup. */
function ChipGroupSingle({
  value,
  onChange,
}: {
  value: (typeof SLEEP_HOURS)[number]['id'] | undefined;
  onChange: (v: (typeof SLEEP_HOURS)[number]['id']) => void;
}) {
  return (
    <ChipGroup
      options={SLEEP_HOURS}
      value={value ? [value] : []}
      onChange={(next) => {
        const picked = next.find((v) => v !== value);
        if (picked) onChange(picked);
      }}
    />
  );
}
