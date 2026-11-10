import { View } from 'react-native';

import { AppText, ChipGroup, FieldError, OptionCards, Section, TextField } from '@/components/ui';
import { FOCUS_BODY, FOCUS_HEALTH, FOCUS_SKILLS, GOALS, type Goal } from '@/features/profile/options';

import type { StepProps } from '../types';

export function FocusStep({ draft, update, errors }: StepProps) {
  const focus = draft.focus ?? { body: [], skills: [], health: [], other: '' };
  return (
    <View>
      <Section title="Body" hint="Areas you want to build or improve.">
        <ChipGroup options={FOCUS_BODY} value={focus.body} onChange={(body) => update({ focus: { ...focus, body } })} />
      </Section>
      <Section title="Skills">
        <ChipGroup
          options={FOCUS_SKILLS}
          value={focus.skills}
          onChange={(skills) => update({ focus: { ...focus, skills } })}
        />
      </Section>
      <Section title="Health and wellbeing">
        <ChipGroup
          options={FOCUS_HEALTH}
          value={focus.health}
          onChange={(health) => update({ focus: { ...focus, health } })}
        />
      </Section>
      <Section title="Anything else?">
        <TextField
          placeholder="Something not listed"
          value={focus.other}
          onChangeText={(other) => update({ focus: { ...focus, other } })}
          maxLength={120}
        />
        <FieldError message={errors['focus.other']} />
      </Section>
      <AppText variant="small" tone="muted">
        Optional. Areas you pick here are always prioritized in your plan, even if the physique scan says
        they&apos;re already strong.
      </AppText>
    </View>
  );
}

export function GoalsStep({ draft, update, errors }: StepProps) {
  const goals = draft.goals ?? [];
  const selectedGoalOptions = GOALS.filter((g) => goals.includes(g.id));

  const setGoals = (next: Goal[]) => {
    // Keep the primary goal valid: clear it if deselected, auto-pick when only one goal is chosen.
    let primaryGoal = draft.primaryGoal && next.includes(draft.primaryGoal) ? draft.primaryGoal : undefined;
    if (!primaryGoal && next.length === 1) primaryGoal = next[0];
    update({ goals: next, primaryGoal });
  };

  return (
    <View>
      <Section title="What are your goals?" hint="Select all that apply.">
        <ChipGroup options={GOALS} value={goals} onChange={setGoals} />
        <TextField
          placeholder="Other goal"
          value={draft.goalsOther ?? ''}
          onChangeText={(goalsOther) => update({ goalsOther })}
          maxLength={120}
        />
        <FieldError message={errors.goals ?? errors.goalsOther} />
      </Section>

      {selectedGoalOptions.length > 1 ? (
        <Section title="Which one matters most?" hint="Your main goal sets rep ranges and training style.">
          <OptionCards
            options={selectedGoalOptions}
            value={draft.primaryGoal}
            onChange={(primaryGoal) => update({ primaryGoal })}
          />
        </Section>
      ) : null}
      <FieldError message={errors.primaryGoal} />
    </View>
  );
}
