import type { EquipmentItem } from './options';

/**
 * Typed-in equipment → items the planner knows. Matching is by whole words/phrases, case-insensitive.
 * Anything unrecognized is still saved on the profile; it just doesn't unlock exercises.
 */
const PATTERNS: [RegExp, EquipmentItem][] = [
  [/\b(dumb ?bells?|db'?s?)\b/, 'dumbbells'],
  [/\b(resistance )?bands?\b|\btubes?\b|\bmini ?bands?\b/, 'bands'],
  [/\b(weight |flat |adjustable |incline )?bench(es)?\b/, 'bench'],
  [/\b(pull|chin)[ -]?up bars?\b|\bdoorway bars?\b/, 'pullup_bar'],
  [/\bkettle ?bells?\b|\bkb'?s?\b/, 'kettlebell'],
  [/\bbarbells?\b|\bez[ -]?(curl )?bars?\b|\btrap ?bars?\b|\bolympic bars?\b|\bweight plates?\b|\bplates\b/, 'barbell'],
  [/\b(squat|power) ?racks?\b|\bsquat stands?\b|\bsmith machines?\b/, 'squat_rack'],
  [/\bcables?\b|\bpulleys?\b|\bfunctional trainers?\b|\blat pull ?downs?\b/, 'cable'],
  [/\btrx\b|\bsuspension( trainer| straps?)?\b|\b(gymnastic |gym )?rings\b/, 'suspension'],
  [/\bback ?packs?\b|\brucksacks?\b|\bduffel( bags?)?\b|\bsand ?bags?\b|\bloaded bags?\b|\bweighted bags?\b/, 'loaded_bag'],
  [/\b(water |milk )?jugs?\b|\bgallons?\b/, 'water_jugs'],
  [/\bchairs?\b|\bsteps?\b|\bstairs?\b|\bplyo ?box(es)?\b|\bstep ?box(es)?\b|\bsturdy box(es)?\b/, 'chair_step'],
  [/\btables?\b|\bdoor ?frames?\b|\bdoorways?\b/, 'table_doorframe'],
];

export function recognizeEquipment(text: string | undefined): EquipmentItem[] {
  const t = (text ?? '').toLowerCase();
  if (!t.trim()) return [];
  return [...new Set(PATTERNS.filter(([re]) => re.test(t)).map(([, item]) => item))];
}

/** Ticked items plus anything recognized in the typed text. */
export function effectiveItems(equipment: { items: readonly EquipmentItem[]; other?: string }): EquipmentItem[] {
  return [...new Set([...equipment.items, ...recognizeEquipment(equipment.other)])];
}
