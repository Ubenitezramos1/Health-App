import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { goBack } from '@/components/navigation';
import { Screen } from '@/components/screen';
import { AppText, Badge, Button, Callout, Card, RatingScale, Section } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { makeId } from '@/features/planner/engine';
import { usePlanStore } from '@/features/planner/store';
import { useProfileStore } from '@/features/profile/store';
import { fmtNum, fmtSets, fmtTarget } from '@/features/tracker/format';
import { REASON_TEXT, STALL_TEXT } from '@/features/tracker/progression';
import {
  type ExerciseTarget,
  adviceFor,
  findLog,
  isDeloadWeek,
  newLog,
  sessionTargets,
} from '@/features/tracker/sessions';
import { useTrackerStore } from '@/features/tracker/store';
import type { Adjustment, CheckIn, ExerciseLog, WorkoutLog } from '@/features/tracker/types';

export default function Session() {
  const { week: weekParam, dayId } = useLocalSearchParams<{ week: string; dayId: string }>();
  const week = Number(weekParam);
  const plan = usePlanStore((s) => s.plan);
  const profile = useProfileStore((s) => s.profile);
  const logs = useTrackerStore((s) => s.logs);
  const settings = useTrackerStore((s) => s.settings);
  const addLog = useTrackerStore((s) => s.addLog);
  const setCompleted = useTrackerStore((s) => s.setCompleted);

  const day = plan?.days.find((d) => d.id === dayId);
  if (!plan || !profile || !day || !Number.isFinite(week)) return <Redirect href="/track" />;

  const unit = profile.units.weight;
  const log = findLog(logs, plan.id, week, day.id);
  const deload = log ? log.deload : isDeloadWeek(plan, week, settings);
  const targets = sessionTargets(day, log, logs, { unit, smallSteps: settings.smallSteps, deload });
  const back = () => goBack('/track');

  // newLog applies the accepted adjustment (e.g. one fewer set row) to the unadjusted targets.
  const start = (checkIn: CheckIn | null, adjustment: Adjustment) =>
    addLog(newLog(plan, day, week, targets, unit, checkIn, adjustment, deload, makeId('log')));

  return (
    <Screen
      footer={
        log ? (
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Back" variant="secondary" onPress={back} style={{ flex: 1 }} />
            {log.completedAt ? (
              <Button label="Reopen" variant="secondary" onPress={() => setCompleted(log.id, false)} style={{ flex: 2 }} />
            ) : (
              <Button
                label="Finish workout"
                onPress={() => {
                  setCompleted(log.id, true);
                  back();
                }}
                style={{ flex: 2 }}
              />
            )}
          </View>
        ) : (
          <Button label="Back" variant="secondary" onPress={back} />
        )
      }>
      <View style={{ gap: Spacing.xs, marginBottom: Spacing.xl }}>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center' }}>
          <AppText variant="small" tone="secondary">
            Week {week}
          </AppText>
          {deload ? <Badge label="Deload" tone="warning" /> : null}
          {log?.completedAt ? <Badge label="✓ Done" tone="progress" /> : null}
        </View>
        <AppText variant="title">{day.label}</AppText>
        {log?.adjustment ? (
          <AppText variant="small" tone="secondary">
            {log.adjustment === 'drop_last_set' ? 'Lighter day: last set dropped.' : 'Easier day: 1 more rep in reserve.'}
          </AppText>
        ) : null}
      </View>

      {log ? (
        <LoggedSession log={log} targets={targets} unit={unit} />
      ) : (
        <PreStart targets={targets} unit={unit} onStart={start} />
      )}
    </Screen>
  );
}

/* ---------- Before starting: optional check-in + preview ---------- */

function PreStart({
  targets,
  unit,
  onStart,
}: {
  targets: ExerciseTarget[];
  unit: 'lb' | 'kg';
  onStart: (c: CheckIn | null, a: Adjustment) => void;
}) {
  const [c, setC] = useState<Partial<CheckIn>>({});
  const complete = c.energy && c.sleep && c.soreness ? (c as CheckIn) : null;
  const advice = complete ? adviceFor(complete) : null;

  return (
    <View>
      <Card style={{ gap: Spacing.md, marginBottom: Spacing.xl }}>
        <AppText variant="label">Quick check-in (optional)</AppText>
        <AppText variant="small" tone="secondary">
          The app may suggest a lighter session. You decide whether to take it.
        </AppText>
        <Section title="Energy">
          <RatingScale accessibilityLabel="Energy" value={c.energy} onChange={(energy) => setC({ ...c, energy })} lowLabel="Drained" highLabel="Great" />
        </Section>
        <Section title="Sleep last night">
          <RatingScale accessibilityLabel="Sleep" value={c.sleep} onChange={(sleep) => setC({ ...c, sleep })} lowLabel="Poor" highLabel="Great" />
        </Section>
        <Section title="Soreness">
          <RatingScale accessibilityLabel="Soreness" value={c.soreness} onChange={(soreness) => setC({ ...c, soreness })} lowLabel="None" highLabel="Very sore" />
        </Section>
        {advice ? (
          <Callout tone={advice.adjustment ? 'warning' : 'info'}>
            <AppText variant="label">{advice.title}</AppText>
            <AppText variant="small" tone="secondary">
              {advice.detail}
            </AppText>
            {advice.adjustment ? (
              <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm }}>
                <Button label="Use suggestion" onPress={() => onStart(complete, advice.adjustment)} style={{ flex: 1 }} />
                <Button label="Train as planned" variant="secondary" onPress={() => onStart(complete, null)} style={{ flex: 1 }} />
              </View>
            ) : (
              <Button label="Start workout" onPress={() => onStart(complete, null)} style={{ marginTop: Spacing.sm }} />
            )}
          </Callout>
        ) : (
          <Button label="Skip check-in and start" variant="secondary" onPress={() => onStart(null, null)} />
        )}
      </Card>

      <AppText variant="label" style={{ marginBottom: Spacing.sm }}>
        Today&apos;s targets
      </AppText>
      <View style={{ gap: Spacing.sm }}>
        {targets.map((t) => (
          <View key={t.pe.id} style={styles.previewRow}>
            <AppText variant="small" style={{ flex: 1 }}>
              {t.exercise.name}
            </AppText>
            <AppText variant="small" tone="secondary">
              {t.suggestion.reason === 'first_time' && !t.deload
                ? `${t.reps.length} × ${t.pe.repMin}–${t.pe.repMax}`
                : fmtTarget(t.weight, t.reps, unit, t.exercise.timed)}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

/* ---------- Logging ---------- */

function LoggedSession({ log, targets, unit }: { log: WorkoutLog; targets: ExerciseTarget[]; unit: 'lb' | 'kg' }) {
  const byId = new Map(targets.map((t) => [t.pe.id, t]));
  return (
    <View style={{ gap: Spacing.md }}>
      {log.entries.map((entry, i) => (
        <ExerciseCard key={entry.planExerciseId} log={log} entry={entry} entryIndex={i} target={byId.get(entry.planExerciseId)} unit={unit} />
      ))}
    </View>
  );
}

function ExerciseCard({
  log,
  entry,
  entryIndex,
  target,
  unit,
}: {
  log: WorkoutLog;
  entry: ExerciseLog;
  entryIndex: number;
  target: ExerciseTarget | undefined;
  unit: 'lb' | 'kg';
}) {
  const updateSet = useTrackerStore((s) => s.updateSet);
  const addSet = useTrackerStore((s) => s.addSet);
  const removeSet = useTrackerStore((s) => s.removeSet);

  const usesWeight = target ? !['bodyweight', 'band'].includes(target.exercise.load) : true;
  const name = target?.exercise.name ?? entry.exerciseId;
  const s = target?.suggestion;
  const first = s?.reason === 'first_time' && !target?.deload;

  return (
    <Card style={{ gap: Spacing.sm }}>
      <AppText variant="label">{name}</AppText>
      {target ? (
        <>
          <AppText variant="small">
            Target:{' '}
            {first
              ? `${target.pe.repMin}–${target.pe.repMax}${target.exercise.timed ? ' s' : ' reps'}`
              : fmtTarget(target.weight, target.reps, unit, target.exercise.timed)}{' '}
            · {target.exercise.timed ? target.rir : `RIR ${target.rir}`}
          </AppText>
          <AppText variant="small" tone="muted">
            {target.deload ? 'Deload: keep it easy and crisp.' : REASON_TEXT[s!.reason]}
          </AppText>
          {s?.last ? (
            <AppText variant="small" tone="muted">
              Last time: {fmtSets(s.last, unit)}
            </AppText>
          ) : null}
          {s?.stalled && !target.deload ? (
            <Callout tone="warning">
              <AppText variant="small" tone="secondary">
                {STALL_TEXT}
              </AppText>
            </Callout>
          ) : null}
        </>
      ) : (
        <AppText variant="small" tone="muted">
          No longer in your plan.
        </AppText>
      )}

      <View style={{ gap: Spacing.xs, marginTop: Spacing.xs }}>
        <View style={styles.setHeader}>
          <AppText variant="small" tone="muted" style={{ width: 36 }}>
            Set
          </AppText>
          {usesWeight ? (
            <AppText variant="small" tone="muted" style={{ flex: 1 }}>
              {unit}
            </AppText>
          ) : null}
          <AppText variant="small" tone="muted" style={{ flex: 1 }}>
            {target?.exercise.timed ? 'Seconds' : 'Reps'}
          </AppText>
          <View style={{ width: 44 }} />
        </View>
        {entry.sets.map((set, i) => {
          const doneSet = set.reps !== null && set.reps > 0;
          const tWeight = target?.weight ?? null;
          const tReps = target?.reps[i] ?? target?.reps.at(-1) ?? null;
          return (
            <View key={i} style={[styles.setRow, doneSet && { backgroundColor: Colors.progressSoft }]}>
              <AppText variant="label" style={{ width: 36, textAlign: 'center' }}>
                {i + 1}
              </AppText>
              {usesWeight ? (
                <NumberInput
                  label={`Set ${i + 1} weight`}
                  value={set.weight}
                  placeholder={tWeight !== null ? fmtNum(tWeight) : '—'}
                  decimals
                  onChange={(weight) => updateSet(log.id, entryIndex, i, { weight, unit })}
                />
              ) : null}
              <NumberInput
                label={`Set ${i + 1} reps`}
                value={set.reps}
                placeholder={tReps !== null && !first ? String(tReps) : '—'}
                onChange={(reps) => updateSet(log.id, entryIndex, i, { reps })}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={doneSet ? `Clear set ${i + 1}` : `Log set ${i + 1} as target`}
                onPress={() =>
                  doneSet
                    ? updateSet(log.id, entryIndex, i, { reps: null })
                    : updateSet(log.id, entryIndex, i, {
                        reps: set.reps ?? (first ? null : tReps),
                        weight: set.weight ?? (usesWeight ? tWeight : null),
                        unit,
                      })
                }
                style={[styles.check, doneSet && { backgroundColor: Colors.chartLine, borderColor: Colors.chartLine }]}>
                <AppText variant="label" style={{ color: doneSet ? Colors.background : Colors.textSecondary }}>
                  ✓
                </AppText>
              </Pressable>
            </View>
          );
        })}
        <View style={{ flexDirection: 'row', gap: Spacing.lg, marginTop: Spacing.xs }}>
          <Pressable accessibilityRole="button" onPress={() => addSet(log.id, entryIndex)} hitSlop={8}>
            <AppText variant="small" tone="accent" style={{ fontWeight: '600' }}>
              + Add set
            </AppText>
          </Pressable>
          {entry.sets.length > 1 ? (
            <Pressable accessibilityRole="button" onPress={() => removeSet(log.id, entryIndex, entry.sets.length - 1)} hitSlop={8}>
              <AppText variant="small" tone="secondary">
                Remove last set
              </AppText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

function NumberInput({
  label,
  value,
  placeholder,
  onChange,
  decimals = false,
}: {
  label: string;
  value: number | null;
  placeholder: string;
  onChange: (n: number | null) => void;
  decimals?: boolean;
}) {
  // Keep the raw text while typing so "37." doesn't get eaten before the "5".
  const [text, setText] = useState(value === null ? '' : fmtNum(value));
  // Sync when the value changes from outside (the ✓ button fills in the target) — adjusted during render.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    const parsed = text === '' ? null : Number(text);
    if (parsed !== value) setText(value === null ? '' : fmtNum(value));
  }
  return (
    <TextInput
      accessibilityLabel={label}
      value={text}
      placeholder={placeholder}
      placeholderTextColor={Colors.textMuted}
      keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
      inputMode={decimals ? 'decimal' : 'numeric'}
      onChangeText={(t) => {
        const cleaned = t.replace(decimals ? /[^0-9.]/g : /[^0-9]/g, '');
        setText(cleaned);
        const n = Number(cleaned);
        onChange(cleaned === '' || !Number.isFinite(n) ? null : n);
      }}
      onBlur={() => setText(value === null ? '' : fmtNum(value))}
      style={styles.input}
    />
  );
}

const styles = {
  previewRow: {
    flexDirection: 'row' as const,
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  setHeader: { flexDirection: 'row' as const, gap: Spacing.sm, paddingHorizontal: Spacing.xs },
  setRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: Spacing.sm,
    padding: Spacing.xs,
    borderRadius: Radius.sm,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.background,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  check: {
    width: 44,
    height: 44,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
};
