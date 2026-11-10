import { Pressable, View } from 'react-native';

import { AppText, Badge } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { EQUIPMENT_ITEMS, labelOf } from '@/features/profile/options';

import type { Exercise } from './exercises';

const equipmentLabel = (e: Exercise) =>
  e.equipment.length === 0
    ? 'Bodyweight'
    : e.equipment
        .map((req) =>
          (Array.isArray(req) ? req : [req]).map((r) => (r === 'machine' ? 'Machine' : labelOf(EQUIPMENT_ITEMS, r))).join(' or '),
        )
        .join(' + ');

/** Tappable exercise list used by the swap and add screens. */
export function ExerciseList({ exercises, onPick }: { exercises: Exercise[]; onPick: (e: Exercise) => void }) {
  return (
    <View style={{ gap: Spacing.sm }}>
      {exercises.map((e) => (
        <Pressable
          key={e.id}
          accessibilityRole="button"
          onPress={() => onPick(e)}
          style={({ pressed }) => ({
            padding: Spacing.lg,
            borderRadius: Radius.md,
            borderWidth: 1,
            borderColor: Colors.border,
            backgroundColor: pressed ? Colors.surfaceRaised : Colors.surface,
            gap: Spacing.xs,
          })}>
          <AppText variant="label">{e.name}</AppText>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, alignItems: 'center' }}>
            <AppText variant="small" tone="muted">
              {equipmentLabel(e)}
            </AppText>
            {e.lengthened ? <Badge label="Long-length" tone="progress" /> : null}
            {e.unilateral ? <Badge label="One side at a time" tone="muted" /> : null}
            {e.level >= 2 ? <Badge label={e.level === 3 ? 'Advanced' : 'Needs practice'} tone="warning" /> : null}
          </View>
        </Pressable>
      ))}
    </View>
  );
}
