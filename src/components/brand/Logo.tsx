import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import { Brand } from '@/config/brand';
import { fonts, useTheme } from '@/theme';

import { Text } from '../ui/Text';

/**
 * "Gathering" mark: four rounded pieces circling a terracotta orb, the
 * household around its warm centre. The orb is also Oursome's animated
 * companion (components/brand/Orb.tsx).
 */
export const MARK_SEGMENTS = [
  { color: Brand.colors.honey, start: -158 },
  { color: Brand.colors.sage, start: -68 },
  { color: Brand.colors.slate, start: 22 },
  { color: Brand.colors.heather, start: 112 },
] as const;

const SPAN = 46;

function arc(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(startDeg));
  const y1 = cy + r * Math.sin(rad(startDeg));
  const x2 = cx + r * Math.cos(rad(endDeg));
  const y2 = cy + r * Math.sin(rad(endDeg));
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 0 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

export function LogoMark({ size = 48, dot = true }: { size?: number; dot?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityLabel={`${Brand.name} logo`}>
      {MARK_SEGMENTS.map((s) => (
        <Path
          key={s.color}
          d={arc(50, 50, 32, s.start, s.start + SPAN)}
          stroke={s.color}
          strokeWidth={17}
          strokeLinecap="round"
          fill="none"
        />
      ))}
      {dot ? <Circle cx={50} cy={50} r={11} fill={Brand.colors.terracotta} /> : null}
    </Svg>
  );
}

export function Wordmark({ size = 28, withMark = true }: { size?: number; withMark?: boolean }) {
  const { palette } = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.3 }} accessible accessibilityLabel={Brand.name}>
      {withMark ? <LogoMark size={size * 1.25} /> : null}
      <Text style={{ fontFamily: fonts.display, fontSize: size, lineHeight: size * 1.2, letterSpacing: -size * 0.03, color: palette.text }}>
        {Brand.wordmark}
        <Text style={{ fontFamily: fonts.display, fontSize: size, color: Brand.colors.terracotta }}>.</Text>
      </Text>
    </View>
  );
}
