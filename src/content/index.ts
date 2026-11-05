import { ContentRepo, PUBLISHED_ONLY, REVIEWER_PREVIEW } from './repo';
import type { Concept, GameItem } from './schema';
import { biochemGenetics } from './step1/biochemGenetics';
import { cardioRenal } from './step1/cardioRenal';
import { CASES } from './step1/cases';
import { CONNECTION_GROUPS } from './step1/connections';
import { hemeImmuneResp } from './step1/hemeImmuneResp';
import { microPharmEndoStats } from './step1/microPharmEndoStats';

const bundles = [cardioRenal, hemeImmuneResp, biochemGenetics, microPharmEndoStats];

export const ALL_CONCEPTS: Concept[] = bundles.flatMap((b) => b.concepts);
export const ALL_ITEMS: GameItem[] = [...bundles.flatMap((b) => b.items), ...CONNECTION_GROUPS, ...CASES];

const allowUnreviewed = import.meta.env.DEV || import.meta.env.VITE_ALLOW_UNREVIEWED === 'true';

/** The app-wide repository. */
export const content = new ContentRepo(ALL_CONCEPTS, ALL_ITEMS, allowUnreviewed ? REVIEWER_PREVIEW : PUBLISHED_ONLY);
