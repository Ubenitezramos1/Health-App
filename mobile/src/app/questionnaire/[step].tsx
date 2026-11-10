import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/screen';
import { AppText, Button, ProgressBar } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { fieldErrors } from '@/features/profile/schema';
import { useProfileStore } from '@/features/profile/store';
import { STEPS, stepIndex } from '@/features/questionnaire/steps';

export default function QuestionnaireStep() {
  const { step: stepId, returnTo } = useLocalSearchParams<{ step: string; returnTo?: string }>();
  const draft = useProfileStore((s) => s.draft);
  const update = useProfileStore((s) => s.update);
  const [attempted, setAttempted] = useState(false);

  const index = stepIndex(stepId);
  if (index < 0) return <Redirect href="/questionnaire/welcome" />;
  const step = STEPS[index];

  const result = step.schema?.safeParse(draft);
  const errors = attempted && result && !result.success ? fieldErrors(result.error) : {};

  const next = () => {
    if (result && !result.success) {
      setAttempted(true);
      return;
    }
    if (returnTo === 'review') return router.back();
    const following = STEPS[index + 1];
    if (following) router.push({ pathname: '/questionnaire/[step]', params: { step: following.id } });
    else router.push('/questionnaire/review');
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen
      header={
        <View style={{ gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="small" tone="secondary">
              Step {index + 1} of {STEPS.length + 1}
            </AppText>
            <Pressable accessibilityRole="button" onPress={() => router.dismissTo('/')} hitSlop={12}>
              <AppText variant="small" tone="secondary">
                Save and exit
              </AppText>
            </Pressable>
          </View>
          <ProgressBar value={(index + 1) / (STEPS.length + 1)} />
        </View>
      }
      footer={
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          {index > 0 || returnTo ? <Button label="Back" variant="secondary" onPress={back} style={{ flex: 1 }} /> : null}
          <Button label={returnTo === 'review' ? 'Done' : 'Continue'} onPress={next} style={{ flex: 2 }} />
        </View>
      }>
      <View style={{ marginBottom: Spacing.xl, gap: Spacing.xs }}>
        <AppText variant="title">{step.title}</AppText>
        {step.subtitle ? <AppText tone="secondary">{step.subtitle}</AppText> : null}
      </View>
      <step.Component draft={draft} update={update} errors={errors} />
    </Screen>
  );
}
