import type { Mood, ThemeId } from '@/domain/types';

import type { DecorItem, FrameStyle, Shape, TextRole } from './schema';

export interface FontSpec {
  family: string;
  weight: number;
  style?: 'normal' | 'italic';
  upper?: boolean;
  /** Letter spacing in em. */
  tracking?: number;
  lineHeight: number;
  /** Multiplies the layout's size (handwriting fonts run small). */
  scale?: number;
}

export type BackgroundKind = 'plain' | 'dots' | 'grid' | 'lines' | 'kraft' | 'linen' | 'confetti' | 'deckle';

export interface ThemeDef {
  id: ThemeId;
  name: string;
  description: string;
  colors: {
    page: string;
    chapterPage: string;
    ink: string;
    muted: string;
    accent: string;
    accent2: string;
    /** Photo borders / polaroid paper. */
    mat: string;
    pattern: string;
  };
  fonts: Record<'title' | 'heading' | 'body' | 'caption' | 'label', FontSpec>;
  background: BackgroundKind;
  chapterBackground: BackgroundKind;
  frame: FrameStyle;
  shape: Shape;
  /** Corner radius for 'rounded' shapes, in page units. */
  radius: number;
  /** Multiplier for layout rotations (0 keeps everything straight). */
  tilt: number;
  shadow: boolean;
  /** Ornaments cycled across ordinary photo pages (deterministically). */
  pageDecor: DecorItem[][];
  /** Moods that point to this theme. */
  moods: Mood[];
}

/** Which font each text role uses. */
export const ROLE_FONT: Record<TextRole, keyof ThemeDef['fonts']> = {
  title: 'title',
  subtitle: 'label',
  heading: 'heading',
  date: 'label',
  caption: 'caption',
  body: 'body',
  names: 'caption',
  note: 'body',
};

const SERIF = 'Cormorant Garamond';
const HAND = 'Caveat';
const FRAUNCES = 'Fraunces Variable';
const SANS = 'Inter Variable';
const PLAYFAIR = 'Playfair Display';
const TYPE = 'Special Elite';

export const THEMES: ThemeDef[] = [
  {
    id: 'minimal',
    name: 'Minimal Editorial',
    description: 'Magazine pages: generous white space, refined serif titles and large, uncluttered photographs.',
    colors: { page: '#FBFAF7', chapterPage: '#F3F0EA', ink: '#1F1D1A', muted: '#6B655C', accent: '#9A8F80', accent2: '#C9BFB0', mat: '#FFFFFF', pattern: '#E9E4DB' },
    fonts: {
      title: { family: SERIF, weight: 500, lineHeight: 1.05, tracking: -0.01 },
      heading: { family: SERIF, weight: 500, style: 'italic', lineHeight: 1.1 },
      body: { family: SERIF, weight: 500, lineHeight: 1.35, scale: 1.1 },
      caption: { family: SANS, weight: 400, lineHeight: 1.4, scale: 0.82 },
      label: { family: SANS, weight: 500, upper: true, tracking: 0.22, lineHeight: 1.2, scale: 0.85 },
    },
    background: 'plain',
    chapterBackground: 'plain',
    frame: 'none',
    shape: 'rect',
    radius: 0,
    tilt: 0,
    shadow: false,
    pageDecor: [[]],
    moods: ['elegant', 'calm'],
  },
  {
    id: 'scrapbook',
    name: 'Warm Scrapbook',
    description: 'Kraft paper, taped prints at playful angles, handwritten captions and little doodles.',
    colors: { page: '#EADBC4', chapterPage: '#E3D0B3', ink: '#3B2A1E', muted: '#6E5643', accent: '#C9826B', accent2: '#8FA382', mat: '#FFFDF8', pattern: '#D9C6A8' },
    fonts: {
      title: { family: HAND, weight: 600, lineHeight: 1, scale: 1.35 },
      heading: { family: HAND, weight: 600, lineHeight: 1, scale: 1.3 },
      body: { family: HAND, weight: 500, lineHeight: 1.15, scale: 1.35 },
      caption: { family: HAND, weight: 500, lineHeight: 1.1, scale: 1.4 },
      label: { family: FRAUNCES, weight: 500, upper: true, tracking: 0.16, lineHeight: 1.2, scale: 0.85 },
    },
    background: 'kraft',
    chapterBackground: 'dots',
    frame: 'mat',
    shape: 'rect',
    radius: 0,
    tilt: 1,
    shadow: true,
    pageDecor: [
      [],
      [{ kind: 'tape', x: 4, y: 2, w: 18, h: 6, rotate: -32, over: true, color: 'accent2' }],
      [{ kind: 'heart', x: 86, y: 114, w: 8, h: 8, color: 'accent' }],
      [{ kind: 'washi', x: 76, y: 3, w: 22, h: 6, rotate: 38, over: true, color: 'accent' }],
      [{ kind: 'leaf', x: 3, y: 112, w: 10, h: 10, rotate: -20, color: 'accent2' }],
    ],
    moods: ['nostalgic', 'joyful'],
  },
  {
    id: 'polaroid',
    name: 'Playful Polaroid',
    description: 'Instant-photo frames, photo-booth strips and cheerful pastel pages with confetti.',
    colors: { page: '#F6EFE6', chapterPage: '#E7F0EA', ink: '#2E2A33', muted: '#5F5867', accent: '#E58F84', accent2: '#7FB7A4', mat: '#FFFFFF', pattern: '#F0C9A8' },
    fonts: {
      title: { family: HAND, weight: 600, lineHeight: 1, scale: 1.4 },
      heading: { family: HAND, weight: 600, lineHeight: 1, scale: 1.35 },
      body: { family: SANS, weight: 400, lineHeight: 1.4, scale: 0.9 },
      caption: { family: HAND, weight: 500, lineHeight: 1.05, scale: 1.4 },
      label: { family: SANS, weight: 600, upper: true, tracking: 0.18, lineHeight: 1.2, scale: 0.8 },
    },
    background: 'confetti',
    chapterBackground: 'confetti',
    frame: 'mat',
    shape: 'rect',
    radius: 0,
    tilt: 1,
    shadow: true,
    pageDecor: [[], [{ kind: 'sparkle', x: 88, y: 112, w: 7, h: 7, color: 'accent' }], [{ kind: 'star', x: 4, y: 113, w: 7, h: 7, color: 'accent2' }]],
    moods: ['playful', 'joyful'],
  },
  {
    id: 'romantic',
    name: 'Romantic',
    description: 'Blush tones, soft rounded frames and arches, delicate botanical sprigs and italic serif type.',
    colors: { page: '#FAF1EE', chapterPage: '#F3E2DD', ink: '#4A2F33', muted: '#7D5F62', accent: '#C2848A', accent2: '#A9B59A', mat: '#FFFBFA', pattern: '#EBD3CE' },
    fonts: {
      title: { family: PLAYFAIR, weight: 400, style: 'italic', lineHeight: 1.08 },
      heading: { family: PLAYFAIR, weight: 400, style: 'italic', lineHeight: 1.1 },
      body: { family: SERIF, weight: 500, style: 'italic', lineHeight: 1.35, scale: 1.1 },
      caption: { family: SERIF, weight: 500, style: 'italic', lineHeight: 1.3, scale: 1.05 },
      label: { family: SERIF, weight: 600, upper: true, tracking: 0.24, lineHeight: 1.2, scale: 0.95 },
    },
    background: 'linen',
    chapterBackground: 'plain',
    frame: 'none',
    shape: 'rounded',
    radius: 2.2,
    tilt: 0,
    shadow: false,
    pageDecor: [[], [{ kind: 'sprig', x: 84, y: 108, w: 12, h: 15, rotate: 160, color: 'accent' }], [], [{ kind: 'flower', x: 4, y: 114, w: 7, h: 7, color: 'accent' }]],
    moods: ['romantic', 'elegant'],
  },
  {
    id: 'travel',
    name: 'Travel Journal',
    description: 'Field-notebook grid paper, postage-stamp frames, postmarks, typewriter dates and airmail stripes.',
    colors: { page: '#F4EEDF', chapterPage: '#EFE6D0', ink: '#24323A', muted: '#55636A', accent: '#B5553C', accent2: '#3D6B7A', mat: '#FFFDF6', pattern: '#DCD3BC' },
    fonts: {
      title: { family: FRAUNCES, weight: 600, lineHeight: 1.05 },
      heading: { family: FRAUNCES, weight: 600, lineHeight: 1.08 },
      body: { family: TYPE, weight: 400, lineHeight: 1.45, scale: 0.85 },
      caption: { family: TYPE, weight: 400, lineHeight: 1.35, scale: 0.85 },
      label: { family: TYPE, weight: 400, upper: true, tracking: 0.18, lineHeight: 1.2, scale: 0.9 },
    },
    background: 'grid',
    chapterBackground: 'lines',
    frame: 'mat',
    shape: 'rect',
    radius: 0,
    tilt: 0.5,
    shadow: true,
    pageDecor: [
      [],
      [{ kind: 'postmark', x: 70, y: 106, w: 24, h: 14, rotate: -10, color: 'accent2' }],
      [],
      [{ kind: 'plane', x: 84, y: 3, w: 9, h: 9, rotate: 20, color: 'accent' }],
      [{ kind: 'compass', x: 3, y: 112, w: 10, h: 10, color: 'accent2' }],
    ],
    moods: ['adventurous'],
  },
  {
    id: 'heritage',
    name: 'Classic Heritage',
    description: 'A traditional album: ivory card, photo corners, fine double borders and timeless serif titles.',
    colors: { page: '#F5F0E4', chapterPage: '#2F3B33', ink: '#2A2621', muted: '#6A6155', accent: '#8C6B3F', accent2: '#4C5E50', mat: '#FBF8EF', pattern: '#E6DDC9' },
    fonts: {
      title: { family: FRAUNCES, weight: 500, lineHeight: 1.08, tracking: 0.01 },
      heading: { family: SERIF, weight: 600, upper: true, tracking: 0.14, lineHeight: 1.15, scale: 0.8 },
      body: { family: SERIF, weight: 500, lineHeight: 1.35, scale: 1.1 },
      caption: { family: SERIF, weight: 500, style: 'italic', lineHeight: 1.3, scale: 1.05 },
      label: { family: SERIF, weight: 600, upper: true, tracking: 0.22, lineHeight: 1.2, scale: 0.9 },
    },
    background: 'deckle',
    chapterBackground: 'plain',
    frame: 'mount',
    shape: 'rect',
    radius: 0,
    tilt: 0,
    shadow: true,
    pageDecor: [[]],
    moods: ['nostalgic', 'elegant', 'calm'],
  },
];

export const THEME_BY_ID: Record<ThemeId, ThemeDef> = Object.fromEntries(THEMES.map((t) => [t.id, t])) as Record<ThemeId, ThemeDef>;

export const getTheme = (id: ThemeId): ThemeDef => THEME_BY_ID[id] ?? THEME_BY_ID.minimal;

/** Heritage chapter pages are dark; everything printed on them flips to light ink. */
export function isDarkPage(theme: ThemeDef, kind: 'chapter' | 'other'): boolean {
  return kind === 'chapter' && theme.id === 'heritage';
}

/** Ranks themes for an occasion's recommendation list and the user's mood. */
export function recommendThemes(occasionThemes: ThemeId[], mood: Mood): ThemeId[] {
  const score = (t: ThemeDef) => {
    const i = occasionThemes.indexOf(t.id);
    return (i === -1 ? 0 : 3 - i) * 2 + (t.moods.includes(mood) ? 3 : 0);
  };
  return [...THEMES].sort((a, b) => score(b) - score(a)).map((t) => t.id);
}
