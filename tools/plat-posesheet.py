#!/usr/bin/env python3
"""Pose sheet for animation review — run from the repo root:
     python3 tools/plat-posesheet.py <heroId> [out.png]
One row per POSE, frames in the order the game plays them (repeats collapsed to "×n"),
then a row per strip that no pose uses. Atlas heroes (Shovel Knight) list atlas anims."""
import json, os, subprocess, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
hid = sys.argv[1]; out = sys.argv[2] if len(sys.argv) > 2 else f'/tmp/pose_{hid}.png'
dump = subprocess.run(['node', '-e', """
for (const f of ['core','world','anim','heroes','x4-sheet','xmod','player','monster-sheets','enemies','art-sheets','levels','art']) require('./public/js/plat/' + f + '.js');
console.log(JSON.stringify(PLAT.HEROES[process.argv[1]]));
""", hid], capture_output=True, text=True, cwd=os.path.join(ROOT, '..'))
if dump.returncode: sys.exit(dump.stderr)
H = json.loads(dump.stdout); sp = H['sprite']
try: F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 13)
except Exception: F = None

imgs = {}
def img(p):
    if p not in imgs: imgs[p] = Image.open(os.path.join(ROOT, p)).convert('RGBA')
    return imgs[p]

frames = {}       # anim name -> list of (image, crop box)
if sp['kind'] == 'atlas':
    A = json.load(open(os.path.join(ROOT, '..', sp['atlasSrc']) if os.path.exists(os.path.join(ROOT, '..', sp['atlasSrc'])) else os.path.join(ROOT, sp['atlasSrc'])))
    for name, ids in A['anims'].items():
        fr_ = A['frames']; get = (lambda i: fr_[i] if isinstance(fr_, list) else fr_[str(i)])
        frames[name] = [(sp['img'], (get(i)['x'], get(i)['y'], get(i)['x'] + get(i)['w'], get(i)['y'] + get(i)['h'])) for i in ids]
else:
    for name, a in sp['anims'].items():
        path = sp['dir'] + (a.get('file') or name) + '.png'; ch = a.get('ch', sp['ch'])
        if 'rects' in a: frames[name] = [(path, (x, 0, x + w, ch)) for x, w, ax in a['rects']]
        else: frames[name] = [(path, (i * a['cw'], 0, (i + 1) * a['cw'], ch)) for i in range(a['n'])]

rows = []
used = set()
for pn, pz in H.get('poses', {}).items():
    a = pz['a']
    if a not in frames: rows.append((f'{pn} → {a} (MISSING)', [])); continue
    used.add(a); idx = pz.get('f', list(range(len(frames[a]))))
    seq = []
    for i in idx:
        if seq and seq[-1][0] == i: seq[-1][1] += 1
        else: seq.append([i, 1])
    fps = pz.get('fps', 10)
    rows.append((f"{pn} = {a} @{fps}fps{' loop' if pz.get('loopy') or pn in ('idle','walk','run','float') else ''}", [(frames[a][min(i, len(frames[a]) - 1)], i, n) for i, n in seq]))
for a in frames:
    if a not in used: rows.append((f'[strip] {a}', [(frames[a][i], i, 1) for i in range(len(frames[a]))]))

maxh0 = max((img(p).crop(b).height for f in frames.values() for p, b in f), default=40); S = 2 if maxh0 <= 60 else 1; maxh = max((img(p).crop(b).height for f in frames.values() for p, b in f), default=40)
cellw = max((img(p).crop(b).width for f in frames.values() for p, b in f), default=40) * S + 8
W = 230 + min(12, max((len(r[1]) for r in rows), default=1)) * cellw; rowh = maxh * S + 22
out_im = Image.new('RGB', (W, rowh * len(rows) + 4), (246, 247, 251)); d = ImageDraw.Draw(out_im)
for r, (label, fr) in enumerate(rows):
    y = r * rowh + 2
    if r % 2: d.rectangle([0, y, W, y + rowh - 1], fill=(232, 235, 245))
    d.text((6, y + rowh // 2 - 8), label[:34], fill=(30, 30, 80), font=F)
    for k, ((p, b), i, n) in enumerate(fr[:12]):
        t = img(p).crop(b); t = t.resize((t.width * S, t.height * S), Image.NEAREST)
        x = 230 + k * cellw; out_im.paste(t, (x + (cellw - t.width) // 2, y + 16 + maxh * S - t.height), t)
        d.text((x + 2, y + 1), f'{i}' + (f'×{n}' if n > 1 else ''), fill=(200, 30, 90), font=F)
    if len(fr) > 12: d.text((W - 40, y + 2), f'+{len(fr) - 12}', fill=(200, 30, 90), font=F)
out_im.save(out); print(out, out_im.size, len(rows), 'rows')
