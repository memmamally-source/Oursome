# App Store pack

Everything App Store Connect asks for, ready to paste. The app's code side is done: the bundle ID, privacy manifest, photo permission text, in-app privacy policy and support links, and full account deletion. What's left needs the owner's Apple account and money, so nothing here has been submitted.

## What it costs

- **Apple Developer Program:** US$99 a year (about £79). It's required to publish on the App Store.
- **Expo EAS builds:** the free plan includes a monthly allowance of cloud builds, which is plenty for this.
- Nothing else. The website, privacy and support pages stay on free GitHub Pages.

## Steps (owner)

1. **Join the Apple Developer Program** at <https://developer.apple.com/programs/enroll/> as an individual, using the Apple ID you want to own the app. Approval takes from a day to a couple of days.
2. **Create a free Expo account** at <https://expo.dev/signup>.
3. **Build:** on a computer with Node 20+, in this repo:
   ```bash
   npm install
   npx eas-cli login
   npx eas-cli init            # links the project to your Expo account (adds a projectId to app.json)
   npx eas-cli build --platform ios --profile production
   ```
   EAS asks to sign in to your Apple account and creates the certificates for you; say yes.
4. **Upload:** `npx eas-cli submit --platform ios --latest`. This creates the app in App Store Connect if it doesn't exist yet.
5. **Test on your iPhone with TestFlight** before submitting: install **TestFlight** from the App Store, and the build appears there once processed. Go through every screen, including making an album, deleting an album and deleting your account.
6. **Fill in the listing** in App Store Connect (<https://appstoreconnect.apple.com>) using the text below. Add screenshots, then **Add for Review** → **Submit**.

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

Required: **6.9-inch iPhone**, 1320 × 2868 (portrait), 3 to 10 images. App Store Connect scales them for smaller iPhones. iPad isn't needed because `supportsTablet` is `false`.

Suggested set: Home, an album page, the album reader mid-page-turn, the calendar, a shopping list, and the organiser turning a sentence into an event. Take them on a real iPhone from the TestFlight build (side button + volume up). An iPhone 16/17 Pro Max gives the exact size; screenshots from other recent iPhones are accepted for their own size class.

## Before you submit (checklist)

- [ ] "Oursome" name checked for trademarks (the name is still provisional; see `src/config/brand.ts`)
- [ ] App name available in App Store Connect. If it's taken, try "Oursome: Family Organiser".
- [ ] Every screen tested in TestFlight on a real iPhone (this hasn't been done yet)
- [ ] Album creation, album deletion and account deletion tested on the phone
- [ ] Privacy and support pages open from Settings → Help
- [ ] Screenshots uploaded
