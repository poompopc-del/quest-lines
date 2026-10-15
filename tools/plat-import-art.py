#!/usr/bin/env python3
"""Platform Mode — import the CC0 art packs used by the world themes (v89).

Reads the ORIGINAL download zips (unmodified, as published) and writes only the files the game uses
into public/scenes/plat/<pack>/, plus enemy sprite strips built from the packs' single-frame PNGs and
the generated sheet table public/js/plat/art-sheets.js. Re-running it gives byte-identical output.

  python3 tools/plat-import-art.py <sunny-land-files.zip> <gothicvania-cemetery-files.zip> \\
                                   <gothicvania church files.zip> <2D Platformer Volcano Pack 1.1 (Tio Aimar).zip>

Packs and licences (checked against each zip's own licence file — copied next to the art):
  Sunny Land               · Luis Zuno (ansimuz) · public domain / CC0   https://opengameart.org/node/74142
  GothicVania Cemetery     · Luis Zuno (ansimuz) · public domain / CC0   https://opengameart.org/node/85024
  GothicVania Church       · Luis Zuno (ansimuz) · public domain / CC0   https://opengameart.org/content/gothicvania-church-pack
  2D Platformer Volcano 1.1 · Tio Aimar          · CC0 1.0              https://opengameart.org/content/2d-platformer-volcano-pack-11
The packs' music is NOT imported (it is the only part that needs credit)."""
import io, json, os, re, sys, zipfile
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
OUT = os.path.join(ROOT, 'public', 'scenes', 'plat')
if len(sys.argv) != 5: sys.exit(__doc__)
Z = {k: zipfile.ZipFile(p) for k, p in zip(['sunny', 'cem', 'church', 'volcano'], sys.argv[1:])}

def member(z, suffix):
    """the one zip member whose path ends with `suffix` (ignores __MACOSX junk)"""
    hits = [n for n in Z[z].namelist() if n.endswith(suffix) and '__MACOSX' not in n]
    if len(hits) != 1: sys.exit(f'{z}: expected 1 file ending {suffix!r}, found {hits}')
    return hits[0]
def img(z, suffix): return Image.open(io.BytesIO(Z[z].read(member(z, suffix)))).convert('RGBA')
def frames(z, folder, prefix):
    pat = re.compile(re.escape(folder) + r'/' + re.escape(prefix) + r'(\d+)\.png$')
    hits = sorted(((int(m.group(1)), n) for n in Z[z].namelist() if '__MACOSX' not in n for m in [pat.search(n)] if m))
    if not hits: sys.exit(f'{z}: no frames {folder}/{prefix}N.png')
    return [Image.open(io.BytesIO(Z[z].read(n))).convert('RGBA') for _, n in hits]
def save(im, rel):
    p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    im.save(p, optimize=True); return 'scenes/plat/' + rel
def copy(z, suffix, rel):
    p = os.path.join(OUT, rel); os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'wb') as f: f.write(Z[z].read(member(z, suffix)))
    return 'scenes/plat/' + rel

# ------------------------------------------------------------------ environments
copy('sunny', 'PNG/environment/layers/back.png', 'sunnyland/back.png')
copy('sunny', 'PNG/environment/layers/middle.png', 'sunnyland/middle.png')
copy('sunny', 'PNG/environment/layers/tileset.png', 'sunnyland/tileset.png')
for n in ['bush', 'tree', 'rock', 'shrooms', 'spikes', 'block', 'crate', 'platform-long', 'house']:
    copy('sunny', f'PNG/environment/props/{n}.png', f'sunnyland/{n}.png')
copy('sunny', 'Sunny-land-assets-files/public-license.txt', 'sunnyland/LICENSE.txt')

for n in ['background', 'mountains', 'graveyard', 'tileset']:
    copy('cem', f'PNG/Environment/{n}.png', f'cemetery/{n}.png')
for n in ['tree-1', 'tree-2', 'tree-3', 'stone-1', 'stone-2', 'stone-3', 'stone-4', 'statue', 'bush-small', 'bush-large']:
    copy('cem', f'PNG/Environment/sliced-objects/{n}.png', f'cemetery/{n}.png')
copy('cem', 'gothicvania-cemetery-files/public-license.txt', 'cemetery/LICENSE.txt')

for n in ['tileset', 'backgrounds', 'column']:
    copy('church', f'ENVIRONMENT/{n}.png', f'church/{n}.png')
copy('church', 'gothicvania church files/public-license.txt', 'church/LICENSE.txt')

for i in range(1, 7): copy('volcano', f'PNG/bg_volcano_layers/bg_volcano_{i}.png', f'volcano/bg_{i}.png')
for n in ['03', '05', '07', '13', '15', '17', '19', '21', '33', '34', '35', '53', '54', '56', '59', '65', '66', '68', '70', '71', '72', '73', '74']:
    copy('volcano', f'PNG/volcano_pack_{n}.png', f'volcano/v{n}.png')
copy('volcano', 'License.txt', 'volcano/LICENSE.txt')

# ------------------------------------------------------------------ enemy strips
# Every engine sheet faces LEFT (enemies.js); right-facing pack sprites are mirrored here.
# Frames are pasted bottom-centred into equal cells, one row; anims = cell indices.
SHEETS = {}
def strip(name, rel, anims, flip=False, feet=None):
    order, idx = [], {}
    for an, ims in anims:
        idx[an] = list(range(len(order), len(order) + len(ims))); order += [(an, im) for im in ims]
    cw = max(im.width for _, im in order); ch = max(im.height for _, im in order)
    sheet = Image.new('RGBA', (cw * len(order), ch), (0, 0, 0, 0))
    for i, (_, im) in enumerate(order):
        if flip: im = im.transpose(Image.FLIP_LEFT_RIGHT)
        sheet.paste(im, (i * cw + (cw - im.width) // 2, ch - im.height), im)
    # feet line = lowest opaque row of the movement frames (death puffs do not count)
    body = [im for an, im in order if an in (feet or ['move', 'idle'])]
    by = max(im.getbbox()[3] + (ch - im.height) for im in body)
    ax = round(cw / 2)
    SHEETS[name] = {'kind': 'grid', 'img': save(sheet, rel), 'cols': len(order), 'fw': cw, 'fh': ch, 'ax': ax, 'by': by, 'anims': idx}

sl_death = frames('sunny', 'PNG/sprites/enemy-death', 'enemy-death-')
strip('opossum', 'sunnyland/opossum.png', [('move', frames('sunny', 'PNG/sprites/opossum', 'opossum-')), ('dead', sl_death)])
frog_idle = frames('sunny', 'PNG/sprites/frog/idle', 'frog-idle-')
strip('frog', 'sunnyland/frog.png', [('idle', frog_idle), ('hop', frames('sunny', 'PNG/sprites/frog/jump', 'frog-jump-')), ('dead', sl_death)], feet=['idle'])

cem_death = frames('cem', 'PNG/Sprites/enemy-death', 'enemy-death-')
skel = frames('cem', 'PNG/Sprites/skeleton', 'skeleton-')
strip('skeleton', 'cemetery/skeleton.png', [('move', skel), ('dead', cem_death)])
strip('skeletonClothed', 'cemetery/skeleton-clothed.png', [('move', frames('cem', 'PNG/Sprites/skeleton-clothed', 'skeleton-clothed-')), ('dead', cem_death)])
strip('spectre', 'cemetery/ghost.png', [('move', frames('cem', 'PNG/Sprites/ghost', 'ghost-')), ('atk', frames('cem', 'PNG/Sprites/ghost-halo', 'ghost-halo-')), ('dead', cem_death)], flip=True)

ch_death = frames('church', 'SPRITES/fx/enemy-death/enemy-death-sprites', 'enemy-death')
strip('ghoul', 'church/burning-ghoul.png', [('move', frames('church', 'SPRITES/burning-ghoul/sprites/v1', 'burning-ghoul-')), ('dead', ch_death)])
strip('angel', 'church/angel.png', [('move', frames('church', 'SPRITES/angel/sprites/idle', 'angel')), ('atk', frames('church', 'SPRITES/angel/sprites/angel-attack', 'angel-attack-')), ('dead', ch_death)])

with open(os.path.join(ROOT, 'public', 'js', 'plat', 'art-sheets.js'), 'w') as f:
    f.write('/* GENERATED by tools/plat-import-art.py — do not edit by hand (re-run the script instead).\n'
            '   Enemy sprite strips cut from the CC0 packs in public/scenes/plat/ (see CREDITS.txt there). */\n'
            "(function (G) { 'use strict';\nG.PLAT.ART_SHEETS = " + json.dumps(SHEETS, indent=1) + ';\n})(typeof window !== \'undefined\' ? window : globalThis);\n')

with open(os.path.join(OUT, 'CREDITS.txt'), 'w') as f:
    f.write("""Platform Mode world art (imported by tools/plat-import-art.py from the original download zips)

sunnyland/  Sunny Land — artwork by Luis Zuno (@ansimuz). Public domain (CC0). Credit not required.
            https://opengameart.org/node/74142
cemetery/   GothicVania Cemetery — artwork by Luis Zuno (@ansimuz). Public domain (CC0). Credit not required.
            https://opengameart.org/node/85024
church/     GothicVania Church — artwork by Luis Zuno (@ansimuz). Public domain (CC0). Credit not required.
            https://opengameart.org/content/gothicvania-church-pack
volcano/    2D Platformer Volcano Pack 1.1 — Tio Aimar. CC0 1.0. Credit not required.
            https://opengameart.org/content/2d-platformer-volcano-pack-11

Each folder keeps the pack's own licence file (LICENSE.txt). The packs' music (which needs credit) is not used.
Enemy strips (opossum, frog, skeleton, skeleton-clothed, ghost, burning-ghoul, angel) are the packs' frames
pasted into one row; ghost frames are mirrored so every sheet faces left like the rest of the game.
""")
print('sheets:', ', '.join(f"{k} {v['cols']}x{v['fw']}x{v['fh']} by{v['by']}" for k, v in SHEETS.items()))
