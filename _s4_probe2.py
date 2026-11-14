# -*- coding: utf-8 -*-
"""导出 GUI 源图的查看用裁片 + 修正 S4-d 内容 x 分布（bg=#F4F6FD）。"""
from PIL import Image

base = 'public/textures/'
a = Image.open(base + 'gui-records@2x.png').convert('RGB')
b = Image.open(base + 'gui-records-select@2x.png').convert('RGB')
out = 'public/out/'

# 1) 整图缩略
a.resize((1200, 750), Image.LANCZOS).save(out + '_s4_gui_full.png')
b.resize((1200, 750), Image.LANCZOS).save(out + '_s4_gui_full_sel.png')

# 2) 左栏（源 0..620, 0..1800）两版并排，缩到 400 宽
rail_a = a.crop((0, 0, 620, 1800))
rail_b = b.crop((0, 0, 620, 1800))
comp = Image.new('RGB', (1240, 1800), (255, 255, 255))
comp.paste(rail_a, (0, 0))
comp.paste(rail_b, (620, 0))
comp.resize((744, 1080), Image.LANCZOS).save(out + '_s4_rail_cmp.png')

# 3) 左栏上半（源 y 300..1400）细节 1:1 缩放 1.5x
det = Image.new('RGB', (1240, 1100), (255, 255, 255))
det.paste(a.crop((0, 300, 620, 1400)), (0, 0))
det.paste(b.crop((0, 300, 620, 1400)), (620, 0))
det.save(out + '_s4_rail_detail.png')

# 4) S4-d 内容 x 分布（正确 bg）
d = Image.open('public/out/S4-d.png').convert('RGB')
pd = d.load()
W, H = d.size
BG = (244, 246, 253)
cols = []
for x in range(W):
    n = 0
    for y in range(0, H, 3):
        r, g, bl = pd[x, y]
        if abs(r - BG[0]) + abs(g - BG[1]) + abs(bl - BG[2]) > 18:
            n += 1
    cols.append(n)
xs = [x for x, n in enumerate(cols) if n > 3]
print('S4-d 内容 x: %d..%d' % (min(xs), max(xs)))
print('分段（每 60px 一格，数字=该格有内容的采样行数/360）:')
for x0 in range(0, W, 60):
    seg = cols[x0:x0 + 60]
    c = sum(1 for n in seg if n > 3)
    bar = '#' * (c // 10)
    print('  %4d-%4d %3d %s' % (x0, min(x0 + 60, W), c, bar))
