// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// SITE_URL / BASE_PATH are set by the deploy workflow from GitHub Pages
// (e.g. https://karoofox.com and "/"). Locally they default to a preview URL.
const site = process.env.SITE_URL || 'http://localhost:4321';
const base = process.env.BASE_PATH || '/';

export default defineConfig({
  site,
  base,
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never', assets: '_assets' },
  integrations: [sitemap({ filter: (page) => !page.includes('/404') })],
  devToolbar: { enabled: false },
});
