import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Screen } from '@/components/screen';
import { AppText, Badge, Button, Callout, Card } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { type Tip, greeting, nextWorkout, priorityMuscles, topTips, weekSets } from '@/features/dashboard/today';
import { getExercise } from '@/features/planner/exercises';
import { usePlanStore } from '@/features/planner/store';
import type { Plan } from '@/features/planner/types';
import { useProfileStore } from '@/features/profile/store';
import { STEPS } from '@/features/questionnaire/steps';
import { useScanStore } from '@/features/scanner/store';
import { fmtDate } from '@/features/tracker/format';
import { findLog, insights, liftingDays } from '@/features/tracker/sessions';
import { useTrackerStore } from '@/features/tracker/store';

const today = () => new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });

export default function Today() {
  const profile = useProfileStore((s) => s.profile);
  const draft = useProfileStore((s) => s.draft);
  const startDraft = useProfileStore((s) => s.startDraft);
  const plan = usePlanStore((s) => s.plan);
  const latestScan = useScanStore((s) => s.scans.at(-1));

  const draftInProgress = !profile && Boolean(draft.dob || draft.disclaimerAccepted);

  return (
    <Screen inTab>
      <View style={{ gap: 2, marginBottom: Spacing.xl }}>
        <AppText variant="small" tone="secondary">
          {today()}
        </AppText>
        <AppText variant="title">{profile ? greeting() : 'Welcome'}</AppText>
      </View>

      {!profile ? (
        draftInProgress ? (
          <ResumeQuestionnaire draft={draft} onRestart={() => startDraft('blank')} />
        ) : (
          <Welcome
            onStart={() => {
              startDraft('blank');
              router.push('/questionnaire/welcome');
            }}
          />
        )
      ) : !plan ? (
        <SetupChecklist hasScan={!!latestScan} />
      ) : (
        <PlanDashboard plan={plan} />
      )}
    </Screen>
  );
}

/* ---------- Onboarding ---------- */

const HOW_IT_WORKS = [
  { icon: 'clipboard-outline', title: 'Questionnaire', body: 'About 3 minutes: goals, schedule, equipment, injuries.' },
  { icon: 'scan-outline', title: 'Physique scan (optional)', body: 'Front and back photos show what to prioritize.' },
  { icon: 'barbell-outline', title: 'Your plan', body: 'Sets, reps and rest that fit your time and recovery.' },
  { icon: 'trending-up-outline', title: 'Track and progress', body: 'Log sets; get the next weight and reps every session.' },
] as const;

function Welcome({ onStart }: { onStart: () => void }) {
  return (
    <View style={{ gap: Spacing.xl }}>
      <AppText tone="secondary">A training program built around your body, goals and schedule — and it adjusts as you progress.</AppText>
      <View style={{ gap: Spacing.md }}>
        {HOW_IT_WORKS.map((s, i) => (
          <View key={s.title} style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start' }}>
            <View style={styles.stepIcon}>
              <Ionicons name={s.icon} size={20} color={Colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label">
                {i + 1}. {s.title}
              </AppText>
              <AppText variant="small" tone="secondary">
                {s.body}
              </AppText>
            </View>
          </View>
        ))}
      </View>
      <Button label="Get started" onPress={onStart} />
    </View>
  );
}

function ResumeQuestionnaire({ draft, onRestart }: { draft: object; onRestart: () => void }) {
  const pending = STEPS.find((s) => s.schema && !s.schema.safeParse(draft).success);
  return (
    <Card style={{ gap: Spacing.md, borderColor: Colors.accent }}>
      <AppText variant="label">Pick up where you left off</AppText>
      <AppText variant="small" tone="secondary">
        Your questionnaire answers are saved on this device.
      </AppText>
      <Button
        label="Continue questionnaire"
        onPress={() =>
          router.push(pending ? { pathname: '/questionnaire/[step]', params: { step: pending.id } } : '/questionnaire/review')
        }
      />
      <Button label="Start over" variant="ghost" onPress={onRestart} />
    </Card>
  );
}

function SetupChecklist({ hasScan }: { hasScan: boolean }) {
  const items = [
    { done: true, label: 'Questionnaire', action: undefined },
    { done: hasScan, label: 'Physique scan (optional)', action: () => router.push('/scan') },
    { done: false, label: 'Build your plan', action: () => router.push('/plan/setup') },
  ];
  return (
    <View style={{ gap: Spacing.lg }}>
      <Card style={{ gap: Spacing.md }}>
        <AppText variant="label">Finish setting up</AppText>
        {items.map((it) => (
          <Pressable
            key={it.label}
            accessibilityRole="button"
            disabled={!it.action || it.done}
            onPress={it.action}
            style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
            <Ionicons
              name={it.done ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={it.done ? Colors.chartLine : Colors.textMuted}
            />
            <AppText style={{ flex: 1 }} tone={it.done ? 'secondary' : 'primary'}>
              {it.label}
            </AppText>
            {!it.done && it.action ? <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} /> : null}
          </Pressable>
        ))}
      </Card>
      <Button label="Build my plan" onPress={() => router.push('/plan/setup')} />
      {!hasScan ? <Button label="Start with a scan" variant="secondary" onPress={() => router.push('/scan')} /> : null}
    </View>
  );
}

/* ---------- The daily view ---------- */

function PlanDashboard({ plan }: { plan: Plan }) {
  const profile = useProfileStore((s) => s.profile)!;
  const logs = useTrackerStore((s) => s.logs);
  const settings = useTrackerStore((s) => s.settings);
  const addDeloadWeek = useTrackerStore((s) => s.addDeloadWeek);
  const latestScan = useScanStore((s) => s.scans.at(-1));

  const unit = profile.units.weight;
  const next = nextWorkout(plan, logs, settings);
  const tips = topTips(plan, logs, settings, unit, latestScan);
  const focus = priorityMuscles(plan);
  const days = liftingDays(plan);
  const totalDone = logs.filter((l) => l.planId === plan.id && l.completedAt).length;
  const deloadAdvice = insights(plan, logs, settings, unit).deload;

  const openSession = (week: number, dayId: string) =>
    router.push({ pathname: '/track/session/[week]/[dayId]', params: { week: String(week), dayId } });

  const runTip = (t: Tip) => {
    if (t.action === 'deload' && deloadAdvice) addDeloadWeek(plan.id, deloadAdvice.week);
    else if (t.action === 'progress') router.push('/progress');
    else if (t.action === 'scan') router.push('/scan');
  };

  return (
    <View style={{ gap: Spacing.lg }}>
      {/* Hero: the one thing to do next */}
      <View style={styles.hero}>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
          <AppText variant="small" tone="secondary">
            Week {next.week}
            {next.day ? ` · Day ${next.dayNumber} of ${next.totalThisWeek}` : ''}
          </AppText>
          {next.deload ? <Badge label="Deload week" tone="warning" /> : null}
          {next.inProgress ? <Badge label="In progress" tone="warning" /> : null}
        </View>

        {next.day ? (
          <>
            <AppText variant="title">{next.day.label}</AppText>
            <AppText variant="small" tone="secondary">
              {next.day.exercises.length} exercises · ~{next.day.estMinutes} min
              {next.schedule?.when ? ` · ${next.schedule.when}` : ''}
            </AppText>
            {next.schedule && !next.schedule.todayIsTraining && !next.inProgress ? (
              <AppText variant="small" tone="muted">
                Rest day today — next session {next.schedule.nextTrainingDay}. Walk, stretch, or do light cardio.
              </AppText>
            ) : null}
            <View style={{ gap: 2, marginVertical: Spacing.sm }}>
              {next.day.exercises.slice(0, 4).map((pe) => (
                <AppText key={pe.id} variant="small" tone="secondary">
                  • {getExercise(pe.exerciseId).name}
                </AppText>
              ))}
              {next.day.exercises.length > 4 ? (
                <AppText variant="small" tone="muted">
                  +{next.day.exercises.length - 4} more
                </AppText>
              ) : null}
            </View>
            <Button
              label={next.inProgress ? 'Continue workout' : next.schedule && !next.schedule.todayIsTraining ? 'Train anyway' : 'Start workout'}
              variant={next.schedule && !next.schedule.todayIsTraining && !next.inProgress ? 'secondary' : 'primary'}
              onPress={() => openSession(next.week, next.day!.id)}
            />
          </>
        ) : (
          <>
            <AppText variant="title">Week {next.week} done</AppText>
            <AppText variant="small" tone="secondary">
              Every workout is logged. Rest, walk, or stretch — week {next.week + 1} starts with {days[0]?.label}.
            </AppText>
            <Button label={`Preview week ${next.week + 1}`} variant="secondary" onPress={() => openSession(next.week + 1, days[0].id)} />
          </>
        )}
      </View>

      {/* This week at a glance */}
      <View style={{ gap: Spacing.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <AppText variant="label">This week</AppText>
          <Pressable accessibilityRole="button" onPress={() => router.push('/track')} hitSlop={8}>
            <AppText variant="small" tone="accent" style={{ fontWeight: '600' }}>
              All workouts ›
            </AppText>
          </Pressable>
        </View>
        <View style={{ flexDirection: 'row', gap: Spacing.xs }} accessibilityLabel={`${next.doneThisWeek} of ${next.totalThisWeek} workouts done`}>
          {days.map((d) => {
            const done = !!findLog(logs, plan.id, next.week, d.id)?.completedAt;
            const isNext = next.day?.id === d.id;
            return (
              <Pressable
                key={d.id}
                accessibilityRole="button"
                accessibilityLabel={`${d.label}${done ? ', done' : isNext ? ', up next' : ''}`}
                onPress={() => openSession(next.week, d.id)}
                style={{ flex: 1, gap: Spacing.xs }}>
                <View
                  style={[
                    styles.segment,
                    done && { backgroundColor: Colors.chartLine, borderColor: Colors.chartLine },
                    isNext && { borderColor: Colors.accent },
                  ]}
                />
                <AppText variant="small" tone={done || isNext ? 'primary' : 'muted'} numberOfLines={1} style={{ fontSize: 12 }}>
                  {d.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Stats */}
      <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
        {[
          { label: 'Workouts', value: `${next.doneThisWeek}/${next.totalThisWeek}`, sub: 'this week' },
          { label: 'Sets', value: String(weekSets(plan, logs, next.week)), sub: 'this week' },
          { label: 'Total', value: String(totalDone), sub: 'workouts' },
        ].map((t) => (
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

      {/* What to know right now */}
      {tips.map((t) => (
        <Callout key={t.title} tone={t.tone === 'warning' ? 'warning' : 'info'}>
          <AppText variant="label">{t.title}</AppText>
          <AppText variant="small" tone="secondary">
            {t.body}
          </AppText>
          {t.action ? (
            <Button
              label={t.action === 'deload' ? 'Schedule deload' : t.action === 'scan' ? 'Start scan' : 'See progress'}
              variant="secondary"
              onPress={() => runTip(t)}
              style={{ marginTop: Spacing.xs }}
            />
          ) : null}
        </Callout>
      ))}

      {/* Training focus */}
      <Pressable accessibilityRole="button" onPress={() => router.push('/plan')}>
        <Card style={{ gap: Spacing.sm }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <AppText variant="label">This block&apos;s focus</AppText>
            <Ionicons name="chevron-forward" size={18} color={Colors.textMuted} />
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
            {focus.length ? (
              focus.map((m) => <Badge key={m} label={m} tone="progress" />)
            ) : (
              <AppText variant="small" tone="secondary">
                Balanced — every muscle at standard volume.
              </AppText>
            )}
          </View>
          <AppText variant="small" tone="muted">
            {plan.settings.style === 'efficient' ? 'Efficient' : 'Full volume'} · {days.length} days/week
            {latestScan ? ` · Last scan ${fmtDate(latestScan.takenAt)}` : ' · No scan yet'}
          </AppText>
        </Card>
      </Pressable>
    </View>
  );
}

const styles = {
  hero: {
    gap: Spacing.xs,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.accent,
    backgroundColor: Colors.surface,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    backgroundColor: Colors.accentSoft,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  segment: {
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceRaised,
  },
  tile: { flex: 1, padding: Spacing.md, borderRadius: Radius.md, backgroundColor: Colors.surface, gap: 2 },
};
