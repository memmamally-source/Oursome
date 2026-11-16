# Vector (SVG) candidate — awaiting owner approval

**Status: NOT approved and NOT used on the website.** The website uses only the approved PNG artwork in `brand/source/`. This folder is a separate deliverable for review, as the master prompt requires.

## What it is

- **`karoo-fox-logo-candidate.svg`**: the full logo (fox and wordmark) on the original 1536×1024 canvas.
- **`fox-mark.svg`**: the fox only.

Both were traced from `brand/source/Karoo_Fox_Logo_Original_Lossless.png`, one colour layer at a time:
- the orange body and three darker orange shades;
- cream, and the grey chin shadow;
- the navy features: the ears, both eyes, the nose and the chest.

"Karoo" and "Fox" are traced separately, and their colours were sampled from the original. Nothing was redesigned, and it is a genuine vector, not a PNG embedded in an SVG.

## How it compares

`comparison.png` shows three panels:
- the original;
- the candidate rendered at the same size;
- a difference map, where red marks pixels that differ.

`comparison.json` scores the match:

| Measure | Result |
| --- | --- |
| Mean difference per colour channel (0–255) | 2.55 |
| Pixels differing by more than 48 levels | 0.61% |

Nearly all of the remaining difference falls in two places:
- **Edges:** a one-pixel anti-aliasing difference along the outlines.
- **Soft shading:** the original's smooth orange gradients on the body and tail are reproduced as three flat steps. Up close they look slightly banded.

The shapes match the original: the tail, the eyes, the expression, the ears and the lettering.

## To approve or reject

- **Approve:** say so. The SVG can then be used for print, signage and anywhere else that needs a scalable logo. The website could also switch to it, which would make the logo sharper at very large sizes, but that isn't needed today.
- **Reject or refine:** the PNGs stay as the only approved artwork. A designer can produce a hand-built vector with true gradients, using this trace as a guide.

## Re-running

You need Python 3 with numpy, scipy and Pillow, plus `npm install`.

```bash
SRC=brand/source/Karoo_Fox_Logo_Original_Lossless.png
python3 brand/vector-candidate/tools/masks.py $SRC /tmp/kf
node brand/vector-candidate/tools/trace.cjs /tmp/kf brand/vector-candidate/fox-mark.svg
python3 brand/vector-candidate/tools/wordmark.py $SRC /tmp/kf
node brand/vector-candidate/tools/trace-wordmark.cjs /tmp/kf brand/vector-candidate/wordmark.json
node brand/vector-candidate/tools/compose.mjs
```
