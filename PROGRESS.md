# Oursome — project progress

> Living record so any future session can resume without losing decisions. Keep it concise; update at the end of every stage.

**Product:** AI-powered personal, couples & family organiser. Freemium. US first, then UK/CA/AU.
**Name:** "Oursome" is **provisional** (trademark/domain/store clearance pending). Change it in `src/config/brand.ts` + `app.json` (`name`, `bundleIdentifier`, `package`, `scheme`).
**Repo:** `memmamally-source/Oursome` — fully separate from Crossword Hub and the travel app. No Firebase project yet (cloud code is built and off until one is configured, see `docs/CLOUD.md`).

## Status

| Stage | Status |
| --- | --- |
| 1. Beautiful foundation | ✅ Done |
| 1b. Website first (PWA on GitHub Pages) | ✅ Live at memmamally-source.github.io/Oursome |
| Overhaul (PRs #2–#5) | ✅ Merged |
| Redesign + photo albums (branch `redesign-home`) | ✅ Built and tested; PR for review, **not merged** (merging deploys) |
| 2. Core functionality (accounts, reminders) | ✅ Reminders work while open; Firebase accounts built, off until configured |
| 3. Household sharing | ✅ Built (Firebase, rules tested on the emulator), off until configured |
| 4. AI assistant (server) | Built, not deployed (owner decision) |
| 5. Smart imports (images/PDF) | Text and .ics import done; images/PDF need the AI service |
| 6. Premium subscriptions | — |
| 7. Polish & testing | In progress (no physical-device testing yet) |
| 8. Store release | — |

## Redesign, functional upgrade and photo albums (branch `redesign-home`, not merged)

Merging to `main` deploys the website, so merge only with the owner's approval.


- **R1 Design system:** linen `#F4EEE5`, ivory `#FFF9F0`, terracotta `#B95F49` (solid fills `#A9533F` for AA), sage, honey, espresso; Fraunces headings (self-hosted on web), Nunito Sans text; paper grain on web (`paperProps`); warm dark palette. Each accent has `base/soft/ink/on`.
- **R2 Motion (`theme/motion.ts`):** `useReducedMotion()` (device setting or Settings → Reduce motion). Orb companion (`components/brand/Orb.tsx`, rate-limited celebrations, never blocks), toasts with Undo, confirm dialog (no browser alerts), fold-away task completion, page turning (`components/journal/PageTurn.tsx`, drag/buttons/arrow keys, fade when reduced).
- **R3 Home:** greeting over the household cover (scenes or photo, seasonal accent), occasions ribbon, quick actions, shopping, coming up, recently at home (`features/activity`), optional weekly summary (Sun/Mon), dismissible first steps. "Make it yours" (`/household`).
- **R4 Journal:** memories/milestones/notes with photos (`features/memories`, photos in IndexedDB via `lib/photoStore.ts`), `/journal` book, Our Space timeline.
- **R5 Functional:** reminder engine (`features/reminders`: events, tasks, briefings, quiet hours hold reminders, dedupe, history; browser notifications when allowed, in-app otherwise; push with the app closed needs a server); `.ics` import/export (`features/calendar/ics.ts`, one-way, labelled so); event participants; multi-day all-day events; assistant covers the brief's seven example requests (scenario tests); shopping own order + often-bought; onboarding refresh.
- **R6 Cloud (`features/cloud`, off unless `EXPO_PUBLIC_FIREBASE_*` set):** Firebase Auth; share a family (uploads what's shared, keeps local data), 7-day invite codes, join, leave; two-way sync with merge rules in pure `mapping.ts`; Firestore rules in `firebase/firestore.rules` with 15 emulator tests (`npm run test:cloud`, in CI). Firebase loads in its own chunk only when configured. Verified end to end with two browsers against the emulators.
- **Photo albums (`features/albums`):**
  - Layout engine (`auto.ts`, pure): 27 page designs on a 4:5 page; dynamic programming over crop loss (hard limit 40%), template taste, fullness and variety; sections by day/month/year with dividers; Growing Up chapters with ages; `redesign()` keeps unchanged sections and manual edits. Deterministic per album.
  - Photos stay on the device (owner chose on-device storage; cloud photo storage needs a paid plan): IndexedDB original/display (2048 px)/thumb (480 px) on web, app documents on phones (phone path untested). EXIF dates and orientation; resumable two-at-a-time queue with retry; storage estimate and persistence request.
  - Screens: `/albums`, `/album/new` (choose photos → name → Create album; style suggested from the name), `/album/[id]` (cover, page turning, preloading), `/album/[id]/edit` (designs with previews, swap/replace, crop by drag or buttons, captions, notes, dates, reorder, journal pages, cover/theme/style, redesign, sharing permissions, delete, download).
  - PDF (`pdf.ts`, jsPDF lazy-loaded): 8 × 10 in, 300 dpi with 1/8 in bleed or 150 dpi for sharing, drawn from the same data; `print.ts` print checks and a `PrintProvider` interface (no provider connected).
- **QA done on the production build (local Pages-like server):** unit tests 251; rules tests 15 (emulator); Playwright flows for journal, reminders (with a controlled clock), .ics, shopping, two-person cloud sync, albums (40 generated photos with EXIF incl. a rotated one) and both PDF exports (checked with `pdfinfo`/`pdftoppm`); earlier E2E scripts re-run (`families` 15/15, `taskcal` 10/10; the original `e2e` script still expects the sample content removed in PR #4). Album theme colours checked for WCAG AA. Screenshots and `docs/preview/album-page-turn.gif`.
- **Not done / needs the owner:** physical iPhone/Android testing; a Firebase project (free Spark plan, `docs/CLOUD.md`); cloud photo storage (paid; owner chose on-device); push notifications with the app closed (needs a server); live AI (needs approval and a key); printed-book ordering (no provider).

## Overhaul: performance, UI/UX and AI (merged in PRs #2–#5)


- **A. Performance:** icons are an SVG subset (`npm run icons` after using a new icon name). Reanimated and gesture-handler are gone. Two self-hosted variable fonts on web. The service worker caches CORE at install and WARM when the browser is idle. Measured on slow 4G: returning-user Home 7.8 s → 3.9 s, transfer 1.66 → 0.55 MB, Lighthouse 55 → 65.
- **B. Home and navigation:** logo bar plus greeting card, organiser capture box, My day, My people, lists, coming up. Tabs are Today / Calendar / Tasks / Our Space with a central "+" ("Add or ask"); a sidebar on screens ≥900px. The organiser is a full chat at `/assistant`. `/person/[id]` shows a person page and an add/edit form.
- **C. Calendar, tasks, household:** Day / 3 days (Week when wide) / Month / List, with people filters and calendars behind one button. View maths is in `features/calendar/views.ts`. The task editor has "Who's doing it?" (choosing someone else shares the task) and shows suggested names. Tasks can be filtered by person. Our Space has a People list linking each person to their tasks and calendar.
- **People model:** `Member.kind` is `person` (no account) or `account`, with optional `relationship` and `aliases` set only by the user. `Task.assigneeName` holds an unresolved suggested name. Unassigned tasks belong to the user (`features/people/logic.ts`).
- **Assistant:** Interpretation (names only) → `resolve.ts` (directory, relationships, pronouns, refs validation) → Proposals → user approval → `execute.ts`, the only write path. Questions are answered from data in `query.ts`. `basic.ts` is the labelled offline "Basic mode". `remote.ts` calls `EXPO_PUBLIC_AI_ENDPOINT` (not set yet). Scenario tests are in `features/assistant/__tests__/scenarios.test.ts`.
- **D. AI service (`server/ai`, built and tested, NOT deployed):** a Cloudflare Worker using `@anthropic-ai/sdk` structured outputs (`betaZodOutputFormat`, schema in `src/schema.ts`), with a cached system prompt, `fallbacks: "default"` on Opus/Sonnet 5.5, rate limits (per device, plus a global daily cap), a CORS allow-list, and token/cost logs that never include the message. The model is the `AI_MODEL` var (default `claude-opus-5-5`; `claude-haiku-5-5` is the cheap option), and the owner still has to choose. Costs and the approval-gated turn-on steps are in `server/ai/README.md`. The web build reads the repo variable `EXPO_PUBLIC_AI_ENDPOINT` (unset = Basic mode). `npm run check:server` runs in CI. `AI_EVAL_ENDPOINT=<url> npm run eval:ai` runs every scenario against the live service and fails if any message fell back to Basic mode.
- **E. Testing and measurement (production build, local Pages-like server with gzip, slow 4G 1.6 Mbps / 150 ms, 4× CPU):**
  - Lighthouse mobile: three runs scored 52 / 64 / 68 (this sandbox is noisy). The median, 64, compares with 55 at baseline and 65 after Phase A: LCP 4.7 s, TBT 810 ms, 504 KB.
  - Returning user: Home visible in 4.2 s (baseline 7.8 s, Phase A 3.9 s), 572 KB transferred. Tab switches 0.2–0.9 s; ticking a task 0.27–0.30 s (baseline 0.66 s).
  - A Playwright E2E script (scratchpad, not in the repo) ran 29 checks: onboarding, organiser flows (unknown person, approve, follow-up, multiple actions, dismiss, data question), people across Tasks / Our Space / the person page, calendar views and person filter, task assignment, deep links, persistence, PWA manifest, service worker, offline, the privacy and support pages, and desktop layout. All pass, with no console errors apart from the expected deep-link 404s that GitHub Pages serves by design.
  - Not done: real-device (iPhone) testing, and any live AI evaluation (no key; not deployed).
- **Loading fix (after the overhaul went live):** on a patchy signal a returning visit could hang forever, because the service worker waited on the network for pages with no limit (reproduced: "not loaded after 60 s"). Pages now wait at most 3 s, then open the shell saved at install (4.2 s in the same test). The loading screen offers "Try again" after 10 s, and font preloads are low priority. First visits are still 3–8 s on 4G to 3G, and most of that is the framework (expo-router 439 KB, react-native-web 310 KB, react-dom 204 KB raw), which is a follow-up.
- **Clean start and multiple families (Oct 24):**
  - No sample content for new accounts, and no example prompts in the organiser. Leftover sample content from older accounts is now removed automatically at launch (`features/demo/cleanup.ts`); anything the person added stays.
  - The space store holds `spaces[]` and `activeId`, with derived `space` (the family being viewed) and `people` (everyone, deduped). It is persisted as v2; `migrateSpaces` turns the old single `space` into the first family, without loss.
  - Shared tasks, events and lists carry `spaceId`, stamped by the stores (`withFamily`). Items without it belong to the first family (`belongsTo`).
  - Our Space has a Families switcher and shows the chosen family's people, noticeboard and shared items. Today, Tasks and Calendar show everything.
  - The organiser and the task editor put work for someone into that person's family.
  - Selected, checked and expanded states now use `aria-*` props; `accessibilityState` emitted nothing on web.
- **Tasks on the calendar, full task page (Oct 24):**
  - Open dated tasks appear on the calendar as read-only entries (`features/calendar/tasks.ts`, pseudo-calendar `cal_tasks`, mint): timed tasks are 30-minute blocks, others go in the all-day row.
  - Tapping an entry opens the task (`openOccurrence`). The "Tasks" chip in the calendar filters toggles them (`settings.tasksOnCalendar`). The people filter treats them as the assignee's, or the user's own when unassigned.
  - Adding a task opens the full task page, pre-filled. This covers the Tasks quick-add box and the organiser's "Add task", which passes `proposal`; saving calls `useAssistant.complete`.
  - "Who's doing it?" now shows even before any people exist.
- **Zustand selectors:** never return a fresh `[]` or object; use `NO_MEMBERS` etc., or Zustand 5 re-renders in a loop.

## Stack (verified Oct 2026)

Expo SDK 58 · React Native 0.88 · React 19.3 · TypeScript 6 · Expo Router 58 (JS tabs with custom tab bar) · Zustand 5 + AsyncStorage persistence · date-fns 4 · react-native-svg · Ionicons SVG subset · Fraunces (headings) + Nunito Sans (body), both OFL · Firebase JS SDK 13 (optional, lazy) · jsPDF 4 (lazy, album export) · Jest (jest-expo) · ESLint (eslint-config-expo, React Compiler rules).

Everything used runs in **Expo Go** — no dev build needed yet.

## Key decisions

- **Design tokens** in `src/theme/tokens.ts`: each accent has `base`, `soft` (background) and `ink` (AA text on soft). Text on solid accents is charcoal (`onAccent`) — white on coral fails AA (2.6:1). Purpose-built dark palette.
- **Colour meaning:** coral = primary/actions, sunshine = family/celebration/important dates, sky = calendar, lavender = AI/personal, mint = completion/shopping.
- **Dates:** stored as wall-clock strings (`DateKey` `yyyy-MM-dd`, `LocalDateTime` `yyyy-MM-ddTHH:mm`) plus the event's `timeZone`. DST-safe; zone conversion comes with sync.
- **Recurrence:** simple rules (daily/weekdays/weekly/monthly/yearly + interval/until), expanded on read (`features/calendar/recurrence.ts`). Monthly on the 31st clamps to short months. Completing a recurring task records it and spawns the next instance.
- **Privacy model:** every item has `visibility: 'private' | 'shared'`. Must be enforced by Firestore rules in Stage 3, not just in the client.
- **AI contract:** `features/assistant/parser.ts` returns `ParseResult` (`proposals` | `clarify` | `query` | `unsupported`). Stage 1 uses a deterministic on-device parser; Stage 4's server AI must return the same shape (schema-validated) so the UI is unchanged. Nothing is saved without user approval. The parser asks when the recipient, a numeric date (US vs UK) or a reminder time is ambiguous, and flags assumed dates/times.
- **Auth:** `AuthService` interface in `features/session/store.ts`. Stage 1 `localAuth` is a device-only preview (passwords validated, never stored). Swap for Firebase behind the same interface.
- **Demo content (retired):** the old generator is kept only as a test fixture (`features/demo/legacySample.fixture.ts`). `removeSampleContent()` runs once after stores hydrate and drops every `isDemo`/`demo_` record, keeping sample lists, calendars or the sample household only if the person added their own things to them.
- **Plans/limits:** `src/config/plans.ts` (display only). Real entitlements must be server-verified (Stage 6). No purchase UI exists.
- **Navigation:** `src/app` routes. Root `Stack.Protected` guards: signed-out → onboarding/auth; signed-in → tabs + modals.

## Website-first launch (same approach as Crossword Hub)

Decision (23 Oct 2026): launch as a website first, like Crossword Hub. We reuse the Expo app's web build rather than rewriting it in plain HTML, so the website and the future store apps share one codebase.
- `npm run build:web` (`scripts/build-web.js`) → `dist/`: Expo web export plus `public/` (HTML template with branded boot screen, manifest, icons, `sw.js`, `og-image.png`, `privacy/`, `support/`, `robots.txt`). The script fills in `__BASE__`, `__SITE_URL__`, `__VERSION__` and `__PRECACHE__`, copies `index.html` to `404.html` (single-page-app deep links on Pages) and adds `.nojekyll` (otherwise Pages drops `_expo/`).
- Base path comes from `EXPO_BASE_URL` (via `app.config.js`); in CI it comes from `actions/configure-pages`, so a custom domain needs no code change.
- Service worker: network-first for pages, cache-first for hashed files, and it precaches every built file because routes load lazily.
- Workflows: `ci.yml` (PR checks + build) and `deploy-web.yml` (main → Pages).
- **Blocker:** the repo is private. GitHub Pages needs a public repo (as Crossword Hub is) or a paid GitHub plan; Firebase Hosting is the alternative.
- Verified against a local server that behaves like GitHub Pages: loads at `/Oursome/`, sign-up, deep-link reload, persistence, manifest and icons, service worker, offline reload, privacy and support pages, desktop layout.

## Stage 1 — what works (tested)

- Onboarding (3 slides), sign-up/sign-in (local), optional sample content.
- **Home:** greeting, overview tiles, quick capture → Assistant, smart suggestion (rule-based, dismissible), timeline with "now" marker, top-3 priorities with completion + confetti, Our Space preview, shopping strip, important dates, customisable sections.
- **Calendar:** Month (dots), Week & Day (time grid, overlap columns, tap empty slot to add), Agenda (30 days), calendar visibility toggles, recurring/all-day/multi-day events, event editor (location, notes, repeat, reminder, calendar, visibility, important date).
- **Tasks:** groups (Overdue/Today/Tomorrow/Coming up/Anytime), filters, smart vs manual order with reordering, natural-language quick add, completed history, task editor (category + custom categories, priority, due date/time, repeat, reminder, subtasks, notes, sharing & assignee).
- **Shopping:** multiple lists, auto category grouping, quantities ("2 milk", "milk x2"), purchased → basket → restore, favourites quick-add, private/shared.
- **Assistant:** chat UI, proposals with inline edit / Edit details / Dismiss, clarifying questions, summaries ("What's on tomorrow?", "Organise my tasks for tomorrow").
- **Import:** paste text → event + checklist + evening-before reminder (on-device). Screenshot picker UI (image reading deferred to Stage 5).
- **Our Space:** create space, noticeboard (post/pin/delete), shared events/tasks/lists, members, privacy note, leave.
- **Settings:** profile name/colour, theme (auto/light/dark), Home sections, notification preferences + quiet hours (stored only), JSON data export, sign out, delete all local data.
- Checks: `npm run check` → typecheck + lint + 94 unit tests (parser, importer, recurrence, layout, tasks, shopping, suggestions). Native iOS/Android bundles export cleanly. Every screen visually reviewed in light and dark via web screenshots (not on a physical device).

## Known gaps / outstanding

- Not tested on a physical iPhone/Android device (all testing is the web build in Chromium).
- Cloud sharing and accounts need a Firebase project; until then data is per device and invites explain why they're unavailable.
- Album photos are per device; shared albums can't show photos on other members' devices until cloud photo storage is chosen.
- Notifications arrive only while Oursome is open (tab or installed app).
- Calendar import/export is one-way; no live Google/Apple sync.
- Editing a recurring event edits the whole series.
- Legal drafts in `docs/legal/` need professional review.

## Next

1. Owner review of the `redesign-home` PR on a phone, then merge (deploys).
2. If wanted: create the Firebase project (free Spark plan) and set the repo variables (`docs/CLOUD.md`).
3. Decide on cloud photo storage (paid options) for shared albums.
4. Device testing; EAS development build.

## Handy commands

```bash
npm start            # Expo dev server (scan QR with Expo Go)
npm run check        # typecheck + lint + tests
npm run test:cloud   # security rules + cloud API against the Firebase emulator (needs Java)
npm run web          # browser preview
EXPO_OFFLINE=1 npx expo install <pkg>   # in sandboxes where api.expo.dev is blocked
```
