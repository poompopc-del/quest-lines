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
for (const f of ['core','world','anim','heroes','x4-sheet','xmod','player','monster-sheets','enemies','art-sheets','levels','art']) require('./public/js/plat/' + f + '.js');
const skins = {}; for (const t in PLAT.SKINS) for (const k in PLAT.SKINS[t]) skins[t + ':' + k] = PLAT.enemyDef(k, t);
const themes = {}; for (const t in PLAT.THEMES) themes[t] = PLAT.themeImages(PLAT.THEMES[t]);
console.log(JSON.stringify({ heroes: PLAT.HEROES, enemies: Object.assign({}, PLAT.ENEMIES, skins), bosses: PLAT.BOSSES, proj: PLAT.PROJ, fx: PLAT.FXDEF, themes, levelThemes: Object.fromEntries(PLAT.LEVEL_ORDER.map(id => [id, PLAT.LEVELS[id].theme])) }));
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
        ch = a.get('ch', sp['ch'])          # a strip may set its own height (Kirby's burned/frozen/shocked)
        if im.height != ch: bad(f'{path}: height {im.height} != ch {ch}')
        if 'rects' in a: continue
        if im.width != a['n'] * a['cw']: bad(f'{path}: width {im.width} != n*cw {a["n"]}*{a["cw"]}')
        if a.get('fullBleed'): continue    # art that fills the whole cell height (flames, ice) — not divider lines
        dv = dividers(im)
        if dv: bad(f'{path}: opaque divider columns at {dv[:8]} (use explicit rects)')

# poses / attack steps reference real animations and real frame indices (Anim clamps a bad index
# silently to the last frame — that hides typos, so it is checked here)
for hid, h in D['heroes'].items():
    sp = h['sprite']
    if sp['kind'] == 'atlas':
        A = json.load(open(os.path.join(ROOT, sp['atlasSrc']))); counts = {k: len(v) for k, v in A['anims'].items()}
    else:
        counts = {k: (len(a['rects']) if 'rects' in a else a['n']) for k, a in sp['anims'].items()}
    poses = h.get('poses', {})
    for pn, pz in poses.items():
        if pz['a'] not in counts: bad(f'hero {hid}: pose {pn} uses missing animation {pz["a"]}'); continue
        if 'f' in pz and max(pz['f']) >= counts[pz['a']]: bad(f'hero {hid}: pose {pn} frame {max(pz["f"])} >= {counts[pz["a"]]} frames of {pz["a"]}')
    def frames_of(pose):
        if pose in poses: pz = poses[pose]; return len(pz['f']) if 'f' in pz else counts.get(pz['a'], 0)
        return counts.get(pose, 0)
    steps = list(h['attack'].get('steps', []))
    if h['attack'].get('melee'): steps.append(h['attack']['melee'])
    for i, st in enumerate(steps):
        n = frames_of(st['pose'])
        if not n: bad(f'hero {hid}: attack step {i} pose {st["pose"]} does not exist')
        elif st.get('on') and max(st['on']) >= n: bad(f'hero {hid}: attack step {i} active frame {max(st["on"])} >= {n} frames')
    for k in ('skill', 'dash'):
        ab = h.get(k) or {}
        for key in ('pose', 'chargePose', 'firePose', 'rev'):
            if ab.get(key) and not frames_of(ab[key]): bad(f'hero {hid}: {k}.{key} {ab[key]} does not exist')

for group in ('enemies', 'bosses'):
    for eid, e in D[group].items():
        s = e['sheet']; im = img(s['img']); print(f'{group[:-1]} {eid}')
        if im is None: bad('missing ' + s['img']); continue
        cells = max(max(v) for v in s['anims'].values()) + 1
        rows = -(-cells // s['cols'])
        if s['cols'] * s['fw'] > im.width + 1 or rows * s['fh'] > im.height + 1: bad(f'{s["img"]}: {cells} cells of {s["fw"]}x{s["fh"]} do not fit {im.size}')
        for st in (e.get('states') or []) + ([e['after']] if e.get('after') else []) + ([e['afterSheet']['img']] if e.get('afterSheet') else []):
            if img(st) is None: bad('missing ' + st)

# world art (art.js): every image a theme uses exists, and every level's theme exists
for t, imgs in D['themes'].items():
    print(f'theme {t}: {len(imgs)} art images')
    for f in imgs:
        if img(f) is None: bad(f'theme {t}: missing {f}')
for lv, t in D['levelThemes'].items():
    if t not in D['themes']: bad(f'level {lv}: unknown theme {t}')

for group in ('proj', 'fx'):
    for k, p in D[group].items():
        if not p.get('img'): continue
        im = img(p['img'])
        if im is None: bad(f'{group} {k}: missing {p["img"]}'); continue
        if p.get('n', 1) * p['fw'] > im.width or p['fh'] > im.height: bad(f'{group} {k}: {p.get("n",1)}x{p["fw"]}x{p["fh"]} does not fit {im.size}')

print('\n' + ('all assets OK' if not problems else f'{problems} problem(s)'))
sys.exit(1 if problems else 0)
