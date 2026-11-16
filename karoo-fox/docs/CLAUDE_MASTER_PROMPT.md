> **Owner updates after this brief (16 Nov 2026). These override the brief:**
> - The company name is now **Karoo Fox (Pty) Ltd**. Do not describe Karoo Fox as a brand of EM Medical Group, and do not mention EM Medical Group on the website.
> - The album app (In Pictures) is **not** on the website.
> - Crossword Hub, Oursome and Research Tracker are on the App Store.
> - All logo images are generated from `Karoo_Fox_Logo_High_Resolution_6144x4096.png`.

# KAROO FOX — CLAUDE WEBSITE + LOGO IMPLEMENTATION BRIEF

You are building the **official corporate website for Karoo Fox**, a South African software/app-development brand. Treat the supplied logo image as the APPROVED, CANONICAL brand reference; do not invent another fox or replace the logo with emojis, generic icons, stock art, or a newly generated mascot.

## Why this website is being built

The founder is building a growing portfolio of independent consumer and educational apps and wants a single professional developer identity. Apple currently displays the founder's personal name under an individual Apple Developer membership. Google Play currently uses the developer name Centurion Creatives. The goal is to transition to **Karoo Fox** as the developer identity across both stores, subject to each platform's account-conversion, naming, and verification rules.

The existing South African company is **EM Medical Group (Pty) Ltd**. The name **KAROO FOX** is officially RESERVED with CIPC under name-reservation reference **9471244619**, valid until **18 May 2027**. The existing company's formal legal name change to **Karoo Fox (Pty) Ltd** is NOT YET COMPLETE. Never imply that the legal name change, Apple organisation approval, or Google developer update has already happened. Use accurate, non-misleading website wording until that status changes. Do not publish personal addresses or contact details from documents without explicit approval.

The website is intended to establish a real, credible online presence, showcase apps, provide app support/contact and privacy pages, support domain-based business email, and prepare for Apple Developer Organization verification. It should function as a corporate website, not a mockup or personal blog. Site existence alone does not guarantee Apple's approval.

## Apps to include

- **Crossword Hub** — crossword puzzles, games and challenges.
- **Oursome** — household/family organisation, groceries, shared planning and tasks.
- **Research Tracker** — tools to organise and manage academic research projects.
- **StePhD** — medical education and USMLE study platform.
- **Photo album/scrapbook app** — PLANNED; do not describe as released or give it a fabricated final name.

Verify real functionality, release status, support information, and App Store/Google Play URLs from the actual projects or user-provided facts before publishing. Use honest status labels and no fabricated testimonials, usage statistics, awards or claims.

## Approved brand asset — preserve it

Files provided:
- `Karoo_Fox_Logo_Original_Lossless.png` — exact original artwork at 1536×1024, lossless.
- `Karoo_Fox_Logo_High_Resolution_6144x4096.png` — carefully resampled high-resolution PNG of the SAME artwork, on white.
- `Karoo_Fox_Logo_Website_Tight_4460x3216.png` — tightly cropped version for web layouts.
- `Karoo_Fox_Fox_Icon_2048x2048.png` — standalone fox symbol, for avatar/icon mockups, on white.

The logo depicts a friendly, curled fox with burnt-orange body and head, cream-coloured cheeks and tail, navy-blue details, and a bold wordmark reading **Karoo Fox** (Karoo in navy, Fox in burnt orange). Respect the precise image proportions, colours, facial expression, curled-tail form and typography. No other animal, no abstract replacement, no aggressive fox face, no decorative mountains. You may optimize image files, add responsive sizing, crop surrounding blank canvas carefully, and produce appropriately scaled variants without distorting or reinterpreting the artwork.

**Important:** These are high-resolution RASTER PNGs, not native vector assets; 4× resampling does not create genuine new detail. If an SVG master is needed, manually recreate/vector-trace it as a separate deliverable and visibly compare it against the original; do not simply embed a PNG in SVG and claim it is a vector. Get approval for any redraw before replacing the original logo.

Suggested palette, inferred from the reference (sample and refine as needed): deep navy #061F3E, burnt orange #F15A0A, warm cream #FFF6E9, white #FFFFFF. Maintain sufficient contrast and accessibility.

## Design / UX direction

Build a modern, distinctive, restrained software-company site: premium and international, friendly but not childish. Prioritise whitespace, refined typography, responsive spacing, restrained movement and strong hierarchy. Don't make it look like a healthcare provider, research lab, advertising agency or tourism brand. The fox logo should be prominent but never huge on mobile, with appropriate image `alt` text. Use a correct `object-fit` and intrinsic aspect ratios, no stretching. Keep white-background assets on white or very light backgrounds; do not place white-canvas images onto dark blocks and pretend they are transparent. If a genuine transparent background is needed, create it properly and inspect cream/white details before using it.

Suggested headline: **Thoughtful software for everyday life.**
Suggested intro: **Karoo Fox is a South African software brand creating useful apps for learning, organising, playing and preserving memories.**
Avoid implying all products are live.

## Site structure and functionality

1. Homepage: clear hero, brand identity, succinct value proposition, featured apps and contact CTA.
2. Apps index: cards for each app, status (released/in development) verified before display.
3. App detail pages: overview, accurate features, support, store links only if confirmed.
4. About: South African origin, independent software development focus, international audience.
5. Support hub: application-specific help/contact paths and stable URLs for app stores.
6. Privacy hub: separate stable URL per app. Draft ONLY after inspecting actual app code/settings. If facts are missing, produce a publication-blocking checklist rather than inventing data collection, retention, analytics or deletion practices.
7. Contact page: working support contact mechanism once genuine email details are provided. Avoid exposing private email or fake forms.
8. Basic accessibility, sitemap, metadata, favicon, robots.txt, Open Graph preview, mobile testing and security checks.

## Tech/deployment

The founder already uses **Claude + GitHub + Firebase**. Build this corporate site in a clean, separate repo, with a maintainable static stack suitable for **GitHub Pages** and future custom-domain hosting. Avoid unnecessary Firebase, database, backend or paid services for a simple corporate website. Never alter the production app repositories. Provide GitHub Pages deployment instructions, custom-domain DNS instructions once the domain is purchased, business email setup options and a straightforward way to add future apps.

## Quality and deliverables

Implement the real working website rather than only describing it. Use the supplied logo assets in the repo, preserving source filenames. Check every route and all mobile screen widths, image rendering, headings, links, semantic HTML, keyboard access, colour contrast and Lighthouse-style performance considerations. Never fabricate external links. Provide a concise status report: implemented files, what was tested, what remains to verify, blockers for public launch, and the next steps for CIPC/Apple/Google. Do not claim deployment or a working contact form unless actually verified.

**Start by reading this entire brief, inspecting the logo files, then produce the website implementation and QA checklist.**
