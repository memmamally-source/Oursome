# QA checklist

Status as of 16 Nov 2026. Re-run `npm run check` after every change; all of it must pass.

## Automated (run by `npm run check` and in the deploy workflow)

| Check | Result |
| --- | --- |
| TypeScript (`astro check`, strictest settings) | ✅ 0 errors |
| Unit tests: app-data rules, App Store statuses, company name (Karoo Fox (Pty) Ltd, no EM Medical Group), readiness logic, URLs | ✅ passing |
| HTML validation of every page (html-validate, recommended rules, no inline styles) | ✅ 32 pages |
| Internal links and assets resolve | ✅ |
| No page mentions EM Medical Group or the album app (build fails if one does) | ✅ |
| One `<h1>` per page; title, description, canonical URL and Open Graph image on every page | ✅ |
| Stable app URLs exist (page, support, privacy, data deletion for each app) | ✅ |
| Every page in Chromium at 320, 390, 768 and 1280 px: no console errors, CSP violations, failed requests, broken images or horizontal scrolling | ✅ 32 pages × 4 widths |
| Accessibility: axe WCAG 2.0/2.1 A and AA plus best practices, including colour contrast | ✅ no violations |
| Logos only appear on pure-white backgrounds (the approved artwork has a white canvas) | ✅ |
| Keyboard: the first Tab reaches "Skip to content", Enter moves focus to the main content, and the focus outline is visible | ✅ |
| Works under a sub-path such as `/karoo-fox/` (GitHub Pages project site) | ✅ (checked by a build with `BASE_PATH=/karoo-fox/`) |

## Checked by hand in this session

- **Approved logo.** Every logo image is generated from `Karoo_Fox_Logo_High_Resolution_6144x4096.png` and was compared side by side with it. The header, hero and footer logos match it and are not stretched (fixed aspect ratio). The faint grey box from the artwork's 254-white canvas was removed by snapping near-white pixels to pure white.
- **Logo size.** The logo is prominent but not oversized on a 390 px phone: the hero fox is 200 px.
- **Favicon.** The transparent favicon keeps all cream details on light, mid-grey and navy backgrounds (`brand/review/favicon-check.png`).
- **Social images.** The profile pictures keep the fox inside a circular crop, and the maskable icon keeps it inside the safe zone.
- **Vector candidate.** It was compared side by side with the original and has a difference map; it is not used on the site.

## Performance and security notes

- The site ships no JavaScript to visitors and makes no third-party requests; fonts are self-hosted. The home page makes 13 requests.
- Images are responsive WebP with `srcset` and `sizes`, sized width and height to avoid layout shift, and lazy-loaded below the fold. The hero image has `fetchpriority="high"`.
- **Content-Security-Policy** (meta tag): no scripts at all, styles and fonts only from the site, `form-action 'none'`, `object-src 'none'`. The referrer policy is strict-origin-when-cross-origin.
- **What GitHub Pages can't do:** it can't send custom HTTP headers such as HSTS or `frame-ancestors`. That is acceptable for a static site; if they're ever needed, Cloudflare in front of Pages can add them.

## Still to verify (needs things this session doesn't have)

- [ ] **Real devices:** an iPhone (Safari) and an Android phone (Chrome). Only Chromium was used here.
- [ ] **Other browsers:** Firefox and Safari on desktop.
- [ ] **A Lighthouse run against the live URL** once it's deployed (performance, SEO, best practices).
- [ ] **The custom domain, HTTPS certificate and `www` redirect**, after the DNS is set up.
- [ ] **Email:** send to each of `hello@`, `support@` and `privacy@` and reply from them, once the mailboxes exist.
- [ ] **Link previews:** check the Open Graph preview by pasting the live URL into WhatsApp, LinkedIn and X.
- [ ] **Founder's name:** decide whether to name the founder on the About page. It is hidden for now; set `founder.show: true` in `src/config/company.ts` to show it.
- [ ] **App facts:** before launch, re-check each app's status and store links in `src/data/apps.ts`. In particular, add Research Tracker's App Store URL, check that the Crossword Hub and Oursome App Store links open the right listings (Apple's site couldn't be reached from this session), and confirm whether Crossword Hub's Duels are live.

## Blocks public launch (`npm run readiness`)

- [ ] CIPC registration number
- [ ] Business address, approved by the owner for publication
- [ ] Business, support and privacy emails on the company domain

Until these are done, the site shows a preview banner, highlights the missing details and tells search engines not to index it.
