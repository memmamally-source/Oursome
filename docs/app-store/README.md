# App Store pack

Everything App Store Connect asks for, ready to paste. The code side is done: bundle ID, privacy manifest, photo permission text, in-app privacy policy and support links, full account deletion, safe-area margins checked on iPhone sizes, and screenshots. Nothing has been submitted yet.

The iPhone app builds on GitHub's Macs and uploads itself to App Store Connect (`.github/workflows/ios.yml`), the same way as Crossword Hub and the Research Tracker, so no Mac or Expo account is needed. Your Apple Developer account and App Store Connect API key carry over, so there's nothing new to pay for.

## Step by step (from your iPhone)

If a page is cramped, tap **aA → Request Desktop Website**.

### 1. Register the app's ID (once)

1. Open https://developer.apple.com/account/resources/identifiers/list
2. Tap **+** → **App IDs** → **App** → Continue.
3. **Description:** Oursome · **Bundle ID:** Explicit, `org.oursome.app`
4. Continue → **Register**. No capabilities are needed.

### 2. Create the app in App Store Connect (once)

1. https://appstoreconnect.apple.com → **Apps → + → New App**: iOS · name **Oursome** · language English (UK) · bundle ID **org.oursome.app** · SKU `oursome-ios` · Full Access. If the name is taken, use **Oursome: Family Organiser**.
2. Fill in everything from the sections below: subtitle, description, keywords, URLs, category, age rating, price, App Privacy, review notes, and the screenshots.

### 3. Let GitHub upload for you (once)

Add the **same** four secrets you used for the crosswords and First-project repositories (the API key works for every app on your account):

https://github.com/memmamally-source/Oursome/settings/secrets/actions → **New repository secret**

| Name | Value |
|---|---|
| `APPSTORE_KEY_ID` | the Key ID |
| `APPSTORE_ISSUER_ID` | the Issuer ID |
| `APPSTORE_KEY` | the whole text of the `.p8` file, from `-----BEGIN PRIVATE KEY-----` to `-----END PRIVATE KEY-----` |
| `APPLE_TEAM_ID` | the Team ID |

Lost the `.p8` file? Make a new key: App Store Connect → **Users and Access → Integrations → App Store Connect API → Team Keys → +** (access **Admin**), download it, and use its Key ID.

### 4. Build and test (each release, about 30 minutes)

1. https://github.com/memmamally-source/Oursome/actions/workflows/ios.yml → **Run workflow → Run workflow**.
2. When it's green (15–20 minutes), wait 10–15 minutes for Apple to process it.
3. In App Store Connect → Oursome → **TestFlight**, add yourself as an internal tester, then install it from the **TestFlight** app.
4. Try every screen on your phone: make an album, turn its pages, edit it, delete it; add a task, an event and a shopping item; then Settings → Delete account and data.

### 5. Submit for review

1. App Store Connect → Oursome → the **1.0** page → **Build** → choose the uploaded build.
2. **Add for Review → Submit**. Apple usually replies within a day or two. If they reject it, send me their message.

### Updating the app later

The app doesn't update itself when the website changes; each update is a new build. Raise `version` in `app.json` (1.0.0 → 1.1.0) for a new App Store version, then repeat steps 4 and 5. The build number goes up by itself.

## Listing

| Field | Value |
| --- | --- |
| Name | Oursome |
| Subtitle (30 max) | Family plans, lists & albums |
| Bundle ID | org.oursome.app |
| SKU | oursome-ios |
| Primary category | Lifestyle |
| Secondary category | Productivity |
| Price | Free |
| Support URL | https://oursome.org/support/ |
| Marketing URL | https://oursome.org |
| Privacy Policy URL | https://oursome.org/privacy/ |
| Copyright | 2026 Oursome |
| Contact email | oursomeapp@outlook.com |

**Promotional text (170 max)**

> Plan the week, share the shopping, and turn your photos into beautiful albums, all in one warm, private place for your household.

**Keywords (100 max, comma separated, no spaces after commas)**

```
family,organiser,organizer,calendar,shared,tasks,shopping list,photo book,journal,household,planner
```

**Description**

```
Oursome is a warm home for your family's plans and memories.

PLAN TOGETHER
• A calendar for everyone, with colours for each person
• Tasks and reminders that repeat when you need them to
• Shopping lists that group themselves by aisle
• Type in everyday words, like "Dentist on Tuesday at 3pm", and Oursome sets it up

KEEP THE MEMORIES
• Photo albums designed like printed photo books: choose your photos, name the album and tap Create
• Grids, magazine pages, polaroids, scrapbook pages and timelines, laid out for you by date
• Edit anything: layouts, captions, cover, page order
• A Growing Up album and a family journal for the moments that matter

PRIVATE BY DESIGN
• Everything stays on your phone
• No ads, no tracking, no selling your data
• Your photos are never used to train AI
• Delete your account and everything with it at any time

Oursome is free.
```

**What's New (version 1.0.0)**

> The first version of Oursome.

## App Privacy ("nutrition label")

Answer **"No, we do not collect data from this app."** That's accurate for this build: everything is stored on the device, there's no analytics or ads, and the organiser runs on the device. The privacy manifest in `app.json` declares no tracking and no collected data.

> Change this before switching on cloud sharing (Firebase) or the Smart organiser (AI service). Both send data off the device, so the label, the privacy policy and the manifest must be updated first.

## Age rating

Answer **None** to every content question (violence, profanity, gambling and so on), and **No** to unrestricted web access, user-generated content shared with others, and messaging. The result is **4+**.

## Export compliance

`ITSAppUsesNonExemptEncryption` is already `false` in `app.json`, so App Store Connect won't ask.

## Notes for App Review

```
Oursome stores everything on the device; there is no server account. To review, tap "Get started", then create an account with any name, email and an 8+ character password. It is saved on the device only.

To see the main features: add a task or event from Home, add a shopping item, then tap "Album" on Home, choose a few photos, name the album and tap "Create album". Settings → Account → "Delete account and data" erases everything, photos included.

The photo library permission is used only for photos the user chooses for albums, the journal or the household cover.
```

Leave "Sign-in required" unticked, since there is no demo account to give.

## Screenshots

Upload the PNGs in [`screenshots-6.3in/`](screenshots-6.3in) (1206 × 2622) to the **iPhone** slot. App Store Connect's iPhone slot now accepts only 1206 × 2622 or 1179 × 2556, as the Research Tracker found. [`screenshots/`](screenshots) holds the same set at 1320 × 2868 in case the 6.9-inch slot is offered. All are RGB PNGs without transparency, as Apple requires.

They were taken from the app at iPhone sizes with the notch and home-bar areas emulated (top 62 pt, bottom 34 pt), using made-up sample content and illustrated photos, with a 9:41 status bar drawn in. Order: Home, album reader, calendar, tasks, shopping list, Our Space, album editor. iPad isn't needed because `supportsTablet` is `false`.

To regenerate them after design changes, ask Claude: the scripts drive the built website in Chromium at those sizes.

## Review video

[`review-walkthrough.mp4`](review-walkthrough.mp4) (1 min 42 s, 804 × 1748, H.264) walks through the whole app: welcome screens, **sign up**, adding a task, an event and a shopping list, **creating a photo album**, turning its pages and opening the editor, **signing out and back in**, and **Delete account and data**, which returns to the welcome screen. Attach it under **App Review Information → Attachment**, or upload it if Apple asks for a demo video.

It was recorded from the same app code running at iPhone size with the notch and home-bar insets, with made-up content. If Apple asks for a recording from a device, record the TestFlight build on your iPhone instead: Control Centre → Screen Recording, then follow the same steps.

## Before you submit (checklist)

- [ ] "Oursome" name checked for trademarks (the name is still provisional; see `src/config/brand.ts`)
- [ ] App name available in App Store Connect. If it's taken, try "Oursome: Family Organiser".
- [ ] Every screen tested in TestFlight on a real iPhone (this hasn't been done yet)
- [ ] Album creation, album deletion and account deletion tested on the phone
- [ ] Privacy and support pages open from Settings → Help
- [ ] Screenshots uploaded (`screenshots-6.3in/`)
