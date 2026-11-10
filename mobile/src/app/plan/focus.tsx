import { Redirect } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { goBack } from '@/components/navigation';
import { Screen } from '@/components/screen';
import { AppText, Button, Callout, Card, FieldError, Segmented } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { MAX_PRIORITY, computeTiers } from '@/features/planner/engine';
import { MUSCLES, MUSCLE_LABELS, type Muscle, TIER_LABELS, type Tier } from '@/features/planner/muscles';
import { usePlanStore } from '@/features/planner/store';
import { useProfileStore } from '@/features/profile/store';
import { latestUsableScan, useScanStore } from '@/features/scanner/store';

const TIER_OPTIONS = (['priority', 'standard', 'maintain'] as Tier[]).map((t) => ({ id: t, label: TIER_LABELS[t] }));

export default function AdjustPriorities() {
  const plan = usePlanStore((s) => s.plan);
  const build = usePlanStore((s) => s.build);
  const profile = useProfileStore((s) => s.profile);
  const scans = useScanStore((s) => s.scans);
  const [overrides, setOverrides] = useState(plan?.settings.tierOverrides ?? {});
  const [error, setError] = useState<string>();
  if (!plan || !profile) return <Redirect href="/plan" />;

  // What the plan would recommend with no overrides (to show the reason next to each muscle).
  const recommended = computeTiers(profile, latestUsableScan(scans)?.result ?? null, {});
  const tierOf = (m: Muscle): Tier => overrides[m] ?? recommended[m].tier;
  const priorityCount = MUSCLES.filter((m) => tierOf(m) === 'priority').length;

  const setTier = (m: Muscle, t: Tier) => {
    setError(undefined);
    const next = { ...overrides };
    if (t === recommended[m].tier) delete next[m];
    else next[m] = t;
    setOverrides(next);
  };

  const apply = () => {
    if (priorityCount > MAX_PRIORITY)
      return setError(`Pick at most ${MAX_PRIORITY} priorities — focusing on everything means focusing on nothing.`);
    build(profile, { ...plan.settings, tierOverrides: overrides });
    goBack('/plan');
  };

  return (
    <Screen
      footer={
        <View style={{ gap: Spacing.sm }}>
          <FieldError message={error} />
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Cancel" variant="secondary" onPress={() => goBack('/plan')} style={{ flex: 1 }} />
            <Button label="Rebuild plan" onPress={apply} style={{ flex: 2 }} />
          </View>
        </View>
      }>
      <View style={{ gap: Spacing.xs, marginBottom: Spacing.xl }}>
        <AppText variant="title">Adjust priorities</AppText>
        <AppText tone="secondary">
          Priority muscles get the most sets and go first in a session. Maintain keeps a muscle at its maintenance
          floor — never zero. Up to {MAX_PRIORITY} priorities at once ({priorityCount} chosen).
        </AppText>
      </View>
      {plan.customized ? (
        <View style={{ marginBottom: Spacing.lg }}>
          <Callout tone="warning">
            <AppText variant="small" tone="secondary">
              Rebuilding replaces the changes you made to exercises.
            </AppText>
          </Callout>
        </View>
      ) : null}
      <View style={{ gap: Spacing.sm }}>
        {MUSCLES.map((m) => (
          <Card key={m} style={{ gap: Spacing.sm }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <AppText variant="label">{MUSCLE_LABELS[m]}</AppText>
              <AppText variant="small" tone="muted">
                {overrides[m] ? 'Set by you' : recommended[m].reasons[0] ?? 'Recommended'}
              </AppText>
            </View>
            <Segmented options={TIER_OPTIONS} value={tierOf(m)} onChange={(t) => setTier(m, t)} />
          </Card>
        ))}
      </View>
      {Object.keys(overrides).length ? (
        <Button label="Reset to recommended" variant="ghost" onPress={() => setOverrides({})} style={{ marginTop: Spacing.lg }} />
      ) : null}
    </Screen>
  );
}
