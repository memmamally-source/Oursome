/**
 * Source register. Licence facts are recorded from the publishers' stated terms as known at
 * `lastReviewed`; `verifiedLive` is false where the licence page was not re-opened during this review.
 * "Cite only" means we may link and reference it, but not copy its text, figures or questions.
 */
export type ReuseRule = 'commercial-with-attribution' | 'cite-only' | 'per-item' | 'public-domain';

export interface Source {
  id: string;
  name: string;
  url: string;
  type: string;
  reliability: 'official' | 'high' | 'moderate';
  access: string;
  licence: string;
  reuse: ReuseRule;
  attribution: string;
  lastReviewed: string;
  verifiedLive: boolean;
  notes?: string;
}

export const SOURCES: Source[] = [
  {
    id: 'usmle-outline',
    name: 'USMLE Step 1 Content Outline and Specifications',
    url: 'https://www.usmle.org/exam-resources/step-1-materials/step-1-content-outline-and-specifications',
    type: 'Official exam blueprint',
    reliability: 'official',
    access: 'Public web page',
    licence: '© FSMB and NBME',
    reuse: 'cite-only',
    attribution: 'Link to the official page',
    lastReviewed: '2026-11-05',
    verifiedLive: false,
    notes: 'Not reachable from the build sandbox; ranges taken from a search summary. Re-check before launch.',
  },
  {
    id: 'openstax-ap',
    name: 'OpenStax Anatomy and Physiology 2e',
    url: 'https://openstax.org/details/books/anatomy-and-physiology-2e',
    type: 'Textbook',
    reliability: 'high',
    access: 'Free online / PDF',
    licence: 'CC BY 4.0',
    reuse: 'commercial-with-attribution',
    attribution: 'Access for free at openstax.org; credit OpenStax, with changes noted',
    lastReviewed: '2026-11-05',
    verifiedLive: false,
  },
  {
    id: 'openstax-micro',
    name: 'OpenStax Microbiology',
    url: 'https://openstax.org/details/books/microbiology',
    type: 'Textbook',
    reliability: 'high',
    access: 'Free online / PDF',
    licence: 'CC BY 4.0',
    reuse: 'commercial-with-attribution',
    attribution: 'Access for free at openstax.org; credit OpenStax, with changes noted',
    lastReviewed: '2026-11-05',
    verifiedLive: false,
  },
  {
    id: 'ncbi-bookshelf',
    name: 'NCBI Bookshelf (incl. StatPearls)',
    url: 'https://www.ncbi.nlm.nih.gov/books/',
    type: 'Reference books and review chapters',
    reliability: 'high',
    access: 'Free online; E-utilities API',
    licence: 'Varies by book. StatPearls: CC BY-NC-ND 4.0',
    reuse: 'per-item',
    attribution: 'Cite chapter, authors and NBK id',
    lastReviewed: '2026-11-05',
    verifiedLive: false,
    notes: 'Free to read is not free to reuse. StatPearls forbids commercial reuse and derivatives: cite only.',
  },
  {
    id: 'pubmed',
    name: 'PubMed',
    url: 'https://pubmed.ncbi.nlm.nih.gov/',
    type: 'Bibliographic database',
    reliability: 'high',
    access: 'Web; E-utilities API (rate-limited)',
    licence: 'Citations public; abstracts © publishers',
    reuse: 'cite-only',
    attribution: 'Cite article with PMID',
    lastReviewed: '2026-11-05',
    verifiedLive: false,
  },
  {
    id: 'pmc-oa',
    name: 'PubMed Central Open Access Subset',
    url: 'https://pmc.ncbi.nlm.nih.gov/tools/openftlist/',
    type: 'Full-text articles and figures',
    reliability: 'high',
    access: 'OA web service / bulk FTP',
    licence: 'Per article (CC BY, CC BY-NC, CC0 …)',
    reuse: 'per-item',
    attribution: 'Per article licence',
    lastReviewed: '2026-11-05',
    verifiedLive: false,
    notes: 'Only CC BY / CC0 items are usable commercially. Record the licence on every image used.',
  },
  {
    id: 'cdc',
    name: 'Centers for Disease Control and Prevention',
    url: 'https://www.cdc.gov/',
    type: 'Public health guidance, epidemiology, microbiology',
    reliability: 'official',
    access: 'Public web',
    licence: 'US federal works generally public domain; third-party content excluded',
    reuse: 'public-domain',
    attribution: 'Credit CDC as requested; no implied endorsement',
    lastReviewed: '2026-11-05',
    verifiedLive: false,
    notes: 'Check each page for third-party material (marked) before reuse.',
  },
  {
    id: 'cdc-phil',
    name: 'CDC Public Health Image Library (PHIL)',
    url: 'https://phil.cdc.gov/',
    type: 'Microbiology and pathology images',
    reliability: 'official',
    access: 'Public web',
    licence: 'Mostly public domain; some images copyrighted (labelled per image)',
    reuse: 'per-item',
    attribution: 'Credit CDC/PHIL and the named contributor',
    lastReviewed: '2026-11-05',
    verifiedLive: false,
  },
  {
    id: 'medlineplus',
    name: 'MedlinePlus',
    url: 'https://medlineplus.gov/',
    type: 'Consumer health information, genetics',
    reliability: 'high',
    access: 'Public web; web service API',
    licence: 'NLM-authored pages public domain; licensed content (e.g. A.D.A.M. encyclopedia) is not',
    reuse: 'per-item',
    attribution: 'Credit MedlinePlus / NLM',
    lastReviewed: '2026-11-05',
    verifiedLive: false,
  },
  {
    id: 'wikimedia',
    name: 'Wikimedia Commons',
    url: 'https://commons.wikimedia.org/',
    type: 'Images (histology, gross pathology, microbiology)',
    reliability: 'moderate',
    access: 'Public web; API',
    licence: 'Per file (CC BY, CC BY-SA, PD …)',
    reuse: 'per-item',
    attribution: 'Author, licence and link per file',
    lastReviewed: '2026-11-05',
    verifiedLive: false,
    notes: 'Every image needs medical verification of the label; uploader captions are not authoritative.',
  },
];

export function getSource(id: string): Source | undefined {
  return SOURCES.find((s) => s.id === id);
}
