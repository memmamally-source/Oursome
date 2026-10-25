import { Platform, type TextStyle, type ViewStyle } from 'react-native';

import { Brand } from '@/config/brand';

/**
 * Oursome design tokens: a warm, homely palette (linen, ivory, terracotta,
 * sage, honey, espresso) inspired by Scandinavian interiors and stationery.
 *
 * Accent keys are roles, kept stable so every screen picks up the palette:
 *  coral    → terracotta: primary actions, selection, brand warmth
 *  mint     → sage: completion, shopping, calm positive feedback
 *  sunshine → honey: celebrations, important dates, highlights
 *  sky      → slate blue: appointments and calendar information
 *  lavender → heather: the organiser and personal planning
 *
 * Every accent has a `soft` tint for backgrounds, an `ink` shade for text on
 * that tint, and `on` for text/icons on the solid `base`. All pairs meet WCAG
 * AA (≥ 4.5:1). The terracotta fill is #A9533F (5.0:1 with ivory text); the
 * brand terracotta #B95F49 is used for the logo and decoration.
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
  /** Text on the primary (terracotta) fill. Prefer `accents[x].on` for other fills. */
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
  background: c.linen,
  surface: c.ivory,
  surfaceAlt: '#F9F1E6',
  surfaceSunken: '#ECE3D6',
  border: '#E4D8C8',
  borderStrong: '#CDBBA6',
  text: c.espresso,
  textSecondary: '#6E625A',
  textTertiary: '#72665E',
  onAccent: c.ivory,
  danger: '#A63A24',
  dangerSoft: '#F6DCD3',
  overlay: 'rgba(51,43,39,0.42)',
  shadow: '#5A3E2E',
  accents: {
    coral: { base: '#A9533F', soft: '#F3DDD3', ink: '#8E3F2D', on: c.ivory },
    sunshine: { base: c.honey, soft: '#F7E9CC', ink: '#7A5414', on: c.espresso },
    sky: { base: '#8FA5B2', soft: '#E3E9EC', ink: '#3F5866', on: c.espresso },
    lavender: { base: '#A08DA4', soft: '#ECE4EC', ink: '#5E4A63', on: c.espresso },
    mint: { base: c.sage, soft: '#E2E9DF', ink: '#4A5E49', on: c.espresso },
  },
};

/** Warm dark: a lamp-lit room rather than a cold inverted screen. */
export const darkPalette: Palette = {
  scheme: 'dark',
  background: '#1E1A17',
  surface: '#2A2420',
  surfaceAlt: '#322B26',
  surfaceSunken: '#191512',
  border: '#3A322C',
  borderStrong: '#56493F',
  text: c.linen,
  textSecondary: '#BDAFA3',
  textTertiary: '#9A8D82',
  onAccent: '#1E1A17',
  danger: '#F09A82',
  dangerSoft: '#3D2620',
  overlay: 'rgba(0,0,0,0.55)',
  shadow: '#000000',
  accents: {
    coral: { base: '#D07A63', soft: '#3D2A24', ink: '#E9A792', on: '#1E1A17' },
    sunshine: { base: c.honey, soft: '#3A3022', ink: '#F0CF95', on: '#1E1A17' },
    sky: { base: '#9FB5C1', soft: '#243038', ink: '#BACBD4', on: '#1E1A17' },
    lavender: { base: '#B8A5BC', soft: '#31283A', ink: '#D0C0D3', on: '#1E1A17' },
    mint: { base: '#9DB39C', soft: '#27302A', ink: '#B9CDB8', on: '#1E1A17' },
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
  // Fraunces: an editorial serif with soft, warm curves for headings.
  display: 'Fraunces_600SemiBold',
  heading: 'Fraunces_600SemiBold',
  body: 'NunitoSans_400Regular',
  bodyMedium: 'NunitoSans_600SemiBold',
  bodyBold: 'NunitoSans_700Bold',
} as const;

// Web: the same names are @font-face aliases (public/index.html) with system
// fallbacks, so text renders immediately while the brand fonts load.
const sansFallback = ", system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const serifFallback = ", 'Iowan Old Style', Georgia, 'Times New Roman', serif";

export const fonts = (
  Platform.OS === 'web'
    ? Object.fromEntries(Object.entries(nativeFonts).map(([k, v]) => [k, v + (v.startsWith('Fraunces') ? serifFallback : sansFallback)]))
    : nativeFonts
) as Record<keyof typeof nativeFonts, string>;

const weights: Record<keyof typeof nativeFonts, TextStyle['fontWeight']> = {
  display: '600',
  heading: '600',
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
  display: { ...font('display'), fontSize: 34, lineHeight: 40, letterSpacing: -0.6 },
  title: { ...font('display'), fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  heading: { ...font('heading'), fontSize: 21, lineHeight: 27, letterSpacing: -0.2 },
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
  number: { ...font('display'), fontSize: 28, lineHeight: 32, letterSpacing: -0.5 },
};

export function elevation(palette: Palette, level: 1 | 2 | 3 = 1): ViewStyle {
  // Soft, warm shadows like paper resting on linen.
  const opacity = palette.scheme === 'dark' ? 0.35 : [0, 0.07, 0.1, 0.14][level];
  const radiusPx = [0, 10, 18, 28][level];
  const offset = [0, 3, 6, 12][level];
  return Platform.select<ViewStyle>({
    web: {
      boxShadow: `0px ${offset}px ${radiusPx}px ${palette.scheme === 'dark' ? `rgba(0,0,0,${opacity})` : `rgba(90,62,46,${opacity})`}`,
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
 * Props that give a screen the paper grain on web (see `[data-paper]` in
 * public/index.html). Native screens use the flat linen colour.
 */
export const paperProps = (Platform.OS === 'web' ? { dataSet: { paper: 'true' } } : {}) as object;
