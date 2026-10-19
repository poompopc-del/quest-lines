#!/usr/bin/env python3
"""Platform Mode — build X's animation strips from the sprite compilation sheet the developer supplied
("Mega Man X Customs - X - X (PS1-Style, Extended)" from The Spriters Resource).

  python3 tools/plat-import-x.py "<path to the sheet .png>"

The sheet is one 5634×7021 PNG on a flat (27,89,153) background with text labels. Every animation is
listed below by its row (y0..y1 band) and the x where each frame starts; a frame is the sprite (connected
pixels) that starts there plus any loose pieces inside its box. Frames are re-packed into one strip per
animation, all on a common feet line, horizontally anchored on X's helmet gem (so the body never jumps
between frames). Effects are cut by explicit rectangles. Palettes are read from the sheet's swatches.
Output: public/heroes/x4/*.png and public/js/plat/x4-sheet.js (generated — re-run instead of editing)."""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', 'heroes', 'x4')
if len(sys.argv) != 2: sys.exit(__doc__)
SHEET = Image.open(sys.argv[1]).convert('RGB')
A = np.array(SHEET).astype(np.int16)
BG = np.array([27, 89, 153])
MASK = np.any(A != BG, axis=2)
LAB, _ = ndimage.label(MASK, structure=np.ones((3, 3)))
OBJ = ndimage.find_objects(LAB)
GEM = (224, 40, 32)

def rgba(x0, y0, x1, y1, keep=None):
    """crop → RGBA with the background transparent (keep: label ids to keep, None = all)"""
    a = A[y0:y1, x0:x1]; m = MASK[y0:y1, x0:x1].copy()
    if keep is not None: m &= np.isin(LAB[y0:y1, x0:x1], list(keep))
    out = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); out[..., :3] = a; out[..., 3] = m * 255
    return Image.fromarray(out, 'RGBA')

def frame_at(y0, y1, x):
    """the biggest sprite in band y0..y1 whose box starts at x (±3), plus loose bits inside its box"""
    best = None
    for i, s in enumerate(OBJ):
        if s is None: continue
        sy, sx = s
        if abs(sx.start - x) <= 3 and sy.start >= y0 - 3 and sy.stop <= y1 + 3:
            area = int((LAB[s] == i + 1).sum())
            if not best or area > best[0]: best = (area, i + 1, s)
    if not best: sys.exit(f'no sprite at x={x} in band {y0}-{y1}')
    _, lid, s = best; sy, sx = s
    bx0, by0, bx1, by1 = sx.start, sy.start, sx.stop, sy.stop
    ids = {lid}
    for i, t in enumerate(OBJ):          # loose pieces fully inside the box (sweat drops, sparks)
        if t is None or i + 1 == lid: continue
        ty, tx = t
        if tx.start >= bx0 - 2 and tx.stop <= bx1 + 2 and ty.start >= by0 - 2 and ty.stop <= by1 + 2: ids.add(i + 1)
    return rgba(bx0, by0, bx1, by1, ids)

def gem_x(im):
    a = np.array(im); h = a.shape[0]; top = a[: max(4, int(h * .4))]
    ys, xs = np.where((top[..., 0] == GEM[0]) & (top[..., 1] == GEM[1]) & (top[..., 2] == GEM[2]) & (top[..., 3] > 0))
    return float(xs.mean()) if len(xs) else None

def muzzle(im, ax):
    """buster tip: the right-most red pixels below the helmet → (dx from anchor, dy from feet)"""
    a = np.array(im); h = a.shape[0]; lo = int(h * .3)
    ys, xs = np.where((a[lo:, :, 0] == GEM[0]) & (a[lo:, :, 1] == GEM[1]) & (a[lo:, :, 2] == GEM[2]) & (a[lo:, :, 3] > 0))
    if not len(xs): return None
    xm = xs.max(); sel = xs >= xm - 2
    return [round(float(xm) + 1 - ax, 1), round(float((ys[sel] + lo).mean()) - h, 1)]

# ------------------------------------------------------------------------------------ animations
ANIMS = {
    'intro':      (9, 105, [6, 23, 63, 118, 181, 246, 322, 365, 426, 486]),
    'idle':       (119, 165, [13, 62, 111, 160]),
    'blink':      (119, 165, [211, 260, 309, 358, 407, 456]),
    'tired':      (119, 165, [515, 564, 613, 662, 711, 760]),
    'shoot':      (190, 241, [1, 50, 99, 148, 201]),
    'shootC':     (190, 241, [245, 294, 344, 393, 445, 494, 543]),
    'walkStart':  (254, 301, [12, 52]),
    'walk':       (254, 301, [89, 130, 172, 221, 270, 313, 345, 373, 412, 460, 519, 567, 616, 661]),
    'shotWalkStart': (323, 370, [12, 60]),
    'shotWalk':   (323, 370, [105, 160, 214, 270, 324, 375, 419, 460, 507, 563, 630, 685, 741, 794]),
    'dashStart':  (487, 532, [6, 44]),
    'dash':       (487, 532, [92, 147, 203]),
    'dashEnd':    (487, 532, [273, 313, 351, 407]),
    'shotDashStart': (487, 532, [457, 505]),
    'shotDash':   (487, 532, [562, 625, 688]),
    'shotDashEnd': (487, 532, [767, 816, 867, 923]),
    'jump':       (599, 668, [5, 46, 86, 125, 163, 194, 243, 282]),
    'land':       (599, 668, [320, 356, 388]),
    'shotJump':   (599, 668, [428, 485, 540, 595, 636, 681, 742, 796]),
    'shotLand':   (599, 668, [852, 902, 952]),
    'cling':      (768, 837, [3, 49, 89, 130, 172]),
    'kick':       (768, 837, [210, 255, 295]),
    'shotCling':  (768, 837, [352, 401, 452]),
    'shotKick':   (768, 837, [502, 555, 613]),
    'saber':      (898, 985, [6, 55, 108, 168, 270, 375, 488, 593, 667, 726, 783, 841, 898, 957, 1007]),
    'jumpSaber':  (1005, 1081, [8, 54, 104, 175, 271, 383, 452, 514]),
    'wallSaber':  (1005, 1081, [567, 608, 665, 762, 863, 964, 1049, 1103, 1145, 1202]),
    'hurt':       (1886, 1947, [1, 83, 118]),
    'hurtFlash':  (1886, 1947, [37]),
    'knock':      (1886, 1947, [568, 604]),
    'victory':    (1967, 2048, [12, 61, 112, 151]),
    'exit':       (1967, 2048, [208, 247, 305, 370]),
    'airDash':    (2781, 2837, [1, 34]),
    'hover':      (2781, 2837, [87, 130, 166, 207, 246]),          # ⇉ → ◆ ← ⇇
    'hoverShot':  (2781, 2837, [285, 347, 400, 451, 502]),
    'novaStart':  (2866, 2932, [11, 60, 109, 158]),
    'novaGold':   (2866, 2932, [199]),
    'novaBlue':   (2866, 2932, [602]),
}
# effects: explicit rectangles [x0, y0, x1, y1] on the sheet (whole box, background removed), centred cells
FX = {
    'muzzle':  [[4864, 3184, 4886, 3212], [4886, 3184, 4908, 3212], [4908, 3184, 4933, 3212], [4933, 3184, 4964, 3212]],
    'lemon':   [[4966, 3190, 4982, 3204], [4987, 3190, 5003, 3204]],
    'lemonHit': [[5025, 3190, 5038, 3204], [5042, 3190, 5055, 3204], [5059, 3190, 5072, 3204]],
    'c1Muzzle': [[4866, 3356, 4884, 3384], [4884, 3356, 4902, 3384], [4902, 3356, 4930, 3384], [4930, 3356, 4945, 3384]],
    'c1Shot':  [[4946, 3359, 4977, 3381], [4978, 3359, 5000, 3381]],
    'c1Hit':   [[5008, 3428, 5028, 3490], [5029, 3428, 5059, 3490], [5060, 3428, 5097, 3490], [5097, 3428, 5142, 3490]],
    'c2Muzzle': [[4682, 3386, 4710, 3468], [4722, 3386, 4757, 3468], [4764, 3386, 4810, 3468], [4812, 3386, 4865, 3468], [4865, 3386, 4900, 3468], [4905, 3386, 4960, 3468]],
    'c2Shot':  [[4705, 3469, 4770, 3503], [4776, 3469, 4836, 3503], [4840, 3469, 4907, 3503]],
    'c2Hit':   [[4958, 3494, 4999, 3585], [5000, 3494, 5057, 3585], [5057, 3494, 5117, 3585], [5117, 3494, 5165, 3585]],
    'hit':     [[4686, 3514, 4716, 3585], [4724, 3514, 4764, 3585], [4771, 3514, 4814, 3585], [4820, 3514, 4866, 3585]],
    'dust':    [[413, 533, 450, 580], [464, 533, 522, 580], [537, 533, 591, 580], [604, 533, 656, 580], [668, 533, 719, 580], [748, 533, 778, 580]],
    'novaFlameGold': [[268, 2866, 356, 2934], [368, 2866, 471, 2934]],
    'novaFlameBlue': [[671, 2866, 759, 2934], [771, 2866, 874, 2934]],
    # v92: start 16 px lower — the sheet's frame labels sit above the first bubbles and were cut in with them
    'bubble':  [[896, 1902, 913, 1947], [915, 1902, 936, 1947], [938, 1902, 962, 1947], [964, 1902, 985, 1947], [987, 1902, 1012, 1947], [1014, 1902, 1043, 1947], [1045, 1902, 1076, 1947], [1078, 1902, 1111, 1947]],
    'chargeOrb': [[980, 373, 1002, 399], [1004, 373, 1026, 399], [1028, 373, 1050, 399], [1052, 373, 1075, 399], [1076, 373, 1101, 399], [1102, 373, 1129, 399], [1130, 373, 1155, 399], [1156, 373, 1180, 399], [1181, 373, 1206, 399], [1207, 373, 1234, 399]],
    # charge levels 3/4 + armour plasma (X-Fire orb/sphere · Ultimate Armor plasma; the LVL 4 shot is heroes/x/lvl4.png)
    'chargeBall': [[a, 6313, b, 6350] for a, b in [(4669, 4677), (4678, 4688), (4689, 4701), (4703, 4717), (4718, 4749), (4751, 4783), (4784, 4817), (4817, 4851), (4852, 4889)]],
    'c3Shot':  [[a, 6297, b, 6372] for a, b in [(4891, 4960), (4962, 5039), (5042, 5126), (5129, 5208)]],
    'plasmaShot': [[a, 4747, b, 4808] for a, b in [(4783, 4855), (4865, 4932), (4935, 5010), (5018, 5092)]],
    'plasmaHit': [[a, 4810, b, 4862] for a, b in [(4770, 4822), (4830, 4878), (4890, 4935), (4948, 5000), (5010, 5058), (5072, 5110)]],
}
# palettes: 16-colour swatches under the X4 palette row (sprite x → swatch at x+2, y 3719); index 0 = background
PAL_X = {'default': 1, 'ult': 44, 'shot': 87, 'ultShot': 130, 'flash': 173, 'c1': 216, 'c2': 259, 'c3': 302, 'c4': 345, 'gold': 388, 'after1': 585, 'after2': 622, 'after3': 659}

def swatch(x, y=3719):
    return [list(SHEET.getpixel((x + 2 + (i % 8) * 4 + 1, y + (i // 8) * 4 + 1))) for i in range(16)]

os.makedirs(OUT, exist_ok=True)
frames = {k: [frame_at(y0, y1, x) for x in xs] for k, (y0, y1, xs) in ANIMS.items()}
# horizontal anchor: helmet gem − the gem's offset from the body centre in the first idle frame
i0 = frames['idle'][0]; GEM_OFF = gem_x(i0) - i0.width / 2
def anchor(im):
    g = gem_x(im); return g - GEM_OFF if g is not None else im.width / 2
CH = max(im.height for fl in frames.values() for im in fl) + 2
SHEET_DEF, MUZ = {}, {}
for k, fl in frames.items():
    axs = [anchor(im) for im in fl]
    half = int(max(max(a, im.width - a) for a, im in zip(axs, fl))) + 2
    cw = half * 2
    strip = Image.new('RGBA', (cw * len(fl), CH), (0, 0, 0, 0))
    for i, (im, a) in enumerate(zip(fl, axs)):
        strip.paste(im, (i * cw + int(round(half - a)), CH - im.height), im)
    strip.save(os.path.join(OUT, k + '.png'), optimize=True)
    SHEET_DEF[k] = {'n': len(fl), 'cw': cw, 'ax': half}
    if k.startswith('shot') or k in ('shoot', 'shootC', 'hoverShot'):
        ms = [m for m in (muzzle(im, a) for im, a in zip(fl, axs)) if m]
        if ms: MUZ[k] = [round(sum(m[0] for m in ms) / len(ms), 1), round(sum(m[1] for m in ms) / len(ms), 1)]
FXDEF = {}
for k, rects in FX.items():
    ims = [rgba(*r) for r in rects]
    fw = max(im.width for im in ims) + 2; fh = max(im.height for im in ims) + 2
    strip = Image.new('RGBA', (fw * len(ims), fh), (0, 0, 0, 0))
    for i, im in enumerate(ims):
        bb = im.getbbox() or (0, 0, im.width, im.height); c = im.crop(bb)
        strip.paste(c, (i * fw + (fw - c.width) // 2, (fh - c.height) // 2), c)
    strip.save(os.path.join(OUT, 'fx_' + k + '.png'), optimize=True)
    FXDEF[k] = {'img': 'heroes/x4/fx_' + k + '.png', 'fw': fw, 'fh': fh, 'n': len(ims)}
PAL = {k: swatch(x) for k, x in PAL_X.items()}
# Force (Fourth) Armor colours: the sheet has no armoured body frames, so the armour is shown as X4's white
# body plates with blue trim (hand-made from the default swatch: blues → whites, teal → blue)
FORCE = [c[:] for c in PAL['default']]
for i, c in {12: (232, 236, 248), 13: (192, 200, 224), 14: (136, 148, 184), 15: (72, 80, 120), 5: (88, 168, 248), 6: (40, 104, 216), 7: (32, 56, 136)}.items(): FORCE[i] = list(c)
PAL['force'] = FORCE

with open(os.path.join(ROOT, 'public', 'js', 'plat', 'x4-sheet.js'), 'w') as f:
    f.write('/* GENERATED by tools/plat-import-x.py from the X sprite compilation sheet — do not edit (re-run the script).\n'
            '   X\'s animation strips (public/heroes/x4/), buster muzzle points, effect strips and palettes. */\n'
            "(function (G) { 'use strict';\nG.PLAT.X4 = " + json.dumps({'ch': CH, 'anims': SHEET_DEF, 'muzzle': MUZ, 'fx': FXDEF, 'pal': PAL}, separators=(',', ':')) + ';\n})(typeof window !== \'undefined\' ? window : globalThis);\n')
print('CH', CH, 'GEM_OFF', round(GEM_OFF, 1)); print('anims', {k: (v['n'], v['cw']) for k, v in SHEET_DEF.items()}); print('muzzle', MUZ)
