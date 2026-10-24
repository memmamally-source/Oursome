import { Platform, type TextStyle, type ViewStyle } from 'react-native';

import { Brand } from '@/config/brand';

/**
 * Oursome design tokens.
 *
 * Accents are used purposefully:
 *  coral    → primary actions, selection, brand warmth
 *  sunshine → family events, celebrations, important dates
 *  sky      → appointments and calendar information
 *  lavender → AI and personal planning
 *  mint     → completion, shopping, positive feedback
 *
 * Every accent has a `soft` tint for backgrounds and an `ink` shade for text
 * placed on that tint. All ink/soft pairs meet WCAG AA (≥ 4.5:1). Text on a
 * solid accent always uses `onAccent` (charcoal) — white on coral fails AA.
 */
export const accentKeys = ['coral', 'sunshine', 'sky', 'lavender', 'mint'] as const;
export type AccentKey = (typeof accentKeys)[number];

export type Accent = { base: string; soft: string; ink: string };

export type Palette = {
  scheme: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  border: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  onAccent: string;
  danger: string;
  dangerSoft: string;
  overlay: string;
  shadow: string;
  accents: Record<AccentKey, Accent>;
};

const c = Brand.colors;

export const lightPalette: Palette = {
  scheme: 'light',
  background: c.cream,
  surface: c.white,
  surfaceAlt: '#FFF3E8',
  surfaceSunken: '#F6EEE5',
  border: '#EFE5DA',
  text: c.charcoal,
  textSecondary: '#6B6D7B',
  textTertiary: '#9A9CA8',
  onAccent: c.charcoal,
  danger: '#C2410C',
  dangerSoft: '#FFE9DE',
  overlay: 'rgba(36,38,50,0.38)',
  shadow: '#7A4B2A',
  accents: {
    coral: { base: c.coral, soft: '#FFE8E4', ink: '#B83A30' },
    sunshine: { base: c.sunshine, soft: '#FFF3D6', ink: '#8A5B00' },
    sky: { base: c.sky, soft: '#E4F4FD', ink: '#1C6690' },
    lavender: { base: c.lavender, soft: '#EFEAFC', ink: '#5A44A8' },
    mint: { base: c.mint, soft: '#E2F6EC', ink: '#19734F' },
  },
};

/** A purpose-built dark palette — warm charcoal rather than inverted cream. */
export const darkPalette: Palette = {
  scheme: 'dark',
  background: '#17181F',
  surface: '#22242F',
  surfaceAlt: '#2A2C39',
  surfaceSunken: '#1C1D26',
  border: '#30323F',
  text: '#F5EFE7',
  textSecondary: '#A3A5B5',
  textTertiary: '#767888',
  onAccent: c.charcoal,
  danger: '#FF9A6B',
  dangerSoft: '#3B2620',
  overlay: 'rgba(0,0,0,0.55)',
  shadow: '#000000',
  accents: {
    coral: { base: '#FF8A7F', soft: '#3A2629', ink: '#FFB3AB' },
    sunshine: { base: '#FFD27A', soft: '#382F1F', ink: '#FFD98A' },
    sky: { base: '#8BD1F7', soft: '#1C2E3C', ink: '#9FD8F8' },
    lavender: { base: '#C4B3F2', soft: '#2B2640', ink: '#CDBEF5' },
    mint: { base: '#8DDDBC', soft: '#1B332B', ink: '#9BE3C4' },
  },
};

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  xl: 26,
  xxl: 32,
  pill: 999,
} as const;

const nativeFonts = {
  display: 'Nunito_800ExtraBold',
  heading: 'Nunito_700Bold',
  body: 'NunitoSans_400Regular',
  bodyMedium: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',
} as const;

// Web: the same names are @font-face aliases (public/index.html) with a rounded
// system fallback, so text renders immediately while the brand font loads.
const webFallback = ", ui-rounded, 'SF Pro Rounded', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const fonts = (
  Platform.OS === 'web' ? Object.fromEntries(Object.entries(nativeFonts).map(([k, v]) => [k, v + webFallback])) : nativeFonts
) as Record<keyof typeof nativeFonts, string>;

const weights: Record<keyof typeof nativeFonts, TextStyle['fontWeight']> = {
  display: '800',
  heading: '700',
  body: '400',
  bodyMedium: '600',
  bodyBold: '700',
};

/** Font family plus (on web) the matching weight, so fallback fonts look right too. */
export function font(kind: keyof typeof nativeFonts): TextStyle {
  return Platform.OS === 'web' ? { fontFamily: fonts[kind], fontWeight: weights[kind] } : { fontFamily: fonts[kind] };
}

export type TypeVariant =
  | 'display'
  | 'title'
  | 'heading'
  | 'subheading'
  | 'body'
  | 'bodyStrong'
  | 'callout'
  | 'caption'
  | 'overline'
  | 'number';

export const typography: Record<TypeVariant, TextStyle> = {
  display: { ...font('display'), fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  title: { ...font('display'), fontSize: 26, lineHeight: 32, letterSpacing: -0.4 },
  heading: { ...font('heading'), fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  subheading: { ...font('heading'), fontSize: 17, lineHeight: 22 },
  body: { ...font('body'), fontSize: 16, lineHeight: 23 },
  bodyStrong: { ...font('bodyBold'), fontSize: 16, lineHeight: 23 },
  callout: { ...font('bodyMedium'), fontSize: 14, lineHeight: 20 },
  caption: { ...font('body'), fontSize: 13, lineHeight: 18 },
  overline: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  number: { ...font('display'), fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
};

export function elevation(palette: Palette, level: 1 | 2 | 3 = 1): ViewStyle {
  const opacity = palette.scheme === 'dark' ? 0.35 : [0, 0.06, 0.09, 0.14][level];
  const radiusPx = [0, 10, 18, 28][level];
  const offset = [0, 3, 6, 12][level];
  return Platform.select<ViewStyle>({
    web: {
      boxShadow: `0px ${offset}px ${radiusPx}px ${palette.scheme === 'dark' ? `rgba(0,0,0,${opacity})` : `rgba(122,75,42,${opacity})`}`,
    } as ViewStyle,
    android: { elevation: level * 2, shadowColor: palette.shadow },
    default: {
      shadowColor: palette.shadow,
      shadowOpacity: opacity,
      shadowRadius: radiusPx / 2,
      shadowOffset: { width: 0, height: offset / 2 },
    },
  })!;
}

/** Layout constants shared by the floating tab bar and screens. */
export const layout = {
  tabBarHeight: 64,
  tabBarMargin: 12,
  screenPadding: 20,
  maxContentWidth: 640,
  maxWideContentWidth: 1080,
} as const;
