import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { goBack } from '@/components/navigation';
import { Screen } from '@/components/screen';
import { AppText, Badge, Button, Callout, Card } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { MUSCLES, MUSCLE_LABELS, type Muscle } from '@/features/planner/muscles';
import { usePlanStore } from '@/features/planner/store';
import { useProfileStore } from '@/features/profile/store';
import { latestUsableScan, useScanStore } from '@/features/scanner/store';
import { POSTURE_LABELS, type Rating } from '@/features/scanner/types';
import { fmtDate } from '@/features/tracker/format';

const GROUPS: { rating: Rating; title: string; tone: 'progress' | 'warning' | 'accent' | 'muted' }[] = [
  { rating: 'lagging', title: 'Behind — candidates for priority (up to 3 at once)', tone: 'warning' },
  { rating: 'strong', title: 'Ahead — kept at maintenance, never dropped', tone: 'progress' },
  { rating: 'balanced', title: 'Balanced', tone: 'accent' },
  { rating: 'not_visible', title: 'Not visible in these photos', tone: 'muted' },
];

const SIDE = { left: 'Left', right: 'Right' } as const;
const REGION = { arms: 'arm', chest: 'chest', shoulders: 'shoulder', legs: 'leg', glutes: 'glute', back: 'back' } as const;

export default function ScanResultScreen() {
  const { scanId } = useLocalSearchParams<{ scanId: string }>();
  const scans = useScanStore((s) => s.scans);
  const plan = usePlanStore((s) => s.plan);
  const build = usePlanStore((s) => s.build);
  const profile = useProfileStore((s) => s.profile);
  const record = scans.find((s) => s.id === scanId);
  if (!record || !profile) return <Redirect href="/scan" />;

  const a = record.analysis;
  const isLatestUsable = latestUsableScan(scans)?.record.id === record.id;
  const planUsesIt = plan?.scanTakenAt === record.takenAt;

  const applyToPlan = () => {
    if (plan) {
      build(profile, plan.settings);
      router.dismissTo('/plan');
    } else router.push('/plan/setup');
  };

  return (
    <Screen
      footer={
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Button label="Done" variant="secondary" onPress={() => goBack('/')} style={{ flex: 1 }} />
          {a.quality.usable && isLatestUsable && !planUsesIt ? (
            <Button label={plan ? 'Update my plan' : 'Build my plan'} onPress={applyToPlan} style={{ flex: 2 }} />
          ) : !a.quality.usable ? (
            <Button label="Retake photos" onPress={() => router.replace('/scan')} style={{ flex: 2 }} />
          ) : null}
        </View>
      }>
      <View style={{ gap: Spacing.xs, marginBottom: Spacing.xl }}>
        <AppText variant="small" tone="secondary">
          Scan · {fmtDate(record.takenAt)}
        </AppText>
        <AppText variant="title">{a.quality.usable ? 'Your results' : "We couldn't read these photos"}</AppText>
      </View>

      {a.quality.issues.length ? (
        <View style={{ marginBottom: Spacing.lg }}>
          <Callout tone="warning">
            <AppText variant="label">{a.quality.usable ? 'For a better next scan' : 'How to fix it'}</AppText>
            {a.quality.issues.map((i) => (
              <AppText key={i} variant="small" tone="secondary">
                • {i}
              </AppText>
            ))}
          </Callout>
        </View>
      ) : null}

      {a.quality.usable ? (
        <>
          <AppText style={{ marginBottom: Spacing.lg }}>{a.summary}</AppText>

          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg }}>
            <Card style={{ flex: 1, gap: Spacing.xs }}>
              <AppText variant="label">Strengths</AppText>
              {a.strengths.map((s) => (
                <AppText key={s} variant="small" tone="secondary">
                  • {s}
                </AppText>
              ))}
            </Card>
            <Card style={{ flex: 1, gap: Spacing.xs }}>
              <AppText variant="label">Focus on</AppText>
              {a.focusAreas.map((s) => (
                <AppText key={s} variant="small" tone="secondary">
                  • {s}
                </AppText>
              ))}
            </Card>
          </View>

          {GROUPS.map((g) => {
            const muscles = MUSCLES.filter((m) => a.muscles[m].rating === g.rating);
            if (!muscles.length) return null;
            return (
              <View key={g.rating} style={{ marginBottom: Spacing.lg, gap: Spacing.sm }}>
                <Badge label={g.title} tone={g.tone} />
                {muscles.map((m: Muscle) => (
                  <View key={m} style={{ borderBottomWidth: 1, borderBottomColor: Colors.border, paddingBottom: Spacing.sm }}>
                    <AppText variant="label">{MUSCLE_LABELS[m]}</AppText>
                    <AppText variant="small" tone="secondary">
                      {a.muscles[m].note}
                    </AppText>
                  </View>
                ))}
              </View>
            );
          })}

          {a.asymmetries.length || a.postureFlags.length ? (
            <Card style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
              <AppText variant="label">Balance and posture</AppText>
              {a.asymmetries.map((x) => (
                <AppText key={x.region} variant="small" tone="secondary">
                  • {SIDE[x.weakerSide]} {REGION[x.region]} slightly behind — your plan adds one-sided work, weaker
                  side first. {x.note}
                </AppText>
              ))}
              {a.postureFlags.map((p) => (
                <AppText key={p.flag} variant="small" tone="secondary">
                  • {POSTURE_LABELS[p.flag]} — {p.note}
                </AppText>
              ))}
            </Card>
          ) : null}

          {planUsesIt ? (
            <AppText variant="small" tone="muted" style={{ marginBottom: Spacing.md }}>
              Your current plan already uses this scan.
            </AppText>
          ) : null}
          <AppText variant="small" tone="muted">
            These are visual estimates to guide training emphasis, not a medical assessment. Lighting, pose and
            clothing affect results — use the same setup each time to compare scans.
          </AppText>
        </>
      ) : null}
    </Screen>
  );
}
