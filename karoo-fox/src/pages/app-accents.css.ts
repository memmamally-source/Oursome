import type { APIRoute } from 'astro';
import { apps } from '../data/apps.ts';

/** Per-app accent colours as classes, so pages need no inline styles (strict CSP). */
export const GET: APIRoute = () =>
  new Response(apps.map((a) => `.accent-${a.slug}{--accent:${a.accent}}`).join('\n') + '\n', {
    headers: { 'Content-Type': 'text/css; charset=utf-8' },
  });
