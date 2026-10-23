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
    coral: '#FF7468',
    sunshine: '#FFC857',
    sky: '#76C8F5',
    lavender: '#B7A2ED',
    mint: '#79D6B0',
    cream: '#FFF9F2',
    charcoal: '#242632',
    white: '#FFFFFF',
  },
} as const;

export type BrandColor = keyof typeof Brand.colors;
