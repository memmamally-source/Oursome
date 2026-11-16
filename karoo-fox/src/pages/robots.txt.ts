import type { APIRoute } from 'astro';
import { hasVisiblePlaceholders } from '../lib/readiness.ts';

/** Blocks crawlers while the site still shows placeholders; otherwise allows all and lists the sitemap. */
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL(`${import.meta.env.BASE_URL.replace(/\/$/, '')}/sitemap-index.xml`, site).href;
  const body = hasVisiblePlaceholders() ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
