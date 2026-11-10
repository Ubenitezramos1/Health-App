import { useState } from 'react';
import { View } from 'react-native';

import { ChipGroup, FieldError, NumberField, OptionCards, Section } from '@/components/ui';
import {
  AVAILABILITY,
  EQUIPMENT_ACCESS,
  EQUIPMENT_ITEMS,
  type EquipmentAccess,
  SESSION_LENGTHS,
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

  return (
    <View>
      <Section title="What can you train with?">
        <OptionCards
          options={EQUIPMENT_ACCESS}
          value={equipment.access}
          onChange={(access: EquipmentAccess) => set({ access, items: access === 'limited' ? equipment.items : [] })}
        />
        <FieldError message={errors['equipment.access'] ?? errors.equipment} />
      </Section>

      {equipment.access === 'limited' ? (
        <Section title="What do you have?" hint="Select all that apply.">
          <ChipGroup options={EQUIPMENT_ITEMS} value={equipment.items} onChange={(items) => set({ items })} />
          <FieldError message={errors['equipment.items']} />
          {equipment.items.includes('dumbbells') ? (
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
    </View>
  );
}
