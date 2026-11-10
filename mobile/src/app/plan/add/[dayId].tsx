import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { goBack } from '@/components/navigation';
import { Screen } from '@/components/screen';
import { AppText, Button, Chip, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { addExercise } from '@/features/planner/edits';
import { isAllowed, selectionContext } from '@/features/planner/engine';
import { ExerciseList } from '@/features/planner/exercise-list';
import { EXERCISES, primaryMuscle } from '@/features/planner/exercises';
import { MUSCLES, MUSCLE_LABELS, type Muscle } from '@/features/planner/muscles';
import { usePlanStore } from '@/features/planner/store';
import { useProfileStore } from '@/features/profile/store';

export default function AddExercise() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const plan = usePlanStore((s) => s.plan);
  const save = usePlanStore((s) => s.save);
  const profile = useProfileStore((s) => s.profile);
  const [query, setQuery] = useState('');
  const [muscle, setMuscle] = useState<Muscle | null>(null);

  const day = plan?.days.find((d) => d.id === dayId);
  if (!plan || !profile || !day) return <Redirect href="/plan" />;

  const ctx = selectionContext(profile, plan.settings, null);
  const inDay = new Set(day.exercises.map((x) => x.exerciseId));
  const q = query.trim().toLowerCase();
  const options = EXERCISES.filter(
    (e) =>
      isAllowed(e, ctx) &&
      !inDay.has(e.id) &&
      (!muscle || primaryMuscle(e) === muscle) &&
      (!q || e.name.toLowerCase().includes(q)),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Screen footer={<Button label="Cancel" variant="secondary" onPress={() => goBack({ pathname: '/plan/day/[dayId]', params: { dayId } })} />}>
      <View style={{ gap: Spacing.md, marginBottom: Spacing.xl }}>
        <AppText variant="title">Add to {day.label}</AppText>
        <TextField placeholder="Search exercises" value={query} onChangeText={setQuery} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
          {MUSCLES.map((m) => (
            <Chip key={m} label={MUSCLE_LABELS[m]} selected={muscle === m} onPress={() => setMuscle(muscle === m ? null : m)} />
          ))}
        </View>
      </View>
      {options.length ? (
        <ExerciseList
          exercises={options}
          onPick={(e) => {
            save(addExercise(plan, day.id, e.id, profile.primaryGoal));
            goBack({ pathname: '/plan/day/[dayId]', params: { dayId } });
          }}
        />
      ) : (
        <AppText tone="muted">No matches with your equipment.</AppText>
      )}
    </Screen>
  );
}
