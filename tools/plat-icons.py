#!/usr/bin/env python3
"""Build public/items/plat/icons.png — the Platform Mode item atlas (16 px cells).

Source: "16x16 Assorted RPG Icons" by Shade, CC0 — https://opengameart.org/content/16x16-assorted-rpg-icons
Usage:  python3 tools/plat-icons.py <folder with potions.png, books.png, chests.png, consumables.png ...>

ICONS keeps the atlas order. The cell index of each entry is what items.js puts in `spr`
(col = i % COLS, row = i // COLS), so only ever APPEND new entries.
"""
import os, sys
from PIL import Image

COLS = 8
# (atlas key, source sheet, source col, source row)
ICONS = [
    ('potS',   'potions',     3, 1),   # small red potion
    ('potL',   'potions',     3, 4),   # big round red potion
    ('elixir', 'potions',     6, 10),  # golden flask
    ('frost',  'potions',    10, 4),   # round ice-blue flask
    ('meteor', 'books',       3, 11),  # gold tome with a red gem
    ('goblet', 'consumables', 22, 11), # golden goblet
    ('chest',  'chests',      4, 1),   # map treasure chest
]

def main():
    src = sys.argv[1] if len(sys.argv) > 1 else '.'
    rows = (len(ICONS) + COLS - 1) // COLS
    out = Image.new('RGBA', (COLS * 16, rows * 16), (0, 0, 0, 0))
    sheets = {}
    for i, (key, sheet, c, r) in enumerate(ICONS):
        if sheet not in sheets:
            sheets[sheet] = Image.open(os.path.join(src, sheet + '.png')).convert('RGBA')
        out.paste(sheets[sheet].crop((c * 16, r * 16, c * 16 + 16, r * 16 + 16)), ((i % COLS) * 16, (i // COLS) * 16))
        print(f'{key:8s} -> spr [{i % COLS}, {i // COLS}]')
    dst = os.path.join(os.path.dirname(__file__), '..', 'public', 'items', 'plat', 'icons.png')
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    out.save(dst, optimize=True)
    print('wrote', os.path.normpath(dst), out.size)

if __name__ == '__main__':
    main()
