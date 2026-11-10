import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { goBack } from '@/components/navigation';
import { Screen } from '@/components/screen';
import { AppText, Badge, Button, Callout, Section, Segmented } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { usePlanStore } from '@/features/planner/store';
import { useProfileStore } from '@/features/profile/store';
import { fmtDate } from '@/features/tracker/format';
import { weightStep } from '@/features/tracker/progression';
import { currentWeek, dayStatus, findLog, insights, isDeloadWeek, liftingDays } from '@/features/tracker/sessions';
import { useTrackerStore } from '@/features/tracker/store';

export default function TrackerHome() {
  const plan = usePlanStore((s) => s.plan);
  const profile = useProfileStore((s) => s.profile);
  const logs = useTrackerStore((s) => s.logs);
  const settings = useTrackerStore((s) => s.settings);
  const setSmallSteps = useTrackerStore((s) => s.setSmallSteps);
  const addDeloadWeek = useTrackerStore((s) => s.addDeloadWeek);
  const [week, setWeek] = useState(() => (plan ? currentWeek(plan, logs) : 1));
  if (!plan || !profile) return <Redirect href="/" />;

  const unit = profile.units.weight;
  const latest = currentWeek(plan, logs);
  const deload = isDeloadWeek(plan, week, settings);
  const days = liftingDays(plan);
  const nextTodo = days.find((d) => !findLog(logs, plan.id, week, d.id)?.completedAt);
  const advice = insights(plan, logs, settings, unit).deload;
  const steps = {
    normal: weightStep('barbell', unit, false),
    small: weightStep('barbell', unit, true),
  };

  return (
    <Screen>
      <View style={styles.nav}>
        <Pressable accessibilityRole="button" onPress={() => goBack('/')} hitSlop={12}>
          <AppText variant="small" tone="secondary">
            ‹ Back
          </AppText>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/progress')} hitSlop={12}>
          <AppText variant="small" tone="accent" style={{ fontWeight: '600' }}>
            Progress
          </AppText>
        </Pressable>
      </View>

      <AppText variant="title" style={{ marginBottom: Spacing.md }}>
        Workouts
      </AppText>

      <View style={styles.weekBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous week"
          onPress={() => setWeek(Math.max(1, week - 1))}
          style={[styles.weekBtn, week <= 1 && { opacity: 0.3 }]}>
          <AppText variant="heading">‹</AppText>
        </Pressable>
        <View style={{ alignItems: 'center', gap: 2 }}>
          <AppText variant="heading">Week {week}</AppText>
          <AppText variant="small" tone="muted">
            {week === latest ? 'This week' : week < latest ? 'Past week — tap a day to edit' : 'Upcoming'}
          </AppText>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next week"
          onPress={() => setWeek(Math.min(latest + 1, week + 1))}
          style={[styles.weekBtn, week >= latest + 1 && { opacity: 0.3 }]}>
          <AppText variant="heading">›</AppText>
        </Pressable>
      </View>

      {deload ? (
        <View style={{ marginBottom: Spacing.md }}>
          <Callout tone="info">
            <AppText variant="label">Deload week</AppText>
            <AppText variant="small" tone="secondary">
              About half the sets, a little lighter, 3–4 reps in reserve. You come back stronger next week.
            </AppText>
          </Callout>
        </View>
      ) : null}

      {advice && week === latest ? (
        <View style={{ marginBottom: Spacing.md }}>
          <Callout tone="warning">
            <AppText variant="label">Consider a deload in week {advice.week}</AppText>
            <AppText variant="small" tone="secondary">
              {advice.reason} An easier week usually breaks the plateau.
            </AppText>
            <Button label={`Make week ${advice.week} a deload`} variant="secondary" onPress={() => addDeloadWeek(plan.id, advice.week)} />
          </Callout>
        </View>
      ) : null}

      <View style={{ gap: Spacing.sm, marginBottom: Spacing.xl }}>
        {days.map((d, i) => {
          const log = findLog(logs, plan.id, week, d.id);
          const status = dayStatus(log);
          const upNext = d === nextTodo && week === latest;
          return (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              onPress={() => router.push({ pathname: '/track/session/[week]/[dayId]', params: { week: String(week), dayId: d.id } })}
              style={({ pressed }) => [
                styles.day,
                upNext && { borderColor: Colors.accent },
                pressed && { backgroundColor: Colors.surfaceRaised },
              ]}>
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="small" tone="secondary">
                  Day {i + 1}
                </AppText>
                <AppText variant="heading">{d.label}</AppText>
                <AppText variant="small" tone="muted">
                  {status === 'done'
                    ? `Done ${fmtDate(log!.completedAt!)}`
                    : status === 'in_progress'
                      ? 'In progress'
                      : `${d.exercises.length} exercises · ~${d.estMinutes} min`}
                </AppText>
              </View>
              {status === 'done' ? (
                <Badge label="✓ Done" tone="progress" />
              ) : upNext ? (
                <Badge label="Up next" />
              ) : status === 'in_progress' ? (
                <Badge label="In progress" tone="warning" />
              ) : null}
            </Pressable>
          );
        })}
      </View>

      {steps.normal !== steps.small ? (
        <Section title="Weight jumps" hint="Use small steps if your gym has small plates or micro-loads.">
          <Segmented
            options={[
              { id: 'normal', label: `${steps.normal} ${unit} steps` },
              { id: 'small', label: `${steps.small} ${unit} steps` },
            ]}
            value={settings.smallSteps ? 'small' : 'normal'}
            onChange={(v) => setSmallSteps(v === 'small')}
          />
        </Section>
      ) : null}
    </Screen>
  );
}

const styles = {
  nav: { flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: Spacing.md },
  weekBar: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  weekBtn: { width: 44, height: 44, alignItems: 'center' as const, justifyContent: 'center' as const },
  day: {
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
