import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { goBack } from '@/components/navigation';
import { Screen } from '@/components/screen';
import { AppText, Badge, Button, Stepper } from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { moveExercise, removeExercise, setReps, setSets } from '@/features/planner/edits';
import { getExercise } from '@/features/planner/exercises';
import { usePlanStore } from '@/features/planner/store';
import type { PlanExercise } from '@/features/planner/types';

const formatRest = (sec: number) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

const ROLE_LABEL = { main: 'Main lift', secondary: 'Secondary', accessory: 'Accessory' } as const;

export default function DayEditor() {
  const { dayId } = useLocalSearchParams<{ dayId: string }>();
  const plan = usePlanStore((s) => s.plan);
  const save = usePlanStore((s) => s.save);
  const [open, setOpen] = useState<string | null>(null);

  const day = plan?.days.find((d) => d.id === dayId);
  if (!plan || !day) return <Redirect href="/plan" />;

  return (
    <Screen
      footer={
        <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
          <Button label="Back" variant="secondary" onPress={() => goBack('/plan')} style={{ flex: 1 }} />
          {day.type !== 'recovery' ? (
            <Button
              label="Add exercise"
              onPress={() => router.push({ pathname: '/plan/add/[dayId]', params: { dayId: day.id } })}
              style={{ flex: 2 }}
            />
          ) : null}
        </View>
      }>
      <View style={{ gap: Spacing.xs, marginBottom: Spacing.xl }}>
        <AppText variant="title">{day.label}</AppText>
        <AppText tone="secondary">
          {day.type === 'recovery'
            ? 'Light day: 20–40 min of walking or easy cycling, plus mobility and stretching.'
            : `${day.exercises.length} exercises · ~${day.estMinutes} min including warm-up. Tap an exercise to edit or swap it.`}
        </AppText>
      </View>

      <View style={{ gap: Spacing.sm }}>
        {day.exercises.map((pe, i) => {
          const pairedWithPrev = !!pe.supersetGroup && day.exercises[i - 1]?.supersetGroup === pe.supersetGroup;
          return (
            <View key={pe.id}>
              {pe.supersetGroup && !pairedWithPrev ? (
                <AppText variant="small" tone="accent" style={{ fontWeight: '600', marginBottom: Spacing.xs }}>
                  Superset — alternate sets, rest after each pair
                </AppText>
              ) : null}
              <ExerciseRow
                pe={pe}
                expanded={open === pe.id}
                inSuperset={!!pe.supersetGroup}
                onToggle={() => setOpen(open === pe.id ? null : pe.id)}
                onSets={(n) => save(setSets(plan, day.id, pe.id, n))}
                onReps={(min, max) => save(setReps(plan, day.id, pe.id, min, max))}
                onMove={(delta) => save(moveExercise(plan, day.id, pe.id, delta))}
                onRemove={() => {
                  setOpen(null);
                  save(removeExercise(plan, day.id, pe.id));
                }}
                onSwap={() =>
                  router.push({ pathname: '/plan/swap/[dayId]/[exId]', params: { dayId: day.id, exId: pe.id } })
                }
                isFirst={i === 0}
                isLast={i === day.exercises.length - 1}
              />
            </View>
          );
        })}
      </View>
    </Screen>
  );
}

function ExerciseRow({
  pe,
  expanded,
  inSuperset,
  onToggle,
  onSets,
  onReps,
  onMove,
  onRemove,
  onSwap,
  isFirst,
  isLast,
}: {
  pe: PlanExercise;
  expanded: boolean;
  inSuperset: boolean;
  onToggle: () => void;
  onSets: (n: number) => void;
  onReps: (min: number, max: number) => void;
  onMove: (delta: -1 | 1) => void;
  onRemove: () => void;
  onSwap: () => void;
  isFirst: boolean;
  isLast: boolean;
}) {
  const e = getExercise(pe.exerciseId);
  const unit = e.timed ? 's' : '';
  return (
    <View
      style={{
        borderRadius: Radius.md,
        borderWidth: 1,
        borderColor: expanded ? Colors.accent : Colors.border,
        borderLeftWidth: inSuperset ? 3 : 1,
        borderLeftColor: inSuperset ? Colors.accent : expanded ? Colors.accent : Colors.border,
        backgroundColor: Colors.surface,
      }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={onToggle}
        style={{ padding: Spacing.lg, gap: Spacing.xs }}>
        <View style={{ flexDirection: 'row', gap: Spacing.sm, alignItems: 'center', flexWrap: 'wrap' }}>
          <AppText variant="label" style={{ flexShrink: 1 }}>
            {e.name}
          </AppText>
          <Badge label={ROLE_LABEL[pe.role]} tone={pe.role === 'main' ? 'accent' : 'muted'} />
        </View>
        <AppText variant="small" tone="secondary">
          {pe.sets} × {pe.repMin}–{pe.repMax}
          {unit} · {e.timed ? pe.rir : `RIR ${pe.rir}`} · rest {formatRest(pe.restSec)}
        </AppText>
        {pe.notes.map((n) => (
          <AppText key={n} variant="small" tone="muted">
            {n}
          </AppText>
        ))}
      </Pressable>

      {expanded ? (
        <View style={{ padding: Spacing.lg, paddingTop: 0, gap: Spacing.md }}>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Stepper label="Sets" value={pe.sets} onChange={onSets} min={1} max={6} />
            <Stepper
              label={e.timed ? 'Min sec' : 'Min reps'}
              value={pe.repMin}
              onChange={(n) => onReps(n, Math.max(n, pe.repMax))}
              min={1}
              max={e.timed ? 120 : 30}
            />
            <Stepper
              label={e.timed ? 'Max sec' : 'Max reps'}
              value={pe.repMax}
              onChange={(n) => onReps(Math.min(pe.repMin, n), n)}
              min={1}
              max={e.timed ? 180 : 40}
            />
          </View>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Swap" variant="secondary" onPress={onSwap} style={{ flex: 1 }} />
            <Button label="↑" variant="secondary" onPress={() => !isFirst && onMove(-1)} style={{ width: 52, paddingHorizontal: 0 }} />
            <Button label="↓" variant="secondary" onPress={() => !isLast && onMove(1)} style={{ width: 52, paddingHorizontal: 0 }} />
            <Button label="Remove" variant="ghost" onPress={onRemove} style={{ flex: 1 }} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
