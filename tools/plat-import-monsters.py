#!/usr/bin/env python3
"""Import the CC0 monster + swamp packs into Platform Mode — run from the repo root:

    python3 tools/plat-import-monsters.py <packs dir>

<packs dir> holds the unzipped downloads:
    mcf/Monsters_Creatures_Fantasy/...                (LuizMelo, CC0)
    mcf13/Monster_Creatures_Fantasy(Version 1.3)/...  (LuizMelo, CC0)
    mcf2/Monsters Creatures Fantasy 2/...             (LuizMelo, CC0)
    swamp/Gothicvania Swamp files/...                 (ansimuz, CC0)
    ew2/EVil Wizard 2/..., ew3/Evil Wizard 3/...      (LuizMelo, CC0 — the world-4 boss)

Writes
    public/enemies/mcf/<monster>.png      one-row strip per monster: every animation, frames cropped to the
                                          monster's union box and MIRRORED to face LEFT like every other enemy
    public/enemies/mcf/fx/<name>.png      projectile strips (bomb, spore, eye bolt, sword wave)
    public/scenes/plat/swamp/*.png        swamp layers, tileset, water tiles, decor, swamp creature strips
    public/js/plat/monster-sheets.js      PLAT.MONSTER_SHEETS (grid sheets) + PLAT.MONSTER_FX (projectile strips)
Re-running gives byte-identical output.
"""
import json, os, sys
from PIL import Image, ImageOps

SRC = sys.argv[1] if len(sys.argv) > 1 else '.'
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public')
MCF = os.path.join(SRC, 'mcf', 'Monsters_Creatures_Fantasy')
M13 = os.path.join(SRC, 'mcf13', 'Monster_Creatures_Fantasy(Version 1.3)')
MC2 = os.path.join(SRC, 'mcf2', 'Monsters Creatures Fantasy 2')
SW = os.path.join(SRC, 'swamp', 'Gothicvania Swamp files')
EW2 = os.path.join(SRC, 'ew2', 'EVil Wizard 2', 'Sprites')
EW3 = os.path.join(SRC, 'ew3', 'Evil Wizard 3', 'Sprites')

def strip(path, cw):
    im = Image.open(path).convert('RGBA'); n = im.width // cw
    return [im.crop((i * cw, 0, i * cw + cw, im.height)) for i in range(n)]

def files(paths):
    return [Image.open(p).convert('RGBA') for p in paths]

# monster: (face_right, { anim: frames }) — frames are whole source cells (centred, feet near the bottom)
def mcf(name, anims, extra=None):
    out = {k: strip(os.path.join(MCF, name, f + '.png'), 150) for k, f in anims.items()}
    for k, f in (extra or {}).items(): out[k] = strip(os.path.join(M13, name, f + '.png'), 150)
    return out

MONSTERS = {
    'skel':    (True, mcf('Skeleton', {'idle': 'Idle', 'move': 'Walk', 'atk': 'Attack', 'shield': 'Shield', 'hurt': 'Take Hit', 'dead': 'Death'}, {'atk2': 'Attack3'})),
    'goblin':  (True, mcf('Goblin', {'idle': 'Idle', 'move': 'Run', 'atk': 'Attack', 'hurt': 'Take Hit', 'dead': 'Death'}, {'throw': 'Attack3'})),
    'shroom':  (True, mcf('Mushroom', {'idle': 'Idle', 'move': 'Run', 'atk': 'Attack', 'hurt': 'Take Hit', 'dead': 'Death'}, {'spit': 'Attack3'})),
    'eye':     (True, mcf('Flying eye', {'move': 'Flight', 'atk': 'Attack', 'hurt': 'Take Hit', 'dead': 'Death'}, {'spit': 'Attack3'})),
    'rat':     (True, {'idle': strip(os.path.join(MC2, 'Rat', 'idle.png'), 70), 'move': strip(os.path.join(MC2, 'Rat', 'run.png'), 70),
                       'atk': strip(os.path.join(MC2, 'Rat', 'attack_bite.png'), 70), 'hurt': strip(os.path.join(MC2, 'Rat', 'hurt.png'), 70),
                       'dead': strip(os.path.join(MC2, 'Rat', 'rat-death.png'), 70)}),
    'bat':     (False, {'move': strip(os.path.join(MC2, 'Bat', 'fly.png'), 87), 'atk': strip(os.path.join(MC2, 'Bat', 'attack.png'), 87),
                        'hurt': strip(os.path.join(MC2, 'Bat', 'hurt.png'), 87), 'dead': strip(os.path.join(MC2, 'Bat', 'fly-to-fall.png'), 87) + strip(os.path.join(MC2, 'Bat', 'death.png'), 87)}),
    'goo':     (True, {'idle': strip(os.path.join(MC2, 'Slime', 'idle.png'), 156), 'move': strip(os.path.join(MC2, 'Slime', 'walk.png'), 156),
                       'atk': strip(os.path.join(MC2, 'Slime', 'attack.png'), 156), 'hurt': strip(os.path.join(MC2, 'Slime', 'hurt.png'), 156),
                       'dead': strip(os.path.join(MC2, 'Slime', 'death.png'), 156)}),
    'mimic':   (True, {'closed': strip(os.path.join(MC2, 'Mimic', 'Idle_closed.png'), 146), 'open': strip(os.path.join(MC2, 'Mimic', 'opening.png'), 146),
                       'transform': strip(os.path.join(MC2, 'Mimic', 'transform.png'), 146), 'idle': strip(os.path.join(MC2, 'Mimic', 'idle_transformed.png'), 146),
                       'move': strip(os.path.join(MC2, 'Mimic', 'walk.png'), 146), 'atk': strip(os.path.join(MC2, 'Mimic', 'attack_1.png'), 146),
                       'atk2': strip(os.path.join(MC2, 'Mimic', 'attack_2.png'), 146), 'hurt': strip(os.path.join(MC2, 'Mimic', 'hurt.png'), 146),
                       'dead': strip(os.path.join(MC2, 'Mimic', 'death.png'), 146)}),
    # boss: Evil Wizard 2 (phase 1) and Evil Wizard 3 (phase 2) by LuizMelo, CC0
    'wiz2':    (True, {k: strip(os.path.join(EW2, f + '.png'), 250) for k, f in [('idle', 'Idle'), ('move', 'Run'), ('atk', 'Attack1'), ('atk2', 'Attack2'), ('jump', 'Jump'), ('fall', 'Fall'), ('hurt', 'Take hit'), ('dead', 'Death')]}),
    'wiz3':    (True, {k: strip(os.path.join(EW3, f + '.png'), 140) for k, f in [('idle', 'Idle'), ('move', 'Walk'), ('run', 'Run'), ('atk', 'Attack'), ('jump', 'Jump'), ('fall', 'Fall'), ('hurt', 'Get hit'), ('dead', 'Death')]}),
    # Gothicvania Swamp creatures (single frames, already facing LEFT)
    'spider':  (False, {'move': files([os.path.join(SW, 'Sprites', 'Spider', 'walk', f'spider{i}.png') for i in range(1, 5)])}),
    'thing':   (False, {'move': files([os.path.join(SW, 'Sprites', 'Thing', 'walk thing', f'thing{i}.png') for i in range(1, 5)])}),
    'wraith':  (False, {'move': files([os.path.join(SW, 'Sprites', 'Ghost', 'Flying', f'Ghost{i}.png') for i in range(1, 5)])}),
}
OUT_DIR = {'spider': 'scenes/plat/swamp', 'thing': 'scenes/plat/swamp', 'wraith': 'scenes/plat/swamp'}

def union_box(frames):
    x0 = y0 = 10 ** 9; x1 = y1 = -1
    for f in frames:
        b = f.getbbox()
        if not b: continue
        x0, y0, x1, y1 = min(x0, b[0]), min(y0, b[1]), max(x1, b[2]), max(y1, b[3])
    return x0, y0, x1, y1

sheets, fx = {}, {}
for key, (face_right, anims) in MONSTERS.items():
    order = list(anims.keys()); allf = [f for k in order for f in anims[k]]
    x0, y0, x1, y1 = union_box(allf); w, h = x1 - x0, y1 - y0
    cw = allf[0].width
    # anchor: the source cell's centre (the body sits there); feet = the lowest opaque row of the walk / idle frames
    ref = anims.get('idle') or anims.get('move')
    feet = max(f.getbbox()[3] for f in ref if f.getbbox())
    ax = cw / 2 - x0; by = feet - y0
    if key == 'wiz2': feet = max(f.getbbox()[3] for f in ref if f.getbbox())   # the staff's flame never reaches below the feet
    sheet = Image.new('RGBA', (w * len(allf), h), (0, 0, 0, 0)); idx = {}; i = 0
    for k in order:
        idx[k] = []
        for f in anims[k]:
            c = f.crop((x0, y0, x1, y1))
            if face_right: c = ImageOps.mirror(c)
            sheet.paste(c, (i * w, 0)); idx[k].append(i); i += 1
    if face_right: ax = w - ax
    rel = (OUT_DIR.get(key, 'enemies/mcf')) + f'/{key}.png'
    os.makedirs(os.path.dirname(os.path.join(ROOT, rel)), exist_ok=True)
    sheet.save(os.path.join(ROOT, rel), optimize=True)
    sheets[key] = {'kind': 'grid', 'img': rel, 'cols': len(allf), 'fw': w, 'fh': h, 'ax': round(ax), 'by': round(by), 'anims': idx}
    print(f'{key:7s} {len(allf):3d} frames {w}x{h} ax {round(ax)} by {round(by)} -> {rel}')

# projectile strips (cropped to their union box; all fly to the RIGHT in the source = the game's projectile direction)
PROJ = {
    'bomb':  (os.path.join(M13, 'Goblin', 'Bomb_sprite.png'), 100),
    'spore': (os.path.join(M13, 'Mushroom', 'Projectile_sprite.png'), 50),
    'bolt':  (os.path.join(M13, 'Flying eye', 'projectile_sprite.png'), 48),
    'blade': (os.path.join(M13, 'Skeleton', 'Sword_sprite.png'), 92),
    'wbolt': (os.path.join(EW3, 'Projectile', 'Moving.png'), 50),
    'wboom': (os.path.join(EW3, 'Projectile', 'Explode.png'), 50),
}
for key, (path, cw) in PROJ.items():
    fr = strip(path, cw); x0, y0, x1, y1 = union_box(fr); w, h = x1 - x0, y1 - y0
    s = Image.new('RGBA', (w * len(fr), h), (0, 0, 0, 0))
    for i, f in enumerate(fr): s.paste(f.crop((x0, y0, x1, y1)), (i * w, 0))
    rel = f'enemies/mcf/fx/{key}.png'; os.makedirs(os.path.join(ROOT, 'enemies/mcf/fx'), exist_ok=True); s.save(os.path.join(ROOT, rel), optimize=True)
    fx[key] = {'img': rel, 'fw': w, 'fh': h, 'n': len(fr)}
    print(f'fx {key:6s} {len(fr)} frames {w}x{h}')

# swamp environment
ENV = os.path.join(SW, 'Evironment'); dst = os.path.join(ROOT, 'scenes/plat/swamp'); os.makedirs(dst, exist_ok=True)
for f in ['background', 'mid-layer-01', 'mid-layer-02', 'tileset', 'trees']:
    Image.open(os.path.join(ENV, f + '.png')).convert('RGBA').save(os.path.join(dst, f + '.png'), optimize=True)
ts = Image.open(os.path.join(ENV, 'tileset.png')).convert('RGBA')
ts.crop((224, 80, 240, 96)).save(os.path.join(dst, 'water-top.png'), optimize=True)
ts.crop((224, 96, 240, 112)).save(os.path.join(dst, 'water.png'), optimize=True)
for i, (a, b) in enumerate([(32, 72), (96, 152), (168, 216)]):         # three plants on the tileset's second row
    p = ts.crop((a, 64, b, 112)); p = p.crop(p.getbbox()); p.save(os.path.join(dst, f'plant-{i + 1}.png'), optimize=True)
props = Image.open(os.path.join(ENV, 'props.png')).convert('RGBA')
cols = [any(props.getpixel((x, y))[3] for y in range(props.height)) for x in range(props.width)]
runs, s0 = [], None
for x, c in enumerate(cols + [False]):
    if c and s0 is None: s0 = x
    if not c and s0 is not None: runs.append((s0, x)); s0 = None
for i, (a, b) in enumerate(runs):
    p = props.crop((a, 0, b, props.height)); p = p.crop(p.getbbox()); p.save(os.path.join(dst, f'prop-{i + 1}.png'), optimize=True)
print('swamp env ok,', len(runs), 'props')
# enemy death puff (swamp pack) — a generic "poof" for monsters without a death animation
puff = files([os.path.join(SW, 'Sprites', 'Enemy-Death', 'Explosion', f'Enemy-Death{i}.png') for i in range(1, 7)])
s = Image.new('RGBA', (39 * 6, 49), (0, 0, 0, 0))
for i, f in enumerate(puff): s.paste(f, (i * 39, 0))
s.save(os.path.join(dst, 'death-puff.png'), optimize=True)
fx['puff'] = {'img': 'scenes/plat/swamp/death-puff.png', 'fw': 39, 'fh': 49, 'n': 6}

with open(os.path.join(ROOT, 'js', 'plat', 'monster-sheets.js'), 'w') as f:
    f.write('/* GENERATED by tools/plat-import-monsters.py — do not edit by hand (re-run the script instead).\n'
            '   CC0 monsters: Monsters Creatures Fantasy 1 + 2 by LuizMelo · Gothicvania Swamp by ansimuz (see scenes/plat/CREDITS.txt).\n'
            '   Every strip faces LEFT like the other enemies. */\n')
    f.write("(function (G) { 'use strict';\nG.PLAT = G.PLAT || {};\n")
    f.write('G.PLAT.MONSTER_SHEETS = ' + json.dumps(sheets, separators=(',', ':')) + ';\n')
    f.write('G.PLAT.MONSTER_FX = ' + json.dumps(fx, separators=(',', ':')) + ';\n')
    f.write("})(typeof window !== 'undefined' ? window : globalThis);\n")
print('wrote js/plat/monster-sheets.js')
