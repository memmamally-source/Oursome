# Karoo Fox website

The official website of **Karoo Fox**: the company, its apps, and one place for app support, privacy policies and data-deletion instructions.

- Static site built with [Astro](https://astro.build) 7, TypeScript and plain CSS. It ships no JavaScript to visitors.
- It has no database, accounts, cookies, analytics, forms or third-party requests. Fonts are self-hosted.
- It is hosted free on GitHub Pages, and a custom domain can be added later.
- It has a strict Content-Security-Policy, passes WCAG 2.1 AA checks (axe), works in light and dark mode, and is responsive from 320 px up.

> **Status: preview.** Company details such as the registration number, address, domain and email are placeholders. They show highlighted on the pages, and the site tells search engines not to index it until they are filled in. See [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md).

## Why this stack

| Need | Choice |
| --- | --- |
| Many similar pages (5 apps today, dozens later), each with stable support, privacy and deletion URLs | Astro generates all of them from one data file (`src/data/apps.ts`) |
| GitHub Pages, low maintenance, fast, secure | Pure static HTML/CSS output with no JavaScript runtime and no server |
| Non-developers can edit facts | Company details live in `src/config/company.ts`; app facts in `src/data/apps.ts`; news in Markdown |
| Don't publish anything unverified | Placeholders are visible, `npm run readiness` lists every gap, and the deploy workflow refuses to publish until they're filled |

The alternatives were weaker. Plain HTML would mean copying the header, footer and five pages per app by hand. Next.js or another JavaScript framework adds a client runtime the site doesn't need. Firebase Hosting adds a dependency the site doesn't need.

## Commands

```bash
npm install
npm run dev          # http://localhost:4321
npm run check        # typecheck, unit tests, build, HTML/link/metadata checks, browser + accessibility tests
npm run readiness    # what must be supplied before publishing (SITE_URL=https://… to check the domain too)
npm run brand        # regenerate logos, favicons and the social image from src/brand/
```

`npm run check` must pass before every commit. It covers:
- **Unit tests:** the app-data rules, the company legal wording and the readiness logic.
- **`astro check`:** strict TypeScript.
- **`scripts/verify-build.mjs`:** HTML validation (no inline styles), internal links and assets, one `<h1>` per page, and title, description, canonical URL and Open Graph image on every page. It also confirms that every stable app URL exists.
- **`tests/browser.mjs`:** loads every page in Chromium at 375 px and 1280 px, in light and dark mode. It fails on console errors, CSP violations, failed requests, horizontal scrolling or axe WCAG 2.1 AA violations.

## Structure

```
src/config/company.ts   Legal names, registration, address, emails (placeholders = null)
src/data/apps.ts        The app portfolio: status per platform, features, privacy summary, deletion steps
src/content/news/       Announcements (Markdown, one file per post)
src/brand/              Logo sources: fox-mark.svg (layered) and wordmark.json
src/pages/              Routes (see below)
src/styles/global.css   Design tokens and all styles
public/                 Generated brand assets, favicons, app icons
scripts/                Brand generator, build verifier, readiness report, static server
tests/                  Unit tests and browser tests
docs/                   Launch checklist and brand guide
```

### URLs

| Page | URL |
| --- | --- |
| Home | `/` |
| Apps | `/apps/` |
| App page | `/apps/<slug>/` |
| App support | `/apps/<slug>/support/` |
| App privacy | `/apps/<slug>/privacy/` |
| App data deletion | `/apps/<slug>/delete-data/` |
| About | `/about/` |
| Support Centre | `/support/` |
| Delete your data (all apps) | `/support/data-deletion/` |
| Contact | `/contact/` |
| Company information | `/legal/` |
| Website privacy notice | `/privacy/` |
| News | `/news/`, `/news/<slug>/` |

The slugs are `crossword-hub`, `oursome`, `research-tracker`, `stephd` and `in-pictures`. **Never rename a slug** after it has been entered in App Store Connect or Play Console.

## Common edits

**Fill in company details.** Edit `src/config/company.ts`. When the CIPC confirms the name change, set `nameAmendmentComplete: true`; every legal statement on the site then switches to Karoo Fox (Pty) Ltd.

**Change an app's status.** Edit its `releases` in `src/data/apps.ts`, for example when Oursome goes live on the App Store:
```ts
{ platform: 'ios', status: 'available', url: 'https://apps.apple.com/app/id6826843084' },
```
Store buttons only appear for `available` releases. `unconfirmed` releases are hidden; Research Tracker's iPhone app is currently `unconfirmed`.

**Add an app.** Add an entry to `apps` in `src/data/apps.ts`, put a 256×256 icon at `public/images/apps/<slug>.webp`, and run `npm run check`. All of its pages, the footer, the Support Centre and the sitemap update automatically.

**Post news.** Add `src/content/news/YYYY-MM-DD-some-title.md` with `title`, `date` and `summary` front matter.

**Host a full privacy policy here.** For now each app's privacy page summarises its published policy and links to it; the app's own site stays authoritative, so the two can't drift apart. To move a policy here, add the full text as a page and update `privacyPolicyUrl`. Do this only after the policy has been reviewed, and when it should name the company as the responsible party.

## Move to its own repository

This folder was built on a branch of the Oursome repository only because that was the repository available to the build session. It is self-contained and must **not** be merged into Oursome. Oursome's GitHub Pages site serves oursome.org, a repository can only have one Pages site, and Oursome's own lint and type checks are not set up for this folder.

To give it its own repository with its history:

1. Create an empty repository, for example `memmamally-source/karoo-fox`. It must be public to use GitHub Pages on a free plan.
2. From a clone of Oursome:
   ```bash
   git fetch origin claude/karoo-fox-website-jeovs4
   git subtree split --prefix=karoo-fox origin/claude/karoo-fox-website-jeovs4 -b karoo-fox-only
   git push https://github.com/memmamally-source/karoo-fox.git karoo-fox-only:main
   ```
3. In the new repository, go to Settings → Pages → Source and choose **GitHub Actions**. Then run **Actions → Deploy website → Run workflow**. Tick *allow placeholders* only if you want a preview at `https://memmamally-source.github.io/karoo-fox/` before the details are filled in.
4. Delete the `karoo-fox/` folder and the branch from Oursome when you're happy.

Deploying, connecting a domain and setting up business email are covered in [docs/LAUNCH-CHECKLIST.md](docs/LAUNCH-CHECKLIST.md).
