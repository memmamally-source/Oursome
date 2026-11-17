import { Image } from 'expo-image';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import type { Season } from '@/features/home/occasions';
import { useTheme } from '@/theme';
import { useReducedMotion } from '@/theme/motion';

export const COVERS = ['hearth', 'garden', 'linen', 'coast', 'evening', 'meadow'] as const;
export type CoverKey = (typeof COVERS)[number];

export const coverNames: Record<CoverKey, string> = {
  hearth: 'Hearth',
  garden: 'Garden',
  linen: 'Linen',
  coast: 'Coast',
  evening: 'Evening',
  meadow: 'Meadow',
};

/** Palette-only scenes; each reads well with dark navy text on its left. */
function Scene({ cover, dark }: { cover: CoverKey; dark: boolean }) {
  const dim = dark ? 0.5 : 1;
  switch (cover) {
    case 'hearth':
      return (
        <G opacity={dim}>
          <Rect width="400" height="200" fill="url(#skyWarm)" />
          <Circle cx="330" cy="58" r="30" fill="#59D5CF" opacity={0.9} />
          <Path d="M0 150 Q 90 115 190 140 T 400 128 L400 200 L0 200Z" fill="#A9DCEB" />
          <Path d="M0 172 Q 120 140 240 165 T 400 158 L400 200 L0 200Z" fill="#12B8B0" />
          {/* A small house with a lit window. */}
          <Path d="M286 150 L310 128 L334 150 L334 172 L286 172Z" fill="#FFFFFF" />
          <Path d="M282 152 L310 125 L338 152" stroke="#1769AA" strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <Rect x="302" y="152" width="12" height="12" rx="2" fill="#59D5CF" />
        </G>
      );
    case 'garden':
      return (
        <G opacity={dim}>
          <Rect width="400" height="200" fill="#E4F3F1" />
          <Circle cx="320" cy="64" r="34" fill="#BDECE8" />
          <Path d="M0 140 Q 100 100 200 135 T 400 120 L400 200 L0 200Z" fill="#A9DCEB" />
          <Path d="M0 165 Q 140 130 260 160 T 400 150 L400 200 L0 200Z" fill="#12B8B0" />
          <Path d="M250 160 C 250 130 270 120 280 112 C 282 128 272 142 250 160Z" fill="#0A6661" />
          <Path d="M262 162 C 280 140 300 140 312 136 C 304 152 290 160 262 162Z" fill="#0E8F88" />
        </G>
      );
    case 'linen':
      return (
        <G opacity={dim}>
          <Rect width="400" height="200" fill="#F7FBFE" />
          {Array.from({ length: 9 }, (_, i) => (
            <Path key={i} d={`M0 ${22 * i + 8} L400 ${22 * i + 8}`} stroke="#DFEAF1" strokeWidth={1} strokeDasharray="6 6" />
          ))}
          <G transform="translate(280 30)">
            <Path d="M14 62 A 46 46 0 0 1 62 14" stroke="#59D5CF" strokeWidth={18} strokeLinecap="round" fill="none" />
            <Path d="M86 14 A 46 46 0 0 1 134 62" stroke="#12B8B0" strokeWidth={18} strokeLinecap="round" fill="none" />
            <Path d="M134 86 A 46 46 0 0 1 86 134" stroke="#3FA2E4" strokeWidth={18} strokeLinecap="round" fill="none" />
            <Circle cx="74" cy="74" r="16" fill="#1769AA" />
          </G>
        </G>
      );
    case 'coast':
      return (
        <G opacity={dim}>
          <Rect width="400" height="200" fill="url(#skyCool)" />
          <Circle cx="318" cy="70" r="28" fill="#BDECE8" />
          <Path d="M0 130 Q 50 120 100 130 T 200 130 T 300 130 T 400 130 L400 200 L0 200Z" fill="#9CC9E8" />
          <Path d="M0 150 Q 50 140 100 150 T 200 150 T 300 150 T 400 150 L400 200 L0 200Z" fill="#3FA2E4" />
          <Path d="M0 176 Q 120 160 260 176 T 400 170 L400 200 L0 200Z" fill="#D3E7F2" />
        </G>
      );
    case 'evening':
      return (
        <G opacity={dark ? 0.7 : 1}>
          <Rect width="400" height="200" fill="url(#skyDusk)" />
          <Circle cx="320" cy="60" r="22" fill="#DDF5F3" />
          <Circle cx="329" cy="54" r="20" fill="#C6C5FB" />
          {[
            [250, 40],
            [280, 92],
            [360, 104],
            [372, 34],
            [220, 70],
          ].map(([x, y]) => (
            <Circle key={`${x}`} cx={x} cy={y} r={2} fill="#FFFFFF" opacity={0.85} />
          ))}
          <Path d="M0 160 Q 120 130 240 156 T 400 146 L400 200 L0 200Z" fill="#3D3BA8" />
        </G>
      );
    case 'meadow':
      return (
        <G opacity={dim}>
          <Rect width="400" height="200" fill="#E5F5FB" />
          <Path d="M0 120 Q 120 96 240 118 T 400 108 L400 200 L0 200Z" fill="#8EDFD9" />
          <Path d="M0 150 Q 140 124 280 148 T 400 140 L400 200 L0 200Z" fill="#59D5CF" />
          {[
            [250, 150, '#1769AA'],
            [290, 160, '#FFFFFF'],
            [330, 146, '#12B8B0'],
            [360, 165, '#FFFFFF'],
            [300, 140, '#59D5CF'],
          ].map(([x, y, c]) => (
            <Circle key={`${x}`} cx={x as number} cy={y as number} r={4} fill={c as string} />
          ))}
        </G>
      );
  }
}

/** A few seasonal details: autumn leaves, winter snow, spring blossom, summer haze. */
function SeasonAccent({ season, animate }: { season: Season; animate: boolean }) {
  const sway =
    animate && Platform.OS === 'web'
      ? ({
          animationKeyframes: [
            {
              '0%': { transform: [{ translateY: 0 }, { rotate: '0deg' }] },
              '50%': { transform: [{ translateY: 4 }, { rotate: '8deg' }] },
              '100%': { transform: [{ translateY: 0 }, { rotate: '0deg' }] },
            },
          ],
          animationDuration: '6s',
          animationIterationCount: 'infinite',
          animationTimingFunction: 'ease-in-out',
        } as unknown as ViewStyle)
      : null;
  const shapes =
    season === 'autumn'
      ? [
          [338, 26, '#1769AA'],
          [366, 54, '#59D5CF'],
          [322, 80, '#12B8B0'],
        ].map(([x, y, c], i) => <Path key={i} d={`M${x} ${y} c 8 -10 18 -6 20 0 c -6 8 -14 10 -20 0z`} fill={c as string} opacity={0.85} />)
      : season === 'winter'
        ? [
            [330, 30],
            [362, 66],
            [318, 96],
            [382, 22],
            [346, 118],
          ].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={3} fill="#FFFFFF" opacity={0.9} />)
        : season === 'spring'
          ? [
              [336, 34],
              [366, 64],
              [322, 92],
            ].map(([x, y], i) => <Circle key={i} cx={x} cy={y} r={4.5} fill="#BFDDF3" opacity={0.95} />)
          : [<Ellipse key="haze" cx="330" cy="62" rx="60" ry="60" fill="#DDF5F3" opacity={0.35} />];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, sway]}>
      {/* Anchored top-right so the details stay clear of the greeting on narrow screens. */}
      <Svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="xMaxYMin slice">
        {shapes}
      </Svg>
    </View>
  );
}

/** The household's cover: a chosen scene (with a seasonal touch) or their own photo. */
export function HouseholdCover({ cover = 'hearth', photo, season }: { cover?: CoverKey; photo?: string; season?: Season }) {
  const { palette } = useTheme();
  const reduced = useReducedMotion();
  const dark = palette.scheme === 'dark';
  if (photo) {
    return (
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Image source={{ uri: photo }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityIgnoresInvertColors />
        {/* A soft veil so text stays readable over any photo. */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: dark ? 'rgba(30,26,23,0.55)' : 'rgba(255,249,240,0.55)' }]} />
      </View>
    );
  }
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice">
        <Defs>
          <LinearGradient id="skyWarm" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#DDF5F3" />
            <Stop offset="1" stopColor="#E3F0FA" />
          </LinearGradient>
          <LinearGradient id="skyCool" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#EEF4F8" />
            <Stop offset="1" stopColor="#E2F1FB" />
          </LinearGradient>
          <LinearGradient id="skyDusk" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#8E8CF2" />
            <Stop offset="1" stopColor="#ECEBFB" />
          </LinearGradient>
        </Defs>
        <Scene cover={cover} dark={dark} />
      </Svg>
      {season && cover !== 'evening' ? <SeasonAccent season={season} animate={!reduced} /> : null}
      {/* Left-side wash keeps the greeting legible over every scene. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="wash" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={palette.surface} stopOpacity={dark ? 0.85 : 0.82} />
            <Stop offset="0.55" stopColor={palette.surface} stopOpacity={dark ? 0.55 : 0.35} />
            <Stop offset="1" stopColor={palette.surface} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100" height="100" fill="url(#wash)" />
      </Svg>
    </View>
  );
}
