# Steps Ahead — progress

> Living record so any session can resume without losing decisions. Update at the end of every stage.

**Product:** gamified USMLE learning companion. Step 1 first; Step 2 CK and Step 3 later in the same codebase.
**Name:** "Steps Ahead" (owner's choice, Nov 2026). Change in `src/config/brand.ts`, `index.html`, `public/manifest.webmanifest`.
**Repository:** intended home is a new repo, e.g. `memmamally-source/steps-ahead`. **It does not exist yet**: the first session could not create repositories. The code was pushed, with its own independent history, to branch `claude/steps-ahead-medical-arcade-a8in03` of the Oursome repo purely as transport. It shares no files or history with Oursome. See "Moving to its own repository" below.

## Status (5 Nov 2026)

| Phase | State |
| --- | --- |
| 1. Foundation (structure, design system, schema, events, blueprint research, source register) | ✅ (blueprint figures need verification on usmle.org) |
| 1. New GitHub repo | ❌ needs the owner (see below) |
| 1. Firebase project | ❌ not created; rules drafted in `firebase/firestore.rules`, config read from `VITE_FIREBASE_*` |
| 2. Core app: onboarding, five tabs, dashboard, study-time tracking, local progress | ✅ (guest/on-device only) |
| 3. First four games: Crossword, Connections, Mystery Patient, Survival | ✅ playable, plus Fact or Fiction and Spaced Review |
| 4. Content pipeline | Partly done: schema, automated QA, publication gate. Missing: admin/review console, generation tooling, import/export |
| 5. Learning system: mistakes, Teach Me This, mastery, weak areas, FSRS, plans, dashboard | ✅ first version |
| 6. Remaining games | Designed in `docs/GAME_DESIGNS.md`; not built |
| 7. Social and premium | Not started; `leaderboardOptIn` stored; `BILLING_ENABLED = false` |
| 8. Release preparation | Not started |

## How it was verified

- `npm run check`: typecheck, ESLint (React Compiler rules), 54 unit tests covering content QA, FSRS, mastery, weak-area analysis, plans, study-time rules, the progress reducer (idempotency, mistakes, streaks), crossword generation (grid validation over many seeds), Connections fairness, Survival, Mystery scoring, review item selection.
- Playwright end-to-end run against a reviewer-preview production build served like GitHub Pages (base path, 404.html fallback), at 390×844 and 1280×860, light and dark: onboarding, every playable game to completion, wrong-answer feedback, Teach Me This, mistakes library and retry, dashboard, nested deep-link reload, external study log, planned games not clickable, active study time counted (and not while the tab is hidden), no horizontal scroll on phone pages, and no console errors. Script kept outside the repo.
- **Not done:** real-device testing, accessibility audit with a screen reader, medical review of any content.

## Key decisions

- **Web app first (Vite + React SPA)** for GitHub Pages; the same code can later be wrapped for the stores (Capacitor) or ported.
- **On-device first.** Zustand persisted to localStorage. Every write is a `LearningEvent` through `applyEvent` (pure, idempotent by event id), the same path a Firestore sync will replay.
- **Publication gate.** `ContentRepo` shows only `published` content in production builds. `VITE_ALLOW_UNREVIEWED=true` builds a labelled reviewer preview. All 40 concepts are `draft` / `ai-drafted`.
- **Concept-level spaced repetition** (FSRS-4.5 default weights). Correct answers before the due date don't advance the schedule; misses always count. Review asks a different item, and a different format where possible.
- **Mastery ≠ accuracy.** Beta-posterior per concept, weighted by difficulty, with a 45-day half-life, and a minimum of 3 attempts before any judgement. Statuses: not studied, insufficient information, needs revision, developing, improving, strong.
- **Weak areas are reported at the most specific level** (topic or concept), not the organ system.
- **Study time:** 5 s ticks, 90 s idle cut-off, ≤10 s per tick, only while a study context is open and the page is visible; one tab holds a lock (tab id persists across reloads). External logs are stored separately; totals are combined only on display.
- **Daily puzzles** are seeded by `package:date:game`, so everyone gets the same one.
- **Feedback colours** (green ok / deep red bad) always carry an icon and a word; selection uses black/white, so the primary red never means "wrong".

## Moving to its own repository (owner action)

1. On GitHub create an empty repo, e.g. `steps-ahead` (public if you want free GitHub Pages).
2. Locally: `git clone --single-branch -b claude/steps-ahead-medical-arcade-a8in03 https://github.com/memmamally-source/Oursome steps-ahead && cd steps-ahead && git remote set-url origin https://github.com/memmamally-source/steps-ahead.git && git push -u origin HEAD:main`
3. Delete the transport branch from Oursome afterwards. (Or add the new repo to a Claude session and ask Claude to do steps 2–3.)
4. Pages: Settings → Pages → Source "GitHub Actions", then run "Deploy to GitHub Pages" manually. It deploys a labelled reviewer preview until the repo variable `ALLOW_UNREVIEWED=false` is set.

## Firebase (owner action, free Spark plan is enough to start)

Create a new Firebase project (e.g. `steps-ahead-prod`, plus `steps-ahead-dev`), enable Authentication (Email link + Google) and Firestore. Add a Web app and put its config in repository variables `FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_APP_ID`. Never commit service-account keys. Then the next stage wires auth and sync.

## Next stage (suggested order)

1. Owner: create the repo and the Firebase project; review a first batch of concepts (the app's Content & sources page and `docs/MEDICAL_QA.md` describe the checklist).
2. Admin/review console (editor role, status transitions with audit trail, JSON export/import) so review happens in the app, not in code.
3. Firebase auth + event sync + emulator rules tests.
4. Pharmacology Match and Mechanism Lab (highest learning value of the remaining games), then Biostatistics Blitz.
5. Content expansion towards 150–200 reviewed concepts, prioritising blueprint-heavy areas (pathology, physiology).
6. Code-split games (bundle is 530 KB raw / 167 KB gzip), add a service worker for offline play.
