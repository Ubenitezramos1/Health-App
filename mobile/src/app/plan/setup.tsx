import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { goBack } from '@/components/navigation';
import { Screen } from '@/components/screen';
import {
  AppText,
  Button,
  Callout,
  Chip,
  FieldError,
  OptionCards,
  Section,
  Segmented,
  TextField,
} from '@/components/ui';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { dayOptions, defaultSettings } from '@/features/planner/engine';
import { DEFAULT_WEEKDAYS } from '@/features/planner/rules';
import { WEEKDAY_NAMES, WEEKDAY_SHORT, isValidTime } from '@/features/planner/schedule';
import { usePlanStore } from '@/features/planner/store';
import type { PlanSettings } from '@/features/planner/types';
import { needsMedicalClearance } from '@/features/profile/schema';
import { useProfileStore } from '@/features/profile/store';

const STYLE_OPTIONS = [
  {
    id: 'efficient',
    label: 'Efficient (less is more)',
    description: '2 hard sets on main lifts, 2–3 on accessories, close to failure. Shortest sessions.',
  },
  { id: 'full', label: 'Full volume', description: 'More weekly sets for maximum muscle growth. Longer sessions.' },
] as const;

const SCHEDULE_OPTIONS = [
  { id: 'loose', label: 'Loose', description: 'Day 1, Day 2… in order. Train whenever it fits your week.' },
  { id: 'days', label: 'Set days', description: 'Pick the weekdays you train (for example Mon / Wed / Fri).' },
  { id: 'exact', label: 'Exact times', description: 'Set days plus a time for each session.' },
] as const;

const DELOAD_OPTIONS = [
  { id: 'on', label: 'Planned deloads on' },
  { id: 'off', label: 'Off' },
] as const;

/** Settings that change the workouts themselves (everything else only changes the calendar). */
const structural = (a: PlanSettings, b: PlanSettings) =>
  a.style !== b.style ||
  a.daysPerWeek !== b.daysPerWeek ||
  a.deloadEnabled !== b.deloadEnabled ||
  a.clearanceConfirmed !== b.clearanceConfirmed;

export default function PlanSetup() {
  const profile = useProfileStore((s) => s.profile);
  const plan = usePlanStore((s) => s.plan);
  const build = usePlanStore((s) => s.build);
  const save = usePlanStore((s) => s.save);
  const [settings, setSettings] = useState<PlanSettings | null>(() =>
    plan ? plan.settings : profile ? defaultSettings(profile) : null,
  );
  const [error, setError] = useState<string>();

  if (!profile || !settings) return <Redirect href="/" />;

  const recommended = defaultSettings(profile);
  const patch = (p: Partial<PlanSettings>) => {
    setError(undefined);
    setSettings({ ...settings, ...p });
  };
  const flagged = needsMedicalClearance(profile);
  const rebuildNeeded = !plan || structural(plan.settings, settings);

  const toggleWeekday = (d: number) => {
    const has = settings.weekdays.includes(d);
    patch({ weekdays: has ? settings.weekdays.filter((x) => x !== d) : [...settings.weekdays, d].sort((a, b) => a - b) });
  };

  const submit = () => {
    if (settings.scheduleType !== 'loose' && settings.weekdays.length !== settings.daysPerWeek)
      return setError(`Pick exactly ${settings.daysPerWeek} training day${settings.daysPerWeek > 1 ? 's' : ''}`);
    if (settings.scheduleType === 'exact') {
      const bad = settings.weekdays.find((d) => settings.times[d] && !isValidTime(settings.times[d]));
      if (bad !== undefined) return setError(`Enter ${WEEKDAY_NAMES[bad]}'s time as HH:MM (24-hour), like 18:30`);
    }
    if (rebuildNeeded) build(profile, settings);
    else if (plan) save({ ...plan, settings, updatedAt: new Date().toISOString() });
    router.dismissTo('/plan');
  };

  return (
    <Screen
      footer={
        <View style={{ gap: Spacing.sm }}>
          <FieldError message={error} />
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            <Button label="Cancel" variant="secondary" onPress={() => goBack('/plan')} style={{ flex: 1 }} />
            <Button
              label={!plan ? 'Build my plan' : rebuildNeeded ? 'Rebuild plan' : 'Save schedule'}
              onPress={submit}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      }>
      <View style={{ marginBottom: Spacing.xl, gap: Spacing.xs }}>
        <AppText variant="title">{plan ? 'Plan settings' : 'Build your plan'}</AppText>
        <AppText tone="secondary">Based on your profile. You can change all of this later.</AppText>
      </View>

      <Section title="Training days per week" hint="From your availability answer.">
        <Segmented
          options={dayOptions(profile).map((n) => ({ id: String(n), label: `${n} day${n > 1 ? 's' : ''}` }))}
          value={String(settings.daysPerWeek)}
          onChange={(v) => patch({ daysPerWeek: Number(v), weekdays: DEFAULT_WEEKDAYS[Number(v)] })}
        />
      </Section>

      <Section
        title="Plan style"
        hint={`Recommended for you: ${recommended.style === 'efficient' ? 'Efficient' : 'Full volume'}.`}>
        <OptionCards options={STYLE_OPTIONS} value={settings.style} onChange={(style) => patch({ style })} />
      </Section>

      <Section title="Schedule">
        <OptionCards
          options={SCHEDULE_OPTIONS}
          value={settings.scheduleType}
          onChange={(scheduleType) => patch({ scheduleType })}
        />
      </Section>

      {settings.scheduleType !== 'loose' ? (
        <Section title="Which days?" hint={`Pick ${settings.daysPerWeek}. Rest days get walking, cardio, or stretching.`}>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
            {WEEKDAY_SHORT.map((name, d) => (
              <Chip key={name} label={name} selected={settings.weekdays.includes(d)} onPress={() => toggleWeekday(d)} />
            ))}
          </View>
        </Section>
      ) : null}

      {settings.scheduleType === 'exact' ? (
        <Section title="Session times" hint="24-hour time. Adjust anytime around work or life.">
          {settings.weekdays.map((d) => (
            <View key={d} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
              <AppText style={{ width: 100 }}>{WEEKDAY_NAMES[d]}</AppText>
              <TextField
                placeholder="18:00"
                value={settings.times[d] ?? ''}
                onChangeText={(t) => patch({ times: { ...settings.times, [d]: t.trim() } })}
                maxLength={5}
                inputMode="numeric"
              />
            </View>
          ))}
        </Section>
      ) : null}

      <Section
        title="Deload weeks"
        hint={`An easier week (about half the sets) every ${profile.experience === 'none' || profile.experience === 'beginner' ? 8 : 6} weeks to shed fatigue.`}>
        <Segmented
          options={DELOAD_OPTIONS}
          value={settings.deloadEnabled ? 'on' : 'off'}
          onChange={(v) => patch({ deloadEnabled: v === 'on' })}
        />
      </Section>

      {flagged ? (
        <Section title="Medical clearance">
          <Callout tone="warning">
            <AppText variant="small" tone="secondary">
              Your answers suggest checking with a doctor before training. Until you confirm clearance, your
              plan sticks to lower-risk exercises.
            </AppText>
          </Callout>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: settings.clearanceConfirmed }}
            onPress={() => patch({ clearanceConfirmed: !settings.clearanceConfirmed })}
            style={{ flexDirection: 'row', gap: Spacing.md, alignItems: 'center', paddingVertical: Spacing.sm }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: Radius.sm - 2,
                borderWidth: 2,
                borderColor: settings.clearanceConfirmed ? Colors.accent : Colors.borderStrong,
                backgroundColor: settings.clearanceConfirmed ? Colors.accent : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              {settings.clearanceConfirmed ? <AppText style={{ color: Colors.onAccent }}>✓</AppText> : null}
            </View>
            <AppText style={{ flex: 1 }}>My doctor cleared me for exercise</AppText>
          </Pressable>
        </Section>
      ) : null}

      {plan?.customized && rebuildNeeded ? (
        <Callout tone="warning">
          <AppText variant="small" tone="secondary">
            Rebuilding replaces the changes you made to exercises.
          </AppText>
        </Callout>
      ) : null}
    </Screen>
  );
}
