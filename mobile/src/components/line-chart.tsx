import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { AppText } from '@/components/ui';
import { Colors, Spacing } from '@/constants/theme';

export type ChartPoint = { label: string; value: number; detail: string };

const HEIGHT = 180;
const PAD = { top: 12, right: 12, bottom: 8, left: 40 };

/** Nice round ticks covering [min, max]. */
function ticks(min: number, max: number, count = 3): number[] {
  // A minimum span keeps labels distinct and stops a 1 lb change from looking like a cliff.
  const MIN_SPAN = 4;
  if (max - min < MIN_SPAN) {
    const mid = (max + min) / 2;
    min = mid - MIN_SPAN / 2;
    max = mid + MIN_SPAN / 2;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const out: number[] = [];
  for (let v = start; v <= max + step * 0.001; v += step) out.push(Math.round(v * 100) / 100);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + step);
  return out;
}

/**
 * Single-series line chart (dataviz spec): 2px line, ≥8px markers with a surface ring,
 * hairline recessive grid, one y-axis, no legend (the title names the series).
 * Tap a point to read its value; the list under the chart is the table view.
 */
export function LineChart({ points, unitLabel }: { points: ChartPoint[]; unitLabel: string }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState(points.length - 1);
  if (!points.length) return null;

  const values = points.map((p) => p.value);
  const yTicks = ticks(Math.min(...values), Math.max(...values));
  const yMin = yTicks[0];
  const yMax = yTicks[yTicks.length - 1];
  const plotW = Math.max(1, width - PAD.left - PAD.right);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD.top + plotH - ((v - yMin) / (yMax - yMin || 1)) * plotH;
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const sel = points[Math.min(selected, points.length - 1)];
  const hitW = Math.max(28, plotW / Math.max(1, points.length));

  return (
    <View>
      <View style={{ minHeight: 40, marginBottom: Spacing.sm }} accessibilityLiveRegion="polite">
        <AppText variant="heading">
          {Math.round(sel.value)} {unitLabel}
        </AppText>
        <AppText variant="small" tone="secondary">
          {sel.label} · {sel.detail}
        </AppText>
      </View>
      <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height: HEIGHT }}>
        {width > 0 ? (
          <>
            <Svg width={width} height={HEIGHT}>
              {yTicks.map((t) => (
                <Line key={t} x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke={Colors.border} strokeWidth={1} />
              ))}
              <Path d={path} stroke={Colors.chartLine} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
              {points.map((p, i) => (
                <Circle
                  key={i}
                  cx={x(i)}
                  cy={y(p.value)}
                  r={i === selected ? 6 : 4}
                  fill={Colors.chartLine}
                  stroke={Colors.surface}
                  strokeWidth={2}
                />
              ))}
            </Svg>
            {yTicks.map((t) => (
              <AppText
                key={t}
                variant="small"
                tone="muted"
                style={{ position: 'absolute', left: 0, width: PAD.left - 6, textAlign: 'right', top: y(t) - 9, fontSize: 11 }}>
                {Math.round(t)}
              </AppText>
            ))}
            {points.map((p, i) => (
              <Pressable
                key={i}
                accessibilityRole="button"
                accessibilityLabel={`${p.label}: ${Math.round(p.value)} ${unitLabel}, ${p.detail}`}
                onPress={() => setSelected(i)}
                style={{ position: 'absolute', top: 0, bottom: 0, left: x(i) - hitW / 2, width: hitW }}
              />
            ))}
          </>
        ) : null}
      </View>
    </View>
  );
}
