import { View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/theme';

export type IllustrationName = 'sun' | 'together' | 'assistant' | 'checklist' | 'basket' | 'calendar' | 'import';

/**
 * Friendly, geometric spot illustrations built from the brand palette.
 * Shapes only — no text — so they work in any locale and both themes.
 */
export function Illustration({ name, width = 200 }: { name: IllustrationName; width?: number }) {
  const { palette } = useTheme();
  const a = palette.accents;
  const surface = palette.surface;
  const line = palette.scheme === 'dark' ? palette.border : '#F1E6DA';
  const height = (width * 160) / 200;

  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={height} viewBox="0 0 200 160">
        {name === 'sun' && (
          <G>
            <Circle cx={100} cy={86} r={64} fill={a.sunshine.soft} />
            {Array.from({ length: 8 }).map((_, i) => {
              const ang = (i * Math.PI) / 4;
              return (
                <Path
                  key={i}
                  d={`M ${100 + Math.cos(ang) * 44} ${74 + Math.sin(ang) * 44} L ${100 + Math.cos(ang) * 54} ${74 + Math.sin(ang) * 54}`}
                  stroke={a.sunshine.base}
                  strokeWidth={6}
                  strokeLinecap="round"
                />
              );
            })}
            <Circle cx={100} cy={74} r={30} fill={a.sunshine.base} />
            <Path d="M48 118 q0 -16 18 -16 q4 -14 20 -12 q10 -10 22 0 q18 -2 18 14 q14 0 14 14 z" fill={surface} />
            <Rect x={122} y={96} width={46} height={42} rx={10} fill={surface} stroke={line} strokeWidth={2} />
            <Rect x={122} y={96} width={46} height={12} rx={6} fill={a.coral.base} />
            <Circle cx={134} cy={120} r={4} fill={a.sky.base} />
            <Circle cx={146} cy={120} r={4} fill={a.mint.base} />
            <Circle cx={158} cy={120} r={4} fill={a.lavender.base} />
          </G>
        )}
        {name === 'together' && (
          <G>
            <Circle cx={100} cy={84} r={66} fill={a.lavender.soft} />
            <Circle cx={74} cy={92} r={30} fill={a.coral.base} opacity={0.92} />
            <Circle cx={126} cy={92} r={30} fill={a.sky.base} opacity={0.92} />
            <Circle cx={100} cy={60} r={26} fill={a.sunshine.base} opacity={0.95} />
            <Circle cx={100} cy={128} r={14} fill={a.mint.base} />
            <Circle cx={74} cy={84} r={5} fill={surface} />
            <Circle cx={126} cy={84} r={5} fill={surface} />
            <Circle cx={100} cy={54} r={4.5} fill={surface} />
          </G>
        )}
        {name === 'assistant' && (
          <G>
            <Circle cx={100} cy={82} r={62} fill={a.lavender.soft} />
            <Path
              d="M100 32 C106 62 118 74 148 80 C118 86 106 98 100 128 C94 98 82 86 52 80 C82 74 94 62 100 32 Z"
              fill={a.lavender.base}
            />
            <Path
              d="M150 30 C152 40 156 44 166 46 C156 48 152 52 150 62 C148 52 144 48 134 46 C144 44 148 40 150 30 Z"
              fill={a.sunshine.base}
            />
            <Path
              d="M52 110 C53 117 56 120 63 121 C56 122 53 125 52 132 C51 125 48 122 41 121 C48 120 51 117 52 110 Z"
              fill={a.coral.base}
            />
            <Circle cx={156} cy={118} r={6} fill={a.mint.base} />
            <Circle cx={44} cy={52} r={5} fill={a.sky.base} />
          </G>
        )}
        {name === 'checklist' && (
          <G>
            <Circle cx={100} cy={84} r={64} fill={a.mint.soft} />
            <Rect x={56} y={34} width={88} height={104} rx={16} fill={surface} stroke={line} strokeWidth={2} />
            {[0, 1, 2].map((i) => (
              <G key={i}>
                <Circle
                  cx={78}
                  cy={62 + i * 26}
                  r={8}
                  fill={i === 0 ? a.mint.base : 'none'}
                  stroke={i === 0 ? a.mint.base : line}
                  strokeWidth={3}
                />
                <Rect
                  x={94}
                  y={58 + i * 26}
                  width={i === 1 ? 30 : 38}
                  height={8}
                  rx={4}
                  fill={i === 0 ? line : [a.coral, a.sky, a.lavender][i].soft}
                />
              </G>
            ))}
            <Path d="M74 62 l3 3 l6 -6" stroke={surface} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={150} cy={40} r={10} fill={a.sunshine.base} />
          </G>
        )}
        {name === 'basket' && (
          <G>
            <Circle cx={100} cy={84} r={64} fill={a.mint.soft} />
            <Circle cx={80} cy={70} r={14} fill={a.coral.base} />
            <Rect x={98} y={46} width={16} height={38} rx={8} fill={a.sunshine.base} />
            <Circle cx={124} cy={72} r={12} fill={a.mint.base} />
            <Path d="M50 82 H150 L138 132 Q136 140 128 140 H72 Q64 140 62 132 Z" fill={a.sky.base} />
            <Path
              d="M72 96 V126 M88 96 V126 M104 96 V126 M120 96 V126"
              stroke={surface}
              strokeWidth={4}
              strokeLinecap="round"
              opacity={0.6}
            />
          </G>
        )}
        {name === 'calendar' && (
          <G>
            <Circle cx={100} cy={84} r={64} fill={a.sky.soft} />
            <Rect x={50} y={36} width={100} height={98} rx={18} fill={surface} stroke={line} strokeWidth={2} />
            <Rect x={50} y={36} width={100} height={24} rx={12} fill={a.sky.base} />
            {Array.from({ length: 9 }).map((_, i) => (
              <Rect
                key={i}
                x={62 + (i % 3) * 28}
                y={70 + Math.floor(i / 3) * 20}
                width={20}
                height={12}
                rx={6}
                fill={i === 4 ? a.coral.base : i === 2 ? a.sunshine.base : i === 6 ? a.mint.base : line}
              />
            ))}
          </G>
        )}
        {name === 'import' && (
          <G>
            <Circle cx={100} cy={84} r={64} fill={a.lavender.soft} />
            <Rect x={46} y={40} width={64} height={88} rx={12} fill={surface} stroke={line} strokeWidth={2} />
            <Rect x={56} y={54} width={44} height={6} rx={3} fill={line} />
            <Rect x={56} y={68} width={34} height={6} rx={3} fill={line} />
            <Rect x={56} y={82} width={40} height={6} rx={3} fill={line} />
            <Path d="M116 84 h18" stroke={a.lavender.base} strokeWidth={5} strokeLinecap="round" />
            <Path
              d="M128 76 l8 8 l-8 8"
              stroke={a.lavender.base}
              strokeWidth={5}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Rect x={142} y={52} width={36} height={22} rx={8} fill={a.sky.base} />
            <Rect x={142} y={80} width={36} height={22} rx={8} fill={a.mint.base} />
            <Rect x={142} y={108} width={36} height={18} rx={8} fill={a.sunshine.base} />
          </G>
        )}
      </Svg>
    </View>
  );
}
