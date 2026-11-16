import { useId } from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Mask, Path, Rect, Stop } from 'react-native-svg';

import { Brand } from '@/config/brand';
import { useTheme } from '@/theme';

import word from '../../../assets/brand/wordmark-path.json';

/**
 * The Oursome mark: a circular "O" with a simple home in its lower half, the
 * ring stopping just short of the roof. The same geometry draws the app icons
 * and SVG masters (scripts/generate-brand-assets.js), on a 100 × 100 grid.
 */
const R_OUT = 46;
const R_IN = 30;
const APEX = 40;
const d = APEX - 50;
const s = (-d + Math.sqrt(d * d - 2 * (d * d - R_OUT * R_OUT))) / 2;
const f = (n: number) => n.toFixed(2);
const ROUND = 3;
export const HOUSE_PATH = `M ${f(50 - s)} ${f(APEX + s)} L ${f(50 - ROUND)} ${f(APEX + ROUND)} Q 50 ${APEX} ${f(50 + ROUND)} ${f(APEX + ROUND)} L ${f(50 + s)} ${f(APEX + s)} A ${R_OUT} ${R_OUT} 0 0 1 ${f(50 - s)} ${f(APEX + s)} Z`;
const circle = (r: number) => `M ${50 - r} 50 A ${r} ${r} 0 1 0 ${50 + r} 50 A ${r} ${r} 0 1 0 ${50 - r} 50 Z`;
export const RING_PATH = `${circle(R_OUT)} ${circle(R_IN)}`;
const PANE = 8;
const GAP = 2.6;
const PANES = [0, 1].flatMap((r) => [0, 1].map((c) => [50 - PANE - GAP / 2 + c * (PANE + GAP), 61.5 + r * (PANE + GAP)] as const));

/** Gradient stops for the ring and the house, lighter on dark backgrounds. */
const TONES = {
  light: { ring: [Brand.colors.ocean, Brand.colors.turquoise], house: [Brand.colors.ocean, Brand.colors.deepBlue] },
  dark: { ring: ['#4DA3E8', '#2CCFC6'], house: ['#3B8FD9', Brand.colors.ocean] },
} as const;

type Tone = 'auto' | 'light' | 'dark';

export function LogoMark({ size = 48, tone = 'auto' }: { size?: number; tone?: Tone }) {
  const { palette } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const t = TONES[tone === 'auto' ? palette.scheme : tone];
  return (
    <Svg width={size} height={size} viewBox="-2 -2 104 104" accessibilityLabel={`${Brand.name} logo`}>
      <Defs>
        <LinearGradient id={`${id}r`} x1="0.1" y1="0.9" x2="0.9" y2="0.1">
          <Stop offset="0" stopColor={t.ring[0]} />
          <Stop offset="1" stopColor={t.ring[1]} />
        </LinearGradient>
        <LinearGradient id={`${id}h`} x1="0.2" y1="0" x2="0.8" y2="1">
          <Stop offset="0" stopColor={t.house[0]} />
          <Stop offset="1" stopColor={t.house[1]} />
        </LinearGradient>
        <Mask id={`${id}g`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
          <Rect x="-10" y="-10" width="120" height="120" fill="#fff" />
          <Path d={HOUSE_PATH} fill="#000" stroke="#000" strokeWidth={7} strokeLinejoin="round" />
        </Mask>
        <Mask id={`${id}w`} maskUnits="userSpaceOnUse" x="-10" y="-10" width="120" height="120">
          <Rect x="-10" y="-10" width="120" height="120" fill="#fff" />
          {PANES.map(([x, y]) => (
            <Rect key={`${x}-${y}`} x={x} y={y} width={PANE} height={PANE} rx={1.8} fill="#000" />
          ))}
        </Mask>
      </Defs>
      <Path d={RING_PATH} fillRule="evenodd" fill={`url(#${id}r)`} mask={`url(#${id}g)`} />
      <Path d={HOUSE_PATH} fill={`url(#${id}h)`} mask={`url(#${id}w)`} />
    </Svg>
  );
}

/** "oursome", outlined from Nunito Sans ExtraBold so it looks the same everywhere. */
export function Wordmark({ size = 28, withMark = true, tone = 'auto' }: { size?: number; withMark?: boolean; tone?: Tone }) {
  const { palette } = useTheme();
  const scheme = tone === 'auto' ? palette.scheme : tone;
  // `size` is the height of the lowercase letters' box (x-height × 1.6), close to a font size.
  const xh = size * 0.62;
  const k = xh / word.xHeight;
  const width = word.width * k;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.32 }} accessible accessibilityRole="header" accessibilityLabel={Brand.name}>
      {withMark ? <LogoMark size={size * 1.35} tone={tone} /> : null}
      <Svg width={width} height={xh * 1.08} viewBox={`0 ${-word.xHeight * 1.04} ${word.width} ${word.xHeight * 1.08}`}>
        <Path d={word.d} fill={scheme === 'dark' ? Brand.colors.cloud : Brand.colors.navy} />
      </Svg>
    </View>
  );
}
