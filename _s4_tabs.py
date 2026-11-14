# -*- coding: utf-8 -*-
"""导出 S4-d 的 GUI 上缘/行区裁片 + 源图 rail 非白带分布（判断裁切上边缘是否切到控件）。"""
from PIL import Image

im = Image.open('public/out/S4-d.png').convert('RGB')
im.crop((1040, 160, 1870, 420)).save('public/out/_s4_gui_top.png')
im.crop((1040, 380, 1870, 640)).save('public/out/_s4_gui_row.png')

a = Image.open('public/textures/gui-records@2x.png').convert('RGB')
pa = a.load()
prev = None
start = 0
print('rail(x0..279 逻辑) 非白带：')
for y in range(0, 760):
    n = 0
    for x in range(0, 556, 2):
        r, g, b = pa[x, y]
        if not (r > 250 and g > 250 and b > 250):
            n += 1
    c = 'INK' if n >= 3 else 'white'
    if c != prev:
        if prev == 'INK':
            print('  源 y %d..%d = 逻辑 %.1f..%.1f' % (start, y - 1, start / 2, (y - 1) / 2))
        if c == 'INK':
            start = y
        prev = c
print('done')
