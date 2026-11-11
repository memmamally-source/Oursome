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
  supportEmail: 'oursomeapp@outlook.com',
  /** The website; the privacy policy and support pages live under it (App Store listing URLs). */
  siteUrl: 'https://oursome.org',
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

export const privacyUrl = `${Brand.siteUrl}/privacy/`;
export const supportUrl = `${Brand.siteUrl}/support/`;
export const APP_STORE_URL = 'https://apps.apple.com/app/id6826843084';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=org.oursome.app';

export type BrandColor = keyof typeof Brand.colors;

/**
 * Where "Rate Oursome" goes: straight to the store's review page in the app,
 * or the right store's web page in a browser.
 */
export function rateUrl(os: string, userAgent = ''): string {
  if (os === 'ios') return 'itms-apps://apps.apple.com/app/id6826843084?action=write-review';
  if (os === 'android') return 'market://details?id=org.oursome.app';
  return /iPhone|iPad|iPod|Macintosh/i.test(userAgent) ? `${APP_STORE_URL}?action=write-review` : PLAY_STORE_URL;
}

/** "Send feedback": an email to us with the app version and device filled in. */
export function feedbackMailto(version: string, os: string): string {
  const subject = encodeURIComponent(`Oursome feedback (${version}, ${os})`);
  const body = encodeURIComponent('What did you like, what was confusing, and what would you change?\n\n');
  return `mailto:${Brand.supportEmail}?subject=${subject}&body=${body}`;
}
