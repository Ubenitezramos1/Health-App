import { getExercise } from '@/features/planner/exercises';
import { MUSCLES, MUSCLE_LABELS } from '@/features/planner/muscles';
import { WEEKDAY_NAMES, formatTime, normalizeWeekdays } from '@/features/planner/schedule';
import type { Plan, PlanDay } from '@/features/planner/types';
import type { WeightUnit } from '@/features/profile/units';
import type { ScanRecord } from '@/features/scanner/types';
import { currentWeek, findLog, insights, isDeloadWeek, liftingDays } from '@/features/tracker/sessions';
import type { TrackerSettings, WorkoutLog } from '@/features/tracker/types';

/** Monday = 0 … Sunday = 6 (matches plan weekdays). */
export const weekdayIndex = (d: Date) => (d.getDay() + 6) % 7;

export type NextWorkout = {
  week: number;
  deload: boolean;
  /** Next workout to do this training week, or null when the week is complete. */
  day: PlanDay | null;
  dayNumber: number;
  inProgress: boolean;
  doneThisWeek: number;
  totalThisWeek: number;
  /** For set-day / exact schedules: what the calendar says about today. */
  schedule: { todayIsTraining: boolean; when: string | null; nextTrainingDay: string | null } | null;
};

export function nextWorkout(plan: Plan, logs: WorkoutLog[], settings: TrackerSettings, now = new Date()): NextWorkout {
  const week = currentWeek(plan, logs);
  const days = liftingDays(plan);
  const status = days.map((d) => findLog(logs, plan.id, week, d.id));
  const idx = status.findIndex((l) => !l?.completedAt);
  const day = idx >= 0 ? days[idx] : null;

  let schedule: NextWorkout['schedule'] = null;
  if (plan.settings.scheduleType !== 'loose') {
    const training = normalizeWeekdays(plan.settings.weekdays, plan.days.length);
    const today = weekdayIndex(now);
    const todayIsTraining = training.includes(today);
    const upcoming = training.find((d) => d > today) ?? training[0];
    const time = plan.settings.scheduleType === 'exact' ? formatTime(plan.settings.times[today] ?? '18:00') : null;
    schedule = {
      todayIsTraining,
      when: todayIsTraining ? (time ? `Today at ${time}` : 'Today') : null,
      nextTrainingDay: todayIsTraining ? null : WEEKDAY_NAMES[upcoming],
    };
  }

  return {
    week,
    deload: isDeloadWeek(plan, week, settings),
    day,
    dayNumber: idx + 1,
    inProgress: idx >= 0 && !!status[idx] && !status[idx]!.completedAt,
    doneThisWeek: status.filter((l) => l?.completedAt).length,
    totalThisWeek: days.length,
    schedule,
  };
}

export type Tip = { tone: 'warning' | 'info' | 'progress'; title: string; body: string; action?: 'deload' | 'progress' | 'scan' };

/** The 1–2 most useful things to tell the user right now, most important first. */
export function topTips(
  plan: Plan,
  logs: WorkoutLog[],
  settings: TrackerSettings,
  unit: WeightUnit,
  latestScan: ScanRecord | undefined,
  now = new Date(),
): Tip[] {
  const tips: Tip[] = [];
  const { exercises, deload } = insights(plan, logs, settings, unit);
  if (deload)
    tips.push({ tone: 'warning', title: `Deload suggested for week ${deload.week}`, body: deload.reason, action: 'deload' });

  const ready = exercises.filter((e) => e.suggestion.reason === 'add_weight');
  if (ready.length)
    tips.push({
      tone: 'progress',
      title: 'Ready to add weight',
      body: ready.map((e) => getExercise(e.exerciseId).name).slice(0, 3).join(', ') + (ready.length > 3 ? ` +${ready.length - 3} more` : ''),
      action: 'progress',
    });

  const stalled = exercises.filter((e) => e.suggestion.stalled);
  if (stalled.length && !deload)
    tips.push({
      tone: 'warning',
      title: 'Stalled lift',
      body: `${getExercise(stalled[0].exerciseId).name} hasn't moved in 2 sessions — see Progress for options.`,
      action: 'progress',
    });

  const scanAgeDays = latestScan ? (now.getTime() - new Date(latestScan.takenAt).getTime()) / 86_400_000 : null;
  if (scanAgeDays === null)
    tips.push({ tone: 'info', title: 'Add a physique scan', body: 'Two photos tell your plan what to prioritize. Optional.', action: 'scan' });
  else if (scanAgeDays > plan.blockWeeks * 7)
    tips.push({ tone: 'info', title: 'Time for a new scan', body: `Your last scan is ${Math.floor(scanAgeDays / 7)} weeks old.`, action: 'scan' });

  return tips.slice(0, 2);
}

export function priorityMuscles(plan: Plan): string[] {
  return MUSCLES.filter((m) => plan.volume[m].tier === 'priority').map((m) => MUSCLE_LABELS[m]);
}

export function weekSets(plan: Plan, logs: WorkoutLog[], week: number): number {
  return logs
    .filter((l) => l.planId === plan.id && l.week === week)
    .flatMap((l) => l.entries.flatMap((e) => e.sets))
    .filter((s) => s.reps).length;
}

export function greeting(now = new Date()): string {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
}
