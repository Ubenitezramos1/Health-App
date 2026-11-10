import { Redirect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { goBack } from '@/components/navigation';
import { Screen } from '@/components/screen';
import { AppText, Button, Section } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { swapExercise } from '@/features/planner/edits';
import { alternativesFor, selectionContext } from '@/features/planner/engine';
import { ExerciseList } from '@/features/planner/exercise-list';
import { getExercise } from '@/features/planner/exercises';
import { usePlanStore } from '@/features/planner/store';
import { useProfileStore } from '@/features/profile/store';

export default function SwapExercise() {
  const { dayId, exId } = useLocalSearchParams<{ dayId: string; exId: string }>();
  const plan = usePlanStore((s) => s.plan);
  const save = usePlanStore((s) => s.save);
  const profile = useProfileStore((s) => s.profile);

  const pe = plan?.days.find((d) => d.id === dayId)?.exercises.find((x) => x.id === exId);
  if (!plan || !profile || !pe) return <Redirect href="/plan" />;

  const current = getExercise(pe.exerciseId);
  const { sameMovement, sameMuscle } = alternativesFor(pe.exerciseId, selectionContext(profile, plan.settings, null));
  const pick = (id: string) => {
    save(swapExercise(plan, dayId, exId, id));
    goBack({ pathname: '/plan/day/[dayId]', params: { dayId } });
  };

  return (
    <Screen footer={<Button label="Cancel" variant="secondary" onPress={() => goBack({ pathname: '/plan/day/[dayId]', params: { dayId } })} />}>
      <View style={{ gap: Spacing.xs, marginBottom: Spacing.xl }}>
        <AppText variant="title">Swap exercise</AppText>
        <AppText tone="secondary">
          Replacing {current.name}. Sets and reps stay the same. Only options that fit your equipment and
          injuries are shown.
        </AppText>
      </View>
      <Section title="Same movement" hint="Closest match — your progress carries over best.">
        {sameMovement.length ? (
          <ExerciseList exercises={sameMovement} onPick={(e) => pick(e.id)} />
        ) : (
          <AppText variant="small" tone="muted">
            No other options with your equipment.
          </AppText>
        )}
      </Section>
      {sameMuscle.length ? (
        <Section title="Other exercises for the same muscle">
          <ExerciseList exercises={sameMuscle} onPick={(e) => pick(e.id)} />
        </Section>
      ) : null}
    </Screen>
  );
}
