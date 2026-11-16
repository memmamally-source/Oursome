"""Masks for the "Karoo Fox" wordmark in the original artwork (navy "Karoo", orange "Fox").

Usage: python3 brand/vector-candidate/tools/wordmark.py brand/source/Karoo_Fox_Logo_Original_Lossless.png <work-dir>
Then:  node brand/vector-candidate/tools/trace-wordmark.cjs <work-dir> brand/vector-candidate/wordmark.json
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

src, out = os.path.abspath(sys.argv[1]), sys.argv[2]
os.makedirs(out, exist_ok=True)
S = 4
box = (240, 715, 1310, 910)
im = Image.open(src).convert('RGB').crop(box)
a = np.asarray(im.resize((im.width * S, im.height * S), Image.LANCZOS), dtype=np.float32)
ink = nd.gaussian_filter(255 - a.min(axis=2), 1.0) > 127
# The bottom of the fox's tail dips into the crop above 'aroo'; ignore it.
ink[: 40 * S, 160 * S : 670 * S] = False
r, g, b = a[..., 0], a[..., 1], a[..., 2]
orange = ink & (nd.gaussian_filter(r - b, 2) > 80)
navy = ink & ~orange
for name, m in (('karoo', navy), ('fox', orange)):
    m = nd.gaussian_filter(m.astype(np.float32), 2) > 0.5
    Image.fromarray(np.where(m, 0, 255).astype(np.uint8)).save(os.path.join(out, f'wm_{name}.png'))
print(im.size)
