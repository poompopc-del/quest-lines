"""Build a real alternating walk cycle from one side-view stride frame.
The sheet's 8 'walk' drawings all hold the same stride (same leg forward, view switches 3/4→side),
so the legs never pass each other. Here: legs below the skirt hem are swung like a pendulum
(x' = hip + s·(x − hip), s = cos φ, mirrored for the other leg), shoes are re-pasted unmirrored,
and the body bobs (up when the legs pass, down on contact).
usage: python3 -I walkgen.py walk.png base_index out.png"""
import sys, math
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
src, bi, out = sys.argv[1], int(sys.argv[2]), sys.argv[3]
CW, CHH = 200, 230
strip = np.array(Image.open(src).convert('RGBA')).astype(np.float32)
f = strip[:, bi*CW:(bi+1)*CW].copy()
a = f[..., 3] > 40
ys = np.where(a.any(1))[0]; top, bot = ys.min(), ys.max()
r, g, b = f[..., 0], f[..., 1], f[..., 2]
skirt = a & (b > r + 12) & (r < 90) & (g < 100)              # dark navy skirt
cnt = skirt.sum(1); rows = [y for y in range(top + (bot-top)//2, bot) if cnt[y] >= 14]
hem = rows[0]
while hem + 1 < bot and cnt[hem + 1] >= 8: hem += 1
hem += 1
legs = np.zeros_like(a); legs[hem:bot + 1] = a[hem:bot + 1]
dark = legs & (f[..., :3].max(2) < 70)                         # shoes = dark blobs at the bottom
dark[:bot - 13] = False
lab, n = ndi.label(ndi.binary_dilation(dark, iterations=1) & legs)
shoes = []
for k in range(1, n + 1):
    m = lab == k
    if m.sum() < 25: continue
    yy, xx = np.where(m); shoes.append((m, xx.min(), xx.max(), yy.min(), yy.max()))
hipx = np.where(a[hem:hem + 4].any(0))[0].mean()
hip_row = lambda y: hipx
print('hem', hem, 'bot', bot, 'hip', round(hipx, 1), 'shoes', [(s[1], s[2]) for s in shoes])
upper = f.copy(); upper[hem:] = 0
legs_only = f.copy(); legs_only[:hem] = 0
for m, *_ in shoes: legs_only[m] = 0
frames = []
N = 8
for k in range(N):
    phi = 2 * math.pi * k / N
    s = math.cos(phi)
    s = math.copysign(max(abs(s), .5), s if abs(s) > 1e-6 else (1 if k < N//2 else -1))
    bob = -round(3 * (1 - abs(math.cos(phi))))           # up while passing
    canvas = np.zeros((CHH, CW, 4), np.float32)
    # legs: the whole leg layer is scaled horizontally about the hip (s<0 = mirrored → other leg forward);
    # near the passing pose the mirrored copy is added too, so both legs show close together
    def put(scale):
        sc = abs(scale)
        h = bot + 1 - hem
        L = Image.fromarray(legs_only[hem:bot + 1].astype(np.uint8), 'RGBA')
        if scale < 0: L = L.transpose(Image.FLIP_LEFT_RIGHT)
        cxs = (CW - 1 - hipx) if scale < 0 else hipx              # hip column after the flip
        W2 = max(1, int(round(CW * sc)))
        L = L.resize((W2, h), Image.NEAREST)
        arr = np.array(L).astype(np.float32)
        ox = int(round(hipx - cxs * sc))
        for x in range(W2):
            nx = x + ox
            if 0 <= nx < CW:
                col = arr[:, x]; m = (col[:, 3] > 40) & (canvas[hem:bot + 1, nx, 3] < 40)
                canvas[hem:bot + 1, nx][m] = col[m]
    put(s)
    if abs(s) < .6: put(-s)
    # shoes: same shape, moved with their leg (never mirrored)
    for m, x0, x1, y0, y1 in shoes:
        cx = (x0 + x1) / 2; ncx = hipx + s * (cx - hipx); dx = int(round(ncx - cx))
        yy, xx = np.where(m)
        ok = (xx + dx >= 0) & (xx + dx < CW)
        canvas[yy[ok], xx[ok] + dx] = f[yy[ok], xx[ok]]
    # upper body on top (skirt covers the thighs)
    up = upper[..., 3] > 0
    canvas[up] = upper[up]
    # bob the whole figure, feet stay on the floor on contact frames
    canvas = np.roll(canvas, bob, 0)
    if bob < 0: canvas[bob:] = 0
    frames.append(canvas)
s = np.concatenate(frames, axis=1).astype(np.uint8)
Image.fromarray(s, 'RGBA').quantize(256, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE).save(out, optimize=True)
