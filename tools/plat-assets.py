#!/usr/bin/env python3
"""Platform Mode asset audit — run from the repo root:  python3 tools/plat-assets.py

Checks every sprite the Platform Mode uses (hero strips, enemy/boss grids, projectile/FX strips)
against the real PNGs: the file exists, a strip is exactly n x cw wide, a grid fits its image,
and reports fully opaque 1-px columns (frame dividers baked into a sheet, like elon/roll.png).
Needs Node (to read js/plat/*.js) and Pillow."""
import json, os, subprocess, sys
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
dump = subprocess.run(['node', '-e', """
for (const f of ['core','world','anim','heroes','player','enemies','levels']) require('./public/js/plat/' + f + '.js');
console.log(JSON.stringify({ heroes: PLAT.HEROES, enemies: PLAT.ENEMIES, bosses: PLAT.BOSSES, proj: PLAT.PROJ, fx: PLAT.FXDEF }));
"""], capture_output=True, text=True, cwd=os.path.join(ROOT, '..'))
if dump.returncode: sys.exit(dump.stderr)
D = json.loads(dump.stdout)
problems = 0

def img(path):
    p = os.path.join(ROOT, path)
    if not os.path.exists(p): return None
    return Image.open(p).convert('RGBA')

def dividers(im):
    W, H = im.size; a = im.getchannel('A')
    return [x for x in range(W) if sum(1 for y in range(H) if a.getpixel((x, y)) > 0) >= H - 1]

def bad(msg):
    global problems; problems += 1; print('  ✗', msg)

for hid, h in D['heroes'].items():
    sp = h['sprite']; print(f'hero {hid}')
    if sp['kind'] == 'atlas':
        if not img(sp['img']): bad('missing ' + sp['img'])
        continue
    for name, a in sp['anims'].items():
        path = sp['dir'] + (a.get('file') or name) + '.png'; im = img(path)
        if im is None: bad('missing ' + path); continue
        if im.height != sp['ch']: bad(f'{path}: height {im.height} != ch {sp["ch"]}')
        if 'rects' in a: continue
        if im.width != a['n'] * a['cw']: bad(f'{path}: width {im.width} != n*cw {a["n"]}*{a["cw"]}')
        dv = dividers(im)
        if dv: bad(f'{path}: opaque divider columns at {dv[:8]} (use explicit rects)')

for group in ('enemies', 'bosses'):
    for eid, e in D[group].items():
        s = e['sheet']; im = img(s['img']); print(f'{group[:-1]} {eid}')
        if im is None: bad('missing ' + s['img']); continue
        cells = max(max(v) for v in s['anims'].values()) + 1
        rows = -(-cells // s['cols'])
        if s['cols'] * s['fw'] > im.width + 1 or rows * s['fh'] > im.height + 1: bad(f'{s["img"]}: {cells} cells of {s["fw"]}x{s["fh"]} do not fit {im.size}')
        for st in e.get('states', []) + ([e['after']] if e.get('after') else []):
            if img(st) is None: bad('missing ' + st)

for group in ('proj', 'fx'):
    for k, p in D[group].items():
        if not p.get('img'): continue
        im = img(p['img'])
        if im is None: bad(f'{group} {k}: missing {p["img"]}'); continue
        if p.get('n', 1) * p['fw'] > im.width or p['fh'] > im.height: bad(f'{group} {k}: {p.get("n",1)}x{p["fw"]}x{p["fh"]} does not fit {im.size}')

print('\n' + ('all assets OK' if not problems else f'{problems} problem(s)'))
sys.exit(1 if problems else 0)
