# Albums — memory planner & automatic scrapbook maker

*Plan the memories. Capture the moments. Let Albums tell the story.*

“Albums” is a working title (change it in `src/config/brand.ts`, `index.html` and `public/manifest.webmanifest`).

A mobile-first web app (React 19, TypeScript, Vite, Tailwind CSS 4) that:

1. offers **20 occasions** (travel, honeymoon, birthday, graduation, baby’s first year, pets, …), each with its own photo ideas, story chapters and suggested styles;
2. asks a few **questions that adapt to the occasion** (a graduation asks who is graduating, not where you’re flying);
3. builds a **personalised photo checklist** grouped into Destinations & places, People, Food & drink, Details and Memories, with recommended counts, attach-a-photo, skip, edit and custom prompts;
4. takes **photo uploads** (multi-select, camera, drag-and-drop) with thumbnails, captions, favourites, chapters and reordering;
5. offers **six album styles** previewed with your own photos;
6. **lays the album out automatically** with a deterministic layout engine (51 page layouts);
7. lets you **edit** it in a page-turning book view (layouts, swap/replace photos, crop/zoom, text, add/remove/reorder pages, restyle, redesign);
8. **saves everything locally** (IndexedDB) with autosave and a visible save status;
9. **exports a PDF** at 150 dpi (standard) or 300 dpi (high quality), with resolution warnings.

The app is local-first: photos never leave the device, there are no accounts, no payments and no paid APIs.

This folder is a standalone app inside the Oursome repository. It doesn’t share build tooling with the Expo app at the repo root.

## Run it

Requires Node 20+ (CI uses 22).

```bash
cd albums
npm install
npm run dev        # http://localhost:5173
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run check` | Type check + lint (incl. React Compiler rules) + unit tests |
| `npm test` | Unit tests only (Vitest) |
| `npm run build` | Type check, then production build into `dist/` |
| `npm run preview` | Serve the production build locally |

## Try it (example workflows)

**Plan ahead — honeymoon**

1. Home → **Create an Album** → search “honey” → *Honeymoon*.
2. Where: “Santorini, Greece”, dates 1–8 June, names “Anna, Ben”. The suggested title becomes “Honeymoon in Santorini, Greece”.
3. **Create my photo plan.** You get couple-specific ideas (“First view of Santorini, Greece”, “A romantic dinner”, “A candid photograph of you both laughing”, a highlight per day…). No group or children prompts appear.
4. Attach a photo to an idea with **+ Photo**, tick ideas off by hand, skip one, add “The hotel cat” as your own.
5. **Organise photos** → add more → **Choose a style** → *Romantic* → **Make my album**.

**Already have photos — birthday**

1. Home → **I already have photos** → *Birthdays* → “Maya”.
2. **Continue to photos**, add 10–40 photos, mark a couple as favourites and caption one.
3. **Choose a style** → *Playful Polaroid* → **Make my album**. Favourites get large frames; the captioned photo lands in a layout that shows its caption; photos are split into days if they carry capture dates.

**Edit and export**

- Tap a page, then a photo on it: **Replace**, **Adjust** (drag/zoom), **Swap** (then tap another photo), **Remove**.
- **Layout** shows every design for the style, previewed with the page’s photos; **Try another** picks the next-best design.
- **Album style** switches theme without losing photos or text. **Redesign album** re-runs the layout with a new arrangement.
- **Export PDF** → Standard or High quality. Low-resolution photos and empty frames are listed with links to their pages.

Test photos: any JPG/PNG/WebP works. To check EXIF dates and orientation, use phone photos.

## Deploy to GitHub Pages

The build is fully static and path-independent:

- `vite.config.ts` sets `base: './'`, so every asset URL is relative;
- routes use `HashRouter` (`…/#/album/123`), so no server rewrites or 404 tricks are needed;
- the service worker and manifest use relative scopes (`./`).

So `dist/` works at a domain root or any sub-path (`/Oursome/albums/`) unchanged.

This repository’s GitHub Pages site already serves the Oursome app (oursome.org), and a repo has one Pages site. Two options:

**A. Serve it under the existing site** (e.g. `https://oursome.org/albums/`). In `.github/workflows/deploy-web.yml`, after “Build the website”, add:

```yaml
      - name: Build Albums into /albums
        run: |
          npm ci --prefix albums
          npm run build --prefix albums
          cp -r albums/dist dist/albums
```

**B. Its own site.** Copy `albums/` into a new repository, then add `.github/workflows/pages.yml`:

```yaml
name: Deploy
on: { push: { branches: [main] }, workflow_dispatch: {} }
permissions: { contents: read, pages: write, id-token: write }
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci && npm run check && npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment: { name: github-pages, url: '${{ steps.d.outputs.page_url }}' }
    steps:
      - id: d
        uses: actions/deploy-pages@v4
```

and set **Settings → Pages → Source: GitHub Actions**.

Neither is wired up yet: deploying is the owner’s call. `ci.yml` already runs `check` and `build` for `albums/` on every pull request.

## Project structure

```
albums/
  src/
    config/brand.ts          product name and tagline
    domain/types.ts          the JSON data model (Project, Photo, Album, PlanItem…)
    templates/               occasion catalogue, shot library, planner (pure + tests)
    layouts/                 page-layout schema, 51 layouts, 6 themes
    engine/                  album generator and editing operations (pure + tests)
    render/                  scene builder → SVG page view (screen) and canvas (PDF)
    export/                  PDF export and resolution checks
    storage/                 IndexedDB, image processing, EXIF, quota, object URLs
    services/repository.ts   storage interface (future cloud implementation goes here)
    state/                   Zustand stores: open project (autosave), library
    components/, screens/    UI
  public/                    manifest, icons, service worker
  docs/ARCHITECTURE.md       how the engines work, extension points, limitations
```

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the template engine, layout engine, adding occasions/layouts/themes, the Firebase integration points and known limitations.

## Browser support

Built for current iPhone Safari, Android Chrome and desktop Chrome, Edge, Firefox and Safari. Tested in this repo’s CI-like environment with headless Chromium only (desktop 1280 × 900 and an emulated iPhone 13 viewport); **not yet tested on a physical iPhone or Android device.**

- HEIC photos open only where the browser can decode them (Safari). Elsewhere you get a clear message; iPhone users can choose “Most Compatible” camera format or share as JPEG.
- iPhone Safari may delete site data for sites not opened for 7 days unless the app is added to the Home Screen. The app asks for persistent storage and says this plainly.
