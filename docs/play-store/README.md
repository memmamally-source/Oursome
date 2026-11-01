# Google Play pack

Everything Play Console asks for, ready to paste. The code side is done:
- package `org.oursome.app`
- unneeded permissions removed (camera, microphone, storage, overlay)
- a "Reminders" notification channel
- version codes that rise with every build
- a GitHub workflow that builds the signed app bundle

## What it costs

- **Google Play developer account:** a **one-time US$25** fee. Unlike Apple, there's no yearly charge.
- **Builds:** free. They run on GitHub's computers because the repository is public.

## Google's testing rule for new accounts

New *personal* developer accounts must run a **closed test with at least 12 testers who stay opted in for 14 days in a row** before Google lets the app go public. Testers just need a Google account and an Android phone; friends and family are fine. Organisation accounts (which need a D-U-N-S number) don't have this rule. Check Play Console for the current wording, because Google changes it from time to time.

## Step by step

### 1. Create the developer account (once)

1. Go to https://play.google.com/console/signup and sign in with the Google account that should own the app.
2. Choose **Yourself** (personal), fill in your details, use `oursomeapp@outlook.com` as the contact email, and pay the US$25.
3. Complete Google's identity verification. This needs ID and can take a day or two. You also have to verify an Android phone through the Play Console app.

### 2. Add the upload key to GitHub (once)

Claude made an upload key and sent it as a private file (`Oursome-Android-upload-key-SECRETS.txt`). At https://github.com/memmamally-source/Oursome/settings/secrets/actions, add the three secrets it lists:
- `ANDROID_UPLOAD_KEYSTORE`
- `ANDROID_UPLOAD_KEYSTORE_PASSWORD`
- `ANDROID_UPLOAD_KEY_PASSWORD`

Then keep the file somewhere safe, such as a password manager.

### 3. Build the app bundle

1. Go to https://github.com/memmamally-source/Oursome/actions/workflows/android.yml and click **Run workflow → Run workflow**. It takes about 15–25 minutes.
2. Open the finished run. Under **Artifacts**, download **Oursome-android-N**, unzip it, and you'll have `Oursome-N.aab`.

### 4. Create the app in Play Console (once)

1. In Play Console, click **Create app**:
   - **App name:** Oursome
   - **Default language:** English (United Kingdom)
   - **App or game:** App
   - **Free or paid:** Free
2. Tick the declarations and click **Create app**.
3. Work through **Dashboard → Set up your app** using the answers below.

### 5. Closed test (required before going public)

1. Go to **Test and release → Testing → Closed testing → Create track**, or use the default **Alpha** track.
2. Click **Create new release** and upload `Oursome-N.aab`. Accept **Play App Signing** when asked: Google keeps the final signing key, and your upload key just proves uploads are yours.
3. For **Release notes**, enter: `First test version of Oursome.`
4. Under **Testers**, create an email list with at least 12 Google accounts, then **Save → Review release → Start rollout**.
5. Send testers the **opt-in link** shown on the Testers tab. They open it, tap **Become a tester**, then install Oursome from Google Play.
6. Leave it running for 14 days with testers still opted in, and fix anything they report.

### 6. Go public

When Play Console shows **Apply for production** (after the 14 days), answer its short questions about the test, then create a **Production** release with the latest `.aab` and submit it for review. Google usually takes from a few hours to a few days.

## Store listing

| Field | Value |
| --- | --- |
| App name (30 max) | Oursome: Family Organiser |
| Short description (80 max) | Family calendar, tasks, shopping lists and photo albums, all in one warm place. |
| App icon | `icon-512.png` (512 × 512) |
| Feature graphic | `feature-graphic-1024x500.png` |
| Phone screenshots | `screenshots/android-1-home.png` … `android-7-album-edit.png` (1080 × 1920) |
| Category | Lifestyle |
| Contact email | oursomeapp@outlook.com |
| Website | https://oursome.org |
| Privacy policy | https://oursome.org/privacy/ |

**Full description**

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

## App content answers (Policy → App content)

| Section | Answer |
| --- | --- |
| Privacy policy | https://oursome.org/privacy/ |
| Sign in details (App access) | **Yes**, then **Add details**: username `oursomeapp@outlook.com`, password `Sunshine123`. Note: "Accounts are stored only on the device. Tap 'I already have an account' and sign in with these details; on a device with no account yet, this sets it up. Account deletion: Settings → Account → Delete account and data." Reviewers can't create accounts, so signing in on a fresh device sets the account up. |
| Ads | **No**, the app doesn't contain ads |
| Content rating | Category **Utility, Productivity, Communication or Other**. Answer **No** to everything (violence, sexuality, language, controlled substances, gambling, user interaction/sharing, location sharing, digital purchases). |
| Target audience | **18 and over** (it's for adults running a household; this keeps it out of the Families programme) |
| News app | No |
| Government app | No |
| Financial features | None |
| Health | None |
| Data safety | **No data collected** and **no data shared**. Everything is stored on the device; nothing is sent to us or anyone else. Data is not encrypted in transit because none is transmitted. Users can delete their data in the app (Settings → Account → Delete account and data). |

> Update the Data safety form, the privacy policy and the iOS privacy answers before switching on cloud sharing (Firebase) or the AI assistant, because both send data off the phone.

## Updating the app later

1. Raise `version` in `app.json` (1.0.0 → 1.1.0).
2. Run the Android workflow.
3. Upload the new `.aab` as a new release on the same track. The version code goes up by itself.
