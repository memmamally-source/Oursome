import { Platform, type TextStyle, type ViewStyle } from 'react-native';

import { Brand } from '@/config/brand';

/**
 * Oursome design tokens: calm blue and turquoise on cool white, with deep navy
 * text. Colours live here (and in src/config/brand.ts); screens never hard-code them.
 *
 * Accent keys are roles, kept stable so saved data (a list's colour, a
 * person's colour) still works after the redesign:
 *  coral    → ocean blue: primary actions, selection, the brand
 *  mint     → turquoise: completion, shopping, calm positive feedback
 *  sunshine → amber: celebrations, important dates, highlights (used sparingly)
 *  sky      → sky blue: appointments and calendar information
 *  lavender → indigo: the organiser and personal planning
 *
 * Every accent has a `soft` tint for backgrounds, an `ink` shade for text on
 * that tint, and `on` for text/icons on the solid `base`. All pairs meet WCAG
 * AA (≥ 4.5:1); src/theme/__tests__/contrast.test.ts checks them.
 */
export const accentKeys = ['coral', 'sunshine', 'sky', 'lavender', 'mint'] as const;
export type AccentKey = (typeof accentKeys)[number];

export type Accent = { base: string; soft: string; ink: string; on: string };

export type Palette = {
  scheme: 'light' | 'dark';
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceSunken: string;
  border: string;
  /** Slightly stronger rule for focus rings and selected outlines. */
  borderStrong: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  /** Text on the primary (ocean blue) fill. Prefer `accents[x].on` for other fills. */
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
  background: c.cloud,
  surface: c.white,
  surfaceAlt: '#F2F8FC',
  surfaceSunken: '#EAF2F8',
  border: c.mist,
  borderStrong: '#B9CCDA',
  text: c.ink,
  textSecondary: '#5B6B80',
  textTertiary: '#5F6E82',
  onAccent: c.white,
  danger: '#B42318',
  dangerSoft: '#FDE7E5',
  overlay: 'rgba(16,42,67,0.45)',
  shadow: c.navy,
  accents: {
    coral: { base: c.ocean, soft: '#E3F0FA', ink: c.deepBlue, on: c.white },
    sunshine: { base: '#F2B33D', soft: '#FDF2DA', ink: '#7A4F00', on: c.navy },
    sky: { base: '#3FA2E4', soft: '#E2F1FB', ink: '#135E91', on: c.navy },
    lavender: { base: '#5856D6', soft: '#ECEBFB', ink: '#3D3BA8', on: c.white },
    mint: { base: c.turquoise, soft: '#DDF5F3', ink: '#0A6661', on: c.navy },
  },
};

/** Night blue: calm and readable, never pure black. */
export const darkPalette: Palette = {
  scheme: 'dark',
  background: '#0B1A2B',
  surface: '#12253A',
  surfaceAlt: '#172C44',
  surfaceSunken: '#08131F',
  border: '#22384F',
  borderStrong: '#36506A',
  text: '#EAF3FA',
  textSecondary: '#A9BACB',
  textTertiary: '#91A4B7',
  onAccent: '#0B1A2B',
  danger: '#FF8F80',
  dangerSoft: '#3B1D1D',
  overlay: 'rgba(0,0,0,0.55)',
  shadow: '#000000',
  accents: {
    coral: { base: '#4DA3E8', soft: '#123250', ink: '#A3D0F5', on: '#0B1A2B' },
    sunshine: { base: '#F5C060', soft: '#3A2D12', ink: '#F8D894', on: '#0B1A2B' },
    sky: { base: '#6BB8EE', soft: '#14324A', ink: '#A8D6F6', on: '#0B1A2B' },
    lavender: { base: '#8E8CF2', soft: '#25264F', ink: '#C6C5FB', on: '#0B1A2B' },
    mint: { base: '#2CCFC6', soft: '#0D3735', ink: '#8FE6E0', on: '#0B1A2B' },
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
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pill: 999,
} as const;

const nativeFonts = {
  // Nunito Sans throughout: clean and modern, the same family as the wordmark.
  display: 'NunitoSans_800ExtraBold',
  heading: 'NunitoSans_700Bold',
  body: 'NunitoSans_400Regular',
  bodyMedium: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',
} as const;

// Web: the same names are @font-face aliases (public/index.html) with system
// fallbacks, so text renders immediately while the brand fonts load.
const sansFallback = ", system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";

export const fonts = (
  Platform.OS === 'web'
    ? Object.fromEntries(Object.entries(nativeFonts).map(([k, v]) => [k, v + sansFallback]))
    : nativeFonts
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
  display: { ...font('display'), fontSize: 32, lineHeight: 38, letterSpacing: -0.8 },
  title: { ...font('display'), fontSize: 26, lineHeight: 32, letterSpacing: -0.6 },
  heading: { ...font('heading'), fontSize: 20, lineHeight: 26, letterSpacing: -0.3 },
  subheading: { ...font('heading'), fontSize: 17, lineHeight: 22 },
  body: { ...font('body'), fontSize: 16, lineHeight: 23 },
  bodyStrong: { ...font('bodyBold'), fontSize: 16, lineHeight: 23 },
  callout: { ...font('bodyMedium'), fontSize: 14, lineHeight: 20 },
  caption: { ...font('body'), fontSize: 13, lineHeight: 18 },
  overline: {
    ...font('bodyBold'),
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  number: { ...font('display'), fontSize: 26, lineHeight: 30, letterSpacing: -0.6 },
};

export function elevation(palette: Palette, level: 1 | 2 | 3 = 1): ViewStyle {
  // Soft, cool shadows: just enough to lift a card.
  const opacity = palette.scheme === 'dark' ? 0.35 : [0, 0.06, 0.09, 0.13][level];
  const radiusPx = [0, 10, 18, 28][level];
  const offset = [0, 3, 6, 12][level];
  return Platform.select<ViewStyle>({
    web: {
      boxShadow: `0px ${offset}px ${radiusPx}px ${palette.scheme === 'dark' ? `rgba(0,0,0,${opacity})` : `rgba(16,42,67,${opacity})`}`,
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

/**
 * Motion tokens. Productivity screens use `fast`/`base`; journal moments
 * (page turns, celebrations) use `slow`. Respect reduced motion via
 * useReducedMotion() in src/theme/motion.ts.
 */
export const motion = {
  duration: { instant: 90, fast: 160, base: 240, slow: 420, page: 650 },
  /** CSS easing strings for web transitions. */
  css: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    out: 'cubic-bezier(0.16, 1, 0.3, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

/**
 * Screen background props. The old paper grain is retired: every platform uses
 * the flat background colour. Kept so screens don't need changing.
 */
export const paperProps = {} as object;
