import type { Visibility } from '@/features/types';

/**
 * Photo albums are structured data: the same album renders identically on
 * every device and in the printed PDF. Positions are fractions of the page
 * (pages are 4:5 portrait, matching an 8 × 10 in photo book).
 */
export const PAGE_ASPECT = 4 / 5;

export type PhotoMeta = {
  id: string;
  albumId: string;
  width: number;
  height: number;
  /** When it was taken (from the photo itself when available), ISO. */
  takenAt?: string;
  caption?: string;
  /** Original file name, for downloads. */
  name?: string;
  /** "ready" once the display and thumbnail versions exist. */
  status: 'pending' | 'ready' | 'failed';
  /** Whether the original file is kept as well as the display version. */
  hasOriginal?: boolean;
  addedBy: string;
  addedAt: string;
};

/** How a photo sits in its frame: focal point (0–1) and zoom (1 = just fills). */
export type Crop = { x: number; y: number; zoom: number };

export type Slot = { photoId: string; crop: Crop };

export type PageKind = 'photos' | 'divider' | 'note';

export type AlbumPage = {
  id: string;
  kind: PageKind;
  layout: string;
  slots: Slot[];
  /** Divider/section title ("Day 2", "2019 · Age 3"), or an optional page heading. */
  title?: string;
  /** A line under the photos. */
  caption?: string;
  /** A date shown on the page, ISO date. */
  date?: string;
  /** A journal entry or personal note. */
  note?: string;
  /** Which section the page belongs to (a day, month or year), so adding photos only redesigns that part. */
  section?: string;
  /** Changed by hand: automatic redesigns of its section ask first. */
  edited?: boolean;
};

export type TemplateKey = 'everyday' | 'holiday' | 'wedding' | 'birthday' | 'school' | 'milestone' | 'graduation' | 'growingUp';
export type ThemeKey = 'linen' | 'classic' | 'kraft' | 'garden' | 'evening';
export type CoverDesign = 'photo' | 'framed' | 'polaroid' | 'title';

export type Album = {
  id: string;
  title: string;
  subtitle?: string;
  description?: string;
  /** ISO dates; endDate for trips and school years. */
  date?: string;
  endDate?: string;
  template: TemplateKey;
  theme: ThemeKey;
  cover: { design: CoverDesign; photoId?: string; crop?: Crop };
  /** Every photo in the album, in reading order. Photos not on any page are "unplaced". */
  photoIds: string[];
  pages: AlbumPage[];
  /** Growing Up: whose album it is, and their birthday for ages. */
  person?: { memberId?: string; name: string; birthDate?: string };
  visibility: Visibility;
  spaceId?: string;
  /** Shared albums: whether other family members may edit, or only view. */
  membersCanEdit?: boolean;
  authorId: string;
  createdAt: string;
  updatedAt: string;
};
