# -*- coding: utf-8 -*-
"""临时测量脚本（阶段5-B）：量 S3 左栏科目行 pill 的精确矩形 + S4 手机屏分区。
只读纹理，不改任何素材。跑完可删。"""
from PIL import Image

TEX = 'public/textures/'

def runs(im, x, y0, y1, pred, minlen=2):
    out, start = [], None
    for y in range(y0, y1):
        p = im.convert('RGB').getpixel((x, y))
        if pred(p):
            if start is None:
                start = y
        else:
            if start is not None and y - start >= minlen:
                out.append((start, y - 1))
            start = None
    if start is not None:
        out.append((start, y1 - 1))
    return out

def px(p):
    return '%02X%02X%02X' % p

im = Image.open(TEX + 'ext-review-default.png')  # 2880x1800, dpr2 -> /2 = page px
print('ext-review-default', im.size)
W, H = im.size
# 左栏 pill 底色 --bg #F4F6FD ；白底 --surface #FFFFFF
def is_pill(p):
    r, g, b = p
    return abs(r - 0xF4) < 6 and abs(g - 0xF6) < 6 and abs(b - 0xFD) < 6

col = 200  # page x=100 -> 2x
rr = runs(im, col, 0, 900, is_pill)
print('pill runs @pageX100 (page px):', [(a / 2, b / 2) for a, b in rr])

# 逐 run 量横向范围（page y 取 run 中点）
for a, b in rr:
    ymid = (a + b) // 2
    xs = [x for x in range(0, 700) if is_pill(im.convert('RGB').getpixel((x, ymid)))]
    if xs:
        print('  run y=%.1f..%.1f  x=%.1f..%.1f' % (a / 2, b / 2, min(xs) / 2, max(xs) / 2))

# 输入条（底部粉边框）位置：扫 page y 800..900 找非白
print('\n-- 底部输入条 --')
def not_white(p):
    return sum(p) < 3 * 250
rr = runs(im, 600, 1560, 1800, not_white, 3)
print('notwhite runs @pageX300 y780..900:', [(a / 2, b / 2) for a, b in rr])

mob = Image.open(TEX + 'mob-record.png')
print('\nmob-record', mob.size)
mobsel = Image.open(TEX + 'mob-record-select.png')
print('mob-record-select', mobsel.size)
syn = Image.open(TEX + 'mob-settings-sync.png')
print('mob-settings-sync', syn.size)

gui = Image.open(TEX + 'gui-records@2x.png')
gui2 = Image.open(TEX + 'gui-records-select@2x.png')
print('gui', gui.size, gui2.size)
