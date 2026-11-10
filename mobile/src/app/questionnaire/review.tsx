import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { AppText, Button, Callout, FieldError, ProgressBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { planChanges } from '@/features/planner/profile-diff';
import { usePlanStore } from '@/features/planner/store';
import { needsMedicalClearance } from '@/features/profile/schema';
import { useProfileStore } from '@/features/profile/store';
import { SummaryList } from '@/features/questionnaire/summary-list';

export default function Review() {
  const draft = useProfileStore((s) => s.draft);
  const complete = useProfileStore((s) => s.complete);
  const [error, setError] = useState<string>();

  const save = async () => {
    const before = useProfileStore.getState().profile;
    const result = await complete();
    if (!result.ok) return setError(result.message);
    const after = useProfileStore.getState().profile;
    // Only ask about the plan when an answer that shapes it actually changed.
    const changes = before && after && usePlanStore.getState().plan ? planChanges(before, after) : [];
    if (changes.length) router.replace('/plan/rebuild');
    else router.dismissTo('/');
  };

  return (
    <Screen
      header={
        <View style={{ gap: Spacing.sm }}>
          <AppText variant="small" tone="secondary">
            Review
          </AppText>
          <ProgressBar value={1} />
        </View>
      }
      footer={
        <View style={{ gap: Spacing.sm }}>
          <FieldError message={error} />
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Back" variant="secondary" onPress={() => router.back()} style={{ flex: 1 }} />
            <Button label="Save profile" onPress={save} style={{ flex: 2 }} />
          </View>
        </View>
      }>
      <View style={{ marginBottom: Spacing.xl, gap: Spacing.xs }}>
        <AppText variant="title">Check your answers</AppText>
        <AppText tone="secondary">Tap Edit to change anything. You can update these anytime.</AppText>
      </View>
      {needsMedicalClearance(draft) ? (
        <View style={{ marginBottom: Spacing.md }}>
          <Callout tone="warning">
            <AppText variant="label">Check with your doctor first</AppText>
            <AppText variant="small" tone="secondary">
              Some answers suggest getting medical clearance before you start training.
            </AppText>
          </Callout>
        </View>
      ) : null}
      <SummaryList
        draft={draft}
        onEdit={(step) =>
          router.push({ pathname: '/questionnaire/[step]', params: { step, returnTo: 'review' } })
        }
      />
    </Screen>
  );
}
