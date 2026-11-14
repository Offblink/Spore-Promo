# -*- coding: utf-8 -*-
"""S4 返工探针：GUI 源图尺寸 / 选中行位置 / 当前 S4-d 内容 x 分布。"""
import io, sys, json
from PIL import Image

base = 'public/textures/'
a = Image.open(base + 'gui-records@2x.png').convert('RGB')
b = Image.open(base + 'gui-records-select@2x.png').convert('RGB')
print('gui-records@2x', a.size, 'select', b.size)

# 差异图：找选中行（粉底）
from PIL import ImageChops
diff = ImageChops.difference(a, b)
bbox = diff.getbbox()
print('diff bbox (source px):', bbox)

# 按行统计差异像素，找出粉色行的 y 范围
w, h = a.size
pa = a.load(); pb = b.load()
rows = {}
for y in range(h):
    n = 0
    for x in range(0, w, 4):
        if abs(pa[x, y][0] - pb[x, y][0]) + abs(pa[x, y][1] - pb[x, y][1]) + abs(pa[x, y][2] - pb[x, y][2]) > 24:
            n += 1
    if n:
        rows[y] = n
if rows:
    ys = sorted(rows)
    print('diff rows y: %d..%d (%d rows)' % (ys[0], ys[-1], len(ys)))
    # 分段
    segs = []
    s = ys[0]; p = ys[0]
    for y in ys[1:]:
        if y - p > 3:
            segs.append((s, p)); s = y
        p = y
    segs.append((s, p))
    print('segments:', segs)
    for (s, e) in segs:
        xs = [x for y in range(s, e + 1) for x in range(0, w, 4)
              if abs(pa[x, y][0] - pb[x, y][0]) + abs(pa[x, y][1] - pb[x, y][1]) + abs(pa[x, y][2] - pb[x, y][2]) > 24]
        if xs:
            print('  seg y %d..%d  x %d..%d (源px)  = 逻辑 x %d..%d y %d..%d' %
                  (s, e, min(xs) * 4, max(xs) * 4, min(xs) * 4 // 2, max(xs) * 4 // 2, s // 2, e // 2))

# 左栏（逻辑 x 0..288 → 源 0..576）的行结构：找每行文字的 y 带
print('\n== 左栏（源 x 0..576）暗像素行分布（文字带） ==')
bands = []
run = None
for y in range(h):
    dark = 0
    for x in range(0, 576, 2):
        r, g, bl = pa[x, y]
        if r < 160 and g < 160 and bl < 160:
            dark += 1
    if dark >= 3:
        if run is None:
            run = [y, y]
        else:
            run[1] = y
    else:
        if run and run[1] - run[0] >= 4:
            bands.append(tuple(run))
        run = None
if run:
    bands.append(tuple(run))
for (s, e) in bands[:40]:
    print('  y %d..%d 源 (%d px高)  逻辑 y %d..%d (%d px高)' % (s, e, e - s + 1, s // 2, e // 2, (e - s + 1) // 2))

# 当前 S4-d 内容 x 分布
try:
    d = Image.open('public/out/S4-d.png').convert('RGB')
    print('\nS4-d', d.size)
    pd = d.load()
    W, H = d.size
    cols = []
    for x in range(W):
        n = 0
        for y in range(0, H, 4):
            r, g, bl = pd[x, y]
            # 非 bg（bg 近似 --bg）：偏离 bg 色
            if abs(r - 24) + abs(g - 27) + abs(bl - 47) > 24:
                n += 1
        cols.append(n)
    xs = [x for x, n in enumerate(cols) if n > 2]
    print('内容 x 范围: %d..%d' % (min(xs), max(xs)))
    # 每 100px 段的内容密度
    for x0 in range(0, W, 120):
        seg = cols[x0:x0 + 120]
        print('  x %4d..%4d : %d' % (x0, min(x0 + 120, W), sum(1 for n in seg if n > 2)))
except Exception as ex:
    print('S4-d 读取失败', ex)
