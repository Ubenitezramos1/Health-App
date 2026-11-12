import { effectiveItems } from '@/features/profile/equipment-text';
import type { InjuryArea } from '@/features/profile/options';
import { type Profile, needsMedicalClearance } from '@/features/profile/schema';
import { ageFromDob } from '@/features/profile/units';

import {
  EXERCISES,
  type Equip,
  type Exercise,
  type Pattern,
  bwIntensity,
  getExercise,
  isUnloaded,
  primaryMuscle,
} from './exercises';
import {
  type AsymmetryRegion,
  FOCUS_TO_MUSCLES,
  MUSCLES,
  MUSCLE_LABELS,
  type Muscle,
  type ScanResult,
  type Tier,
} from './muscles';
import {
  ANTAGONIST_PAIRS,
  DAY_NAMES,
  DAY_OPTIONS,
  DEFAULT_DAYS,
  DEFAULT_WEEKDAYS,
  ISO_FOR,
  type Level,
  PULL_PATTERNS,
  PUSH_PATTERNS,
  REST_DAY_TEXT,
  SESSION_BUDGET_MIN,
  SPLIT_NAMES,
  TEMPLATES,
  WARMUP_MIN,
  cardioAdvice,
  goalProfileOf,
  levelOf,
  prescription,
  setBounds,
  splitFor,
  volumeTargets,
} from './rules';
import type { MuscleVolume, Plan, PlanDay, PlanExercise, PlanSettings, PlanStyle, SlotRole } from './types';

export const MAX_PRIORITY = 3;
/** Exercises per session. Efficient: 4–6 in the rules, +1 so 3-day plans can still cover every muscle twice a week. */
const MAX_EXERCISES: Record<PlanStyle, number> = { efficient: 7, full: 9 };

let idCounter = 0;
export const makeId = (prefix: string) => `${prefix}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

/* ---------- Settings ---------- */

export function defaultSettings(profile: Profile): PlanSettings {
  const daysPerWeek = DEFAULT_DAYS[profile.availability];
  return {
    style: profile.sessionLength === 'short' || profile.availability === 'low' ? 'efficient' : 'full',
    daysPerWeek,
    scheduleType: 'loose',
    weekdays: DEFAULT_WEEKDAYS[daysPerWeek],
    times: {},
    deloadEnabled: true,
    tierOverrides: {},
    clearanceConfirmed: false,
  };
}

export const dayOptions = (profile: Profile) => DAY_OPTIONS[profile.availability];

/* ---------- Tiers — rules §2.2 ---------- */

export type TierResult = Record<Muscle, { tier: Tier; reasons: string[] }>;

export function computeTiers(
  profile: Profile,
  scan: ScanResult | null,
  overrides: PlanSettings['tierOverrides'],
): TierResult {
  const focus = new Set(profile.focus.body.flatMap((f) => FOCUS_TO_MUSCLES[f]));
  const result = {} as TierResult;

  // Candidates for Priority, scored so the most important win when more than MAX_PRIORITY qualify.
  const candidates: { muscle: Muscle; score: number }[] = [];

  for (const m of MUSCLES) {
    const rating = scan?.muscles[m];
    const reasons: string[] = [];
    let tier: Tier = 'standard';
    if (rating === 'lagging') reasons.push('Scan: lagging');
    if (rating === 'strong') reasons.push('Scan: already strong');
    if (focus.has(m)) reasons.push('You chose it as a focus area');

    if (rating === 'lagging' || focus.has(m)) {
      candidates.push({ muscle: m, score: (rating === 'lagging' ? 2 : 0) + (focus.has(m) ? 1 : 0) });
    } else if (rating === 'strong') {
      tier = 'maintain'; // the scan can lower a muscle only if the user didn't ask for it
    }
    if (scan?.postureFlags.includes('rounded_shoulders') && (m === 'rear_delts' || m === 'back')) {
      reasons.push('Scan: possible rounded shoulders');
      candidates.push({ muscle: m, score: 1.5 });
    }
    result[m] = { tier, reasons };
  }

  // The user's own choices are fixed first; scan/focus candidates fill the remaining priority slots.
  const overridden = Object.entries(overrides) as [Muscle, Tier][];
  const userPriorities = overridden.filter(([, t]) => t === 'priority').length;
  const slots = Math.max(0, MAX_PRIORITY - userPriorities);
  const ranked = [...new Map(candidates.sort((a, b) => b.score - a.score).map((c) => [c.muscle, c])).values()].filter(
    (c) => !(c.muscle in overrides),
  );
  ranked.forEach((c, i) => {
    if (i < slots) result[c.muscle].tier = 'priority';
    else {
      result[c.muscle].tier = 'standard';
      result[c.muscle].reasons.push(`Queued for next block (max ${MAX_PRIORITY} priorities at once)`);
    }
  });

  for (const [m, t] of overridden) result[m] = { tier: t, reasons: ['Set by you'] };
  return result;
}

/* ---------- Exercise availability ---------- */

export type SelectionContext = {
  equipment: Set<Equip> | 'all';
  currentInjuries: Set<InjuryArea>;
  lowRiskOnly: boolean;
  level: Level;
  asymmetryRegions: Set<AsymmetryRegion>;
  strengthFocus: boolean;
};

export function selectionContext(profile: Profile, settings: PlanSettings, scan: ScanResult | null): SelectionContext {
  return {
    equipment:
      profile.equipment.access === 'full'
        ? 'all'
        : // Ticked items (gear and everyday items) plus anything recognized in the typed-in text.
          new Set<Equip>(effectiveItems(profile.equipment)),
    currentInjuries: new Set(profile.injuries.filter((i) => i.status === 'current').map((i) => i.area)),
    lowRiskOnly: needsMedicalClearance(profile) && !settings.clearanceConfirmed,
    level: levelOf(profile.experience),
    asymmetryRegions: new Set(scan?.asymmetries.map((a) => a.region) ?? []),
    strengthFocus: ['strength', 'athletic'].includes(goalProfileOf(profile.primaryGoal)),
  };
}

const hasEquipment = (e: Exercise, eq: SelectionContext['equipment']) =>
  eq === 'all' || e.equipment.every((req) => (Array.isArray(req) ? req.some((r) => eq.has(r)) : eq.has(req)));

/** What a user can do to make bodyweight work harder: which exercises they can do, and whether they can add weight. */
export function stepContext(profile: Profile, settings: PlanSettings) {
  const sel = selectionContext(profile, settings, null);
  const canAddWeight =
    sel.equipment === 'all' || ['loaded_bag', 'dumbbells', 'kettlebell', 'water_jugs'].some((i) => (sel.equipment as Set<Equip>).has(i as Equip));
  return { allowed: (e: Exercise) => isAllowed(e, sel), canAddWeight };
}

export function isAllowed(e: Exercise, ctx: SelectionContext): boolean {
  if (!hasEquipment(e, ctx.equipment)) return false;
  if (e.avoid?.some((a) => ctx.currentInjuries.has(a))) return false;
  if (ctx.lowRiskOnly && e.highRisk) return false;
  return true;
}

const PATTERN_REGION: Partial<Record<Pattern, AsymmetryRegion>> = {
  horizontal_push: 'chest',
  chest_iso: 'chest',
  vertical_push: 'shoulders',
  side_delt_iso: 'shoulders',
  rear_delt_iso: 'shoulders',
  biceps_iso: 'arms',
  triceps_iso: 'arms',
  squat: 'legs',
  lunge: 'legs',
  hinge: 'legs',
  quad_iso: 'legs',
  hamstring_iso: 'legs',
  glute_iso: 'glutes',
  horizontal_pull: 'back',
  vertical_pull: 'back',
};

/** Bodyweight lifts worth programming even in a full gym. */
const GYM_STAPLES = new Set(['pull_up', 'chin_up', 'dip']);

function score(e: Exercise, ctx: SelectionContext, role: SlotRole, used: Set<string>): number {
  let s = 0;
  if (e.lengthened) s += 2;
  if (ctx.level === 'beginner') s += e.level === 1 ? 2 : e.level === 3 ? -6 : 0;
  else if (e.level === 3 && ctx.level === 'intermediate') s -= 1;
  if (ctx.strengthFocus && role === 'main' && e.load === 'barbell') s += 3;
  // Match difficulty to the lifter (rules: bodyweight progression).
  const bw = bwIntensity(e);
  if (bw === null) {
    // Lifts you can add weight to progress in small, precise steps — favored for main and secondary slots.
    if (role === 'main') s += ctx.level === 'beginner' ? 1 : 3;
    else if (role === 'secondary') s += ctx.level === 'beginner' ? 1 : 2;
  } else if (ctx.level === 'beginner') {
    if (bw === 'hard') s -= 3; // build up to these through the ladder instead
  } else {
    if (bw === 'easy') s -= 4; // warm-up level for trained lifters
    // Hard bodyweight work earns its place: pull-ups, chin-ups and dips always; the rest only when there's
    // no gym (in a gym, a loaded press or squat is the better tool). Skill-heavy moves (level 3) are reached
    // through the ladder by intermediates rather than prescribed on day one.
    const staple = GYM_STAPLES.has(e.id);
    const earns = bw === 'hard' && role !== 'accessory' && (staple || ctx.equipment !== 'all');
    const reachable = ctx.level === 'advanced' || e.level < 3 || staple;
    if (earns && reachable) s += ctx.level === 'advanced' ? 3 : 2;
  }
  const region = PATTERN_REGION[e.pattern];
  if (region && ctx.asymmetryRegions.has(region) && e.unilateral) s += 4;
  // Vary exercises across repeated days — except for beginners, who progress faster by practicing the same lifts.
  if (used.has(e.id) && ctx.level !== 'beginner') s -= 3;
  if (e.timed) s -= 1;
  return s;
}

export function pickExercise(
  pattern: Pattern,
  ctx: SelectionContext,
  role: SlotRole,
  usedInPlan: Set<string>,
  usedInDay: Set<string>,
): Exercise | null {
  // A trained lifter's main/secondary slots never get a warm-up-level move: better to skip the slot.
  const tooEasy = (e: Exercise) => ctx.level !== 'beginner' && role !== 'accessory' && bwIntensity(e) === 'easy';
  const options = EXERCISES.filter(
    (e) => e.pattern === pattern && isAllowed(e, ctx) && !usedInDay.has(e.id) && !tooEasy(e),
  );
  if (!options.length) return null;
  return options.reduce((best, e) => (score(e, ctx, role, usedInPlan) > score(best, ctx, role, usedInPlan) ? e : best));
}

/** Alternatives for the swap screen: same movement first, then other exercises for the same muscle. */
export function alternativesFor(exerciseId: string, ctx: SelectionContext) {
  const current = getExercise(exerciseId);
  const muscle = primaryMuscle(current);
  const allowed = EXERCISES.filter((e) => e.id !== exerciseId && isAllowed(e, ctx));
  const byScore = (a: Exercise, b: Exercise) => score(b, ctx, 'secondary', new Set()) - score(a, ctx, 'secondary', new Set());
  const sameMovement = allowed.filter((e) => e.pattern === current.pattern).sort(byScore);
  const sameMuscle = allowed
    .filter((e) => e.pattern !== current.pattern && muscle && primaryMuscle(e) === muscle)
    .sort(byScore);
  return { sameMovement, sameMuscle };
}

/* ---------- Volume and time ---------- */

export function weeklyVolume(days: PlanDay[]): Record<Muscle, number> {
  const v = Object.fromEntries(MUSCLES.map((m) => [m, 0])) as Record<Muscle, number>;
  for (const day of days)
    for (const pe of day.exercises) {
      const credit = getExercise(pe.exerciseId).credit;
      for (const m of MUSCLES) v[m] += (credit[m] ?? 0) * pe.sets;
    }
  return v;
}

/** Estimated session length: warm-up + work + rest, with supersets sharing rest. */
export function estimateMinutes(day: PlanDay): number {
  if (!day.exercises.length) return 0;
  let seconds = WARMUP_MIN * 60;
  const seen = new Set<string>();
  for (const pe of day.exercises) {
    const e = getExercise(pe.exerciseId);
    // Bodyweight/band sets run 8–25+ reps, and slow lowering adds ~2 s per rep.
    const work = (isUnloaded(e) && !e.timed ? 70 : e.kind === 'compound' ? 45 : 40) + (pe.tempo ? 25 : 0);
    if (pe.supersetGroup) {
      if (seen.has(pe.supersetGroup)) continue;
      seen.add(pe.supersetGroup);
      const pair = day.exercises.filter((x) => x.supersetGroup === pe.supersetGroup);
      const rounds = Math.max(...pair.map((x) => x.sets));
      seconds += rounds * (pair.length * work + Math.max(...pair.map((x) => x.restSec)));
    } else {
      seconds += pe.sets * (work + pe.restSec);
    }
  }
  return Math.round(seconds / 60);
}

/* ---------- Plan generation ---------- */

type Ctx = {
  profile: Profile;
  settings: PlanSettings;
  style: PlanStyle;
  sel: SelectionContext;
  goal: ReturnType<typeof goalProfileOf>;
  tiers: TierResult;
  targets: Record<Muscle, { target: number; ceiling: number; floor: number }>;
  budget: number;
  why: string[];
  warnings: string[];
};

function makePlanExercise(ctx: Ctx, e: Exercise, role: SlotRole): PlanExercise {
  return {
    id: makeId('ex'),
    exerciseId: e.id,
    role,
    sets: setBounds(ctx.style, role, isUnloaded(e)).base,
    ...prescription(ctx.goal, ctx.style, role, { timed: e.timed, unloaded: isUnloaded(e) }),
    notes: [],
  };
}

const muscleOf = (pe: PlanExercise) => primaryMuscle(getExercise(pe.exerciseId));
const boundsOf = (style: PlanStyle, pe: PlanExercise) =>
  setBounds(style, pe.role, isUnloaded(getExercise(pe.exerciseId)));
const tierRank: Record<Tier, number> = { priority: 0, standard: 1, maintain: 2 };
const roleRank: Record<SlotRole, number> = { main: 0, secondary: 1, accessory: 2 };

function buildDays(ctx: Ctx): PlanDay[] {
  const types = splitFor(ctx.settings.daysPerWeek, ctx.sel.level);
  const usedInPlan = new Set<string>();
  const counts: Record<string, number> = {};
  const repeated = new Set(types.filter((t, i) => types.indexOf(t) !== i));
  const missing = new Set<Pattern>();

  return types.map((type) => {
    counts[type] = (counts[type] ?? 0) + 1;
    const usedInDay = new Set<string>();
    const exercises: PlanExercise[] = [];
    for (const slot of TEMPLATES[type]) {
      const e = pickExercise(slot.pattern, ctx.sel, slot.role, usedInPlan, usedInDay);
      if (!e) {
        if (!missing.has(slot.pattern)) missing.add(slot.pattern);
        continue;
      }
      // Maintain-tier muscles skip their isolation work; compounds keep them above the floor.
      const m = primaryMuscle(e);
      if (slot.role === 'accessory' && m && ctx.tiers[m].tier === 'maintain') continue;
      usedInDay.add(e.id);
      usedInPlan.add(e.id);
      exercises.push(makePlanExercise(ctx, e, slot.role));
    }
    const letter = repeated.has(type) ? ` ${String.fromCharCode(64 + counts[type])}` : '';
    const isFull = type === 'full_a' || type === 'full_b';
    const hasBothFull = types.includes('full_a') && types.includes('full_b');
    return {
      id: makeId('day'),
      type,
      label: isFull ? (hasBothFull ? DAY_NAMES[type] : 'Full body') : DAY_NAMES[type] + letter,
      exercises,
      estMinutes: 0,
    };
  });
}

/** Raise muscles below target, lower those above ceiling. Rules §2.2 / §3. */
function balanceVolume(ctx: Ctx, days: PlanDay[]) {
  const order = [...MUSCLES].sort((a, b) => tierRank[ctx.tiers[a].tier] - tierRank[ctx.tiers[b].tier]);
  const lifting = days.filter((d) => d.type !== 'recovery');

  for (const m of order) {
    const { target, ceiling } = ctx.targets[m];
    for (let guard = 0; guard < 40; guard++) {
      const v = weeklyVolume(days)[m];
      if (v >= target) break;
      // 1) add a set to an exercise for this muscle (accessories first)
      const slots = lifting
        .flatMap((d) => d.exercises)
        .filter((pe) => muscleOf(pe) === m && pe.sets < boundsOf(ctx.style, pe).max)
        .sort((a, b) => roleRank[b.role] - roleRank[a.role] || a.sets - b.sets);
      if (slots.length) {
        slots[0].sets += 1;
        continue;
      }
      // 2) add an isolation exercise on the lightest day that doesn't already train it directly
      if (!addAccessory(ctx, lifting, m)) break;
    }
    for (let guard = 0; guard < 40; guard++) {
      const v = weeklyVolume(days)[m];
      if (v <= ceiling) break;
      const slots = lifting
        .flatMap((d) => d.exercises)
        .filter((pe) => muscleOf(pe) === m && pe.sets > boundsOf(ctx.style, pe).min)
        .sort((a, b) => roleRank[b.role] - roleRank[a.role] || b.sets - a.sets);
      if (!slots.length) break;
      slots[0].sets -= 1;
    }
  }
}

/** Which muscles naturally belong on each day type (extra work goes there first). */
const DAY_AFFINITY: Record<PlanDay['type'], Muscle[]> = {
  full_a: [...MUSCLES],
  full_b: [...MUSCLES],
  upper: ['chest', 'back', 'side_delts', 'rear_delts', 'biceps', 'triceps', 'core'],
  push: ['chest', 'side_delts', 'triceps', 'core'],
  pull: ['back', 'rear_delts', 'biceps', 'core'],
  lower: ['quads', 'hamstrings', 'glutes', 'calves', 'core'],
  legs: ['quads', 'hamstrings', 'glutes', 'calves', 'core'],
  recovery: [],
};

function addAccessory(ctx: Ctx, days: PlanDay[], m: Muscle): boolean {
  const byLoad = (a: PlanDay, b: PlanDay) => a.exercises.length - b.exercises.length;
  const fitting = days.filter((d) => DAY_AFFINITY[d.type].includes(m)).sort(byLoad);
  // Prefer a day that already trains this body part — even if it means a second exercise of the same
  // movement there — before putting e.g. shoulder or chest work on leg day.
  const passes: { days: PlanDay[]; allowSamePattern: boolean }[] = [
    { days: fitting, allowSamePattern: false },
    { days: fitting, allowSamePattern: true },
  ];
  // Never fall back to a day that doesn't train this body part (e.g. rear delts on leg day);
  // a full-body day always fits. If nothing fits, the muscle stays short and the plan says so.
  for (const pass of passes)
    for (const pattern of ISO_FOR[m])
      for (const day of pass.days) {
        if (!pass.allowSamePattern && day.exercises.some((x) => getExercise(x.exerciseId).pattern === pattern)) continue;
        const usedInDay = new Set(day.exercises.map((x) => x.exerciseId));
        const usedInPlan = new Set(days.flatMap((d) => d.exercises.map((x) => x.exerciseId)));
        const e = pickExercise(pattern, ctx.sel, 'accessory', usedInPlan, usedInDay);
        if (!e) continue;
        day.exercises.push(makePlanExercise(ctx, e, 'accessory'));
        return true;
      }
  return false;
}

/** Priority work first: priority compounds, then other mains, secondaries, priority accessories, the rest. */
function orderDay(ctx: Ctx, day: PlanDay) {
  const key = (pe: PlanExercise) => {
    const m = muscleOf(pe);
    const priority = m ? ctx.tiers[m].tier === 'priority' : false;
    if (pe.role === 'main') return priority ? 0 : 1;
    if (pe.role === 'secondary') return 2;
    return priority ? 3 : 4;
  };
  day.exercises = day.exercises
    .map((pe, i) => ({ pe, i }))
    .sort((a, b) => key(a.pe) - key(b.pe) || a.i - b.i)
    .map((x) => x.pe);
}

function pairSupersets(day: PlanDay) {
  const free = () => day.exercises.filter((x) => x.role === 'accessory' && !x.supersetGroup);
  const pat = (pe: PlanExercise) => getExercise(pe.exerciseId).pattern;
  for (const [a, b] of ANTAGONIST_PAIRS) {
    const x = free().find((pe) => pat(pe) === a);
    const y = free().find((pe) => pat(pe) === b && pe !== x);
    if (x && y) {
      const group = makeId('ss');
      x.supersetGroup = group;
      y.supersetGroup = group;
      // keep the pair adjacent
      day.exercises = day.exercises.filter((pe) => pe !== y);
      day.exercises.splice(day.exercises.indexOf(x) + 1, 0, y);
    }
  }
}

/** Fit each session into the user's time: superset, then trim lowest-tier work, never below a floor. */
function fitTime(ctx: Ctx, days: PlanDay[]) {
  const trimmed = new Set<string>();
  for (const day of days) {
    if (day.type === 'recovery') continue;
    if (estimateMinutes(day) > ctx.budget) pairSupersets(day);
    // 1–2 day plans have to fit the whole body into each session, so they get one more slot.
    const maxExercises = MAX_EXERCISES[ctx.style] + (ctx.settings.daysPerWeek <= 2 ? 1 : 0);
    for (let guard = 0; guard < 60; guard++) {
      const overTime = estimateMinutes(day) > ctx.budget;
      const overCount = day.exercises.length > maxExercises;
      if (!overTime && !overCount) break;
      const volume = weeklyVolume(days);
      const removable = [...day.exercises]
        .filter((pe) => pe.role !== 'main')
        .map((pe) => ({ pe, m: muscleOf(pe) }))
        .sort(
          (a, b) =>
            tierRank[ctx.tiers[b.m ?? 'core'].tier] - tierRank[ctx.tiers[a.m ?? 'core'].tier] ||
            roleRank[b.pe.role] - roleRank[a.pe.role],
        );
      let changed = false;
      // Removing sets must keep EVERY credited muscle (not just the primary) at or above its floor.
      const keepsFloors = (pe: PlanExercise, sets: number) => {
        const credit = getExercise(pe.exerciseId).credit;
        // Only muscles this exercise trains matter — a muscle that's already short for other reasons
        // (e.g. no side-delt option without equipment) mustn't block trimming everything else.
        return MUSCLES.every((mm) => !credit[mm] || volume[mm] - (credit[mm] ?? 0) * sets >= ctx.targets[mm].floor);
      };
      for (const { pe, m } of removable) {
        if (!m) continue;
        if (overTime && pe.sets > boundsOf(ctx.style, pe).min && keepsFloors(pe, 1)) {
          pe.sets -= 1;
          changed = true;
          break;
        }
        if (keepsFloors(pe, pe.sets)) {
          day.exercises = day.exercises.filter((x) => x !== pe);
          if (pe.supersetGroup)
            day.exercises.filter((x) => x.supersetGroup === pe.supersetGroup).forEach((x) => delete x.supersetGroup);
          trimmed.add(MUSCLE_LABELS[m]);
          changed = true;
          break;
        }
      }
      if (!changed) break;
    }
    day.estMinutes = estimateMinutes(day);
    if (day.estMinutes > ctx.budget + 5)
      ctx.warnings.push(
        `${day.label} runs about ${day.estMinutes} min — over your ${ctx.budget}-min target. Remove an accessory or add a training day.`,
      );
  }
  if (trimmed.size)
    ctx.why.push(
      `Kept sessions to ${MAX_EXERCISES[ctx.style]} exercises or fewer and under ~${ctx.budget} min by trimming extra isolation work. Every muscle still gets at least its maintenance volume.`,
    );
}

/** After trimming, spend any spare minutes on muscles still under target (no new exercises). */
function topUp(ctx: Ctx, days: PlanDay[]) {
  const order = [...MUSCLES].sort((a, b) => tierRank[ctx.tiers[a].tier] - tierRank[ctx.tiers[b].tier]);
  for (let changed = true, guard = 0; changed && guard < 40; guard++) {
    changed = false;
    const volume = weeklyVolume(days);
    for (const m of order) {
      if (volume[m] >= ctx.targets[m].target) continue;
      for (const day of days) {
        const pe = day.exercises
          .filter((x) => muscleOf(x) === m && x.sets < boundsOf(ctx.style, x).max)
          .sort((a, b) => roleRank[b.role] - roleRank[a.role])[0];
        if (!pe) continue;
        pe.sets += 1;
        if (estimateMinutes(day) <= ctx.budget) {
          changed = true;
          break;
        }
        pe.sets -= 1;
      }
      if (changed) break;
    }
  }
  for (const day of days) day.estMinutes = estimateMinutes(day);
}

/** Pulling ≥ pushing (≥1.5× with rounded shoulders). Rules §2.2. */
function balancePushPull(ctx: Ctx, days: PlanDay[], rounded: boolean) {
  const ratio = rounded ? 1.5 : 1;
  const all = () => days.flatMap((d) => d.exercises);
  const setsOf = (patterns: Pattern[]) =>
    all()
      .filter((pe) => patterns.includes(getExercise(pe.exerciseId).pattern))
      .reduce((n, pe) => n + pe.sets, 0);
  for (let guard = 0; guard < 20 && setsOf(PULL_PATTERNS) < setsOf(PUSH_PATTERNS) * ratio; guard++) {
    const pull = all()
      .filter((pe) => PULL_PATTERNS.includes(getExercise(pe.exerciseId).pattern) && pe.sets < boundsOf(ctx.style, pe).max)
      .sort((a, b) => roleRank[b.role] - roleRank[a.role] || a.sets - b.sets)[0];
    if (pull) {
      pull.sets += 1;
      continue;
    }
    if (!addAccessory(ctx, days.filter((d) => d.type !== 'recovery'), 'rear_delts')) break;
  }
}

function addNotes(ctx: Ctx, days: PlanDay[], scan: ScanResult | null) {
  for (const day of days)
    for (const pe of day.exercises) {
      const e = getExercise(pe.exerciseId);
      const m = primaryMuscle(e);
      const region = PATTERN_REGION[e.pattern];
      const asym = scan?.asymmetries.find((a) => a.region === region);
      if (e.unilateral && asym)
        pe.notes.push(`Start with your ${asym.weakerSide} side; match its reps on the other side.`);
      if (
        ctx.style === 'efficient' &&
        pe.role === 'accessory' &&
        m &&
        ctx.tiers[m].tier === 'priority' &&
        ['machine', 'cable', 'dumbbell'].includes(e.load)
      )
        pe.notes.push('Optional: drop set on the last set (lower the weight ~25% and keep going).');
    }
}

export function generatePlan(profile: Profile, settings: PlanSettings, scan: ScanResult | null = null): Plan {
  const level = levelOf(profile.experience);
  const age = ageFromDob(profile.dob) ?? 30;
  const tiers = computeTiers(profile, scan, settings.tierOverrides);
  const style = settings.style;
  const targets = Object.fromEntries(
    MUSCLES.map((m) => [m, volumeTargets(style, level, tiers[m].tier, m, age)]),
  ) as Ctx['targets'];

  const ctx: Ctx = {
    profile,
    settings,
    style,
    sel: selectionContext(profile, settings, scan),
    goal: goalProfileOf(profile.primaryGoal),
    tiers,
    targets,
    budget: SESSION_BUDGET_MIN[profile.sessionLength],
    why: [],
    warnings: [],
  };

  ctx.why.push(
    style === 'efficient'
      ? 'Efficient plan: 2 hard sets on main lifts and 2–3 on accessories, taken close to failure. Most of the results for much less time.'
      : 'Full-volume plan: more weekly sets for maximum muscle growth.',
  );
  ctx.why.push(
    `${settings.daysPerWeek} day${settings.daysPerWeek > 1 ? 's' : ''} a week: ${SPLIT_NAMES[Math.min(settings.daysPerWeek, 7)][level]}${settings.daysPerWeek >= 2 ? ' — each muscle trained about twice a week' : ''}.`,
  );
  if (ctx.sel.currentInjuries.size)
    ctx.why.push(
      `Skipped exercises that load your current ${[...ctx.sel.currentInjuries].join(', ').replace(/_/g, ' ')} injur${ctx.sel.currentInjuries.size > 1 ? 'ies' : 'y'}.`,
    );
  if (ctx.sel.lowRiskOnly)
    ctx.warnings.push('Lower-risk exercises only until you confirm medical clearance in plan settings.');
  if (!scan) ctx.why.push('No physique scan yet — your focus areas set the priorities. A scan will refine them.');

  const days = buildDays(ctx);
  balanceVolume(ctx, days);
  const rounded = scan?.postureFlags.includes('rounded_shoulders') ?? false;
  balancePushPull(ctx, days, rounded);
  for (const d of days) orderDay(ctx, d);
  fitTime(ctx, days);
  topUp(ctx, days);
  addNotes(ctx, days, scan);

  if (days.some((d) => d.exercises.some((x) => isUnloaded(getExercise(x.exerciseId)))))
    ctx.why.push(
      `Bodyweight and band exercises: 3 sets, ${prescription(ctx.goal, style, 'main', { unloaded: true }).repMin}–${prescription(ctx.goal, style, 'main', { unloaded: true }).repMax} reps, stopping 1–2 reps short of failure (last set to failure). Add reps each session — the tracker tells you when it's time for a harder version.`,
    );

  const finalVolume = weeklyVolume(days);
  const volume = Object.fromEntries(
    MUSCLES.map((m) => [m, { ...tiers[m], ...targets[m], sets: finalVolume[m] } satisfies MuscleVolume]),
  ) as Record<Muscle, MuscleVolume>;

  const below = MUSCLES.filter((m) => finalVolume[m] < targets[m].floor);
  if (below.length)
    ctx.warnings.push(
      `Your equipment limits direct work for ${below.map((m) => MUSCLE_LABELS[m].toLowerCase()).join(', ')}. A loaded backpack, water jugs, a sturdy table, bands or dumbbells would fill the gap — add them in your profile.`,
    );

  const blockWeeks = level === 'beginner' ? 8 : 6;
  const now = new Date().toISOString();
  return {
    id: makeId('plan'),
    createdAt: now,
    updatedAt: now,
    profileUpdatedAt: profile.updatedAt,
    scanTakenAt: scan?.takenAt,
    settings,
    days,
    volume,
    sessionBudgetMin: ctx.budget,
    blockWeeks,
    deloadWeek: settings.deloadEnabled ? blockWeeks : null,
    why: ctx.why,
    warnings: ctx.warnings,
    restDay: REST_DAY_TEXT,
    cardio: cardioAdvice(ctx.goal, profile.primaryGoal),
    customized: false,
    goal: ctx.goal,
  };
}
