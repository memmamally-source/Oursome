# oursome.

**Life’s better together.** A warm home for a family’s plans and memories: calendars, tasks, reminders, shopping lists, a journal, photo albums designed like printed photo books, and a shared “Our Space”.

> The name “Oursome” is provisional pending trademark and store clearance. Branding lives in `src/config/brand.ts`.

## The website

Oursome launches as a website first, like Crossword Hub: one codebase that runs in the browser and installs to a phone's home screen. The App Store and Google Play apps come later from the same code.

- `npm run build:web` builds the site into `dist/`: static files with offline support, a web app manifest, and privacy and support pages.
- `.github/workflows/deploy-web.yml` publishes it to GitHub Pages whenever `main` changes. One-time setup: Settings → Pages → Source: **GitHub Actions**.
- To install it on an iPhone, open the site in Safari, tap Share, then **Add to Home Screen**.

## The organiser (AI)

Type anything in everyday words: "Rufaida needs to take the kids to the park", "Dentist on Tuesday at 3pm", "What's overdue?". The organiser shows a card for each thing it understood, and nothing is saved until you tap Add.

- **Basic mode** (default): runs on the device, and messages aren't sent anywhere.
- **Smart mode:** the AI service in [`server/ai`](server/ai/README.md) (Claude via a Cloudflare Worker). It is built and tested but **not deployed**; switching it on needs the owner's approval, an Anthropic API key and a model choice. Costs and steps are in that README.

## Photo albums

Choose photos, name the album and tap **Create album**: Oursome designs the pages (grids, magazine layouts, polaroids, scrapbook pages, timelines) by date, with a style suggested from the name. Read it by turning pages, edit anything you like, and download a print-ready PDF (8 × 10 in, 300 dpi with bleed). Photos stay on your device.

## Sharing with your family

Accounts and family sharing use Firebase and are off until a Firebase project is configured. See [`docs/CLOUD.md`](docs/CLOUD.md) (free Spark plan). Private things never leave the device.

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
4. Tap **Get started** and create an account (stored on the phone only unless cloud sharing is configured).

You can also run `npm run web` for a quick look in the browser.

## Scripts

| Command | What it does |
| --- | --- |
| `npm start` | Expo dev server |
| `npm run web` | Run the website locally |
| `npm run build:web` | Build the website into `dist/` |
| `npm run check` | TypeScript, ESLint and unit tests |
| `npm test` | Unit tests only |
| `npm run test:cloud` | Firestore security rules and cloud API against the local Firebase emulator (needs Java) |
| `npm run check:server` | AI service typecheck and tests (fake model, no cost) |
| `npm run eval:ai` | Organiser scenarios against a live AI service (`AI_EVAL_ENDPOINT=<url>`; costs a few cents) |
| `npm run icons` | Regenerate the icon subset after using a new icon name |

## Project structure

```
src/
  app/            Expo Router screens (tabs, modals, auth)
  components/     UI kit, brand, illustrations, feature components
  config/         Brand and plan configuration
  features/       Domain logic and stores (tasks, calendar, shopping, space, assistant…)
  lib/            Dates, ids, storage, haptics
  theme/          Design tokens and theme provider
server/ai/        AI service (Cloudflare Worker, not deployed)
firebase/         Firestore rules, emulator config and rules tests
docs/             Cloud setup, previews, brand concepts, legal drafts
```

See [`PROGRESS.md`](PROGRESS.md) for status, decisions and next steps.
