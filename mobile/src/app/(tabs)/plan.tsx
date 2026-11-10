import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/screen';
import { AppText, Badge, Button, Callout, Card } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { MUSCLES, MUSCLE_LABELS, TIER_LABELS, type Tier } from '@/features/planner/muscles';
import { weekView } from '@/features/planner/schedule';
import { usePlanStore } from '@/features/planner/store';
import { useProfileStore } from '@/features/profile/store';
import { latestUsableScan, useScanStore } from '@/features/scanner/store';

const TIER_TONE: Record<Tier, 'progress' | 'accent' | 'muted'> = {
  priority: 'progress',
  standard: 'accent',
  maintain: 'muted',
};

const fmtSets = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export default function PlanOverview() {
  const plan = usePlanStore((s) => s.plan);
  const build = usePlanStore((s) => s.build);
  const profile = useProfileStore((s) => s.profile);
  const scans = useScanStore((s) => s.scans);
  if (!plan || !profile)
    return (
      <Screen inTab>
        <AppText variant="title" style={{ marginBottom: Spacing.sm }}>
          Your plan
        </AppText>
        <AppText tone="secondary" style={{ marginBottom: Spacing.xl }}>
          {profile
            ? 'Build a plan from your answers: sets, reps, rest and a weekly schedule you can edit.'
            : 'Answer the questionnaire first — your plan is built from it.'}
        </AppText>
        <Button
          label={profile ? 'Build my plan' : 'Start questionnaire'}
          onPress={() => router.push(profile ? '/plan/setup' : '/questionnaire/welcome')}
        />
      </Screen>
    );

  const lifting = plan.days.filter((d) => d.type !== 'recovery');
  const longest = Math.max(...lifting.map((d) => d.estMinutes));
  const profileChanged = profile.updatedAt !== plan.profileUpdatedAt;
  const latest = latestUsableScan(scans);
  const newScan = !!latest && latest.record.takenAt !== plan.scanTakenAt;

  return (
    <Screen inTab>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginBottom: Spacing.md }}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/plan/setup')} hitSlop={12}>
          <AppText variant="small" tone="accent" style={{ fontWeight: '600' }}>
            Settings
          </AppText>
        </Pressable>
      </View>

      <View style={{ gap: Spacing.xs, marginBottom: Spacing.xl }}>
        <AppText variant="title">Your plan</AppText>
        <AppText tone="secondary">
          {plan.settings.style === 'efficient' ? 'Efficient' : 'Full volume'} · {lifting.length} day
          {lifting.length > 1 ? 's' : ''}/week · up to ~{longest} min
        </AppText>
      </View>

      {newScan && !profileChanged ? (
        <View style={{ marginBottom: Spacing.lg }}>
          <Callout tone="info">
            <AppText variant="label">New scan results</AppText>
            <AppText variant="small" tone="secondary">
              Rebuild to prioritize what your latest scan found{plan.customized ? ' (this replaces your exercise edits)' : ''}.
            </AppText>
            <Button label="Rebuild plan" variant="secondary" onPress={() => build(profile, plan.settings)} />
          </Callout>
        </View>
      ) : null}

      {profileChanged ? (
        <View style={{ marginBottom: Spacing.lg }}>
          <Callout tone="info">
            <AppText variant="label">Your profile changed</AppText>
            <AppText variant="small" tone="secondary">
              Rebuild to use your latest answers{plan.customized ? ' (this replaces your exercise edits)' : ''}.
            </AppText>
            <Button label="Rebuild plan" variant="secondary" onPress={() => build(profile, plan.settings)} />
          </Callout>
        </View>
      ) : null}

      {plan.warnings.map((w) => (
        <View key={w} style={{ marginBottom: Spacing.md }}>
          <Callout tone="warning">
            <AppText variant="small" tone="secondary">
              {w}
            </AppText>
          </Callout>
        </View>
      ))}

      <AppText variant="label" style={{ marginBottom: Spacing.sm }}>
        This week
      </AppText>
      <View style={{ gap: Spacing.sm, marginBottom: Spacing.xl }}>
        {weekView(plan).map((slot) =>
          slot.day ? (
            <Pressable
              key={slot.title}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/plan/day/[dayId]', params: { dayId: slot.day!.id } })}
              style={({ pressed }) => [styles.dayRow, pressed && { backgroundColor: Colors.surfaceRaised }]}>
              <View style={{ flex: 1 }}>
                <AppText variant="small" tone="secondary">
                  {slot.title}
                  {slot.time ? ` · ${slot.time}` : ''}
                </AppText>
                <AppText variant="heading">{slot.day.label}</AppText>
                <AppText variant="small" tone="muted">
                  {slot.day.type === 'recovery'
                    ? 'Mobility, easy cardio, stretching'
                    : `${slot.day.exercises.length} exercises · ~${slot.day.estMinutes} min`}
                </AppText>
              </View>
              <AppText tone="accent" variant="heading">
                ›
              </AppText>
            </Pressable>
          ) : (
            <View key={slot.title} style={[styles.dayRow, styles.restRow]}>
              <View style={{ flex: 1 }}>
                <AppText variant="small" tone="muted">
                  {slot.title}
                </AppText>
                <AppText variant="small" tone="secondary">
                  {slot.restText}
                </AppText>
              </View>
            </View>
          ),
        )}
      </View>

      <Card style={{ gap: Spacing.md, marginBottom: Spacing.lg }}>
        <AppText variant="label">Why this plan</AppText>
        {plan.why.map((w) => (
          <AppText key={w} variant="small" tone="secondary">
            • {w}
          </AppText>
        ))}
        <View style={{ gap: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border, paddingTop: Spacing.md }}>
          <AppText variant="small" tone="secondary">
            Weekly sets per muscle
          </AppText>
          {(['priority', 'standard', 'maintain'] as Tier[]).map((tier) => {
            const muscles = MUSCLES.filter((m) => plan.volume[m].tier === tier);
            if (!muscles.length) return null;
            return (
              <View key={tier} style={{ gap: Spacing.xs }}>
                <Badge label={TIER_LABELS[tier]} tone={TIER_TONE[tier]} />
                <AppText variant="small">
                  {muscles.map((m) => `${MUSCLE_LABELS[m]} ${fmtSets(plan.volume[m].sets)}`).join(' · ')}
                </AppText>
              </View>
            );
          })}
        </View>
        <Button label="Adjust priorities" variant="secondary" onPress={() => router.push('/plan/focus')} />
      </Card>

      <Card style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
        <AppText variant="label">Training block</AppText>
        <AppText variant="small" tone="secondary">
          {plan.deloadWeek
            ? `${plan.blockWeeks}-week block. Week ${plan.deloadWeek} is a deload: same exercises, about half the sets, a little lighter. Then you'll re-check your profile and scan.`
            : `${plan.blockWeeks}-week block with planned deloads off. The tracker will still suggest one if your progress stalls.`}
        </AppText>
      </Card>

      <Card style={{ gap: Spacing.sm }}>
        <AppText variant="label">Cardio and rest days</AppText>
        <AppText variant="small" tone="secondary">
          {plan.cardio}
        </AppText>
      </Card>
    </Screen>
  );
}

const styles = {
  dayRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  restRow: { backgroundColor: 'transparent', borderStyle: 'dashed' as const, paddingVertical: Spacing.md },
};
