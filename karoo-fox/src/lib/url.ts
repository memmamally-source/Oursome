/** Prefix an internal path with the configured base path (for GitHub Pages project sites). */
export function href(path: string, base: string = import.meta.env.BASE_URL): string {
  const b = base.endsWith('/') ? base : `${base}/`;
  return b + path.replace(/^\//, '');
}

/** Stable per-app URLs (used in App Store Connect and Play Console). */
export const appPaths = (slug: string) => ({
  page: `/apps/${slug}/`,
  support: `/apps/${slug}/support/`,
  privacy: `/apps/${slug}/privacy/`,
  deleteData: `/apps/${slug}/delete-data/`,
});

export function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}
