/** Profile values are stored in metric (cm, kg). These helpers convert for display/input. */

export type WeightUnit = 'lb' | 'kg';
export type LengthUnit = 'imperial' | 'metric';

const KG_PER_LB = 0.45359237;
const CM_PER_IN = 2.54;

export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;

export const feetInchesToCm = (feet: number, inches: number) => (feet * 12 + inches) * CM_PER_IN;

export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_IN);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export const round = (value: number, decimals = 0) => {
  const f = 10 ** decimals;
  return Math.round(value * f) / f;
};

export function formatWeight(kg: number, unit: WeightUnit) {
  return unit === 'kg' ? `${round(kg, 1)} kg` : `${round(kgToLb(kg))} lb`;
}

export function formatHeight(cm: number, unit: LengthUnit) {
  if (unit === 'metric') return `${round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}′ ${inches}″`;
}

/** Parses "YYYY-MM-DD" into a Date only if it is a real calendar date. */
export function parseIsoDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    return null;
  }
  return date;
}

/** Whole years between a "YYYY-MM-DD" birth date and `today`. */
export function ageFromDob(dobIso: string, today: Date = new Date()): number | null {
  const dob = parseIsoDate(dobIso);
  if (!dob) return null;
  let age = today.getFullYear() - dob.getUTCFullYear();
  const beforeBirthday =
    today.getMonth() < dob.getUTCMonth() ||
    (today.getMonth() === dob.getUTCMonth() && today.getDate() < dob.getUTCDate());
  if (beforeBirthday) age -= 1;
  return age;
}

export const toIsoDate = (year: number, month: number, day: number) =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
