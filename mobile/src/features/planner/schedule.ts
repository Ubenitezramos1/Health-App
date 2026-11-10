import { DEFAULT_WEEKDAYS, REST_DAY_TEXT } from './rules';
import type { Plan, PlanDay } from './types';

export const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const WEEKDAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export type WeekSlot = {
  /** "Day 3" (loose) or "Wednesday" (days / exact). */
  title: string;
  /** "6:30 PM" for exact schedules. */
  time?: string;
  day: PlanDay | null;
  restText: string;
};

/** Keep chosen weekdays valid for the day count: reuse what fits, otherwise fall back to defaults. */
export function normalizeWeekdays(weekdays: number[], daysPerWeek: number): number[] {
  const unique = [...new Set(weekdays)].filter((d) => d >= 0 && d <= 6).sort((a, b) => a - b);
  return unique.length === daysPerWeek ? unique : DEFAULT_WEEKDAYS[daysPerWeek];
}

export function formatTime(hhmm: string | undefined): string | undefined {
  if (!hhmm) return undefined;
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return undefined;
  const h = Number(m[1]);
  const suffix = h >= 12 ? 'PM' : 'AM';
  return `${((h + 11) % 12) + 1}:${m[2]} ${suffix}`;
}

export const isValidTime = (v: string) => /^([01]?\d|2[0-3]):[0-5]\d$/.test(v);

/** The 7-day view for the chosen schedule type. Training days keep plan order. */
export function weekView(plan: Plan): WeekSlot[] {
  const { scheduleType, weekdays, times } = plan.settings;
  const training = normalizeWeekdays(weekdays, plan.days.length);
  let next = 0;
  return WEEKDAY_NAMES.map((name, i) => {
    const isTraining = training.includes(i);
    const day = isTraining ? (plan.days[next++] ?? null) : null;
    return {
      title: scheduleType === 'loose' ? `Day ${i + 1}` : name,
      time: scheduleType === 'exact' && day ? formatTime(times[i] ?? '18:00') : undefined,
      day,
      restText: REST_DAY_TEXT,
    };
  });
}
