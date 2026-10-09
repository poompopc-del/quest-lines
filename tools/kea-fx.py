"""Cut the red aura FX sheet into fixed-size strips with the white matte removed."""
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as nd
SRC, OUT = sys.argv[1], sys.argv[2]
im = np.array(Image.open(SRC).convert('RGB')).astype(float)
H, W, _ = im.shape
# un-premultiply against white: a = 1 - min/255 (red ink keeps G/B low)
mn = im.min(2)
a = np.clip((255 - mn) / 255.0 * 1.15, 0, 1)
a[a < .06] = 0
rgb = np.where(a[..., None] > 0, (im - (1 - a[..., None]) * 255) / np.maximum(a[..., None], 1e-3), 0).clip(0, 255)
ink = a > .12
from scipy import ndimage as nd2
HOLE = {'aura': .32, 'slash': .92, 'spark': .92, 'fade': .0}
BANDS = {'aura': (20, 225), 'slash': (255, 440), 'spark': (455, 625), 'fade': (650, 850)}
XS = {'aura':160,'slash':160,'spark':200,'fade':196}
res = {}
for name, (y0, y1) in BANDS.items():
    X0 = XS[name]
    if HOLE[name]:
        band = ink[y0:y1]
        holes = nd2.binary_fill_holes(nd2.binary_closing(band, iterations=2)) & ~band
        hy, hx = np.nonzero(holes); hy = hy + y0
        a[hy, hx] = np.maximum(a[hy, hx], HOLE[name]); rgb[hy, hx] = (255, 70, 95) if name=='aura' else (255, 236, 238)
    col = ink[y0:y1, X0:].sum(0)
    # group columns into frames (gaps >= 8 px)
    segs = []; on = False; gap = 0
    for x, v in enumerate(col):
        if v > 0:
            if not on: s = x; on = True
            gap = 0; e = x
        elif on:
            gap += 1
            if gap >= 10: segs.append((s + X0, e + X0 + 1)); on = False
    if on: segs.append((s + X0, e + X0 + 1))
    segs = [g for g in segs if g[1] - g[0] > 6]
    # vertical extent of the band's ink
    rows = ink[y0:y1, X0:].sum(1); ys = np.nonzero(rows)[0]; t, b = y0 + ys.min(), y0 + ys.max() + 1
    cw = max(g[1] - g[0] for g in segs) + 8; ch = b - t + 8
    strip = np.zeros((ch, cw * len(segs), 4), np.uint8)
    for i, (x0, x1) in enumerate(segs):
        ox = i * cw + (cw - (x1 - x0)) // 2
        strip[4:4 + (b - t), ox:ox + (x1 - x0), :3] = rgb[t:b, x0:x1]
        strip[4:4 + (b - t), ox:ox + (x1 - x0), 3] = (a[t:b, x0:x1] * 255)
    Image.fromarray(strip).save(f'{OUT}/fx_{name}.png', optimize=True)
    res[name] = dict(w=int(cw), h=int(ch), n=len(segs))
    print(name, cw, ch, len(segs), segs)
json.dump(res, open(f'{OUT}/fx.json', 'w'))
