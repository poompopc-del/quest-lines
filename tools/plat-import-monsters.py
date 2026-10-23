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

# ======================================================================================= v115 batch 2
# <packs dir>/batch2 holds: gothicvania-town-files/, super_grotto_escape_files/, fort_of_illusion_files/,
# forest_of_illusion_files/ (ansimuz, CC0), Hell-Hound-Files/ (ansimuz, CC-BY 3.0 — credited in CREDITS.txt + the game's credits),
# Bosses.png ("Bosses" sprite sheet, CC0)
B2 = os.path.join(SRC, 'batch2')
def save(im, rel):
    path = os.path.join(ROOT, rel); os.makedirs(os.path.dirname(path), exist_ok=True); im.save(path, optimize=True)
def cp(src, rel): save(Image.open(src).convert('RGBA'), rel)
def grid_sheet(key, anims, rel, face_right=False, align=None):
    """anims: {name: [frames]} → one-row strip cropped to the union box (frames already aligned to a common canvas)."""
    order = list(anims.keys()); allf = [f for k in order for f in anims[k]]
    x0, y0, x1, y1 = union_box(allf); w, h = x1 - x0, y1 - y0; cw = allf[0].width
    ref = anims.get('idle') or anims.get('move'); feet = max(f.getbbox()[3] for f in ref if f.getbbox())
    ax = cw / 2 - x0; by = feet - y0
    sheet = Image.new('RGBA', (w * len(allf), h), (0, 0, 0, 0)); idx = {}; i = 0
    for k in order:
        idx[k] = []
        for f in anims[k]:
            c = f.crop((x0, y0, x1, y1))
            if face_right: c = ImageOps.mirror(c)
            sheet.paste(c, (i * w, 0)); idx[k].append(i); i += 1
    if face_right: ax = w - ax
    save(sheet, rel)
    sheets[key] = {'kind': 'grid', 'img': rel, 'cols': len(allf), 'fw': w, 'fh': h, 'ax': round(ax), 'by': round(by), 'anims': idx}
    print(f'{key:7s} {len(allf):3d} frames {w}x{h} ax {round(ax)} by {round(by)} -> {rel}')

if os.path.isdir(B2):
    # ---- Hell Hound (faces LEFT already). Frames on a common 72 x 48 canvas, feet on the bottom row.
    HH = os.path.join(B2, 'Hell-Hound-Files', 'Hell-Hound-Files', 'PNG')
    def canvas(frames, cw=72, ch=48):
        out = []
        for f in frames:
            c = Image.new('RGBA', (cw, ch), (0, 0, 0, 0)); c.paste(f, ((cw - f.width) // 2, ch - f.height)); out.append(c)
        return out
    grid_sheet('hound', {'idle': canvas(strip(os.path.join(HH, 'hell-hound-idle.png'), 64)), 'move': canvas(strip(os.path.join(HH, 'hell-hound-walk.png'), 64)),
                         'run': canvas(strip(os.path.join(HH, 'hell-hound-run.png'), 67)), 'atk': canvas(strip(os.path.join(HH, 'hell-hound-jump.png'), 65))}, 'enemies/hound/hound.png')
    # ---- villagers (Gothicvania Town; they face RIGHT → mirrored)
    TS = os.path.join(B2, 'gothicvania-town-files', 'GothicVania-town-files', 'PNG', 'spritesheets')
    for key, name, iw, ww in [('vOld', 'oldman', 34, 34), ('vWoman', 'woman', 37, 37), ('vHat', 'hat-man', 39, 39), ('vBeard', 'bearded', 40, 40)]:
        idle = Image.open(os.path.join(TS, name + '-idle.png')).convert('RGBA'); walk = Image.open(os.path.join(TS, name + '-walk.png')).convert('RGBA')
        ni = round(idle.width / iw); nw = round(walk.width / ww)
        fi = [idle.crop((round(i * idle.width / ni), 0, round((i + 1) * idle.width / ni), idle.height)) for i in range(ni)]
        fw_ = [walk.crop((round(i * walk.width / nw), 0, round((i + 1) * walk.width / nw), walk.height)) for i in range(nw)]
        H = max(idle.height, walk.height)
        grid_sheet(key, {'idle': canvas(fi, 48, H), 'move': canvas(fw_, 48, H)}, f'scenes/plat/town/{key}.png', face_right=True)
    # ---- town environment
    TE = os.path.join(B2, 'gothicvania-town-files', 'GothicVania-town-files', 'PNG', 'environment')
    for f in ['background', 'middleground']: cp(os.path.join(TE, 'layers', f + '.png'), f'scenes/plat/town/{f}.png')
    for f in ['house-a', 'house-b', 'house-c', 'street-lamp', 'well', 'wagon', 'barrel', 'crate', 'crate-stack', 'sign']: cp(os.path.join(TE, 'props-sliced', f + '.png'), f'scenes/plat/town/{f}.png')
    SL = os.path.join(TE, 'layers', 'sliced-tileset'); op = lambda n: Image.open(os.path.join(SL, n + '.png')).convert('RGBA')
    # 16 px atlas: row 0 = surfaces, row 1 = bodies
    at = Image.new('RGBA', (8 * 16, 3 * 16), (0, 0, 0, 0))
    g, gb, wl, wb, tw = op('ground'), op('ground-b'), op('wall'), op('wall-b'), op('top-wood')
    at.paste(g.crop((0, 9, 16, 25)), (0, 0)); at.paste(gb.crop((0, 9, 16, 25)), (16, 0))            # cobble street top
    at.paste(g.crop((0, 25, 16, 41)), (0, 16)); at.paste(gb.crop((0, 25, 16, 41)), (16, 16))        # under the cobbles
    at.paste(g.crop((0, 32, 16, 48)), (32, 16)); at.paste(gb.crop((0, 32, 16, 48)), (48, 16))       # deep earth
    for i, w_ in enumerate([wl, wb]):
        c = w_.copy(); c.alpha_composite(tw); at.paste(c, (32 + i * 16, 0))                          # plaster wall with a beam on top
        at.paste(w_, (64 + i * 16, 16))
    at.paste(tw, (64, 0))                                                                             # wooden plank (one-way)
    save(at, 'scenes/plat/town/tiles.png')
    # ---- fort of illusion
    FO = os.path.join(B2, 'fort_of_illusion_files', 'Fort of Illusion Files', 'Layers')
    for f in ['back', 'mountains', 'tileset', 'front']: cp(os.path.join(FO, f + '.png'), f'scenes/plat/fort/{f}.png')
    for f in ['banner', 'window', 'door', 'closed-door', 'flag']: cp(os.path.join(FO, 'Props', f + '.png'), f'scenes/plat/fort/{f}.png')
    # ---- forest of illusion
    FR = os.path.join(B2, 'forest_of_illusion_files', 'Forest of Illusion Files', 'Layers')
    for f in ['back', 'middle', 'tiles']: cp(os.path.join(FR, f + '.png'), f'scenes/plat/forest/{f}.png')
    # ---- super grotto escape
    GR = os.path.join(B2, 'super_grotto_escape_files', 'Super Grotto Escape Files', 'Layers')
    for f in ['back', 'far', 'middle', 'tileset']: cp(os.path.join(GR, f + '.png'), f'scenes/plat/grotto/{f}.png')
    for f in ['palm', 'plant', 'plant-big']: cp(os.path.join(GR, 'props', f + '.png'), f'scenes/plat/grotto/{f}.png')
    gts = Image.open(os.path.join(GR, 'tileset.png')).convert('RGBA')
    save(gts.crop((128, 64, 176, 160)), 'scenes/plat/grotto/pillar.png'); save(gts.crop((96, 64, 112, 80)), 'scenes/plat/grotto/lava-top.png'); save(gts.crop((96, 80, 112, 96)), 'scenes/plat/grotto/lava.png')
    # ---- Bosses.png: Snail Tank + Horned Serpent
    BS = Image.open(os.path.join(B2, 'Bosses.png')).convert('RGBA')
    def snail(box):
        c = BS.crop(box); px = c.load()
        body = Image.new('RGBA', c.size, (0, 0, 0, 0)); bp = body.load()         # the shell without the green cannon → alignment
        for y in range(c.height):
            for x in range(c.width):
                r, gg, b, a = px[x, y]
                if a and not (gg > r + 20 and gg > b): bp[x, y] = px[x, y]
        bb = body.getbbox(); cv = Image.new('RGBA', (80, 64), (0, 0, 0, 0))
        cv.paste(c, (66 - bb[2], 62 - bb[3])); return cv
    S8 = {'s1': (7, 6, 62, 45), 's2': (66, 8, 119, 44), 's3': (123, 1, 170, 45), 's4': (185, 4, 234, 45), 's5': (55, 58, 102, 108), 's6': (108, 58, 155, 108), 's7': (175, 66, 230, 104), 's8': (5, 118, 55, 154)}
    F = {k: snail(b) for k, b in S8.items()}
    # the rolling shell: the tucked-in frame cut to a round ball (holes filled, a dark rim)
    c7 = BS.crop(S8['s7']); p7 = c7.load(); R = 15; ball = Image.new('RGBA', (2 * R + 2, 2 * R + 2), (0, 0, 0, 0)); pb = ball.load()
    for y in range(2 * R + 2):
        for x in range(2 * R + 2):
            sx, sy = x - R - 1 + 33, y - R - 1 + 23; d = ((x - R - 1) ** 2 + (y - R - 1) ** 2) ** .5
            if d > R: continue
            q = p7[sx, sy] if 0 <= sx < c7.width and 0 <= sy < c7.height else (0, 0, 0, 0)
            if not q[3] or q[1] > q[0] + 20: q = (96, 56, 22, 255)
            pb[x, y] = q if d < R - 1 else (24, 18, 22, 255)
    cv = Image.new('RGBA', (80, 64), (0, 0, 0, 0)); cv.paste(ball, (40 - R - 1, 62 - 2 * R - 2))
    grid_sheet('snail', {'idle': [F['s1']], 'move': [F['s1'], F['s2']], 'raise': [F['s3'], F['s4']], 'fire': [F['s5'], F['s6']], 'hide': [F['s7']], 'hurt': [F['s8']], 'shell': [cv]}, 'bosses/snail/snail.png')
    def holes_white(c):                                                         # the serpent's eye is a see-through hole → white
        w, h = c.size; px = c.load(); out = set(); st = [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
        while st:
            x, y = st.pop()
            if (x, y) in out or not (0 <= x < w and 0 <= y < h) or px[x, y][3]: continue
            out.add((x, y)); st += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        for y in range(h):
            for x in range(w):
                if not px[x, y][3] and (x, y) not in out: px[x, y] = (255, 255, 255, 255)
        return c
    SP = {'head0': (351, 167, 381, 189), 'head1': (337, 199, 367, 222), 'head2': (339, 229, 369, 253), 'body': (382, 172, 457, 190), 'dead': (362, 272, 456, 292),
          'fin1': (377, 194, 394, 204), 'fin2': (410, 194, 423, 204), 'fin3': (377, 210, 393, 221), 'fin4': (410, 211, 425, 220)}
    for k, b in SP.items(): save(holes_white(BS.crop(b)) if k.startswith('head') else BS.crop(b), f'bosses/serpent/{k}.png')
    # bubble projectile strip (6 rings, 16 x 16 cells) and the snail's shell (a plain rolling shell = hide frame)
    rings = [(343, 120, 349, 127), (352, 116, 362, 127), (367, 111, 381, 127), (389, 111, 403, 127), (406, 111, 420, 127), (423, 111, 437, 127)]
    s = Image.new('RGBA', (16 * 6, 16), (0, 0, 0, 0))
    for i, b in enumerate(rings): c = BS.crop(b); s.paste(c, (i * 16 + (16 - c.width) // 2, (16 - c.height) // 2))
    save(s, 'bosses/serpent/bubble.png'); fx['bubble'] = {'img': 'bosses/serpent/bubble.png', 'fw': 16, 'fh': 16, 'n': 6}
    print('batch 2 ok')

with open(os.path.join(ROOT, 'js', 'plat', 'monster-sheets.js'), 'w') as f:
    f.write('/* GENERATED by tools/plat-import-monsters.py — do not edit by hand (re-run the script instead).\n'
            '   CC0 monsters: Monsters Creatures Fantasy 1 + 2 by LuizMelo · Gothicvania Swamp / Town by ansimuz · Hell Hound by ansimuz (CC-BY 3.0) · Bosses sheet (CC0) — see scenes/plat/CREDITS.txt.\n'
            '   Every strip faces LEFT like the other enemies. */\n')
    f.write("(function (G) { 'use strict';\nG.PLAT = G.PLAT || {};\n")
    f.write('G.PLAT.MONSTER_SHEETS = ' + json.dumps(sheets, separators=(',', ':')) + ';\n')
    f.write('G.PLAT.MONSTER_FX = ' + json.dumps(fx, separators=(',', ':')) + ';\n')
    f.write("})(typeof window !== 'undefined' ? window : globalThis);\n")
print('wrote js/plat/monster-sheets.js')
