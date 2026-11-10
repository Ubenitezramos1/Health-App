import '@/global.css';

import { Platform } from 'react-native';

/**
 * Palette C — "Navy violet".
 * Navy base, muted violet accent for actions, teal reserved for progress / PRs.
 */
export const Colors = {
  background: '#0D1224',
  surface: '#161D36',
  surfaceRaised: '#1E2747',
  border: '#2A3358',
  borderStrong: '#3A4573',
  text: '#E7E9F5',
  textSecondary: '#A3A8C3',
  textMuted: '#6F7596',
  accent: '#7C6CF2',
  accentPressed: '#6A5AE0',
  accentSoft: '#2A2758',
  onAccent: '#FFFFFF',
  progress: '#2DD4BF',
  progressSoft: '#0F3A3A',
  /** Chart series mark (validated: OKLCH L inside dark band, ≥3:1 vs surface). */
  chartLine: '#14A396',
  warning: '#F5B454',
  warningSoft: '#3A2E14',
  danger: '#F47174',
  dangerSoft: '#3D1A22',
} as const;

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', rounded: 'ui-rounded', mono: 'ui-monospace' },
  web: { sans: 'var(--font-display)', rounded: 'var(--font-rounded)', mono: 'var(--font-mono)' },
  default: { sans: 'normal', rounded: 'normal', mono: 'monospace' },
});

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
} as const;

export const Type = {
  title: { fontSize: 26, fontWeight: '700' as const, lineHeight: 32 },
  heading: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 22 },
  label: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  small: { fontSize: 13, fontWeight: '400' as const, lineHeight: 18 },
};

export const MaxContentWidth = 560;
