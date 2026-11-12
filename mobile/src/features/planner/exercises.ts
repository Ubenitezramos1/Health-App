import type { EquipmentItem, InjuryArea } from '@/features/profile/options';

import type { CreditMuscle, Muscle } from './muscles';

/** Movement patterns = the "slots" a training day is built from. Alternates share a pattern. */
export type Pattern =
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'horizontal_push'
  | 'vertical_push'
  | 'horizontal_pull'
  | 'vertical_pull'
  | 'chest_iso'
  | 'side_delt_iso'
  | 'rear_delt_iso'
  | 'biceps_iso'
  | 'triceps_iso'
  | 'quad_iso'
  | 'hamstring_iso'
  | 'glute_iso'
  | 'calf'
  | 'core';

/** Equipment a full gym has beyond the questionnaire's home-equipment list. */
export type Equip = EquipmentItem | 'machine';

/** How weight is added — the tracker uses this to pick the smallest load step. */
export type LoadType = 'barbell' | 'dumbbell' | 'machine' | 'cable' | 'kettlebell' | 'band' | 'bodyweight' | 'household';

export type Exercise = {
  id: string;
  name: string;
  pattern: Pattern;
  kind: 'compound' | 'isolation';
  /** Fractional set credit per muscle: 1 = primary mover, 0.5 = secondary. */
  credit: Partial<Record<CreditMuscle, number>>;
  /** Every entry is required; a nested array means "any one of these". */
  equipment: (Equip | Equip[])[];
  load: LoadType;
  /** 1 = beginner-friendly, 2 = needs some practice, 3 = advanced. */
  level: 1 | 2 | 3;
  /** Trains the muscle at long lengths (moderate evidence of more growth). */
  lengthened?: boolean;
  unilateral?: boolean;
  /** Excluded when the user has a CURRENT injury in one of these areas. */
  avoid?: InjuryArea[];
  /** Heavy axial or high-skill lifts — excluded until a user flagged for medical clearance confirms it. */
  highRisk?: boolean;
  /** Done for time instead of reps (planks). */
  timed?: boolean;
};

type Opts = Partial<Pick<Exercise, 'lengthened' | 'unilateral' | 'avoid' | 'highRisk' | 'timed'>>;

const ex = (
  id: string,
  name: string,
  pattern: Pattern,
  kind: Exercise['kind'],
  credit: Exercise['credit'],
  equipment: Exercise['equipment'],
  load: LoadType,
  level: Exercise['level'],
  opts: Opts = {},
): Exercise => ({ id, name, pattern, kind, credit, equipment, load, level, ...opts });

const PUSH = { chest: 1, triceps: 0.5, front_delts: 0.5 } as const;
const OVERHEAD = { front_delts: 1, side_delts: 0.5, triceps: 0.5 } as const;
const ROW = { back: 1, biceps: 0.5, rear_delts: 0.5 } as const;
const PULLDOWN = { back: 1, biceps: 0.5 } as const;
const SQUAT = { quads: 1, glutes: 0.5 } as const;
const HINGE = { hamstrings: 1, glutes: 0.5 } as const;

export const EXERCISES: Exercise[] = [
  // Squat
  ex('barbell_back_squat', 'Barbell back squat', 'squat', 'compound', { ...SQUAT, core: 0.5 }, ['barbell', 'squat_rack'], 'barbell', 2, { avoid: ['knee', 'lower_back'], highRisk: true }),
  ex('hack_squat', 'Hack squat', 'squat', 'compound', SQUAT, ['machine'], 'machine', 1, { lengthened: true, avoid: ['knee'] }),
  ex('leg_press', 'Leg press', 'squat', 'compound', SQUAT, ['machine'], 'machine', 1, { avoid: ['knee'] }),
  ex('goblet_squat', 'Goblet squat', 'squat', 'compound', SQUAT, [['dumbbells', 'kettlebell']], 'dumbbell', 1, { avoid: ['knee'] }),
  ex('bodyweight_squat', 'Bodyweight squat', 'squat', 'compound', SQUAT, [], 'bodyweight', 1, { avoid: ['knee'] }),

  // Hinge
  ex('barbell_rdl', 'Barbell Romanian deadlift', 'hinge', 'compound', HINGE, ['barbell'], 'barbell', 2, { lengthened: true, avoid: ['lower_back'], highRisk: true }),
  ex('db_rdl', 'Dumbbell Romanian deadlift', 'hinge', 'compound', HINGE, ['dumbbells'], 'dumbbell', 1, { lengthened: true, avoid: ['lower_back'] }),
  ex('kb_rdl', 'Kettlebell Romanian deadlift', 'hinge', 'compound', HINGE, ['kettlebell'], 'kettlebell', 1, { lengthened: true, avoid: ['lower_back'] }),
  ex('back_extension', '45° back extension', 'hinge', 'compound', HINGE, ['machine'], 'bodyweight', 1, { lengthened: true }),
  ex('single_leg_rdl', 'Single-leg Romanian deadlift', 'hinge', 'compound', HINGE, [], 'bodyweight', 2, { lengthened: true, unilateral: true, avoid: ['ankle'] }),

  // Lunge / single-leg
  ex('bulgarian_split_squat', 'Bulgarian split squat', 'lunge', 'compound', SQUAT, [['bench', 'chair_step']], 'bodyweight', 2, { lengthened: true, unilateral: true, avoid: ['knee'] }),
  ex('db_bulgarian_split_squat', 'Dumbbell Bulgarian split squat', 'lunge', 'compound', SQUAT, ['dumbbells', ['bench', 'chair_step']], 'dumbbell', 2, { lengthened: true, unilateral: true, avoid: ['knee'] }),
  ex('db_reverse_lunge', 'Dumbbell reverse lunge', 'lunge', 'compound', SQUAT, ['dumbbells'], 'dumbbell', 1, { unilateral: true, avoid: ['knee'] }),
  ex('reverse_lunge', 'Reverse lunge', 'lunge', 'compound', SQUAT, [], 'bodyweight', 1, { unilateral: true, avoid: ['knee'] }),
  ex('step_up', 'Step-up', 'lunge', 'compound', SQUAT, [['bench', 'chair_step']], 'bodyweight', 1, { unilateral: true, avoid: ['knee'] }),

  // Horizontal push
  ex('barbell_bench_press', 'Barbell bench press', 'horizontal_push', 'compound', PUSH, ['barbell', 'bench'], 'barbell', 2, { avoid: ['shoulder'] }),
  ex('db_bench_press', 'Dumbbell bench press', 'horizontal_push', 'compound', PUSH, ['dumbbells', 'bench'], 'dumbbell', 1, { lengthened: true, avoid: ['shoulder'] }),
  ex('incline_db_press', 'Incline dumbbell press', 'horizontal_push', 'compound', PUSH, ['dumbbells', 'bench'], 'dumbbell', 1, { lengthened: true, avoid: ['shoulder'] }),
  ex('incline_barbell_press', 'Incline barbell press', 'horizontal_push', 'compound', PUSH, ['barbell', 'bench'], 'barbell', 2, { avoid: ['shoulder'] }),
  ex('single_arm_db_press', 'Single-arm dumbbell bench press', 'horizontal_push', 'compound', { ...PUSH, core: 0.5 }, ['dumbbells', 'bench'], 'dumbbell', 2, { unilateral: true, avoid: ['shoulder'] }),
  ex('machine_chest_press', 'Machine chest press', 'horizontal_push', 'compound', PUSH, ['machine'], 'machine', 1),
  ex('dip', 'Dip', 'horizontal_push', 'compound', PUSH, ['machine'], 'bodyweight', 2, { lengthened: true, avoid: ['shoulder', 'elbow'] }),
  ex('push_up', 'Push-up', 'horizontal_push', 'compound', PUSH, [], 'bodyweight', 1, { avoid: ['wrist'] }),
  ex('deficit_push_up', 'Deficit push-up', 'horizontal_push', 'compound', PUSH, [], 'bodyweight', 2, { lengthened: true, avoid: ['wrist', 'shoulder'] }),
  ex('band_chest_press', 'Band chest press', 'horizontal_push', 'compound', PUSH, ['bands'], 'band', 1),

  // Vertical push
  ex('db_shoulder_press', 'Seated dumbbell shoulder press', 'vertical_push', 'compound', OVERHEAD, ['dumbbells'], 'dumbbell', 1, { avoid: ['shoulder', 'neck'] }),
  ex('barbell_ohp', 'Barbell overhead press', 'vertical_push', 'compound', { ...OVERHEAD, core: 0.5 }, ['barbell'], 'barbell', 2, { avoid: ['shoulder', 'neck', 'lower_back'] }),
  ex('machine_shoulder_press', 'Machine shoulder press', 'vertical_push', 'compound', OVERHEAD, ['machine'], 'machine', 1, { avoid: ['shoulder'] }),
  ex('pike_push_up', 'Pike push-up', 'vertical_push', 'compound', OVERHEAD, [], 'bodyweight', 2, { avoid: ['shoulder', 'wrist'] }),
  ex('band_overhead_press', 'Band overhead press', 'vertical_push', 'compound', OVERHEAD, ['bands'], 'band', 1, { avoid: ['shoulder'] }),

  // Horizontal pull
  ex('chest_supported_db_row', 'Chest-supported dumbbell row', 'horizontal_pull', 'compound', ROW, ['dumbbells', 'bench'], 'dumbbell', 1),
  ex('one_arm_db_row', 'One-arm dumbbell row', 'horizontal_pull', 'compound', ROW, ['dumbbells'], 'dumbbell', 1, { unilateral: true, lengthened: true }),
  ex('seated_cable_row', 'Seated cable row', 'horizontal_pull', 'compound', ROW, ['cable'], 'cable', 1, { lengthened: true }),
  ex('machine_row', 'Machine row', 'horizontal_pull', 'compound', ROW, ['machine'], 'machine', 1),
  ex('barbell_row', 'Barbell row', 'horizontal_pull', 'compound', ROW, ['barbell'], 'barbell', 2, { avoid: ['lower_back'] }),
  ex('inverted_row', 'Inverted row (under a sturdy table or low bar)', 'horizontal_pull', 'compound', ROW, [['table_doorframe', 'squat_rack']], 'bodyweight', 2),
  ex('band_row', 'Band row', 'horizontal_pull', 'compound', ROW, ['bands'], 'band', 1),

  // Vertical pull
  ex('lat_pulldown', 'Lat pulldown', 'vertical_pull', 'compound', PULLDOWN, ['cable'], 'cable', 1, { lengthened: true }),
  ex('assisted_pull_up', 'Assisted pull-up (machine)', 'vertical_pull', 'compound', PULLDOWN, ['machine'], 'machine', 1, { lengthened: true }),
  ex('pull_up', 'Pull-up', 'vertical_pull', 'compound', PULLDOWN, ['pullup_bar'], 'bodyweight', 3, { lengthened: true, avoid: ['shoulder', 'elbow'] }),
  ex('band_assisted_pull_up', 'Band-assisted pull-up', 'vertical_pull', 'compound', PULLDOWN, ['pullup_bar', 'bands'], 'band', 2, { lengthened: true, avoid: ['shoulder'] }),
  ex('band_lat_pulldown', 'Band lat pulldown', 'vertical_pull', 'compound', PULLDOWN, ['bands'], 'band', 1),

  // Chest isolation
  ex('cable_fly', 'Cable fly', 'chest_iso', 'isolation', { chest: 1 }, ['cable'], 'cable', 1, { lengthened: true }),
  ex('pec_deck', 'Pec deck', 'chest_iso', 'isolation', { chest: 1 }, ['machine'], 'machine', 1),
  ex('db_fly', 'Dumbbell fly', 'chest_iso', 'isolation', { chest: 1 }, ['dumbbells', 'bench'], 'dumbbell', 1, { lengthened: true, avoid: ['shoulder'] }),
  ex('band_fly', 'Band fly', 'chest_iso', 'isolation', { chest: 1 }, ['bands'], 'band', 1),

  // Side delts
  ex('db_lateral_raise', 'Dumbbell lateral raise', 'side_delt_iso', 'isolation', { side_delts: 1 }, ['dumbbells'], 'dumbbell', 1),
  ex('cable_lateral_raise', 'Cable lateral raise', 'side_delt_iso', 'isolation', { side_delts: 1 }, ['cable'], 'cable', 1, { lengthened: true, unilateral: true }),
  ex('machine_lateral_raise', 'Machine lateral raise', 'side_delt_iso', 'isolation', { side_delts: 1 }, ['machine'], 'machine', 1),
  ex('band_lateral_raise', 'Band lateral raise', 'side_delt_iso', 'isolation', { side_delts: 1 }, ['bands'], 'band', 1),

  // Rear delts
  ex('reverse_pec_deck', 'Reverse pec deck', 'rear_delt_iso', 'isolation', { rear_delts: 1 }, ['machine'], 'machine', 1),
  ex('face_pull', 'Cable face pull', 'rear_delt_iso', 'isolation', { rear_delts: 1, back: 0.5 }, ['cable'], 'cable', 1),
  ex('rear_delt_db_fly', 'Rear delt dumbbell fly', 'rear_delt_iso', 'isolation', { rear_delts: 1 }, ['dumbbells'], 'dumbbell', 1),
  ex('band_pull_apart', 'Band pull-apart', 'rear_delt_iso', 'isolation', { rear_delts: 1, back: 0.5 }, ['bands'], 'band', 1),
  ex('prone_y_raise', 'Prone Y raise', 'rear_delt_iso', 'isolation', { rear_delts: 1 }, [], 'bodyweight', 1),

  // Biceps
  ex('incline_db_curl', 'Incline dumbbell curl', 'biceps_iso', 'isolation', { biceps: 1 }, ['dumbbells', 'bench'], 'dumbbell', 1, { lengthened: true }),
  ex('db_curl', 'Dumbbell curl', 'biceps_iso', 'isolation', { biceps: 1 }, ['dumbbells'], 'dumbbell', 1),
  ex('hammer_curl', 'Hammer curl', 'biceps_iso', 'isolation', { biceps: 1, forearms: 0.5 }, ['dumbbells'], 'dumbbell', 1),
  ex('cable_curl', 'Cable curl', 'biceps_iso', 'isolation', { biceps: 1 }, ['cable'], 'cable', 1),
  ex('ez_bar_curl', 'EZ-bar curl', 'biceps_iso', 'isolation', { biceps: 1 }, ['barbell'], 'barbell', 1, { avoid: ['wrist'] }),
  ex('band_curl', 'Band curl', 'biceps_iso', 'isolation', { biceps: 1 }, ['bands'], 'band', 1),
  ex('concentration_curl', 'Concentration curl', 'biceps_iso', 'isolation', { biceps: 1 }, ['dumbbells'], 'dumbbell', 1, { unilateral: true }),

  // Triceps
  ex('overhead_cable_extension', 'Overhead cable triceps extension', 'triceps_iso', 'isolation', { triceps: 1 }, ['cable'], 'cable', 1, { lengthened: true, avoid: ['elbow'] }),
  ex('overhead_db_extension', 'Overhead dumbbell triceps extension', 'triceps_iso', 'isolation', { triceps: 1 }, ['dumbbells'], 'dumbbell', 1, { lengthened: true, avoid: ['elbow', 'shoulder'] }),
  ex('cable_pushdown', 'Cable triceps pushdown', 'triceps_iso', 'isolation', { triceps: 1 }, ['cable'], 'cable', 1),
  ex('skull_crusher', 'Dumbbell skull crusher', 'triceps_iso', 'isolation', { triceps: 1 }, ['dumbbells', 'bench'], 'dumbbell', 2, { lengthened: true, avoid: ['elbow'] }),
  ex('diamond_push_up', 'Diamond push-up', 'triceps_iso', 'isolation', { triceps: 1, chest: 0.5 }, [], 'bodyweight', 2, { avoid: ['wrist', 'elbow'] }),
  ex('band_pushdown', 'Band triceps pushdown', 'triceps_iso', 'isolation', { triceps: 1 }, ['bands'], 'band', 1),
  ex('single_arm_overhead_extension', 'Single-arm overhead dumbbell extension', 'triceps_iso', 'isolation', { triceps: 1 }, ['dumbbells'], 'dumbbell', 1, { lengthened: true, unilateral: true, avoid: ['elbow', 'shoulder'] }),

  // Quads isolation
  ex('leg_extension', 'Leg extension', 'quad_iso', 'isolation', { quads: 1 }, ['machine'], 'machine', 1),

  // Hamstrings isolation
  ex('seated_leg_curl', 'Seated leg curl', 'hamstring_iso', 'isolation', { hamstrings: 1 }, ['machine'], 'machine', 1, { lengthened: true }),
  ex('lying_leg_curl', 'Lying leg curl', 'hamstring_iso', 'isolation', { hamstrings: 1 }, ['machine'], 'machine', 1),
  ex('sliding_leg_curl', 'Sliding leg curl (towel)', 'hamstring_iso', 'isolation', { hamstrings: 1, glutes: 0.5 }, [], 'bodyweight', 2, { avoid: ['knee'] }),
  ex('band_leg_curl', 'Band leg curl', 'hamstring_iso', 'isolation', { hamstrings: 1 }, ['bands'], 'band', 1),

  // Glutes
  ex('barbell_hip_thrust', 'Barbell hip thrust', 'glute_iso', 'isolation', { glutes: 1, hamstrings: 0.5 }, ['barbell', 'bench'], 'barbell', 2),
  ex('db_hip_thrust', 'Dumbbell hip thrust', 'glute_iso', 'isolation', { glutes: 1, hamstrings: 0.5 }, ['dumbbells', ['bench', 'chair_step']], 'dumbbell', 1),
  ex('hip_abduction', 'Hip abduction machine', 'glute_iso', 'isolation', { glutes: 1 }, ['machine'], 'machine', 1),
  ex('cable_kickback', 'Cable glute kickback', 'glute_iso', 'isolation', { glutes: 1 }, ['cable'], 'cable', 1, { unilateral: true }),
  ex('glute_bridge', 'Glute bridge', 'glute_iso', 'isolation', { glutes: 1, hamstrings: 0.5 }, [], 'bodyweight', 1),

  // Calves
  ex('standing_calf_raise', 'Standing calf raise (machine)', 'calf', 'isolation', { calves: 1 }, ['machine'], 'machine', 1, { lengthened: true }),
  ex('seated_calf_raise', 'Seated calf raise', 'calf', 'isolation', { calves: 1 }, ['machine'], 'machine', 1),
  ex('db_calf_raise', 'Dumbbell calf raise (off a step)', 'calf', 'isolation', { calves: 1 }, ['dumbbells'], 'dumbbell', 1, { lengthened: true, avoid: ['ankle'] }),
  ex('single_leg_calf_raise', 'Single-leg calf raise (off a step)', 'calf', 'isolation', { calves: 1 }, [], 'bodyweight', 1, { lengthened: true, unilateral: true, avoid: ['ankle'] }),

  // Core
  ex('cable_crunch', 'Cable crunch', 'core', 'isolation', { core: 1 }, ['cable'], 'cable', 1, { lengthened: true }),
  ex('hanging_knee_raise', 'Hanging knee raise', 'core', 'isolation', { core: 1 }, ['pullup_bar'], 'bodyweight', 2, { avoid: ['shoulder'] }),
  ex('pallof_press', 'Pallof press', 'core', 'isolation', { core: 1 }, [['cable', 'bands']], 'cable', 1),
  ex('dead_bug', 'Dead bug', 'core', 'isolation', { core: 1 }, [], 'bodyweight', 1),
  ex('plank', 'Plank', 'core', 'isolation', { core: 1 }, [], 'bodyweight', 1, { timed: true, avoid: ['shoulder'] }),

  // Everyday items — loaded backpack/bag and water jugs (weight tracked like dumbbells)
  ex('bag_squat', 'Backpack squat (bag hugged at chest)', 'squat', 'compound', SQUAT, ['loaded_bag'], 'household', 1, { avoid: ['knee'] }),
  ex('bag_rdl', 'Backpack Romanian deadlift', 'hinge', 'compound', HINGE, ['loaded_bag'], 'household', 1, { lengthened: true, avoid: ['lower_back'] }),
  ex('bag_reverse_lunge', 'Backpack reverse lunge', 'lunge', 'compound', SQUAT, ['loaded_bag'], 'household', 1, { unilateral: true, avoid: ['knee'] }),
  ex('bag_floor_press', 'Backpack floor press', 'horizontal_push', 'compound', PUSH, ['loaded_bag'], 'household', 1, { avoid: ['shoulder'] }),
  ex('bag_overhead_press', 'Backpack overhead press', 'vertical_push', 'compound', OVERHEAD, ['loaded_bag'], 'household', 1, { avoid: ['shoulder', 'neck'] }),
  ex('bag_row', 'Bent-over backpack row', 'horizontal_pull', 'compound', ROW, ['loaded_bag'], 'household', 1, { avoid: ['lower_back'] }),
  ex('bag_curl', 'Backpack curl', 'biceps_iso', 'isolation', { biceps: 1 }, ['loaded_bag'], 'household', 1),
  ex('bag_lateral_raise', 'Single-arm backpack lateral raise', 'side_delt_iso', 'isolation', { side_delts: 1 }, ['loaded_bag'], 'household', 1, { unilateral: true }),
  ex('bag_hip_thrust', 'Backpack hip thrust (shoulders on couch or chair)', 'glute_iso', 'isolation', { glutes: 1, hamstrings: 0.5 }, ['loaded_bag'], 'household', 1),
  ex('jug_curl', 'Water jug curl', 'biceps_iso', 'isolation', { biceps: 1 }, ['water_jugs'], 'household', 1),
  ex('jug_lateral_raise', 'Water jug lateral raise', 'side_delt_iso', 'isolation', { side_delts: 1 }, ['water_jugs'], 'household', 1),
  ex('jug_row', 'Single-arm water jug row', 'horizontal_pull', 'compound', ROW, ['water_jugs'], 'household', 1, { unilateral: true, lengthened: true }),
  ex('jug_rear_delt_fly', 'Water jug rear delt fly', 'rear_delt_iso', 'isolation', { rear_delts: 1 }, ['water_jugs'], 'household', 1),
  ex('jug_overhead_extension', 'Overhead water jug triceps extension', 'triceps_iso', 'isolation', { triceps: 1 }, ['water_jugs'], 'household', 1, { lengthened: true, avoid: ['elbow', 'shoulder'] }),

  // Sturdy chair or step
  ex('incline_push_up', 'Incline push-up (hands on a chair)', 'horizontal_push', 'compound', PUSH, ['chair_step'], 'bodyweight', 1, { avoid: ['wrist'] }),
  ex('decline_push_up', 'Decline push-up (feet on a chair)', 'horizontal_push', 'compound', { ...PUSH, front_delts: 1 }, ['chair_step'], 'bodyweight', 2, { avoid: ['wrist', 'shoulder'] }),
  ex('chair_dip', 'Bench dip (on a chair)', 'triceps_iso', 'isolation', { triceps: 1, chest: 0.5 }, ['chair_step'], 'bodyweight', 1, { avoid: ['shoulder', 'elbow', 'wrist'] }),

  // Sturdy table or doorframe
  ex('doorframe_row', 'Doorframe row (towel around the frame)', 'horizontal_pull', 'compound', ROW, ['table_doorframe'], 'bodyweight', 1),

  // Suspension trainer / rings
  ex('suspension_row', 'Suspension row (TRX / rings)', 'horizontal_pull', 'compound', ROW, ['suspension'], 'bodyweight', 1, { lengthened: true }),
  ex('suspension_push_up', 'Suspension push-up (TRX / rings)', 'horizontal_push', 'compound', { ...PUSH, core: 0.5 }, ['suspension'], 'bodyweight', 2, { lengthened: true, avoid: ['shoulder', 'wrist'] }),
  ex('suspension_curl', 'Suspension biceps curl (TRX / rings)', 'biceps_iso', 'isolation', { biceps: 1 }, ['suspension'], 'bodyweight', 1),
  ex('suspension_face_pull', 'Suspension face pull / Y-raise', 'rear_delt_iso', 'isolation', { rear_delts: 1, back: 0.5 }, ['suspension'], 'bodyweight', 1),

  // Bodyweight progressions (easier/harder steps so the tracker can move people one step at a time)
  ex('knee_push_up', 'Knee push-up', 'horizontal_push', 'compound', PUSH, [], 'bodyweight', 1, { avoid: ['wrist', 'knee'] }),
  ex('archer_push_up', 'Archer push-up', 'horizontal_push', 'compound', { ...PUSH, core: 0.5 }, [], 'bodyweight', 3, { unilateral: true, avoid: ['wrist', 'shoulder'] }),
  ex('bag_push_up', 'Backpack push-up (bag on your back)', 'horizontal_push', 'compound', PUSH, ['loaded_bag'], 'household', 1, { avoid: ['wrist'] }),
  ex('elevated_pike_push_up', 'Elevated pike push-up (feet on a chair)', 'vertical_push', 'compound', OVERHEAD, ['chair_step'], 'bodyweight', 2, { avoid: ['shoulder', 'wrist', 'neck'] }),
  ex('bent_knee_inverted_row', 'Bent-knee inverted row (under a table or low bar)', 'horizontal_pull', 'compound', ROW, [['table_doorframe', 'squat_rack']], 'bodyweight', 1),
  ex('feet_elevated_inverted_row', 'Feet-elevated inverted row', 'horizontal_pull', 'compound', ROW, [['table_doorframe', 'squat_rack'], 'chair_step'], 'bodyweight', 2),
  ex('chin_up', 'Chin-up (palms facing you)', 'vertical_pull', 'compound', { back: 1, biceps: 1 }, ['pullup_bar'], 'bodyweight', 3, { lengthened: true, avoid: ['shoulder', 'elbow'] }),
  ex('underhand_inverted_row', 'Underhand inverted row (biceps focus)', 'biceps_iso', 'isolation', { biceps: 1, back: 0.5 }, [['table_doorframe', 'squat_rack']], 'bodyweight', 1),
  ex('split_squat', 'Split squat', 'squat', 'compound', SQUAT, [], 'bodyweight', 1, { lengthened: true, unilateral: true, avoid: ['knee'] }),
  ex('shrimp_squat', 'Shrimp squat (assisted as needed)', 'squat', 'compound', SQUAT, [], 'bodyweight', 3, { unilateral: true, avoid: ['knee', 'ankle'] }),
  ex('single_leg_hip_thrust', 'Single-leg hip thrust (shoulders on couch or chair)', 'glute_iso', 'isolation', { glutes: 1, hamstrings: 0.5 }, [], 'bodyweight', 1, { unilateral: true }),
  ex('nordic_curl_negative', 'Nordic curl lowering (feet anchored)', 'hamstring_iso', 'isolation', { hamstrings: 1 }, [], 'bodyweight', 3, { lengthened: true, avoid: ['knee'] }),
  ex('hollow_hold', 'Hollow body hold', 'core', 'isolation', { core: 1 }, [], 'bodyweight', 2, { timed: true, avoid: ['lower_back'] }),
];

const BY_ID = new Map(EXERCISES.map((e) => [e.id, e]));

export function getExercise(id: string): Exercise {
  const e = BY_ID.get(id);
  if (!e) throw new Error(`Unknown exercise: ${id}`);
  return e;
}

/* ---------- Bodyweight & band difficulty ---------- */

/** Weight can't be added in steps (bodyweight, bands) — progress comes from reps, tempo and harder variations. */
export const isUnloaded = (e: Exercise) => e.load === 'bodyweight' || e.load === 'band';

/**
 * How demanding an unloaded exercise is for someone who already trains. "Easy" ones (bodyweight squats,
 * glute bridges, doorframe rows) are great for beginners and warm-ups but too light to be a trained lifter's
 * main work; "hard" ones (pull-ups, dips, archer push-ups) are worth choosing over machines once someone can do them.
 */
export type BwIntensity = 'easy' | 'moderate' | 'hard';

const BW_INTENSITY: Record<string, BwIntensity> = {
  bodyweight_squat: 'easy',
  reverse_lunge: 'easy',
  glute_bridge: 'easy',
  doorframe_row: 'easy',
  incline_push_up: 'easy',
  knee_push_up: 'easy',
  bent_knee_inverted_row: 'easy',
  dead_bug: 'easy',
  prone_y_raise: 'easy',
  dip: 'hard',
  pull_up: 'hard',
  chin_up: 'hard',
  decline_push_up: 'hard',
  archer_push_up: 'hard',
  suspension_push_up: 'hard',
  elevated_pike_push_up: 'hard',
  feet_elevated_inverted_row: 'hard',
  shrimp_squat: 'hard',
  nordic_curl_negative: 'hard',
};

export function bwIntensity(e: Exercise): BwIntensity | null {
  return isUnloaded(e) ? (BW_INTENSITY[e.id] ?? 'moderate') : null;
}

/* ---------- Progression ladders (easiest → hardest) ---------- */

/** Each step is a little harder than the last. The tracker only ever suggests one step up or down. */
export const LADDERS: string[][] = [
  ['knee_push_up', 'incline_push_up', 'push_up', 'deficit_push_up', 'decline_push_up', 'archer_push_up'],
  ['doorframe_row', 'bent_knee_inverted_row', 'inverted_row', 'feet_elevated_inverted_row'],
  ['band_assisted_pull_up', 'pull_up'],
  ['bodyweight_squat', 'split_squat', 'bulgarian_split_squat', 'shrimp_squat'],
  ['reverse_lunge', 'split_squat'],
  ['pike_push_up', 'elevated_pike_push_up'],
  ['glute_bridge', 'single_leg_hip_thrust'],
  ['sliding_leg_curl', 'nordic_curl_negative'],
  ['dead_bug', 'hollow_hold'],
  ['chair_dip', 'dip'],
];

/** The next step up/down from an exercise, skipping steps the user can't do (equipment, injury). */
export function ladderStep(exerciseId: string, direction: 1 | -1, allowed: (e: Exercise) => boolean): Exercise | null {
  for (const ladder of LADDERS) {
    const i = ladder.indexOf(exerciseId);
    if (i < 0) continue;
    for (let j = i + direction; j >= 0 && j < ladder.length; j += direction) {
      const next = BY_ID.get(ladder[j]);
      if (next && allowed(next)) return next;
    }
  }
  return null;
}

/** The muscle a slot is "for": the highest-credit target muscle (front delts don't count). */
export function primaryMuscle(e: Exercise): Muscle | null {
  let best: Muscle | null = null;
  let bestCredit = 0;
  for (const [m, c] of Object.entries(e.credit) as [CreditMuscle, number][]) {
    if (m === 'front_delts' || m === 'forearms') continue;
    if (c > bestCredit) {
      best = m;
      bestCredit = c;
    }
  }
  return best;
}
