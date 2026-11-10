import { Redirect, router } from 'expo-router';
import { View } from 'react-native';

import { Screen } from '@/components/screen';
import { AppText, Button, Callout, Card } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { defaultSettings } from '@/features/planner/engine';
import { changesSincePlan } from '@/features/planner/profile-diff';
import { usePlanStore } from '@/features/planner/store';
import { useProfileStore } from '@/features/profile/store';

/** Shown after the questionnaire is saved with answers that affect the plan. */
export default function RebuildPrompt() {
  const profile = useProfileStore((s) => s.profile);
  const history = useProfileStore((s) => s.history);
  const plan = usePlanStore((s) => s.plan);
  const build = usePlanStore((s) => s.build);
  const save = usePlanStore((s) => s.save);
  if (!profile || !plan) return <Redirect href="/" />;

  // Compared with the answers this plan was built from (null = that version isn't on record).
  const changes = changesSincePlan(plan, profile, history) ?? [];

  const keep = () => {
    // The user chose to keep it: stop asking until their answers change again.
    save({ ...plan, profileUpdatedAt: profile.updatedAt });
    router.dismissTo('/');
  };

  const rebuild = () => {
    // Fresh settings from the new answers (days, style, schedule); muscle-priority overrides are cleared.
    build(profile, defaultSettings(profile));
    router.dismissTo('/plan');
  };

  return (
    <Screen
      footer={
        <View style={{ gap: Spacing.sm }}>
          <Button label="Build new plan" onPress={rebuild} />
          <Button label="Keep current plan" variant="secondary" onPress={keep} />
        </View>
      }>
      <View style={{ gap: Spacing.xs, marginBottom: Spacing.xl }}>
        <AppText variant="title">Your answers changed</AppText>
        <AppText tone="secondary">Your workout plan was built from your old answers. Build a new one from these?</AppText>
      </View>

      {changes.length ? (
        <Card style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
          {changes.map((c) => (
            <View key={c.label} style={{ gap: 2, borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm }}>
              <AppText variant="label">{c.label}</AppText>
              <AppText variant="small" tone="muted">
                Before: {c.from}
              </AppText>
              <AppText variant="small">Now: {c.to}</AppText>
            </View>
          ))}
        </Card>
      ) : null}

      <Callout tone="info">
        <AppText variant="label">What happens</AppText>
        <AppText variant="small" tone="secondary">
          The new plan picks days per week, plan style and schedule fresh from your new answers, and clears any
          muscle priorities you set by hand. Your current plan
          {plan.customized ? ', including your exercise edits,' : ''} is saved under Past plans on the Plan tab — you
          can switch back anytime. Your lift history and weight suggestions carry over either way.
        </AppText>
      </Callout>
    </Screen>
  );
}
