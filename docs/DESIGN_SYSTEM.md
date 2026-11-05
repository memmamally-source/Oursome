# Design system

Tokens are CSS custom properties in `src/theme/global.css`. Light is the default; dark applies with `prefers-color-scheme: dark` unless overridden in Profile (`data-theme` on `<html>`).

## Colour
| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--red` | #D71920 | #D71920 | Primary buttons, active nav, progress, brand, highlights (white text on it is 5.2:1) |
| `--red-deep` | #A91018 | — | Hover/pressed |
| `--red-ink` | #C4161D | #FF4D52 | Red text (AA on each surface) |
| `--bg` / `--surface` | #F7F7F7 / #FFFFFF | #0B0B0B / #161616 | Page / cards |
| `--text` / `--muted` | #111111 / #737373 | #FFFFFF / #A3A3A3 | Text |
| `--border` | #E8E8E8 | #2A2A2A | Hairlines |
| `--ok` | #1A7F37 | #3FB950 | Correct (always with ✓ and the word "Correct") |
| `--bad` | #A91018 | #FF6B6F | Incorrect (always with ✗ and "Not quite"/"Incorrect"), on a tinted background |
| `--select-bg` | #111111 | #FFFFFF | Selected chips, tiles and options: **selection is black/white, never red**, so red never means "wrong" |

## Type
Inter Variable (OFL, self-hosted). Headings 800 weight with tight tracking; body 16 px, line height 1.5; tabular numbers for stats; uppercase eyebrows at 0.72 rem with wide tracking.

## Shape and spacing
Radii 4 / 8 / 12 px (no pill cards; pills only for chips and badges). Spacing on a 4 px grid (8, 12, 16, 20, 28). Hairline borders instead of heavy shadows.

## Layout
Mobile first: top brand bar plus a five-tab bottom bar (Home, Arcade, Subjects, Review, Profile) with safe-area padding. At ≥960 px, a 240 px sidebar replaces the tabs and adds Dashboard and Content & sources. Content max width 1080 px.

## Components
Buttons (primary red, dark, ghost, text), chips (radio/toggle), badges (status), cards (accent, dark), stat tiles, progress bars, bottom sheet / modal dialog (focus moves in, Escape closes, focus returns), answer options with A–E keys, feedback panel, crossword grid, Connections tiles (tiers: black, red, grey, outlined), activity heatmap (red sequential ramp).

## Motion and accessibility
Short rise/fade transitions only. Everything respects `prefers-reduced-motion` and Profile → Reduce motion. Visible red focus ring; skip link; ARIA roles on tabs, radios, dialogs and progress bars; keyboard play in every game (A–E/1–5, T/F, crossword arrows/Tab/Space). Charts have text equivalents (hidden table, aria labels).
