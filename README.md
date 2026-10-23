# oursome.

**Life’s better together.** An AI-powered personal, couples and family organiser: calendars, tasks, reminders, shopping lists and a shared “Our Space”, in one warm, colourful app.

> The name “Oursome” is provisional pending trademark and store clearance. Branding lives in `src/config/brand.ts`.

## The website

Oursome launches as a website first, like Crossword Hub: one codebase that runs in the browser and installs to a phone's home screen. The App Store and Google Play apps come later from the same code.

- `npm run build:web` builds the site into `dist/`: static files with offline support, a web app manifest, and privacy and support pages.
- `.github/workflows/deploy-web.yml` publishes it to GitHub Pages whenever `main` changes. One-time setup: Settings → Pages → Source: **GitHub Actions**.
- To install it on an iPhone, open the site in Safari, tap Share, then **Add to Home Screen**.

## Preview the native app on your iPhone

1. Install **Expo Go** from the App Store.
2. On your computer (Node 20+):
   ```bash
   git clone https://github.com/memmamally-source/Oursome.git
   cd Oursome
   npm install
   npm start
   ```
3. Scan the QR code with the iPhone Camera app. It opens in Expo Go.
   - Phone and computer on different networks? Use `npx expo start --tunnel`.
4. Tap **Get started**, create an account (stored on the phone only in this preview) and keep **Explore with sample content** on.

You can also run `npm run web` for a quick look in the browser.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run web` | Run the website locally |
| `npm run build:web` | Build the website into `dist/` |
| `npm run check` | TypeScript, ESLint and unit tests |
| `npm test` | Unit tests only |

## Project structure

```
src/
  app/            Expo Router screens (tabs, modals, auth)
  components/     UI kit, brand, illustrations, feature components
  config/         Brand and plan configuration
  features/       Domain logic and stores (tasks, calendar, shopping, space, assistant…)
  lib/            Dates, ids, storage, haptics
  theme/          Design tokens and theme provider
docs/             Brand concepts, legal drafts
```

See [`PROGRESS.md`](PROGRESS.md) for status, decisions and next steps.
