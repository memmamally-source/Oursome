import type { IconName } from '@/features/types';

import type { Family } from './layouts';
import type { CoverDesign, TemplateKey, ThemeKey } from './types';

/**
 * Album templates shape the automatic design: which page styles it favours,
 * how photos are grouped into sections, and its default look.
 */
export type Template = {
  key: TemplateKey;
  name: string;
  description: string;
  icon: IconName;
  theme: ThemeKey;
  cover: CoverDesign;
  /** How much each page family is favoured (missing = 1). */
  families: Partial<Record<Family, number>>;
  /** Split photos into sections with a divider page each. */
  sections: 'none' | 'day' | 'month' | 'year';
  /** Average photos per page it aims for (more = fuller pages). */
  density: number;
  /** Words used to suggest the template from an album's name. */
  keywords: string[];
};

export const TEMPLATES: Template[] = [
  {
    key: 'everyday',
    name: 'Everyday memories',
    description: 'Little moments, gathered gently.',
    icon: 'sunny-outline',
    theme: 'linen',
    cover: 'framed',
    families: { feature: 1.2, polaroid: 0.7, scrapbook: 0.6, timeline: 0.4, minimal: 0.8 },
    sections: 'none',
    density: 3,
    keywords: [],
  },
  {
    key: 'holiday',
    name: 'Holiday',
    description: 'Day by day, with polaroids and scrapbook pages.',
    icon: 'airplane-outline',
    theme: 'kraft',
    cover: 'photo',
    families: { polaroid: 1.3, scrapbook: 1.2, feature: 1, masonry: 1, editorial: 0.8, timeline: 0.6, grid: 0.7, minimal: 0.5 },
    sections: 'day',
    density: 3.2,
    keywords: ['holiday', 'trip', 'vacation', 'travel', 'beach', 'summer', 'camping', 'weekend away', 'road trip', 'getaway'],
  },
  {
    key: 'wedding',
    name: 'Wedding & anniversary',
    description: 'Elegant, airy pages that let the big moments breathe.',
    icon: 'heart-outline',
    theme: 'classic',
    cover: 'photo',
    families: { editorial: 1.5, minimal: 1.4, feature: 1.1, grid: 0.6, masonry: 0.8, polaroid: 0.3, scrapbook: 0.2, timeline: 0.3 },
    sections: 'none',
    density: 2.2,
    keywords: ['wedding', 'anniversary', 'engagement', 'honeymoon', 'vows'],
  },
  {
    key: 'birthday',
    name: 'Birthday',
    description: 'Bright and playful, cake included.',
    icon: 'gift-outline',
    theme: 'linen',
    cover: 'polaroid',
    families: { polaroid: 1.3, scrapbook: 1.1, grid: 1, feature: 1, masonry: 0.9, editorial: 0.6, timeline: 0.4 },
    sections: 'none',
    density: 3.2,
    keywords: ['birthday', 'party', 'turns', 'bday'],
  },
  {
    key: 'school',
    name: 'School year',
    description: 'Month by month through the year.',
    icon: 'school-outline',
    theme: 'kraft',
    cover: 'framed',
    families: { grid: 1.1, scrapbook: 1, polaroid: 1, timeline: 0.8, feature: 0.9, masonry: 0.8, editorial: 0.6 },
    sections: 'month',
    density: 3.4,
    keywords: ['school', 'year 1', 'year 2', 'reception', 'nursery', 'class', 'term', 'grade', 'kindergarten', 'preschool'],
  },
  {
    key: 'milestone',
    name: 'Family milestone',
    description: 'A big change, told in order.',
    icon: 'flag-outline',
    theme: 'garden',
    cover: 'framed',
    families: { timeline: 1.3, feature: 1.1, editorial: 1, minimal: 1, grid: 0.7, polaroid: 0.6 },
    sections: 'month',
    density: 2.6,
    keywords: ['new home', 'moving', 'move', 'baby', 'newborn', 'first', 'christening', 'naming', 'eid', 'christmas'],
  },
  {
    key: 'graduation',
    name: 'Graduation',
    description: 'Proud, polished pages.',
    icon: 'ribbon-outline',
    theme: 'classic',
    cover: 'photo',
    families: { editorial: 1.3, feature: 1.2, minimal: 1, grid: 0.8, polaroid: 0.6, scrapbook: 0.4 },
    sections: 'none',
    density: 2.6,
    keywords: ['graduation', 'graduate', 'prom', 'leavers', 'commencement'],
  },
  {
    key: 'growingUp',
    name: 'Growing Up',
    description: 'One album through the years, a chapter for each.',
    icon: 'leaf-outline',
    theme: 'garden',
    cover: 'framed',
    families: { timeline: 1.1, feature: 1, polaroid: 1, scrapbook: 0.9, grid: 0.9, minimal: 0.8 },
    sections: 'year',
    density: 3,
    keywords: ['growing up', 'grows', 'through the years', 'childhood'],
  },
];

export const templateOf = (key: TemplateKey) => TEMPLATES.find((t) => t.key === key) ?? TEMPLATES[0];

/** Guess a template from the album's name ("Cornwall trip" → Holiday). */
export function suggestTemplate(title: string): TemplateKey {
  const t = title.toLowerCase();
  const hit = TEMPLATES.find((tpl) => tpl.keywords.some((k) => t.includes(k)));
  return hit?.key ?? 'everyday';
}

export type Theme = {
  key: ThemeKey;
  name: string;
  page: string;
  ink: string;
  muted: string;
  accent: string;
  /** Cloth colour for the cover. */
  cover: string;
  coverInk: string;
  /** Mount colour around photos on polaroid pages. */
  mount: string;
  dark?: boolean;
};

export const THEMES: Theme[] = [
  {
    key: 'linen',
    name: 'Linen',
    page: '#FFF9F0',
    ink: '#332B27',
    muted: '#6E625A',
    accent: '#A9533F',
    cover: '#A9533F',
    coverInk: '#FFF9F0',
    mount: '#FFFFFF',
  },
  {
    key: 'classic',
    name: 'Classic',
    page: '#FFFFFF',
    ink: '#2A2624',
    muted: '#6B6560',
    accent: '#76664A',
    cover: '#EDE6DA',
    coverInk: '#2A2624',
    mount: '#FFFFFF',
  },
  {
    key: 'kraft',
    name: 'Kraft',
    page: '#EBDDC6',
    ink: '#3A2E25',
    muted: '#6A5745',
    accent: '#844A30',
    cover: '#7E5E40',
    coverInk: '#FBF3E6',
    mount: '#FFFDF8',
  },
  {
    key: 'garden',
    name: 'Garden',
    page: '#F6F4EC',
    ink: '#2F3A2E',
    muted: '#5F6B5C',
    accent: '#4C684A',
    cover: '#5E7A5C',
    coverInk: '#FFFDF6',
    mount: '#FFFFFF',
  },
  {
    key: 'evening',
    name: 'Evening',
    page: '#26211E',
    ink: '#F4EEE5',
    muted: '#BFB3A6',
    accent: '#E5B96D',
    cover: '#1C1816',
    coverInk: '#E5B96D',
    mount: '#F7F1E8',
    dark: true,
  },
];

export const themeOf = (key: ThemeKey) => THEMES.find((t) => t.key === key) ?? THEMES[0];
