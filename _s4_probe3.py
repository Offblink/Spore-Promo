# -*- coding: utf-8 -*-
"""S4 返工探针3：GUI 左栏精确几何（行带/粉色行/字号 ink）+ 栏宽分界。"""
from PIL import Image

a = Image.open('public/textures/gui-records@2x.png').convert('RGB')
b = Image.open('public/textures/gui-records-select@2x.png').convert('RGB')
pa, pb = a.load(), b.load()

# --- 1) 左栏列扫描：取 x=8 源px（栏内最左），按 y 分类背景 ---
print('== 左栏背景分带（源 x=8） ==')
prev = None; start = 0
for y in range(1800):
    r, g, bl = pa[8, y]
    if r > 250 and g > 250 and bl > 250:
        c = 'white'
    elif r > 245 and g > 235 and bl > 240 and not (r > 250 and g > 250 and bl > 250):
        c = 'pink'
    elif abs(r - g) < 6 and abs(g - bl) < 6:
        c = 'gray'
    else:
        c = '(%d,%d,%d)' % (r, g, bl)
    if c != prev:
        if prev is not None and y - start >= 6:
            print('  y %4d..%4d (%3d) %s' % (start, y - 1, y - start, prev))
        prev = c; start = y
print('  y %4d..%4d (%3d) %s' % (start, 1799, 1800 - start, prev))

# --- 2) 粉色行的确切 y 范围（在 x=60 源 处找饱和粉） ---
print('\n== 饱和粉底行（源 x=60，非文字像素） ==')
run = None
for y in range(1800):
    r, g, bl = pa[60, y]
    pink = r > 245 and 215 < g < 245 and 225 < bl < 250
    if pink:
        if run is None: run = [y, y]
        else: run[1] = y
    else:
        if run and run[1] - run[0] > 20:
            print('  源 y %d..%d  = 逻辑 y %.1f..%.1f (h=%.1f)' %
                  (run[0], run[1], run[0] / 2, run[1] / 2, (run[1] - run[0] + 1) / 2))
        run = None

# --- 3) 粉色行内标题文字 ink 高（粉字，源 x 100..560, 行范围内） ---
print('\n== 粉行标题粉字 ink（源） ==')
def ink_rows(loader, y0, y1, x0, x1, test):
    rows = []
    for y in range(y0, y1):
        n = 0
        for x in range(x0, x1):
            if test(loader[x, y]):
                n += 1
        if n >= 3: rows.append(y)
    return rows

is_strong_pink = lambda p: p[0] > 180 and p[1] < 140 and 60 < p[2] < 190
is_dark = lambda p: p[0] < 150 and p[1] < 150 and p[2] < 150

# 先找粉行行范围（用第2步结果覆盖的区域）
for (y0, y1, tag) in [(340, 500, 'pinkrow1')]:
    rows = ink_rows(pa, y0, y1, 60, 560, is_strong_pink)
    if rows:
        print('  %s 粉字 ink 源 y %d..%d = %d 源px = %.1f 逻辑px' %
              (tag, rows[0], rows[-1], rows[-1] - rows[0] + 1, (rows[-1] - rows[0] + 1) / 2))

# 深色行标题（定积分换元）
rows = ink_rows(pa, 440, 540, 60, 560, is_dark)
if rows:
    print('  深色行标题 ink 源 y %d..%d = %d 源px = %.1f 逻辑px' %
          (rows[0], rows[-1], rows[-1] - rows[0] + 1, (rows[-1] - rows[0] + 1) / 2))

# --- 4) 栏/内容区分界 x（源 y=600 处颜色变化） ---
print('\n== x 分界（源 y=600） ==')
prev = None; start = 0
for x in range(0, 1400):
    r, g, bl = pa[x, 600]
    c = '(%d,%d,%d)' % (r, g, bl)
    if c != prev:
        if prev is not None and x - start >= 4:
            print('  x %4d..%4d (%d) %s' % (start, x - 1, x - start, prev))
        prev = c; start = x
print('  x %4d..%4d %s' % (start, 1399, prev))

# --- 5) select 版：粉行里的勾选框/标题是否被截断（文字 ink x 范围） ---
print('\n== select 版 粉行 强粉字 ink x 范围 ==')
xs = []
for x in range(0, 620):
    n = 0
    for y in range(340, 500):
        if is_strong_pink(pb[x, y]): n += 1
    if n >= 3: xs.append(x)
if xs:
    print('  源 x %d..%d = 逻辑 x %.1f..%.1f' % (xs[0], xs[-1], xs[0] / 2, xs[-1] / 2))
