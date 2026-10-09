"""Cut the KEA character sheet into per-pose strips (transparent, feet on one floor)."""
import sys, json, numpy as np
from PIL import Image
from scipy import ndimage as nd

SRC, OUT = sys.argv[1], sys.argv[2]
im = np.array(Image.open(SRC).convert('RGB')).astype(int)
H, W, _ = im.shape
mn, mx = im.min(2), im.max(2)
white = (mn >= 236) & ((mx - mn) <= 16)
lab, n = nd.label(white)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
bg = np.isin(lab, list(border))
# enclosed pure-white holes (gaps between arms / legs)
sizes = nd.sum(np.ones_like(lab), lab, index=np.arange(n + 1))
pure = (mn >= 248) & ((mx - mn) <= 6)
for i in range(1, n + 1):
    if i in border: continue
    if sizes[i] >= 60:
        m = lab == i
        if pure[m].mean() > .9: bg |= m
fg = ~bg
# drop the row labels (small dark text components on the left)
fl, fn = nd.label(fg)
for i, s in enumerate(nd.find_objects(fl)):
    h = s[0].stop - s[0].start
    if s[1].stop < 130 and h < 40: fg[fl == i + 1] = False

BANDS = {'idle': (8, 240), 'attack': (245, 478), 'hurt': (483, 708), 'death': (712, 856)}
SEGS = {
    'idle':   [(123,194),(264,334),(402,475),(535,612),(679,758),(821,894),(957,1037),(1097,1177),(1239,1318),(1367,1441)],
    'attack': [(68,199),(217,339),(354,508),(516,'s'),('s',804),(817,918),(939,1222),(1233,1357),(1373,1504)],
    'hurt':   [(99,196),(238,357),(392,528),(550,695),(709,860),(898,1010),(1025,1160),(1178,1331)],
    'death':  [(68,223),(225,388),(390,599),(612,881),(902,1187),(1206,1520)],
}
# split the merged attack 4/5 at the emptiest column
a, b = BANDS['attack']
col = fg[a:b, 640:700].sum(0); sp = 640 + int(col.argmin())
SEGS['attack'][3] = (516, sp); SEGS['attack'][4] = (sp, 804)

rgba = np.zeros((H, W, 4), np.uint8); rgba[..., :3] = im.clip(0, 255)
alpha = fg.astype(float)
# soften the outline: near-white pixels touching the background become partly transparent
edge = fg & nd.binary_dilation(bg, iterations=1)
soft = np.clip((255 - mn) / 45.0, 0, 1)
alpha[edge] = np.minimum(alpha[edge], soft[edge])
rgba[..., 3] = (alpha * 255).astype(np.uint8)

frames = {}
for row, segs in SEGS.items():
    y0, y1 = BANDS[row]
    for k, (x0, x1) in enumerate(segs):
        m = fg[y0:y1, x0:x1].copy()
        cl, cn = nd.label(m)
        if cn > 1:
            ar = nd.sum(m, cl, index=np.arange(1, cn + 1))
            for j, v in enumerate(ar):
                if v < 120: m[cl == j + 1] = False
        if not m.any(): continue
        ys, xs = np.nonzero(m)
        bot = ys.max()
        low = xs[ys >= bot - 22]
        foot = int(low.min())
        head = xs[ys <= ys.min() + 45]
        frames[f'{row}{k+1}'] = dict(img=rgba[y0:y1, x0:x1].copy() * 1, mask=m, top=int(ys.min()), bot=int(bot),
                                    left=int(xs.min()), right=int(xs.max()), foot=foot, headc=int((head.min()+head.max())/2))
        # zero alpha outside the mask (neighbour frames bleeding in)
        frames[f'{row}{k+1}']['img'][~m, 3] = 0

CH = 240; FOOT_X = 80; FLOOR = CH - 4
def strip(name, keys, cw, fx=None):
    FX = fx or FOOT_X
    out = Image.new('RGBA', (cw * len(keys), CH), (0, 0, 0, 0))
    for i, k in enumerate(keys):
        f = frames[k]
        crop = Image.fromarray(f['img'][f['top']:f['bot'] + 1, f['left']:f['right'] + 1])
        x = i * cw + FX - (f['foot'] - f['left']); y = FLOOR - (f['bot'] - f['top'])
        assert x >= i * cw and x + crop.width <= (i + 1) * cw, (name, k, x - i*cw, crop.width, cw)
        out.alpha_composite(crop, (x, max(0, y)))
    q = out.quantize(colors=255, method=Image.FASTOCTREE, dither=Image.NONE) if False else out
    q.save(f'{OUT}/{name}.png', optimize=True)
    return dict(n=len(keys), cw=cw)

info = {}
info['idle']    = strip('idle',    [f'idle{i}' for i in range(1, 11)], 200, 108)
info['guard']   = strip('guard',   ['attack1', 'attack2'], 220)
info['jab']     = strip('jab',     ['attack2', 'attack3', 'attack4'], 260)
info['kick']    = strip('kick',    ['attack5', 'attack6', 'attack7'], 360)
info['recover'] = strip('recover', ['attack8', 'attack9'], 220)
info['hurt']    = strip('hurt',    [f'hurt{i}' for i in range(1, 6)], 260, 100)
info['dead']    = strip('dead',    ['hurt6', 'hurt7', 'death1', 'death2', 'death3', 'death4', 'death5', 'death6'], 410)
meta = {k: {kk: v[kk] for kk in ('top','bot','left','right','foot','headc')} for k, v in frames.items()}
json.dump(dict(info=info, frames=meta, FOOT_X=FOOT_X, FLOOR=FLOOR, CH=CH), open(f'{OUT}/meta.json', 'w'), indent=1)
print(json.dumps(info))
for k in ('idle1','attack4','attack7'):
    f = meta[k]; print(k, 'h', f['bot']-f['top'], 'w', f['right']-f['left'], 'foot', f['foot']-f['left'], 'headc', f['headc']-f['left'])
