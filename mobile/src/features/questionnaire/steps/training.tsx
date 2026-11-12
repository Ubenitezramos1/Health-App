import { useState } from 'react';
import { View } from 'react-native';

import { AppText, ChipGroup, FieldError, NumberField, OptionCards, Section, TextField } from '@/components/ui';
import { recognizeEquipment } from '@/features/profile/equipment-text';
import {
  AVAILABILITY,
  EQUIPMENT_ACCESS,
  EQUIPMENT_ITEMS,
  type EquipmentAccess,
  type EquipmentItem,
  GEAR_ITEMS,
  HOUSEHOLD_ITEMS,
  SESSION_LENGTHS,
  labelOf,
} from '@/features/profile/options';
import { kgToLb, lbToKg, round } from '@/features/profile/units';

import type { StepProps } from '../types';

export function AvailabilityStep({ draft, update, errors }: StepProps) {
  return (
    <View>
      <OptionCards options={AVAILABILITY} value={draft.availability} onChange={(availability) => update({ availability })} />
      <FieldError message={errors.availability} />
    </View>
  );
}

export function SessionStep({ draft, update, errors }: StepProps) {
  return (
    <View>
      <OptionCards
        options={SESSION_LENGTHS}
        value={draft.sessionLength}
        onChange={(sessionLength) => update({ sessionLength })}
      />
      <FieldError message={errors.sessionLength} />
    </View>
  );
}

export function EquipmentStep({ draft, update, errors }: StepProps) {
  type Equipment = NonNullable<typeof draft.equipment>;
  const equipment: Partial<Equipment> & Pick<Equipment, 'items'> = draft.equipment ?? { items: [] };
  const weightUnit = draft.units?.weight ?? 'lb';
  const [maxDb, setMaxDb] = useState<number | undefined>(
    equipment.maxDumbbellKg === undefined
      ? undefined
      : weightUnit === 'kg'
        ? round(equipment.maxDumbbellKg, 1)
        : round(kgToLb(equipment.maxDumbbellKg)),
  );

  // Draft may hold a partially answered equipment object; the step schema enforces completeness.
  const set = (patch: Partial<Equipment>) => update({ equipment: { ...equipment, ...patch } as Equipment });

  const gearIds = GEAR_ITEMS.map((g) => g.id) as EquipmentItem[];
  const householdIds = HOUSEHOLD_ITEMS.map((h) => h.id) as EquipmentItem[];
  const gear = equipment.items.filter((i) => gearIds.includes(i));
  const household = equipment.items.filter((i) => householdIds.includes(i));
  const recognized = recognizeEquipment(equipment.other).filter((i) => !equipment.items.includes(i));
  const homeSetup = equipment.access === 'none' || equipment.access === 'limited';

  const changeAccess = (access: EquipmentAccess) =>
    set({
      access,
      // Everyday items carry over between "none" and "some"; gear only applies to "some"; a full gym needs neither.
      items: access === 'full' ? [] : access === 'none' ? household : equipment.items,
      other: access === 'full' ? undefined : equipment.other,
    });

  return (
    <View>
      <Section title="What can you train with?">
        <OptionCards options={EQUIPMENT_ACCESS} value={equipment.access} onChange={changeAccess} />
        <FieldError message={errors['equipment.access'] ?? errors.equipment} />
      </Section>

      {equipment.access === 'limited' ? (
        <Section title="What equipment do you have?" hint="Select all that apply.">
          <ChipGroup options={GEAR_ITEMS} value={gear} onChange={(g) => set({ items: [...g, ...household] })} />
          {gear.includes('dumbbells') ? (
            <NumberField
              label="Heaviest dumbbell (optional)"
              suffix={weightUnit}
              decimals
              value={maxDb}
              onChange={(v) => {
                setMaxDb(v);
                set({ maxDumbbellKg: v === undefined ? undefined : weightUnit === 'kg' ? v : lbToKg(v) });
              }}
            />
          ) : null}
        </Section>
      ) : null}

      {homeSetup ? (
        <Section
          title="Everyday items you can use"
          hint="Optional. Each one unlocks more exercises — a loaded backpack works for curls, raises, rows and squats.">
          <ChipGroup options={HOUSEHOLD_ITEMS} value={household} onChange={(h) => set({ items: [...gear, ...h] })} />
        </Section>
      ) : null}

      {homeSetup ? (
        <Section title="Anything else?" hint="Type any other equipment you have, separated by commas.">
          <TextField
            placeholder="TRX, EZ bar, plyo box"
            value={equipment.other ?? ''}
            onChangeText={(other) => set({ other })}
            maxLength={120}
          />
          {recognized.length ? (
            <AppText variant="small" tone="secondary">
              Recognized: {recognized.map((r) => labelOf(EQUIPMENT_ITEMS, r)).join(', ')} — your plan will use{' '}
              {recognized.length > 1 ? 'these' : 'it'}. Anything else you typed is saved to your profile.
            </AppText>
          ) : equipment.other?.trim() ? (
            <AppText variant="small" tone="muted">
              Saved to your profile. The app doesn&apos;t have exercises for this yet, but you can add any exercise to
              your plan by hand.
            </AppText>
          ) : null}
          <FieldError message={errors['equipment.other'] ?? errors['equipment.items']} />
        </Section>
      ) : null}
    </View>
  );
}
