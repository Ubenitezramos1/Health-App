import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/screen';
import { AppText, Button, Card } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';
import { GOALS, labelOf } from '@/features/profile/options';
import { useProfileStore } from '@/features/profile/store';
import { STEPS } from '@/features/questionnaire/steps';
import { SummaryList } from '@/features/questionnaire/summary-list';
import { useScanStore } from '@/features/scanner/store';
import { fmtDate } from '@/features/tracker/format';

/** First step whose answers are incomplete, or the review screen if all are done. */
function resumeTarget(draft: object) {
  const pending = STEPS.find((s) => s.schema && !s.schema.safeParse(draft).success);
  return pending
    ? ({ pathname: '/questionnaire/[step]', params: { step: pending.id } } as const)
    : ('/questionnaire/review' as const);
}

export default function Profile() {
  const profile = useProfileStore((s) => s.profile);
  const draft = useProfileStore((s) => s.draft);
  const startDraft = useProfileStore((s) => s.startDraft);
  const scans = useScanStore((s) => s.scans);
  const draftInProgress = Boolean(draft.dob || draft.disclaimerAccepted);

  const startNew = () => {
    startDraft('blank');
    router.push('/questionnaire/welcome');
  };
  const editProfile = () => {
    startDraft('profile');
    router.push('/questionnaire/review');
  };

  return (
    <Screen inTab>
      <View style={{ gap: Spacing.xs, marginBottom: Spacing.xl }}>
        <AppText variant="title">Profile</AppText>
        <AppText tone="secondary">
          {profile ? `Main goal: ${labelOf(GOALS, profile.primaryGoal)}` : 'Answer the questionnaire to build your profile.'}
        </AppText>
      </View>

      {draftInProgress ? (
        <Card style={{ gap: Spacing.md, marginBottom: Spacing.xl, borderColor: Colors.accent }}>
          <AppText variant="label">{profile ? 'You have unsaved edits' : 'Questionnaire in progress'}</AppText>
          <Button label="Continue" onPress={() => router.push(resumeTarget(draft))} />
          <Button label={profile ? 'Discard edits' : 'Start over'} variant="ghost" onPress={() => startDraft('blank')} />
        </Card>
      ) : null}

      {!profile && !draftInProgress ? <Button label="Start questionnaire" onPress={startNew} /> : null}

      {profile ? (
        <>
          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg }}>
            <Button label="Edit answers" variant="secondary" onPress={editProfile} style={{ flex: 1 }} />
            <Button label="Retake" variant="secondary" onPress={startNew} style={{ flex: 1 }} />
          </View>

          <Card style={{ gap: Spacing.sm, marginBottom: Spacing.lg }}>
            <AppText variant="label">Physique scans</AppText>
            <AppText variant="small" tone="secondary">
              Rescan each training block (6–8 weeks) with the same setup to compare.
            </AppText>
            {[...scans].reverse().slice(0, 5).map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/scan/[scanId]', params: { scanId: s.id } })}
                style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.xs }}>
                <AppText variant="small">{fmtDate(s.takenAt)}</AppText>
                <AppText variant="small" tone="accent">
                  {s.analysis.quality.usable ? 'View ›' : 'Unusable photos ›'}
                </AppText>
              </Pressable>
            ))}
            <Button label={scans.length ? 'New scan' : 'Start scan'} variant="secondary" onPress={() => router.push('/scan')} />
          </Card>

          <SummaryList draft={profile} />
        </>
      ) : null}
    </Screen>
  );
}
