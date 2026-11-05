# Steps Ahead

Games that build real USMLE knowledge. Play a Daily Medical Mini, a Connections puzzle or a Mystery Patient, and every answer feeds study-time tracking, spaced review, a mistakes library and weak-area analysis.

> **Status: early development, reviewer preview.** All medical content is original but **AI-drafted and not yet medically reviewed**. A production build shows only content marked `published`, so nothing unreviewed reaches learners unless a build is explicitly a reviewer preview.

This is a standalone product. It shares no code, repository, Firebase project or data with any other app.

## What works today

| Area | State |
| --- | --- |
| Onboarding, Step 1 package (Step 2 CK / Step 3 marked coming soon) | ✅ |
| Home, Arcade, Subjects, Review, Profile; Dashboard; Content & sources | ✅ |
| Red / white / black design system, light + dark, mobile tabs + desktop sidebar, reduced motion, keyboard play | ✅ |
| Games: Medical Crossword, Medical Connections, Mystery Patient, Medical Survival, Fact or Fiction, Spaced Review | ✅ playable |
| Games: Mechanism Lab, Microbiology Hunt, Pharmacology Match, Biostatistics Blitz, Genetics Detective, Pathology Spotlight, Step 1 Challenge | 🛠 designed, not built (shown as "In development") |
| Active study-time tracking (idle/hidden excluded, multi-tab safe), external study log | ✅ |
| Shared learning events, concept mastery, 4-level weak-area analysis, FSRS spaced repetition, study plans | ✅ |
| My Mistakes, answer feedback, Teach Me This lessons with follow-up questions, error reports | ✅ (reports stored on device) |
| Content: 40 concepts, 40 MCQs, 46 true/false, 55 crossword clues, 19 Connections groups, 5 cases | ✅ drafted, ❌ not reviewed |
| Firebase (accounts, sync), admin/review console, leaderboards, subscriptions | ❌ not built (rules drafted) |

## Run it

```bash
npm install
npm run dev          # http://localhost:5173 (includes draft content)
npm run check        # typecheck + lint + tests
npm run build        # production build: published content only
VITE_ALLOW_UNREVIEWED=true npm run build   # reviewer preview build
```

Requires Node 22+.

## Documentation

- [PROGRESS.md](PROGRESS.md): status, decisions, next steps (start here)
- [docs/DEVELOPMENT_ROADMAP.md](docs/DEVELOPMENT_ROADMAP.md)
- [docs/GAME_DESIGNS.md](docs/GAME_DESIGNS.md)
- [docs/STEP1_BLUEPRINT.md](docs/STEP1_BLUEPRINT.md)
- [docs/CONTENT_SCHEMA.md](docs/CONTENT_SCHEMA.md), [docs/CONTENT_SOURCES.md](docs/CONTENT_SOURCES.md), [docs/MEDICAL_QA.md](docs/MEDICAL_QA.md)
- [docs/LEARNING_ANALYTICS.md](docs/LEARNING_ANALYTICS.md), [docs/DATABASE_ARCHITECTURE.md](docs/DATABASE_ARCHITECTURE.md)
- [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)
- [CHANGELOG.md](CHANGELOG.md)

## Stack

Vite 8 · React 19 · TypeScript 5.9 · React Router 7 · Zustand 5 (localStorage persistence) · Vitest + Testing Library · ESLint with React Compiler rules · Inter (OFL, self-hosted via Fontsource). Firebase is planned; nothing is loaded until it is configured.

## Changing the name

The product name lives in `src/config/brand.ts`, `index.html` (`<title>`, meta) and `public/manifest.webmanifest`.
