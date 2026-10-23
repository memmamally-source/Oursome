# Oursome — project progress

> Living record so any future session can resume without losing decisions. Keep it concise; update at the end of every stage.

**Product:** AI-powered personal, couples & family organiser. Freemium. US first, then UK/CA/AU.
**Name:** "Oursome" is **provisional** (trademark/domain/store clearance pending). Change it in `src/config/brand.ts` + `app.json` (`name`, `bundleIdentifier`, `package`, `scheme`).
**Repo:** `memmamally-source/Oursome` — fully separate from Crossword Hub and the travel app. No Firebase project yet.

## Status

| Stage | Status |
| --- | --- |
| 1. Beautiful foundation | ✅ Done (local-only, see below) |
| 1b. Website first (PWA on GitHub Pages) | ✅ Built; goes live once Pages is enabled (see below) |
| 2. Core functionality (Firebase auth, Firestore, notifications) | ⏭ Next |
| 3. Household sharing | — |
| 4. AI assistant (server) | — |
| 5. Smart imports (images/PDF) | — |
| 6. Premium subscriptions (RevenueCat, sandbox) | — |
| 7. Polish & testing | — |
| 8. Store release | — |

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
