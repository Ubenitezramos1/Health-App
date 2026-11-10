import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  AppText,
  ChipGroup,
  Callout,
  DigitsField,
  FieldError,
  NumberField,
  OptionCards,
  Section,
  Segmented,
  TextField,
} from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { ACTIVITIES, ACTIVITY_LEVELS, EXPERIENCE_LEVELS, SEX_OPTIONS } from '@/features/profile/options';
import {
  ageFromDob,
  cmToFeetInches,
  feetInchesToCm,
  kgToLb,
  lbToKg,
  round,
  toIsoDate,
} from '@/features/profile/units';

import type { StepProps } from '../types';

const WEIGHT_UNITS = [
  { id: 'lb', label: 'lb' },
  { id: 'kg', label: 'kg' },
] as const;

const LENGTH_UNITS = [
  { id: 'imperial', label: 'ft / in' },
  { id: 'metric', label: 'cm' },
] as const;

/* ---------- Welcome: age gate, disclaimer, units ---------- */

export function WelcomeStep({ draft, update, errors }: StepProps) {
  // Kept as typed text (not numbers) so "07" stays "07" instead of collapsing to "7".
  const initial = draft.dob?.split('-') ?? [];
  const [year, setYear] = useState(initial[0] ?? '');
  const [month, setMonth] = useState(initial[1] ?? '');
  const [day, setDay] = useState(initial[2] ?? '');

  const setDob = (y: string, m: string, d: string) => {
    const [yn, mn, dn] = [Number(y), Number(m), Number(d)];
    update({ dob: y.length === 4 && mn && dn ? toIsoDate(yn, mn, dn) : '' });
  };

  const age = draft.dob ? ageFromDob(draft.dob) : null;
  const units = draft.units ?? { weight: 'lb', length: 'imperial' };
  const accepted = draft.disclaimerAccepted === true;

  return (
    <View>
      <Section title="Date of birth" hint="You need to be 18 or older to use this app.">
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <DigitsField
            label="Month"
            placeholder="MM"
            maxLength={2}
            value={month}
            onChange={(v) => {
              setMonth(v);
              setDob(year, v, day);
            }}
          />
          <DigitsField
            label="Day"
            placeholder="DD"
            maxLength={2}
            value={day}
            onChange={(v) => {
              setDay(v);
              setDob(year, month, v);
            }}
          />
          <DigitsField
            label="Year"
            placeholder="YYYY"
            maxLength={4}
            value={year}
            onChange={(v) => {
              setYear(v);
              setDob(v, month, day);
            }}
          />
        </View>
        {age !== null && age >= 0 && !errors.dob ? (
          <AppText variant="small" tone="secondary">
            Age: {age}
          </AppText>
        ) : null}
        <FieldError message={errors.dob} />
      </Section>

      <Section title="Units">
        <Segmented
          options={WEIGHT_UNITS}
          value={units.weight}
          onChange={(weight) => update({ units: { ...units, weight } })}
        />
        <Segmented
          options={LENGTH_UNITS}
          value={units.length}
          onChange={(length) => update({ units: { ...units, length } })}
        />
      </Section>

      <Section title="Health disclaimer">
        <Callout tone="info">
          <AppText variant="small" tone="secondary">
            This app gives general fitness guidance, not medical advice. Physique scans are estimates.
            Talk to a doctor before starting a new exercise program, especially if you have an injury,
            a health condition, or are pregnant. Stop any exercise that causes pain, dizziness, or
            shortness of breath.
          </AppText>
        </Callout>
        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          onPress={() => update({ disclaimerAccepted: accepted ? undefined : true })}
          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm }}>
          <View
            style={{
              width: 24,
              height: 24,
              borderRadius: Radius.sm - 2,
              borderWidth: 2,
              borderColor: accepted ? Colors.accent : Colors.borderStrong,
              backgroundColor: accepted ? Colors.accent : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
            {accepted ? <AppText style={{ color: Colors.onAccent, fontWeight: '700' }}>✓</AppText> : null}
          </View>
          <AppText style={{ flex: 1 }}>I understand and accept</AppText>
        </Pressable>
        <FieldError message={errors.disclaimerAccepted} />
      </Section>
    </View>
  );
}

/* ---------- Basics: height, weight, sex ---------- */

export function BasicsStep({ draft, update, errors }: StepProps) {
  const units = draft.units ?? { weight: 'lb', length: 'imperial' };
  const fi = draft.heightCm ? cmToFeetInches(draft.heightCm) : undefined;
  const [feet, setFeet] = useState<number | undefined>(fi?.feet);
  const [inches, setInches] = useState<number | undefined>(fi?.inches);
  const [cm, setCm] = useState<number | undefined>(draft.heightCm ? round(draft.heightCm) : undefined);
  const [weight, setWeight] = useState<number | undefined>(
    draft.weightKg === undefined ? undefined : units.weight === 'kg' ? round(draft.weightKg, 1) : round(kgToLb(draft.weightKg)),
  );

  const setImperialHeight = (f?: number, i?: number) =>
    update({ heightCm: f === undefined ? undefined : feetInchesToCm(f, i ?? 0) });

  return (
    <View>
      <Section title="Height">
        {units.length === 'imperial' ? (
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <NumberField
              label="Feet"
              suffix="ft"
              value={feet}
              onChange={(v) => {
                setFeet(v);
                setImperialHeight(v, inches);
              }}
            />
            <NumberField
              label="Inches"
              suffix="in"
              value={inches}
              onChange={(v) => {
                setInches(v);
                setImperialHeight(feet, v);
              }}
            />
          </View>
        ) : (
          <NumberField
            label="Centimeters"
            suffix="cm"
            value={cm}
            onChange={(v) => {
              setCm(v);
              update({ heightCm: v });
            }}
          />
        )}
        <FieldError message={errors.heightCm} />
      </Section>

      <Section title="Weight">
        <NumberField
          label={units.weight === 'kg' ? 'Kilograms' : 'Pounds'}
          suffix={units.weight}
          decimals
          value={weight}
          onChange={(v) => {
            setWeight(v);
            update({ weightKg: v === undefined ? undefined : units.weight === 'kg' ? v : lbToKg(v) });
          }}
        />
        <FieldError message={errors.weightKg} />
      </Section>

      <Section title="Sex" hint="Used for training and body-composition estimates.">
        <Segmented options={SEX_OPTIONS} value={draft.sex} onChange={(sex) => update({ sex })} />
        <FieldError message={errors.sex} />
      </Section>
    </View>
  );
}

/* ---------- Activity & experience ---------- */

export function ActivityStep({ draft, update, errors }: StepProps) {
  return (
    <View>
      <Section title="How active are you day to day?">
        <OptionCards
          options={ACTIVITY_LEVELS}
          value={draft.activityLevel}
          onChange={(activityLevel) => update({ activityLevel })}
        />
        <FieldError message={errors.activityLevel} />
      </Section>

      <Section title="What do you currently do?" hint="Select all that apply.">
        <ChipGroup
          options={ACTIVITIES}
          value={draft.activities ?? []}
          onChange={(activities) => update({ activities })}
        />
        <TextField
          placeholder="Other activities"
          value={draft.activitiesOther ?? ''}
          onChangeText={(activitiesOther) => update({ activitiesOther })}
          maxLength={120}
        />
        <FieldError message={errors.activitiesOther} />
      </Section>

      <Section title="Strength training experience" hint="Sets your starting volume and progression.">
        <OptionCards
          options={EXPERIENCE_LEVELS}
          value={draft.experience}
          onChange={(experience) => update({ experience })}
        />
        <FieldError message={errors.experience} />
      </Section>
    </View>
  );
}
