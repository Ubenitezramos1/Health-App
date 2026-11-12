/**
 * Planner rule tables. Every number here comes from docs/planner-rules.md —
 * change them there first, then here.
 */
import type { Availability, Experience, Goal, SessionLength } from '@/features/profile/options';

import type { Pattern } from './exercises';
import type { Muscle, Tier } from './muscles';
import type { DayType, PlanStyle, SlotRole } from './types';

export type Level = 'beginner' | 'intermediate' | 'advanced';

export const levelOf = (e: Experience): Level =>
  e === 'none' || e === 'beginner' ? 'beginner' : e === 'intermediate' ? 'intermediate' : 'advanced';

/* ---------- Weekly volume (fractional sets per muscle) — rules §3 ---------- */

type Range = readonly [number, number];
type VolumeTable = Record<Level, Record<Tier, Range>>;

const EFFICIENT_VOLUME: VolumeTable = {
  beginner: { maintain: [3, 4], standard: [4, 6], priority: [6, 9] },
  intermediate: { maintain: [3, 4], standard: [6, 8], priority: [8, 12] },
  advanced: { maintain: [4, 4], standard: [6, 9], priority: [9, 12] },
};

const FULL_VOLUME: VolumeTable = {
  beginner: { maintain: [3, 4], standard: [6, 10], priority: [10, 12] },
  intermediate: { maintain: [4, 6], standard: [10, 14], priority: [14, 18] },
  advanced: { maintain: [5, 6], standard: [12, 16], priority: [16, 20] },
};

/** Calves and core recover fast but matter less for most goals: cap them at the standard range. */
const MINOR_MUSCLES: Muscle[] = ['calves', 'core'];

export function volumeTargets(style: PlanStyle, level: Level, tier: Tier, muscle: Muscle, age: number) {
  const table = style === 'efficient' ? EFFICIENT_VOLUME : FULL_VOLUME;
  const effectiveTier = MINOR_MUSCLES.includes(muscle) && tier === 'priority' ? 'standard' : tier;
  const [low, high] = table[level][effectiveTier];
  const olderBonus = age >= 50 ? 2 : 0; // older adults need more to maintain (Bickel 2011)
  const floor = table[level].maintain[0] + olderBonus;
  // First block starts at the bottom of the range (rules §3).
  const target = Math.max(low, floor);
  return { target, ceiling: Math.max(high, target), floor };
}

/** Sets per exercise allowed by style and role — rules §3.2 / §3b. */
export function setBounds(style: PlanStyle, role: SlotRole, unloaded = false) {
  // Bodyweight/band sets can't be made heavier on the spot, so each needs more company: always 3 sets.
  // If time is short, the planner drops whole exercises rather than going below 3 (user's choice).
  if (unloaded) return style === 'efficient' ? { min: 3, max: 3, base: 3 } : { min: 3, max: 4, base: 3 };
  if (style === 'efficient') return role === 'accessory' ? { min: 2, max: 3, base: 2 } : { min: 2, max: 2, base: 2 };
  return role === 'accessory' ? { min: 2, max: 4, base: 3 } : { min: 2, max: 4, base: 3 };
}

/* ---------- Time — rules §3 time budget ---------- */

export const SESSION_BUDGET_MIN: Record<SessionLength, number> = { short: 55, medium: 85, long: 110 };
export const WARMUP_MIN = 8;

/* ---------- Goal → reps, effort, rest — rules §4 ---------- */

export type GoalProfile = 'hypertrophy' | 'strength' | 'endurance' | 'athletic' | 'general';

export function goalProfileOf(goal: Goal): GoalProfile {
  switch (goal) {
    case 'build_muscle':
    case 'lose_fat':
    case 'recomp':
      return 'hypertrophy';
    case 'get_stronger':
      return 'strength';
    case 'endurance':
      return 'endurance';
    case 'athletic':
      return 'athletic';
    default:
      return 'general';
  }
}

const REPS: Record<GoalProfile, Record<SlotRole, Range>> = {
  hypertrophy: { main: [6, 10], secondary: [8, 12], accessory: [10, 15] },
  strength: { main: [3, 6], secondary: [6, 10], accessory: [8, 12] },
  endurance: { main: [10, 15], secondary: [12, 15], accessory: [12, 20] },
  athletic: { main: [3, 6], secondary: [6, 10], accessory: [8, 12] },
  general: { main: [8, 12], secondary: [8, 12], accessory: [10, 15] },
};

/**
 * Bodyweight/band rep windows. Muscle grows across ~6–30 reps when sets end near failure (Lopez 2021;
 * Schoenfeld 2015 25–35RM ≈ 8–12RM in trained men), but very light loads underperform (Lasevicius 2018).
 * So reps float inside a window, effort is fixed, and passing the top means "make it harder".
 */
const UNLOADED_REPS: Record<GoalProfile, Range> = {
  hypertrophy: [8, 25],
  general: [8, 25],
  strength: [5, 15],
  athletic: [5, 15],
  endurance: [12, 30],
};

export const UNLOADED_RIR = '1–2 short of failure, last set to failure';

export function prescription(
  goal: GoalProfile,
  style: PlanStyle,
  role: SlotRole,
  opts: { timed?: boolean; unloaded?: boolean } = {},
) {
  const { timed = false, unloaded = false } = opts;
  if (unloaded && !timed) {
    const [repMin, repMax] = UNLOADED_REPS[goal];
    return { repMin, repMax, rir: UNLOADED_RIR, restSec: role === 'accessory' ? 75 : 105 };
  }
  const [repMin, repMax] = timed ? ([30, 45] as const) : REPS[goal][role];
  const heavyMain = role === 'main' && (goal === 'strength' || goal === 'athletic');
  const rir = timed
    ? 'Stop before form breaks'
    : heavyMain
    ? '2–3'
    : role === 'accessory'
      ? style === 'efficient'
        ? '0–1 on last set'
        : '1–2'
      : style === 'efficient'
        ? '1–2'
        : '1–3';
  const restSec =
    goal === 'endurance'
      ? role === 'accessory'
        ? 60
        : 90
      : role === 'accessory'
        ? style === 'efficient'
          ? 75
          : 90
        : heavyMain
          ? 180
          : 150;
  return { repMin, repMax, rir, restSec };
}

/* ---------- Split selection — rules §5 ---------- */

export const DAY_OPTIONS: Record<Availability, number[]> = { low: [1, 2, 3], medium: [4, 5], high: [6, 7] };
export const DEFAULT_DAYS: Record<Availability, number> = { low: 3, medium: 4, high: 6 };

export const DEFAULT_WEEKDAYS: Record<number, number[]> = {
  1: [0],
  2: [0, 3],
  3: [0, 2, 4],
  4: [0, 1, 3, 4],
  5: [0, 1, 2, 4, 5],
  6: [0, 1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
};

export function splitFor(days: number, level: Level): DayType[] {
  switch (days) {
    case 1:
      return ['full_a'];
    case 2:
      return ['full_a', 'full_b'];
    case 3:
      return level === 'beginner' ? ['full_a', 'full_b', 'full_a'] : ['upper', 'lower', 'full_a'];
    case 4:
      return ['upper', 'lower', 'upper', 'lower'];
    case 5:
      return level === 'beginner'
        ? ['upper', 'lower', 'full_a', 'upper', 'lower']
        : ['upper', 'lower', 'push', 'pull', 'legs'];
    case 6:
      return ['push', 'pull', 'legs', 'push', 'pull', 'legs'];
    default:
      return ['push', 'pull', 'legs', 'push', 'pull', 'legs', 'recovery'];
  }
}

export const SPLIT_NAMES: Record<number, Record<Level, string>> = {
  1: { beginner: 'Full body', intermediate: 'Full body', advanced: 'Full body' },
  2: { beginner: 'Full body A / B', intermediate: 'Full body A / B', advanced: 'Full body A / B' },
  3: { beginner: 'Full body A / B / A', intermediate: 'Upper / Lower / Full', advanced: 'Upper / Lower / Full' },
  4: { beginner: 'Upper / Lower ×2', intermediate: 'Upper / Lower ×2', advanced: 'Upper / Lower ×2' },
  5: {
    beginner: 'Upper / Lower / Full / Upper / Lower',
    intermediate: 'Upper / Lower + Push / Pull / Legs',
    advanced: 'Upper / Lower + Push / Pull / Legs',
  },
  6: { beginner: 'Push / Pull / Legs ×2', intermediate: 'Push / Pull / Legs ×2', advanced: 'Push / Pull / Legs ×2' },
  7: {
    beginner: 'Push / Pull / Legs ×2 + recovery day',
    intermediate: 'Push / Pull / Legs ×2 + recovery day',
    advanced: 'Push / Pull / Legs ×2 + recovery day',
  },
};

export type Slot = { pattern: Pattern; role: SlotRole };

const s = (pattern: Pattern, role: SlotRole): Slot => ({ pattern, role });

/** Movement slots per day type, in default session order. */
export const TEMPLATES: Record<DayType, Slot[]> = {
  full_a: [
    s('squat', 'main'),
    s('horizontal_push', 'main'),
    s('vertical_pull', 'main'),
    s('hinge', 'secondary'),
    s('side_delt_iso', 'accessory'),
    s('triceps_iso', 'accessory'),
    s('biceps_iso', 'accessory'),
    s('calf', 'accessory'),
    s('core', 'accessory'),
  ],
  full_b: [
    s('hinge', 'main'),
    s('horizontal_push', 'main'),
    s('horizontal_pull', 'main'),
    s('lunge', 'secondary'),
    s('vertical_push', 'secondary'),
    s('rear_delt_iso', 'accessory'),
    s('hamstring_iso', 'accessory'),
    s('biceps_iso', 'accessory'),
    s('triceps_iso', 'accessory'),
    s('core', 'accessory'),
  ],
  upper: [
    s('horizontal_push', 'main'),
    s('horizontal_pull', 'main'),
    s('vertical_push', 'secondary'),
    s('vertical_pull', 'secondary'),
    s('side_delt_iso', 'accessory'),
    s('chest_iso', 'accessory'),
    s('rear_delt_iso', 'accessory'),
    s('biceps_iso', 'accessory'),
    s('triceps_iso', 'accessory'),
  ],
  lower: [
    s('squat', 'main'),
    s('hinge', 'main'),
    s('lunge', 'secondary'),
    s('quad_iso', 'accessory'),
    s('hamstring_iso', 'accessory'),
    s('glute_iso', 'accessory'),
    s('calf', 'accessory'),
    s('core', 'accessory'),
  ],
  push: [
    s('horizontal_push', 'main'),
    s('vertical_push', 'main'),
    s('horizontal_push', 'secondary'),
    s('chest_iso', 'accessory'),
    s('side_delt_iso', 'accessory'),
    s('triceps_iso', 'accessory'),
  ],
  pull: [
    s('vertical_pull', 'main'),
    s('horizontal_pull', 'main'),
    s('horizontal_pull', 'secondary'),
    s('rear_delt_iso', 'accessory'),
    s('biceps_iso', 'accessory'),
    s('core', 'accessory'),
  ],
  legs: [
    s('squat', 'main'),
    s('hinge', 'main'),
    s('lunge', 'secondary'),
    s('quad_iso', 'accessory'),
    s('hamstring_iso', 'accessory'),
    s('glute_iso', 'accessory'),
    s('calf', 'accessory'),
  ],
  recovery: [],
};

export const DAY_NAMES: Record<DayType, string> = {
  full_a: 'Full body A',
  full_b: 'Full body B',
  upper: 'Upper',
  lower: 'Lower',
  push: 'Push',
  pull: 'Pull',
  legs: 'Legs',
  recovery: 'Active recovery',
};

/** Isolation pattern to add when a muscle needs more direct volume. */
export const ISO_FOR: Record<Muscle, Pattern[]> = {
  chest: ['chest_iso', 'horizontal_push'],
  back: ['horizontal_pull', 'vertical_pull'],
  side_delts: ['side_delt_iso'],
  rear_delts: ['rear_delt_iso'],
  biceps: ['biceps_iso'],
  triceps: ['triceps_iso'],
  quads: ['quad_iso', 'lunge'],
  hamstrings: ['hamstring_iso', 'hinge'],
  glutes: ['glute_iso'],
  calves: ['calf'],
  core: ['core'],
};

/** Accessory pairs that don't compete — supersetting them roughly halves rest time. */
export const ANTAGONIST_PAIRS: [Pattern, Pattern][] = [
  ['biceps_iso', 'triceps_iso'],
  ['quad_iso', 'hamstring_iso'],
  ['chest_iso', 'rear_delt_iso'],
  ['side_delt_iso', 'rear_delt_iso'],
  ['glute_iso', 'calf'],
  ['calf', 'core'],
];

export const PUSH_PATTERNS: Pattern[] = ['horizontal_push', 'vertical_push'];
export const PULL_PATTERNS: Pattern[] = ['horizontal_pull', 'vertical_pull', 'rear_delt_iso'];

/* ---------- Recovery days and cardio — rules §5, §1 (concurrent training) ---------- */

export function cardioAdvice(goal: GoalProfile, primaryGoal: Goal): string {
  if (primaryGoal === 'lose_fat' || primaryGoal === 'recomp')
    return '2–3 cardio sessions a week (20–30 min) plus a daily step goal. Cycling or walking keeps leg recovery easy. Do cardio on rest days or after lifting.';
  if (goal === 'endurance') return '3+ cardio sessions a week. Keep hard cardio on rest days or at least 3 hours away from lifting.';
  if (goal === 'athletic') return 'Keep sprints and conditioning away from lifting days when you can; never right before explosive work.';
  if (goal === 'general') return 'Aim for 150 minutes of moderate cardio a week (for example 5 × 30-minute brisk walks).';
  return 'Optional: 2 easy cardio sessions a week for heart health. Cycling interferes least with muscle gain.';
}

export const REST_DAY_TEXT = 'Rest — walk, light cardio, or stretch';
