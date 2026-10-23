#!/usr/bin/env python3
"""v122 — level props as real sprites instead of shapes drawn in code.
Builds public/items/plat/props/*.png from the CC0 downloads in <packs> (default /home/claude/packs):
  coin.png    2 frames 18x18   Kenney "Pixel Platformer" (CC0) tiles 151/152 (face, edge)
  spring.png  2 frames 18x18   Kenney "Pixel Platformer" tiles 107 (rest) / 108 (sprung)
  flag.png    4 frames 18x36   Kenney "Pixel Platformer" flag 111/112 on pole 131; frames 2-3 = the same, greyed (not reached yet)
  sign.png    18x18            Kenney "Pixel Platformer" tile 86 (blank board)
  gem.png     5 frames 15x13   Sunny Land (ansimuz, CC0) gem, recoloured cyan to match the 💎 in the HUD
  sparkle.png 4 frames 32x32   Sunny Land "item-feedback" (pickup sparkle)
  rock.png    28x15            Sunny Land rock prop (falling rocks)
  door.png / door-closed.png   Fort of Illusion (ansimuz, CC0) arched doorway, open / shut (exit)
  bomb.png    3 frames 24x24   Monsters Creatures Fantasy (LuizMelo, CC0) goblin bomb, lit fuse (mortar shells)
  orb.png     3 frames 48x24   PVFX Foundry (nerijs, CC0) "magical projectile" travel frames (water drops)
"""
import json, sys, colorsys, os
from PIL import Image
PK = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/packs'
OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'items', 'plat', 'props')
os.makedirs(OUT, exist_ok=True)
K = Image.open(f'{PK}/gh/cc0/tiles-terrain/pixel-platformer/Tilemap/tilemap_packed.png').convert('RGBA')
def kt(i): c, r = i % 20, i // 20; return K.crop((c * 18, r * 18, c * 18 + 18, r * 18 + 18))
def strip(fr):
    w, h = fr[0].size; s = Image.new('RGBA', (w * len(fr), h))
    for i, f in enumerate(fr): s.paste(f, (i * w, 0))
    return s
def grey(im):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a: l = int(r * .3 + g * .59 + b * .11); px[x, y] = (int(l * .8), int(l * .8), int(l * .85), a)
    return im
strip([kt(151), kt(152)]).save(f'{OUT}/coin.png')
strip([kt(107), kt(108)]).save(f'{OUT}/spring.png')
def flagf(i):
    f = Image.new('RGBA', (18, 36)); f.paste(kt(i), (0, 0)); f.paste(kt(131), (0, 18)); return f
fl = [flagf(111), flagf(112)]
strip(fl + [grey(x.copy()) for x in fl]).save(f'{OUT}/flag.png')
kt(86).save(f'{OUT}/sign.png')
A = f'{PK}/gh/sunny/assets/atlas/'
def atlas(js, png):
    d = json.load(open(A + js)); fr = d.get('frames') or d['textures'][0]['frames']; im = Image.open(A + png).convert('RGBA')
    m = {f['filename']: f['frame'] for f in fr}
    return lambda n: im.crop((m[n]['x'], m[n]['y'], m[n]['x'] + m[n]['w'], m[n]['y'] + m[n]['h']))
a1, a2 = atlas('atlas.json', 'atlas.png'), atlas('atlas-props.json', 'atlas-props.png')
def cyan(im):
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if not a: continue
            h, l, s = colorsys.rgb_to_hls(r / 255, g / 255, b / 255)
            r2, g2, b2 = colorsys.hls_to_rgb(.52, l * .9, max(s, .75))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im
strip([cyan(a1(f'gem/gem-{i}')) for i in range(1, 6)]).save(f'{OUT}/gem.png')
strip([a1(f'item-feedback/item-feedback-{i}') for i in range(1, 5)]).save(f'{OUT}/sparkle.png')
a2('rock').save(f'{OUT}/rock.png')
F = f'{PK}/batch2/fort_of_illusion_files/Fort of Illusion Files/Layers/Props/'
Image.open(F + 'door.png').save(f'{OUT}/door.png'); Image.open(F + 'closed-door.png').save(f'{OUT}/door-closed.png')
B = Image.open(f'{PK}/mcf13/Monster_Creatures_Fantasy(Version 1.3)/Goblin/Bomb_sprite.png').convert('RGBA')
bf = []
for i in range(3):
    f = B.crop((i * 100, 0, i * 100 + 100, 100)); bb = f.getbbox(); cx, cy = (bb[0] + bb[2]) // 2, (bb[1] + bb[3]) // 2
    bf.append(f.crop((cx - 12, cy - 12, cx + 12, cy + 12)))
strip(bf).save(f'{OUT}/bomb.png')
P = f'{PK}/fx/pvfx/effects/magical-projectile/grid/'
S = Image.open(P + 'sprite-sheet.png').convert('RGBA'); man = json.load(open(P + 'manifest.json'))['frames']
of = []
for i in (3, 4, 5):
    m = man[i]; vb = m['visible_bounds']; sx, sy = m['sheet']['x'], m['sheet']['y']
    of.append(S.crop((sx + vb[2] - 48, sy + 36, sx + vb[2], sy + 60)))
strip(of).save(f'{OUT}/orb.png')
for f in sorted(os.listdir(OUT)): print(f, Image.open(f'{OUT}/{f}').size)
