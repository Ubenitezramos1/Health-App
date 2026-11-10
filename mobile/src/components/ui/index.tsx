import type { ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  type TextProps,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';

import { Colors, Radius, Spacing, Type } from '@/constants/theme';
import type { Option } from '@/features/profile/options';

/* ---------- Text ---------- */

type Variant = keyof typeof Type;

export function AppText({
  variant = 'body',
  tone = 'primary',
  style,
  ...rest
}: TextProps & { variant?: Variant; tone?: 'primary' | 'secondary' | 'muted' | 'danger' | 'accent' }) {
  const color = {
    primary: Colors.text,
    secondary: Colors.textSecondary,
    muted: Colors.textMuted,
    danger: Colors.danger,
    accent: Colors.accent,
  }[tone];
  return <Text style={[Type[variant], { color }, style]} {...rest} />;
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <AppText variant="small" tone="danger" style={{ marginTop: Spacing.xs }} accessibilityRole="alert">
      {message}
    </AppText>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <View style={{ gap: Spacing.sm, marginBottom: Spacing.xl }}>
      <View>
        <AppText variant="label">{title}</AppText>
        {hint ? (
          <AppText variant="small" tone="secondary">
            {hint}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

/* ---------- Buttons ---------- */

export function Button({
  label,
  onPress,
  variant = 'primary',
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'primary' && { backgroundColor: pressed ? Colors.accentPressed : Colors.accent },
        variant === 'secondary' && {
          backgroundColor: pressed ? Colors.surfaceRaised : Colors.surface,
          borderColor: Colors.border,
          borderWidth: 1,
        },
        variant === 'ghost' && { backgroundColor: pressed ? Colors.surface : 'transparent' },
        style,
      ]}>
      <AppText variant="label" style={{ color: variant === 'primary' ? Colors.onAccent : Colors.text }}>
        {label}
      </AppText>
    </Pressable>
  );
}

/* ---------- Selection controls ---------- */

/** Multi-select pill. */
export function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[styles.chip, selected && styles.chipSelected]}>
      <AppText variant="small" style={{ color: selected ? Colors.text : Colors.textSecondary, fontWeight: '600' }}>
        {selected ? '✓ ' : ''}
        {label}
      </AppText>
    </Pressable>
  );
}

export function ChipGroup<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<T>[];
  value: readonly T[];
  onChange: (next: T[]) => void;
}) {
  const toggle = (id: T) =>
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  return (
    <View style={styles.chipRow}>
      {options.map((o) => (
        <Chip key={o.id} label={o.label} selected={value.includes(o.id)} onPress={() => toggle(o.id)} />
      ))}
    </View>
  );
}

/** Single-select list of cards (radio). */
export function OptionCards<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<T>[];
  value: T | undefined;
  onChange: (id: T) => void;
}) {
  return (
    <View style={{ gap: Spacing.sm }} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.id)}
            style={[styles.card, selected && styles.cardSelected]}>
            <View style={[styles.radio, selected && styles.radioSelected]}>
              {selected ? <View style={styles.radioDot} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <AppText variant="label">{o.label}</AppText>
              {o.description ? (
                <AppText variant="small" tone="secondary">
                  {o.description}
                </AppText>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Compact single-select (units, sides, status). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<T>[];
  value: T | undefined;
  onChange: (id: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="radiogroup">
      {options.map((o) => {
        const selected = o.id === value;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.id)}
            style={[styles.segment, selected && { backgroundColor: Colors.accent }]}>
            <AppText
              variant="small"
              style={{ fontWeight: '600', color: selected ? Colors.onAccent : Colors.textSecondary }}>
              {o.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 1–5 rating with end labels. */
export function RatingScale({
  value,
  onChange,
  lowLabel,
  highLabel,
  accessibilityLabel,
}: {
  value: number | undefined;
  onChange: (n: number) => void;
  lowLabel: string;
  highLabel: string;
  accessibilityLabel: string;
}) {
  return (
    <View>
      <View style={styles.ratingRow} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
        {[1, 2, 3, 4, 5].map((n) => {
          const selected = n === value;
          return (
            <Pressable
              key={n}
              accessibilityRole="radio"
              accessibilityLabel={`${n} of 5`}
              accessibilityState={{ selected }}
              onPress={() => onChange(n)}
              style={[styles.ratingButton, selected && styles.cardSelected]}>
              <AppText variant="heading" style={{ color: selected ? Colors.text : Colors.textSecondary }}>
                {n}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.ratingLabels}>
        <AppText variant="small" tone="muted">
          {lowLabel}
        </AppText>
        <AppText variant="small" tone="muted">
          {highLabel}
        </AppText>
      </View>
    </View>
  );
}

/* ---------- Inputs ---------- */

export function TextField({ label, style, ...rest }: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: Spacing.xs, flex: 1, minWidth: 0 }}>
      {label ? (
        <AppText variant="small" tone="secondary">
          {label}
        </AppText>
      ) : null}
      <TextInput
        placeholderTextColor={Colors.textMuted}
        style={[styles.input, style]}
        accessibilityLabel={label}
        {...rest}
      />
    </View>
  );
}

/** Numeric field that reports `undefined` while empty or invalid. */
export function NumberField({
  label,
  value,
  onChange,
  suffix,
  placeholder,
  decimals = false,
}: {
  label?: string;
  value: number | undefined;
  onChange: (n: number | undefined) => void;
  suffix?: string;
  placeholder?: string;
  decimals?: boolean;
}) {
  return (
    <View style={{ gap: Spacing.xs, flex: 1, minWidth: 0 }}>
      {label ? (
        <AppText variant="small" tone="secondary">
          {label}
        </AppText>
      ) : null}
      <View style={styles.inputWrap}>
        <TextInput
          accessibilityLabel={label}
          keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
          inputMode={decimals ? 'decimal' : 'numeric'}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          value={value === undefined || Number.isNaN(value) ? '' : String(value)}
          onChangeText={(t) => {
            const cleaned = t.replace(decimals ? /[^0-9.]/g : /[^0-9]/g, '');
            if (cleaned === '') return onChange(undefined);
            const n = Number(cleaned);
            onChange(Number.isFinite(n) ? n : undefined);
          }}
          style={[styles.input, { flex: 1, minWidth: 0, width: '100%', borderWidth: 0 }]}
        />
        {suffix ? (
          <AppText variant="small" tone="muted" style={{ paddingRight: Spacing.md }}>
            {suffix}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

/** − value + control for small integers. */
export function Stepper({
  label,
  value,
  onChange,
  min = 1,
  max = 99,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) {
  const btn = (text: string, next: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${text === '−' ? 'Decrease' : 'Increase'} ${label}`}
      onPress={() => !disabled && onChange(next)}
      style={[styles.stepperBtn, disabled && { opacity: 0.35 }]}>
      <AppText variant="heading">{text}</AppText>
    </Pressable>
  );
  return (
    <View style={{ gap: Spacing.xs, flex: 1, minWidth: 0 }}>
      <AppText variant="small" tone="secondary" numberOfLines={1}>
        {label}
      </AppText>
      <View style={styles.stepper}>
        {btn('−', value - 1, value <= min)}
        <AppText variant="label" style={{ minWidth: 28, textAlign: 'center' }} accessibilityLabel={`${label} ${value}`}>
          {value}
        </AppText>
        {btn('+', value + 1, value >= max)}
      </View>
    </View>
  );
}

export function Badge({ label, tone = 'accent' }: { label: string; tone?: 'accent' | 'progress' | 'warning' | 'muted' }) {
  const palette = {
    accent: [Colors.accentSoft, Colors.text],
    progress: [Colors.progressSoft, Colors.progress],
    warning: [Colors.warningSoft, Colors.warning],
    muted: [Colors.surfaceRaised, Colors.textSecondary],
  }[tone];
  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: palette[0],
        borderRadius: Radius.pill,
        paddingHorizontal: 8,
        paddingVertical: 2,
      }}>
      <AppText variant="small" style={{ color: palette[1], fontWeight: '600', fontSize: 12 }}>
        {label}
      </AppText>
    </View>
  );
}

/* ---------- Misc ---------- */

export function ProgressBar({ value }: { value: number }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <View
      style={styles.progressTrack}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct) }}>
      <View style={[styles.progressFill, { width: `${pct}%` }]} />
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, { flexDirection: 'column', alignItems: 'stretch' }, style]}>{children}</View>;
}

export function Callout({ tone = 'warning', children }: { tone?: 'warning' | 'info'; children: ReactNode }) {
  return (
    <View
      style={[
        styles.callout,
        tone === 'warning'
          ? { backgroundColor: Colors.warningSoft, borderColor: Colors.warning }
          : { backgroundColor: Colors.accentSoft, borderColor: Colors.accent },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipSelected: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.lg,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cardSelected: { borderColor: Colors.accent, backgroundColor: Colors.accentSoft },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.accent },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.accent },
  segmented: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 3,
    gap: 3,
  },
  segment: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: Radius.sm },
  ratingRow: { flexDirection: 'row', gap: Spacing.sm },
  ratingButton: {
    flex: 1,
    height: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  input: {
    minHeight: 48,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.surfaceRaised, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: Colors.accent },
  callout: { borderWidth: 1, borderRadius: Radius.md, padding: Spacing.lg, gap: Spacing.xs },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  stepperBtn: { width: 34, height: 44, alignItems: 'center', justifyContent: 'center' },
});
