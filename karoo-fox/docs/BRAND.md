# Karoo Fox brand guide

## Logo

The logo is the curled, smiling fox with the wordmark **Karoo** in navy and **Fox** in burnt orange. The vector files here were redrawn from the logo artwork the owner supplied in chat on 16 Nov 2026. They are close to it, but they are a redraw, not the original file.

**Please add the original high-resolution file** at `src/brand/original/`, and the designer's vector file if you have one. If the original vector exists, replace `src/brand/fox-mark.svg` with it, keep the layer ids below, and run `npm run brand`.

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

Run `npm run brand` to regenerate them all from `src/brand/fox-mark.svg` and `src/brand/wordmark.json`. To regenerate the wordmark itself, run `node scripts/make-wordmark.mjs`; it uses Poppins SemiBold, which is under the SIL Open Font License.

## Colours

| Token | Hex | Use |
| --- | --- | --- |
| Fox orange | `#F95A10` | The fox; brand graphics only, not for text |
| Wordmark orange | `#D9410C` | "Fox" in the wordmark |
| Burnt orange (text) | `#B5370A` | Links and accents on cream (AA contrast) |
| Button orange | `#C2410C` | Filled buttons with white text (AA contrast) |
| Navy | `#0B1F3F` | Wordmark "Karoo", headings, footer |
| Cream | `#FDF3EA` / `#FBF6EE` | Fox markings / page background |

## Type

- **Poppins** (600/700) for headings, matching the geometric wordmark.
- **Inter** for body text.
- Both are self-hosted, so no requests go to Google Fonts.

## Animating the fox (app start-up screens)

`fox-mark.svg` is drawn in layers that can be animated separately:

| Element id | Part |
| --- | --- |
| `tail-body` | The curled body and tail (contains `tail-tip`) |
| `chest` | Cream and navy chest |
| `ears` | Both ears |
| `head` | Head, cheeks and nose (contains `eye`) |

The website already uses a gentle version: the fox pops in, its ears twitch and it blinks occasionally (`.fox-animated` in `src/styles/global.css`). The animation is switched off for people who choose reduced motion.

Suggested splash sequence for the apps (about 1.2 s, then fade to the app):

1. The body and tail scale up from 0.85 with a soft overshoot (0–450 ms).
2. The head rises 12 px into place (200–600 ms).
3. The ears flick (600–900 ms).
4. One blink (900–1100 ms).
5. The wordmark fades in below (700–1200 ms).

For React Native or Expo apps this can be built with `react-native-svg` and Reanimated using the same layer ids, or exported to Lottie from a design tool. Keep the static logo as the native splash image, so there is no blank frame before the animation starts.
