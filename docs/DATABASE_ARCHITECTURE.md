# Database architecture

## Today: on device
Zustand store persisted to `localStorage` under `steps-ahead:progress` (`src/state/progress.ts`): profile, concept records, FSRS cards, mistakes, day time buckets, daily answer counts, game stats, daily results, external logs, saved concepts, favourite explanations, error reports, and a capped event log (study-time ticks are not persisted in the log; they are fully captured in the day buckets). Export: Profile → Export study history (JSON). Delete: Profile → Delete all data.

## Planned: Firebase (separate Steps Ahead project)
No Firebase project exists yet. Config is read from `VITE_FIREBASE_*` (`src/lib/firebaseConfig.ts`); the Firebase SDK will be lazy-loaded only when configured.

```
users/{uid}                       profile, settings (role and entitlements written server-side only)
users/{uid}/events/{eventId}      append-only learning events (id = event id → idempotent)
users/{uid}/state/progress        materialised aggregates (concept records, FSRS, mistakes, day buckets)
users/{uid}/external/{id}         external study logs
packages/{pkg}/concepts/{id}      published content (world-readable)
packages/{pkg}/items/{id}
editorial/…                       drafts, reviews, audit trail (editors; server writes)
reports/{id}                      learner error reports
leaderboards/{board}/entries/{uid}  server-computed from validated events
```

**Sync design:** the client writes events to `users/{uid}/events` (offline persistence enabled). On another device, events newer than its watermark are fetched and replayed through the same `applyEvent`; ids make the replay idempotent. Aggregates are periodically checkpointed to `state/progress` so new devices don't replay everything. Study-time ticks are batched into per-minute events before upload to keep writes cheap.

**Security:** `firebase/firestore.rules` (draft, untested until an emulator test suite is added): owner-only user data; append-only events; content readable only when published; content, editorial, leaderboards and entitlements are writable only from server code (Admin SDK). Competitive scores are recomputed server-side from events; client-reported scores are never trusted.

**Environments:** separate Firebase projects for development and production (`VITE_APP_ENV`). Never commit service-account keys; server credentials live in the hosting provider's secret store.

**Cost:** content ships in the bundle or is cached; no AI calls at answer time; events are batched.
