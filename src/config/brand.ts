/**
 * Central brand configuration.
 *
 * "Oursome" is a provisional name pending trademark, domain and app-store
 * clearance. Every user-facing reference to the name, tagline or brand
 * colours should come from here so a rename is a one-file change
 * (plus `app.json` for the native display name / bundle identifiers).
 */
export const Brand = {
  name: 'Oursome',
  /** Lowercase wordmark rendered in the logo lockup. */
  wordmark: 'oursome',
  tagline: 'Life’s better together.',
  altTagline: 'Your life. Your people. One place.',
  principle: 'Spend less time organising life and more time living it.',
  supportEmail: 'hello@example.com', // TODO: replace once a domain is secured
  colors: {
    /** Warm linen: the main background. */
    linen: '#F4EEE5',
    /** Soft ivory: raised surfaces, cards, sheets. */
    ivory: '#FFF9F0',
    /** Brand terracotta (logo, decoration). Interactive fills use the AA-safe #A9533F. */
    terracotta: '#B95F49',
    sage: '#879D86',
    honey: '#E5B96D',
    /** Supporting tones for calendars and the organiser. */
    slate: '#8FA5B2',
    heather: '#A08DA4',
    /** Warm espresso: main text. */
    espresso: '#332B27',
  },
} as const;

export type BrandColor = keyof typeof Brand.colors;
