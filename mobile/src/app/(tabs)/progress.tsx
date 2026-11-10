import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/screen';
import { AppText, Badge, Button, Callout } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { getExercise } from '@/features/planner/exercises';
import { usePlanStore } from '@/features/planner/store';
import { useProfileStore } from '@/features/profile/store';
import { fmtTarget } from '@/features/tracker/format';
import { currentWeek, findLog, insights, liftingDays, logsForPlan } from '@/features/tracker/sessions';
import { useTrackerStore } from '@/features/tracker/store';

export default function Progress() {
  const plan = usePlanStore((s) => s.plan);
  const profile = useProfileStore((s) => s.profile);
  const logs = useTrackerStore((s) => s.logs);
  const settings = useTrackerStore((s) => s.settings);
  const addDeloadWeek = useTrackerStore((s) => s.addDeloadWeek);
  if (!plan || !profile)
    return (
      <Screen inTab>
        <AppText variant="title" style={{ marginBottom: Spacing.sm }}>
          Progress
        </AppText>
        <AppText tone="secondary">Build a plan and log your first workout to see progress here.</AppText>
      </Screen>
    );

  const unit = profile.units.weight;
  const week = currentWeek(plan, logs);
  const mine = logsForPlan(logs, plan.id);
  const days = liftingDays(plan);
  const doneThisWeek = days.filter((d) => findLog(mine, plan.id, week, d.id)?.completedAt).length;
  const totalDone = mine.filter((l) => l.completedAt).length;
  const setsThisWeek = mine
    .filter((l) => l.week === week)
    .flatMap((l) => l.entries.flatMap((e) => e.sets))
    .filter((s) => s.reps).length;
  const { exercises, deload } = insights(plan, logs, settings, unit);
  const stalled = exercises.filter((e) => e.suggestion.stalled);
  const readyToAdd = exercises.filter((e) => e.suggestion.reason === 'add_weight');

  const tiles = [
    { label: `Week ${week}`, value: `${doneThisWeek}/${days.length}`, sub: 'workouts done' },
    { label: 'This week', value: String(setsThisWeek), sub: 'sets logged' },
    { label: 'All time', value: String(totalDone), sub: 'workouts' },
  ];

  return (
    <Screen inTab>
      <AppText variant="title" style={{ marginBottom: Spacing.lg }}>
        Progress
      </AppText>

      <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.xl }}>
        {tiles.map((t) => (
          <View key={t.label} style={styles.tile}>
            <AppText variant="small" tone="secondary">
              {t.label}
            </AppText>
            <AppText variant="title">{t.value}</AppText>
            <AppText variant="small" tone="muted">
              {t.sub}
            </AppText>
          </View>
        ))}
      </View>

      <AppText variant="label" style={{ marginBottom: Spacing.sm }}>
        Suggestions for next week
      </AppText>
      <View style={{ gap: Spacing.sm, marginBottom: Spacing.xl }}>
        {deload ? (
          <Callout tone="warning">
            <AppText variant="label">Take a deload in week {deload.week}</AppText>
            <AppText variant="small" tone="secondary">
              {deload.reason} About half the sets and a little lighter for one week, then back to progressing.
            </AppText>
            <Button label={`Make week ${deload.week} a deload`} variant="secondary" onPress={() => addDeloadWeek(plan.id, deload.week)} />
          </Callout>
        ) : null}
        {readyToAdd.length ? (
          <Callout tone="info">
            <AppText variant="label">Ready to add weight</AppText>
            <AppText variant="small" tone="secondary">
              {readyToAdd.map((e) => getExercise(e.exerciseId).name).join(', ')}
            </AppText>
          </Callout>
        ) : null}
        {stalled.length && !deload ? (
          <Callout tone="warning">
            <AppText variant="label">Stalled</AppText>
            <AppText variant="small" tone="secondary">
              {stalled.map((e) => getExercise(e.exerciseId).name).join(', ')} — hold the weight and focus on form, drop
              ~10% and build back, or swap to a similar exercise in your plan.
            </AppText>
          </Callout>
        ) : null}
        {!deload && !readyToAdd.length && !stalled.length ? (
          <AppText variant="small" tone="muted">
            {totalDone || exercises.some((e) => e.sessions)
              ? 'Keep going — beat last time by a rep.'
              : 'Log your first workout to see suggestions here.'}
          </AppText>
        ) : null}
      </View>

      <AppText variant="label" style={{ marginBottom: Spacing.sm }}>
        Exercises
      </AppText>
      <View style={{ gap: Spacing.sm }}>
        {exercises.map((e) => {
          const ex = getExercise(e.exerciseId);
          const status = !e.sessions ? 'New' : e.suggestion.stalled ? 'Stalled' : 'Progressing';
          return (
            <Pressable
              key={e.exerciseId}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/track/exercise/[exerciseId]', params: { exerciseId: e.exerciseId } })}
              style={({ pressed }) => [styles.row, pressed && { backgroundColor: Colors.surfaceRaised }]}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="label">{ex.name}</AppText>
                <AppText variant="small" tone="secondary">
                  {e.sessions
                    ? `Next: ${fmtTarget(e.suggestion.weight, e.suggestion.reps, unit, ex.timed)}`
                    : `Not logged yet · ${e.pe.repMin}–${e.pe.repMax} reps`}
                </AppText>
              </View>
              <Badge label={status} tone={status === 'Stalled' ? 'warning' : status === 'New' ? 'muted' : 'progress'} />
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = {
  tile: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.surface,
    gap: 2,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
};
