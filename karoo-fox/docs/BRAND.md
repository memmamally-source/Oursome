# Karoo Fox brand guide

## Approved artwork

The approved logo is the owner's supplied artwork in `brand/source/`, kept with its original filenames:

| File | What it is |
| --- | --- |
| `Karoo_Fox_Logo_Original_Lossless.png` | The original 1536×1024 artwork. This is the master. |
| `Karoo_Fox_Logo_High_Resolution_6144x4096.png` | A 4× Lanczos enlargement of the same artwork. It adds no new detail. |
| `Karoo_Fox_Logo_Website_Tight_4460x3216.png` | The same artwork, cropped for web layouts |
| `Karoo_Fox_Fox_Icon_2048x2048.png` | The fox alone, centred on white |

Do not redesign the fox, change its expression or colours, or substitute another logo. All of these files are rasters with a white canvas.

## Website and social files (generated)

Running `npm run brand` regenerates these from the approved PNGs. It only removes blank canvas and resizes the images; it never redraws them. It also snaps the canvas's near-white pixels (values 252–254) to pure white, so the logo sits seamlessly on the white page. No artwork colour is anywhere near that range; the cream is #FFF6E9.

| Output | Use |
| --- | --- |
| `public/brand/karoo-fox-logo-{160…1280}.webp`, `karoo-fox-logo-1280.png` | Full logo for the header, footer and documents |
| `public/brand/karoo-fox-icon-{128,256,512}.webp`, `karoo-fox-icon-1024.png` | The fox alone, for the hero and avatars |
| `public/brand/karoo-fox-profile-{400,800,1080}.png` | Social media profile pictures. The fox stays inside a circular crop; use 400 for X and LinkedIn, 800 for YouTube and Facebook, 1080 for Instagram. |
| `public/og-image.png` | The 1200×630 image shown in link previews |
| `public/apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | Home-screen and PWA icons on white |
| `public/favicon.ico`, `favicon-32.png`, `favicon-48.png` | Browser-tab icons |

**Transparency.** The favicons are the only images with a transparent background, because browser tabs can be dark. The background was removed by flood fill from the image edges, so the fox's cream areas stay solid; only the outer edge pixels are blended. Check `brand/review/favicon-check.png` after regenerating.

**Usage rule.** Every other image keeps its white canvas, so place it only on white. The website is light-only for this reason. Its browser tests fail if a logo image ever sits on a background that isn't pure white.

## Vector (SVG)

An SVG reproduction traced from the original is in `brand/vector-candidate/`. It comes with a side-by-side comparison and a difference score. **It has not been approved and is not used on the website.** See `brand/vector-candidate/REVIEW.md`.

## Colours

| Token | Hex | Use |
| --- | --- | --- |
| Navy | `#061F3E` | Headings, text, the navy call-to-action band |
| Burnt orange | `#F15A0A` | Brand graphics only, never body text |
| Burnt orange (text) | `#B5370A` | Links and accents (meets AA contrast on white and cream) |
| Button orange | `#C2410C` | Filled buttons with white text (meets AA contrast) |
| Warm cream | `#FFF6E9` | Alternate section backgrounds (no logos on cream) |
| White | `#FFFFFF` | The page background, and behind every logo |

These follow the palette suggested in the master prompt.

## Type

- **Poppins** (600/700) for headings, matching the geometric wordmark.
- **Inter** for body text.
- Both are self-hosted, so the site makes no requests to Google Fonts.

## Motion and the future app splash

On the website the fox fades and rises in once on the home page. This is switched off for people who choose reduced motion.

For the planned animated start-up screen in the apps:
- **Simple motion works on the approved PNG fox:** scale-in, fade or a gentle bounce.
- **Moving individual parts** (blinking eyes, ear flicks, a tail swish) needs a vector with separate parts. The candidate SVG already has named eyes, nose, ears and chest. Once you approve it, those parts can be animated with `react-native-svg` and Reanimated, or exported to Lottie.
- **Native splash image:** keep the static PNG fox as each app's native splash image, so there is no blank frame before the animation starts.
