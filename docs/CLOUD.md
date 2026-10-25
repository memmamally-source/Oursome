# Cloud accounts and family sharing

Oursome works fully on one device without any of this. Cloud sharing adds:

- real accounts (email and password, password reset emails) with Firebase Authentication
- sharing a family: its shared tasks, events, lists, journal pages, noticeboard notes and people sync to every member's device
- invite codes that expire after 7 days

**Private things never leave the device.** Only items marked *Shared* with a family that has been shared are uploaded.
**Photos stay on the device.** Firebase's file storage needs the paid Blaze plan for new projects, so photos aren't synced; a shared journal page shows its words everywhere and its photo only where it was added.

It stays **off** until you configure a Firebase project. The public site keeps working exactly as before, and the Firebase code isn't even downloaded.

## What it costs

Nothing on Firebase's free **Spark** plan for a household or a small group of families: Authentication and Firestore have free daily allowances well above what a family uses. Spark never bills; at worst, a limit is reached for the day. Don't upgrade to Blaze unless you choose to.

## One-time setup (about 15 minutes)

1. Go to <https://console.firebase.google.com> and **Add project** (Analytics isn't needed). Keep the free Spark plan.
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable.**
   Under **Settings → Authorised domains**, add `memmamally-source.github.io` (and any custom domain).
3. **Build → Firestore Database → Create database** in production mode, in a region near you.
4. **Publish the security rules** from this repository, either:
   - in the console: Firestore → **Rules**, paste the contents of [`firebase/firestore.rules`](../firebase/firestore.rules), **Publish**; or
   - from a computer: `cd firebase && npx firebase-tools login && npx firebase-tools deploy --only firestore:rules --project <your-project-id>`
5. **Project settings → General → Your apps → Web (`</>`)**, register an app (no hosting needed) and copy its config values.
6. In GitHub: **Settings → Secrets and variables → Actions → Variables → New repository variable**, add:

   | Variable | From the Firebase config |
   | --- | --- |
   | `EXPO_PUBLIC_FIREBASE_API_KEY` | `apiKey` |
   | `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN` | `authDomain` |
   | `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | `projectId` |
   | `EXPO_PUBLIC_FIREBASE_APP_ID` | `appId` |
   | `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | `messagingSenderId` |

   These values are **not secrets**: every Firebase web app ships them to the browser. The data is protected by the security rules, which only let members of a household read or write it.
7. The next deploy (merging to `main`, or **Actions → Deploy website → Run workflow**) switches cloud sharing on.

## What people see once it's on

- **Sign up / sign in** use real accounts. Someone who already used Oursome on that device keeps all their data: it isn't tied to the old preview account.
- **Our Space → Invite → Share this family** uploads what's already shared with that family. Nothing on the device is removed.
- **Create an invite code** (admins). The code works for 7 days; send it however you like.
- **Our Space → Join with a code** on the other person's device.
- **Stop sharing here** leaves the shared family; that device keeps its copy.

## How the security rules protect households

[`firebase/firestore.rules`](../firebase/firestore.rules), summarised:

- Nothing is readable or writable without signing in, and anything not listed is closed.
- A household, its members and its items are readable only by its members.
- You can only add **yourself** to a household: as its admin in the same write that creates it, or with a valid, unexpired invite code.
- Only admins create invite codes, for at most 7 days. Codes can be read one at a time by someone who has them, never listed.
- Members can't promote themselves; only an admin changes roles. Anyone can leave.
- Items must be a known kind, are stamped with the writer's own account and the server time, and can't change kind.
- `users/{uid}` is private to that account.

They're tested against the Firebase emulator in [`firebase/tests/rules.test.ts`](../firebase/tests/rules.test.ts): `npm run test:cloud` (needs Java; downloads the emulator on first run). CI runs them on every pull request.

## How sync works

[`src/features/cloud`](../src/features/cloud):

- `mapping.ts` (pure, unit-tested): what a family shares, the cloud shape (your own id is `me` on your device and your account id in the cloud), and the merge rules. An edit not yet uploaded is never overwritten by an older cloud copy; something deleted on another device is removed here; something new here is uploaded.
- `engine.ts`: live listeners for each shared family, uploads shortly after changes, and offline tolerance (changes are kept on the device and retried).
- `api.ts`: every Firestore read and write, the same functions the rules tests use.

Conflicts resolve as "last change wins" per item (a task, an event, a list item).

## Testing locally with the emulators

```sh
cd firebase && npx firebase-tools emulators:start --only firestore,auth --project demo-oursome
# in another terminal
EXPO_PUBLIC_FIREBASE_API_KEY=demo EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost \
EXPO_PUBLIC_FIREBASE_PROJECT_ID=demo-oursome EXPO_PUBLIC_FIREBASE_APP_ID=demo \
EXPO_PUBLIC_FIREBASE_EMULATOR_HOST=localhost npx expo start --web
```

## Not done yet

- Photo sync (needs a paid storage plan, or another free option).
- Push notifications with the app closed (needs a server to send them).
- Native phone builds haven't been tested against Firebase. The web app has been tested against the emulators.
- Removing someone else from a family from inside the app (the rules allow admins to; the screen doesn't offer it yet).
