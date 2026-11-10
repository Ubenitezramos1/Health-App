import { Redirect, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { LineChart } from '@/components/line-chart';
import { goBack } from '@/components/navigation';
import { Screen } from '@/components/screen';
import { AppText, Button, Card } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { getExercise } from '@/features/planner/exercises';
import { useProfileStore } from '@/features/profile/store';
import { fmtDate, fmtNum, fmtSets } from '@/features/tracker/format';
import { convertWeight, estimated1RM } from '@/features/tracker/progression';
import { useTrackerStore } from '@/features/tracker/store';

export default function ExerciseHistory() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const logs = useTrackerStore((s) => s.logs);
  const profile = useProfileStore((s) => s.profile);
  if (!profile) return <Redirect href="/" />;

  const unit = profile.units.weight;
  const exercise = getExercise(exerciseId);
  const usesWeight = !['bodyweight', 'band'].includes(exercise.load);

  // One row per session that has at least one completed set.
  const sessions = logs
    .flatMap((l) =>
      l.entries
        .filter((e) => e.exerciseId === exerciseId && e.sets.some((s) => s.reps))
        .map((e) => ({ log: l, sets: e.sets.filter((s) => s.reps) })),
    )
    .sort((a, b) => a.log.startedAt.localeCompare(b.log.startedAt));

  // Weighted lifts chart estimated 1RM (combines weight and reps); bodyweight charts total reps.
  const points = sessions.map(({ log, sets }) => {
    const best = sets.reduce(
      (acc, s) => {
        const w = s.weight === null ? 0 : convertWeight(s.weight, s.unit, unit);
        const score = usesWeight ? estimated1RM(w, s.reps ?? 0) : (s.reps ?? 0);
        return score > acc.score ? { score, w, reps: s.reps ?? 0 } : acc;
      },
      { score: 0, w: 0, reps: 0 },
    );
    return {
      label: fmtDate(log.startedAt),
      value: usesWeight ? best.score : sets.reduce((n, s) => n + (s.reps ?? 0), 0),
      detail: usesWeight ? `best set ${fmtNum(best.w)} ${unit} × ${best.reps}` : `${sets.length} sets`,
    };
  });

  return (
    <Screen footer={<Button label="Back" variant="secondary" onPress={() => goBack('/progress')} />}>
      <View style={{ gap: Spacing.xs, marginBottom: Spacing.xl }}>
        <AppText variant="title">{exercise.name}</AppText>
        <AppText tone="secondary">
          {usesWeight
            ? 'Estimated 1-rep max per session — rises whether you add reps or weight.'
            : 'Total reps per session.'}
        </AppText>
      </View>

      {points.length ? (
        <Card style={{ marginBottom: Spacing.xl }}>
          {points.length >= 2 ? (
            <LineChart points={points} unitLabel={usesWeight ? `${unit} est. 1RM` : 'reps'} />
          ) : (
            <AppText variant="small" tone="muted">
              Log one more session to see a trend.
            </AppText>
          )}
        </Card>
      ) : (
        <AppText tone="muted">No sessions logged for this exercise yet.</AppText>
      )}

      {sessions.length ? (
        <>
          <AppText variant="label" style={{ marginBottom: Spacing.sm }}>
            History
          </AppText>
          <View>
            {[...sessions].reverse().map(({ log, sets }) => (
              <View
                key={log.id}
                style={{ flexDirection: 'row', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border }}>
                <AppText variant="small" tone="secondary" style={{ width: 92 }}>
                  {fmtDate(log.startedAt)} · W{log.week}
                </AppText>
                <AppText variant="small" style={{ flex: 1 }}>
                  {fmtSets(sets, unit)}
                  {log.deload ? ' (deload)' : ''}
                </AppText>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
