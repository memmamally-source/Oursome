# Oursome — project progress

> Living record so any future session can resume without losing decisions. Keep it concise; update at the end of every stage.

**Product:** AI-powered personal, couples & family organiser. Freemium. US first, then UK/CA/AU.
**Name:** "Oursome" is **provisional** (trademark/domain/store clearance pending). Change it in `src/config/brand.ts` + `app.json` (`name`, `bundleIdentifier`, `package`, `scheme`).
**Repo:** `memmamally-source/Oursome` — fully separate from Crossword Hub and the travel app. No Firebase project yet.

## Status

| Stage | Status |
| --- | --- |
| 1. Beautiful foundation | ✅ Done (local-only, see below) |
| 1b. Website first (PWA on GitHub Pages) | ✅ Live at memmamally-source.github.io/Oursome |
| Overhaul (branch `overhaul-performance-ui-ai`) | ✅ Phases A–E done; PR open, awaiting owner approval to merge (merging deploys). AI service built, not deployed. |
| 2. Core functionality (Firebase auth, Firestore, notifications) | ⏭ Next |
| 3. Household sharing | — |
| 4. AI assistant (server) | — |
| 5. Smart imports (images/PDF) | — |
| 6. Premium subscriptions (RevenueCat, sandbox) | — |
| 7. Polish & testing | — |
| 8. Store release | — |

## Overhaul: performance, UI/UX and AI (branch `overhaul-performance-ui-ai`, not merged)

Merging to `main` deploys the website, so merge only with the owner's approval.

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
- **Zustand selectors:** never return a fresh `[]` or object; use `NO_MEMBERS` etc., or Zustand 5 re-renders in a loop.

## Stack (verified Oct 2026)

Expo SDK 58 · React Native 0.88 · React 19.3 · TypeScript 6 · Expo Router 58 (JS tabs with custom tab bar) · Reanimated 4 · Zustand 5 + AsyncStorage persistence · date-fns 4 · react-native-svg · @expo/vector-icons (Ionicons) · Nunito (headings) + Nunito Sans (body), both OFL · Jest (jest-expo) · ESLint (eslint-config-expo, React Compiler rules).

Everything used runs in **Expo Go** — no dev build needed yet.

## Key decisions

- **Design tokens** in `src/theme/tokens.ts`: each accent has `base`, `soft` (background) and `ink` (AA text on soft). Text on solid accents is charcoal (`onAccent`) — white on coral fails AA (2.6:1). Purpose-built dark palette.
- **Colour meaning:** coral = primary/actions, sunshine = family/celebration/important dates, sky = calendar, lavender = AI/personal, mint = completion/shopping.
- **Dates:** stored as wall-clock strings (`DateKey` `yyyy-MM-dd`, `LocalDateTime` `yyyy-MM-ddTHH:mm`) plus the event's `timeZone`. DST-safe; zone conversion comes with sync.
- **Recurrence:** simple rules (daily/weekdays/weekly/monthly/yearly + interval/until), expanded on read (`features/calendar/recurrence.ts`). Monthly on the 31st clamps to short months. Completing a recurring task records it and spawns the next instance.
- **Privacy model:** every item has `visibility: 'private' | 'shared'`. Must be enforced by Firestore rules in Stage 3, not just in the client.
- **AI contract:** `features/assistant/parser.ts` returns `ParseResult` (`proposals` | `clarify` | `query` | `unsupported`). Stage 1 uses a deterministic on-device parser; Stage 4's server AI must return the same shape (schema-validated) so the UI is unchanged. Nothing is saved without user approval. The parser asks when the recipient, a numeric date (US vs UK) or a reminder time is ambiguous, and flags assumed dates/times.
- **Auth:** `AuthService` interface in `features/session/store.ts`. Stage 1 `localAuth` is a device-only preview (passwords validated, never stored). Swap for Firebase behind the same interface.
- **Demo content:** `features/demo/seed.ts`, generated relative to today, every record `isDemo`/`demo_` id; cleared from Home banner or Settings.
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
- **Settings:** profile name/colour, theme (auto/light/dark), Home sections, notification preferences + quiet hours (stored only), sample content, JSON data export, sign out, delete all local data.
- Checks: `npm run check` → typecheck + lint + 94 unit tests (parser, importer, recurrence, layout, tasks, shopping, suggestions). Native iOS/Android bundles export cleanly. Every screen visually reviewed in light and dark via web screenshots (not on a physical device).

## Known gaps / outstanding

- No backend: data is per device; invites are placeholders; notification prefs aren't delivered.
- Reordering uses up/down arrows (drag-to-reorder later).
- Editing a recurring event edits the whole series (no "this occurrence only" yet).
- Event attachments not implemented (needs Cloud Storage).
- External calendar sync (Google/Apple) not started.
- Week view titles are tiny on narrow phones; consider a 3-day view.
- Routines/habits UI not built (data model can reuse recurring tasks).
- Icon concepts in `docs/brand/icon-concepts.png`; "Gathering" chosen provisionally.
- Legal drafts in `docs/legal/` need professional review.
- Not yet tested on a physical iPhone/Android device.

## Stage 2 plan (next)

1. Create **separate** Firebase projects `oursome-dev` and `oursome-prod` (ask user first — billing/Blaze needed for Functions).
2. Firebase Auth (email/password, reset); investigate Sign in with Apple (required if Google sign-in is offered on iOS).
3. Firestore data model `users/{uid}/…` for private data; repositories behind current store APIs; offline persistence.
4. Expo Notifications for task/event reminders with quiet hours; permission prompt in context.
5. Account deletion via Cloud Function; data export from server.
6. EAS project + development build profile.

## Handy commands

```bash
npm start            # Expo dev server (scan QR with Expo Go)
npm run check        # typecheck + lint + tests
npm run web          # browser preview
EXPO_OFFLINE=1 npx expo install <pkg>   # in sandboxes where api.expo.dev is blocked
```
