# Karoo Fox brand guide

## Logo

The logo is the curled, smiling fox with the wordmark **Karoo** in navy and **Fox** in burnt orange. The original artwork the owner supplied (16 Nov 2026) is kept at `src/brand/original/karoo-fox-logo-original.jpg`, and it is the master reference.

The vector files are traced directly from that original, colour layer by colour layer, with the tools in `scripts/trace-logo/`. They match its shapes, including the tail, the eye and the wordmark, so they can be used at any size. If a designer later supplies the source vector file, replace `src/brand/fox-mark.svg` and `src/brand/wordmark.json` with it and run `npm run brand`.

To re-trace (needs Python 3 with numpy, scipy and Pillow):
```bash
python3 scripts/trace-logo/masks.py src/brand/original/karoo-fox-logo-original.jpg /tmp/fox
node scripts/trace-logo/trace.cjs /tmp/fox src/brand/fox-mark.svg
python3 scripts/trace-logo/wordmark.py src/brand/original/karoo-fox-logo-original.jpg /tmp/fox
node scripts/trace-logo/trace-wordmark.cjs /tmp/fox src/brand/wordmark.json
npm run brand
```

| File | Use |
| --- | --- |
| `public/brand/logo-horizontal.svg` | Website header, documents, email signatures (light backgrounds) |
| `public/brand/logo-horizontal-light.svg` | Same, on navy or dark backgrounds |
| `public/brand/logo-stacked.svg` / `-light.svg` | The full lockup as in the original artwork |
| `public/brand/logo-stacked-2000.png` | Raster version for profiles and documents |
| `public/brand/fox-mark.svg` | The fox alone: favicons, avatars, app splash screens |
| `public/brand/wordmark.svg` | The words only |
| `public/icon-512.png`, `apple-touch-icon.png`, `icon-maskable-512.png` | Square icons on cream |
| `public/og-image.png` | 1200×630 social-sharing image |

Run `npm run brand` to regenerate them all from `src/brand/fox-mark.svg` and `src/brand/wordmark.json`.

## Colours

| Token | Hex | Use |
| --- | --- | --- |
| Fox orange | `#F85A0C` | The fox; brand graphics only, not for text |
| Wordmark orange | `#D83E02` | "Fox" in the wordmark |
| Burnt orange (text) | `#B5370A` | Links and accents on cream (AA contrast) |
| Button orange | `#C2410C` | Filled buttons with white text (AA contrast) |
| Navy | `#031E3C` (logo) / `#0B1F3F` (site) | Wordmark "Karoo" / headings and footer |
| Cream | `#FDF3EA` / `#FBF6EE` | Fox markings / page background |

## Type

- **Poppins** (600/700) for headings, matching the geometric wordmark.
- **Inter** for body text.
- Both are self-hosted, so no requests go to Google Fonts.

## Animating the fox (app start-up screens)

`fox-mark.svg` has these named parts:

| Element id | Part |
| --- | --- |
| `fox-body` | The whole orange and cream body: silhouette, shading layers, cream markings and the chin shadow |
| `eye`, `eye-far` | The closed, smiling eyes |
| `nose` | Nose |
| `ear-left-edge`, `ear-right-inner` | The navy parts of the ears |
| `chest-navy` | The navy chest |

The website already uses a gentle version: the fox pops in and blinks now and then (`.fox-animated` in `src/styles/global.css`). The animation is switched off for people who choose reduced motion.

Suggested splash sequence for the apps (about 1.2 s, then fade to the app):

1. The whole fox scales up from 0.85 with a soft overshoot (0–500 ms).
2. One blink (`eye`, `eye-far`: scaleY to 0.4 and back, 700–900 ms).
3. The wordmark fades in below (600–1100 ms).

Because the fox is traced by colour rather than drawn as separate body parts, the ears, head and tail can't yet be moved independently. For movements like an ear flick or tail swish, ask a designer to supply the source file with those parts separated, or have the fox redrawn in parts from this trace.

For React Native or Expo apps this can be built with `react-native-svg` and Reanimated using the ids above, or exported to Lottie from a design tool. Keep the static logo as the native splash image, so there is no blank frame before the animation starts.
