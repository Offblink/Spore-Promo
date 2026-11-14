# -*- coding: utf-8 -*-
"""S4 验收量测 v2：字幕白条 bbox / 手机与 GUI 下缘 / 选中行标题 ink（更严格的取样窗）。"""
import sys
from PIL import Image

BG = (244, 246, 253)
K = 790.0 / 288  # GUI 显示宽 / 裁切逻辑宽


def near_white(p):
    return min(p) >= 250


def analyze(name):
    im = Image.open('public/out/%s.png' % name).convert('RGB')
    W, H = im.size
    pd = im.load()
    print('\n===== %s =====' % name)

    # 1) 字幕白条：只认 x500..1400 里 ≥600px 连续 near-white 的行
    rows = []
    for y in range(760, 1060):
        run = 0; bs = be = None; best = 0; b0 = None
        for x in range(500, 1450):
            if near_white(pd[x, y]):
                if run == 0: b0 = x
                run += 1
                if run > best: best = run; bs = b0; be = x
            else:
                run = 0
        if best >= 600:
            rows.append((y, bs, be))
    if rows:
        print('字幕白条 bbox: y %d..%d  x %d..%d' %
              (min(r[0] for r in rows), max(r[0] for r in rows),
               min(r[1] for r in rows), max(r[2] for r in rows)))
        bar_top = min(r[0] for r in rows)
    else:
        print('字幕白条: 本帧没有')
        bar_top = None

    # 2) 下缘：手机（x=500，白屏底）、GUI（x=1400，窗口白底）
    for tag, x in [('手机白屏底 x=500', 500), ('GUI 窗口底 x=1400', 1400)]:
        last = None
        for y in range(H - 1, 300, -1):
            if near_white(pd[x, y]):
                last = y; break
        print('%s 最后 near-white y=%s' % (tag, last))

    # 3) GUI 选中行/相邻行 ink（严格取样窗，排除勾选圈与星标）
    for tag, lx0, ly0, lx1, ly1, kind in [
        ('粉选中行标题「第7题 …」', 85, 182, 210, 208, 'pink'),
        ('相邻行标题「定积分换元」', 85, 233, 210, 256, 'dark'),
        ('日期 09-27 14:32（选中行）', 130, 206, 260, 224, 'gray'),
    ]:
        x0 = max(0, int(1060 + lx0 * K)); x1 = min(W - 1, int(1060 + lx1 * K))
        y0 = max(0, int(180 + (ly0 - 96) * K)); y1 = min(H - 1, int(180 + (ly1 - 96) * K))
        ys = []
        for y in range(y0, y1):
            n = 0
            for x in range(x0, x1):
                r, g, b = pd[x, y]
                if kind == 'pink':
                    if r > 170 and g < 150 and 60 < b < 200: n += 1
                elif kind == 'dark':
                    if r < 150 and g < 150 and b < 150: n += 1
                else:
                    if r < 200 and g < 200 and b < 210 and abs(r - b) < 80: n += 1
            if n >= 3: ys.append(y)
        if ys:
            segs = [[ys[0], ys[0]]]
            for y in ys[1:]:
                if y - segs[-1][1] <= 3: segs[-1][1] = y
                else: segs.append([y, y])
            segs.sort(key=lambda s: s[1] - s[0])
            s = segs[-1]
            print('%s: 实测 ink 高 = %d px（y %d..%d）｜有效字高 = 14×%.4f = %.1f px' %
                  (tag, s[1] - s[0] + 1, s[0], s[1], K, 14 * K))
        else:
            print('%s: 未测到（窗 x%d..%d y%d..%d）' % (tag, x0, x1, y0, y1))


for n in (sys.argv[1:] or ['S4-a', 'S4-e', 'S4-b', 'S4-c', 'S4-d']):
    try:
        analyze(n)
    except Exception as e:
        print('%s 失败: %r' % (n, e))
