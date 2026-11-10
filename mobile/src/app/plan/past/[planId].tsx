import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { goBack } from '@/components/navigation';
import { Screen } from '@/components/screen';
import { AppText, Badge, Button, Callout, Card } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { getExercise } from '@/features/planner/exercises';
import { MUSCLES, MUSCLE_LABELS } from '@/features/planner/muscles';
import { usePlanStore } from '@/features/planner/store';
import { fmtDate } from '@/features/tracker/format';
import { useTrackerStore } from '@/features/tracker/store';

/** Read-only view of a past plan, with a confirmed switch back to it. */
export default function PastPlan() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const history = usePlanStore((s) => s.history);
  const restore = usePlanStore((s) => s.restore);
  const logs = useTrackerStore((s) => s.logs);
  const [confirming, setConfirming] = useState(false);

  const past = history.find((p) => p.id === planId);
  if (!past) return <Redirect href="/plan" />;

  const lifting = past.days.filter((d) => d.type !== 'recovery');
  const workouts = logs.filter((l) => l.planId === past.id && l.completedAt).length;
  const priorities = MUSCLES.filter((m) => past.volume[m].tier === 'priority');

  return (
    <Screen
      footer={
        confirming ? (
          <View style={{ gap: Spacing.sm }}>
            <Callout tone="warning">
              <AppText variant="label">Switch to this plan?</AppText>
              <AppText variant="small" tone="secondary">
                Your current plan moves to Past plans, so you can switch back to it later. Workout progress for each
                plan is kept.
              </AppText>
            </Callout>
            <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
              <Button label="Cancel" variant="secondary" onPress={() => setConfirming(false)} style={{ flex: 1 }} />
              <Button
                label="Yes, switch"
                onPress={() => {
                  restore(past.id);
                  router.dismissTo('/plan');
                }}
                style={{ flex: 2 }}
              />
            </View>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Back" variant="secondary" onPress={() => goBack('/plan')} style={{ flex: 1 }} />
            <Button label="Switch to this plan" onPress={() => setConfirming(true)} style={{ flex: 2 }} />
          </View>
        )
      }>
      <View style={{ gap: Spacing.xs, marginBottom: Spacing.xl }}>
        <AppText variant="small" tone="secondary">
          Past plan · built {fmtDate(past.createdAt)}
          {past.archivedAt ? ` · replaced ${fmtDate(past.archivedAt)}` : ''}
        </AppText>
        <AppText variant="title">
          {past.settings.style === 'efficient' ? 'Efficient' : 'Full volume'} · {lifting.length} days/week
        </AppText>
        <AppText tone="secondary">
          {workouts} workout{workouts === 1 ? '' : 's'} logged on this plan
        </AppText>
      </View>

      {priorities.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.lg }}>
          {priorities.map((m) => (
            <Badge key={m} label={`Priority: ${MUSCLE_LABELS[m]}`} tone="progress" />
          ))}
        </View>
      ) : null}

      <View style={{ gap: Spacing.md }}>
        {past.days.map((d) => (
          <Card key={d.id} style={{ gap: Spacing.xs }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="label">{d.label}</AppText>
              {d.type !== 'recovery' ? (
                <AppText variant="small" tone="muted">
                  ~{d.estMinutes} min
                </AppText>
              ) : null}
            </View>
            {d.exercises.map((pe) => (
              <View
                key={pe.id}
                style={{ flexDirection: 'row', gap: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.xs }}>
                <AppText variant="small" style={{ flex: 1 }}>
                  {getExercise(pe.exerciseId).name}
                </AppText>
                <AppText variant="small" tone="secondary">
                  {pe.sets} × {pe.repMin}–{pe.repMax}
                </AppText>
              </View>
            ))}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
