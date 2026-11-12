/**
 * Pre-written option lists for the questionnaire.
 * IDs are stable (stored in the profile); labels are display-only and can change freely.
 */

export type Option<T extends string = string> = { id: T; label: string; description?: string };

export const SEX_OPTIONS = [
  { id: 'male', label: 'Male' },
  { id: 'female', label: 'Female' },
  { id: 'unspecified', label: 'Prefer not to say' },
] as const satisfies readonly Option[];

export const ACTIVITY_LEVELS = [
  { id: 'sedentary', label: 'Mostly sitting', description: 'Desk job, little exercise' },
  { id: 'light', label: 'Lightly active', description: 'Some walking, exercise 1–2×/week' },
  { id: 'moderate', label: 'Moderately active', description: 'On your feet often or exercise 3–4×/week' },
  { id: 'very', label: 'Very active', description: 'Physical job or exercise 5+×/week' },
] as const satisfies readonly Option[];

export const ACTIVITIES = [
  { id: 'weightlifting', label: 'Weightlifting' },
  { id: 'running', label: 'Running' },
  { id: 'cycling', label: 'Cycling' },
  { id: 'swimming', label: 'Swimming' },
  { id: 'hiit', label: 'HIIT' },
  { id: 'yoga_pilates', label: 'Yoga / Pilates' },
  { id: 'team_sports', label: 'Team sports' },
  { id: 'martial_arts', label: 'Martial arts' },
  { id: 'hiking_walking', label: 'Hiking / Walking' },
  { id: 'calisthenics', label: 'Calisthenics' },
  { id: 'crossfit', label: 'CrossFit' },
  { id: 'climbing', label: 'Climbing' },
  { id: 'dance', label: 'Dance' },
] as const satisfies readonly Option[];

export const EXPERIENCE_LEVELS = [
  { id: 'none', label: 'New to lifting', description: "I haven't strength trained before" },
  { id: 'beginner', label: 'Under 6 months', description: 'Still learning the main lifts' },
  { id: 'intermediate', label: '6 months – 2 years', description: 'Consistent, comfortable with most lifts' },
  { id: 'advanced', label: '2+ years', description: 'Consistent training for years' },
] as const satisfies readonly Option[];

export const FOCUS_BODY = [
  { id: 'chest', label: 'Chest' },
  { id: 'back', label: 'Back' },
  { id: 'shoulders', label: 'Shoulders' },
  { id: 'arms', label: 'Arms' },
  { id: 'core', label: 'Core / Abs' },
  { id: 'glutes', label: 'Glutes' },
  { id: 'legs', label: 'Legs' },
  { id: 'calves', label: 'Calves' },
  { id: 'posture', label: 'Posture' },
] as const satisfies readonly Option[];

export const FOCUS_SKILLS = [
  { id: 'strength', label: 'Overall strength' },
  { id: 'endurance', label: 'Endurance' },
  { id: 'mobility', label: 'Mobility / Flexibility' },
  { id: 'balance', label: 'Balance / Stability' },
  { id: 'power', label: 'Power / Explosiveness' },
  { id: 'first_pullup', label: 'First pull-up' },
  { id: 'first_pushup', label: 'First push-up' },
  { id: 'running_pace', label: 'Running pace' },
] as const satisfies readonly Option[];

export const FOCUS_HEALTH = [
  { id: 'energy', label: 'Daily energy' },
  { id: 'sleep', label: 'Sleep' },
  { id: 'stress', label: 'Stress' },
  { id: 'heart_health', label: 'Heart health' },
  { id: 'joint_pain', label: 'Joint pain' },
  { id: 'back_pain', label: 'Back pain' },
  { id: 'confidence', label: 'Confidence' },
] as const satisfies readonly Option[];

export const GOALS = [
  { id: 'build_muscle', label: 'Build muscle' },
  { id: 'lose_fat', label: 'Lose fat' },
  { id: 'recomp', label: 'Lose fat and build muscle' },
  { id: 'get_stronger', label: 'Get stronger' },
  { id: 'endurance', label: 'Improve endurance' },
  { id: 'athletic', label: 'Athletic performance' },
  { id: 'mobility', label: 'Improve mobility' },
  { id: 'general_health', label: 'General health and longevity' },
  { id: 'event_prep', label: 'Prepare for an event' },
] as const satisfies readonly Option[];

export const INJURY_AREAS = [
  { id: 'neck', label: 'Neck' },
  { id: 'shoulder', label: 'Shoulder' },
  { id: 'elbow', label: 'Elbow' },
  { id: 'wrist', label: 'Wrist / Hand' },
  { id: 'upper_back', label: 'Upper back' },
  { id: 'lower_back', label: 'Lower back' },
  { id: 'hip', label: 'Hip' },
  { id: 'knee', label: 'Knee' },
  { id: 'ankle', label: 'Ankle / Foot' },
] as const satisfies readonly Option[];

/** Areas that come in left/right pairs (side is asked for these). */
export const SIDED_INJURY_AREAS = ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle'] as const;

export const INJURY_STATUS = [
  { id: 'current', label: 'Current' },
  { id: 'past', label: 'Past' },
] as const satisfies readonly Option[];

export const INJURY_SEVERITY = [
  { id: 'mild', label: 'Mild' },
  { id: 'moderate', label: 'Moderate' },
  { id: 'severe', label: 'Severe' },
] as const satisfies readonly Option[];

export const INJURY_SIDES = [
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' },
  { id: 'both', label: 'Both' },
] as const satisfies readonly Option[];

export const CONDITIONS = [
  { id: 'heart', label: 'Heart condition' },
  { id: 'blood_pressure', label: 'High blood pressure' },
  { id: 'diabetes', label: 'Diabetes' },
  { id: 'asthma', label: 'Asthma' },
  { id: 'pregnancy', label: 'Pregnant or postpartum' },
  { id: 'recent_surgery', label: 'Surgery in the last 6 months' },
  { id: 'dizziness', label: 'Dizziness or fainting with exercise' },
] as const satisfies readonly Option[];

/** Conditions that trigger a "check with your doctor first" prompt. */
export const CLEARANCE_CONDITIONS = [
  'heart',
  'blood_pressure',
  'pregnancy',
  'recent_surgery',
  'dizziness',
] as const;

export const SLEEP_HOURS = [
  { id: 'lt5', label: 'Under 5' },
  { id: '5-6', label: '5–6' },
  { id: '6-7', label: '6–7' },
  { id: '7-8', label: '7–8' },
  { id: '8-9', label: '8–9' },
  { id: '9plus', label: '9+' },
] as const satisfies readonly Option[];

export const AVAILABILITY = [
  { id: 'low', label: 'Low', description: '1–3 days per week' },
  { id: 'medium', label: 'Medium', description: '4–5 days per week' },
  { id: 'high', label: 'High', description: '6–7 days per week' },
] as const satisfies readonly Option[];

export const SESSION_LENGTHS = [
  { id: 'short', label: 'Little time', description: '30–60 minutes · efficient, lower-volume plan' },
  { id: 'medium', label: 'Medium time', description: '60–90 minutes' },
  { id: 'long', label: 'High time', description: '90+ minutes' },
] as const satisfies readonly Option[];

export const EQUIPMENT_ACCESS = [
  { id: 'none', label: 'No equipment', description: 'Bodyweight, plus everyday items around the house' },
  { id: 'limited', label: 'Some equipment', description: 'Home gym or a few pieces' },
  { id: 'full', label: 'Full gym', description: 'Machines, cables, barbells, dumbbells' },
] as const satisfies readonly Option[];

/** Gym / home-gym gear. */
export const GEAR_ITEMS = [
  { id: 'dumbbells', label: 'Dumbbells' },
  { id: 'bands', label: 'Resistance bands' },
  { id: 'bench', label: 'Bench' },
  { id: 'pullup_bar', label: 'Pull-up bar' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'barbell', label: 'Barbell and plates' },
  { id: 'squat_rack', label: 'Squat rack' },
  { id: 'cable', label: 'Cable machine' },
  { id: 'suspension', label: 'Suspension trainer / rings' },
] as const satisfies readonly Option[];

/** Everyday items that can stand in for equipment (offered for "No equipment" and "Some equipment"). */
export const HOUSEHOLD_ITEMS = [
  { id: 'loaded_bag', label: 'Loaded backpack or bag', description: 'Filled with books or water bottles' },
  { id: 'water_jugs', label: 'Water jugs', description: 'About 8 lb per gallon, more with sand' },
  { id: 'chair_step', label: 'Sturdy chair or step' },
  { id: 'table_doorframe', label: 'Sturdy table or doorframe' },
] as const satisfies readonly Option[];

export const EQUIPMENT_ITEMS = [...GEAR_ITEMS, ...HOUSEHOLD_ITEMS] as const;

type Ids<T extends readonly Option[]> = T[number]['id'];

export type Sex = Ids<typeof SEX_OPTIONS>;
export type ActivityLevel = Ids<typeof ACTIVITY_LEVELS>;
export type ActivityId = Ids<typeof ACTIVITIES>;
export type Experience = Ids<typeof EXPERIENCE_LEVELS>;
export type BodyFocus = Ids<typeof FOCUS_BODY>;
export type SkillFocus = Ids<typeof FOCUS_SKILLS>;
export type HealthFocus = Ids<typeof FOCUS_HEALTH>;
export type Goal = Ids<typeof GOALS>;
export type InjuryArea = Ids<typeof INJURY_AREAS>;
export type InjuryStatus = Ids<typeof INJURY_STATUS>;
export type InjurySeverity = Ids<typeof INJURY_SEVERITY>;
export type InjurySide = Ids<typeof INJURY_SIDES>;
export type Condition = Ids<typeof CONDITIONS>;
export type SleepHours = Ids<typeof SLEEP_HOURS>;
export type Availability = Ids<typeof AVAILABILITY>;
export type SessionLength = Ids<typeof SESSION_LENGTHS>;
export type EquipmentAccess = Ids<typeof EQUIPMENT_ACCESS>;
export type EquipmentItem = Ids<typeof EQUIPMENT_ITEMS>;

export const ids = <T extends readonly Option[]>(options: T) =>
  options.map((o) => o.id) as unknown as [Ids<T>, ...Ids<T>[]];

export const labelOf = (options: readonly Option[], id: string | undefined) =>
  options.find((o) => o.id === id)?.label ?? id ?? '';
