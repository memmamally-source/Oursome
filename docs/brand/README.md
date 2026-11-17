# Oursome brand (November 2026)

Calm blue and turquoise on cool white, with deep navy text. Replaces the warm linen, terracotta, mustard and purple look.

## Logo

A circular "O" with a simple home in its lower half: the ring stops just short of the roof, and the house has a four-pane window. It's flat with a very light gradient, and it reads at 16 px. The wordmark is **oursome** in Nunito Sans ExtraBold (SIL Open Font Licence), outlined to a path so it looks the same everywhere.

| File | Use |
| --- | --- |
| `assets/brand/oursome-logo.svg` / `-1600.png` | Horizontal logo, light backgrounds |
| `assets/brand/oursome-logo-on-dark.svg` / `-1600.png` | Horizontal logo, dark backgrounds |
| `assets/brand/oursome-mark.svg` / `-1024.png` / `-256.png` | Icon only, light backgrounds |
| `assets/brand/oursome-mark-on-dark.svg` / `-1024.png` | Icon only, dark backgrounds |
| `assets/brand/oursome-mark-mono.svg` | One colour (navy) |
| `assets/images/icon.png` | iOS app icon (1024, opaque) |
| `assets/images/android-icon-*.png` | Android adaptive icon (foreground, background, monochrome) |
| `assets/images/splash-icon.png`, `favicon.png` | Splash screen, favicon |
| `public/icons/*` | PWA icons (192, 512, maskable), Apple touch icon, SVG favicon |
| `public/og-image.png` | Link preview |
| `docs/brand/logo-sheet.png` | Review sheet: light, dark, app icon, one colour, small sizes |

Everything is drawn from one piece of geometry: `scripts/generate-brand-assets.js` (exports) and `src/components/brand/Logo.tsx` (in the app). To regenerate: `CHROMIUM_PATH=… NODE_PATH=… node scripts/generate-brand-assets.js`.

## Colours

Defined once in `src/config/brand.ts` and `src/theme/tokens.ts`; screens use tokens, not hex codes.

| Role | Light | Dark |
| --- | --- | --- |
| Background | `#F7FBFE` | `#0B1A2B` |
| Surface (cards) | `#FFFFFF` | `#12253A` |
| Border | `#DFEAF1` | `#22384F` |
| Text | `#142B45` | `#EAF3FA` |
| Secondary text | `#5B6B80` | `#A9BACB` |
| Primary (ocean blue) | `#1769AA` | `#4DA3E8` |
| Turquoise | `#12B8B0` | `#2CCFC6` |
| Sky blue (calendar) | `#3FA2E4` | `#6BB8EE` |
| Indigo (organiser, Our Space) | `#5856D6` | `#8E8CF2` |
| Amber (highlights only) | `#F2B33D` | `#F5C060` |

The accent *keys* in code (`coral`, `mint`, `sky`, `lavender`, `sunshine`) are unchanged, so saved list and person colours keep working; only the colours behind them changed. Every text/background pair meets WCAG AA, checked by `src/theme/__tests__/contrast.test.ts`.

## Type

Nunito Sans throughout: ExtraBold for big titles, Bold for headings, Regular/SemiBold for text. The serif (Fraunces) is retired.
