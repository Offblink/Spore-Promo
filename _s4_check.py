# -*- coding: utf-8 -*-
"""S4 返工验收量测：内容 x 分布 / 字幕白条 bbox / 手机与 GUI 下缘 / GUI 文字实测像素高。"""
import sys
from PIL import Image

BG = (244, 246, 253)


def delta(p):
    return abs(p[0] - BG[0]) + abs(p[1] - BG[1]) + abs(p[2] - BG[2])


def analyze(name):
    im = Image.open('public/out/%s.png' % name).convert('RGB')
    W, H = im.size
    pd = im.load()
    print('\n===== %s (%dx%d) =====' % (name, W, H))

    # --- 1) 内容 x 分布（全帧，步长 3 行） ---
    cols = []
    for x in range(W):
        n = 0
        for y in range(0, H, 3):
            if delta(pd[x, y]) > 18:
                n += 1
        cols.append(n)
    xs = [x for x, n in enumerate(cols) if n > 3]
    print('内容 x 范围: %d..%d' % (min(xs), max(xs)))
    left = sum(1 for x in range(960) if cols[x] > 3)
    right = sum(1 for x in range(960, W) if cols[x] > 3)
    print('左半(0..959) 有内容的列数=%d   右半(960..1919)=%d' % (left, right))
    print('分段密度（每 60px 有内容列数）:')
    row = []
    for x0 in range(0, W, 60):
        row.append('%4d:%d' % (x0, sum(1 for v in cols[x0:x0 + 60] if v > 3)))
    for i in range(0, len(row), 8):
        print('   ' + ' '.join(row[i:i + 8]))

    # --- 2) 字幕白条 bbox（min>=250 的最长连续段） ---
    best = None
    bar_rows = []
    for y in range(800, 1040):
        run = 0; start = 0; bs = None; be = None; best_run = 0
        for x in range(W):
            if min(pd[x, y]) >= 250:
                if run == 0: start = x
                run += 1
                if run > best_run:
                    best_run = run; bs = start; be = x
            else:
                run = 0
        if be is not None and be - bs >= 150:
            bar_rows.append((y, bs, be))
            if best is None or (be - bs) > (best[2] - best[1]):
                best = (y, bs, be)
    if bar_rows:
        ys = [r[0] for r in bar_rows]
        print('字幕白条: y %d..%d  x %d..%d（最长行 y=%d）' %
              (min(ys), max(ys), min(r[1] for r in bar_rows), max(r[2] for r in bar_rows), best[0]))
        bar_x0 = min(r[1] for r in bar_rows)
        bar_top = min(ys)
    else:
        print('字幕白条: 本帧无字幕'); bar_x0 = 10 ** 9; bar_top = 10 ** 9

    # --- 3) 关键列的下缘（沿列从下往上找第一个非 bg） ---
    for tag, x in [('phone列 x=500', 500), ('GUI列 x=1400', 1400), ('中缝列 x=900', 900)]:
        yb = None
        for y in range(H - 1, 400, -1):
            if delta(pd[x, y]) > 12:
                yb = y; break
        # 再找"实内容"（delta>60）下缘，排除淡投影
        yb2 = None
        for y in range(H - 1, 400, -1):
            if delta(pd[x, y]) > 60:
                yb2 = y; break
        print('%s: 最后非bg y=%s   最后实内容(delta>60) y=%s' % (tag, yb, yb2))

    # --- 4) y=100 处的横向段（同步卡是否压机身） ---
    y = 100
    segs = []; s = None
    for x in range(W):
        if delta(pd[x, y]) > 18:
            if s is None: s = x
        else:
            if s is not None and x - s > 6: segs.append((s, x - 1))
            s = None
    print('y=100 实体段: %s' % segs)

    # --- 5) GUI 文字实测（选中行粉字 + 下一行深色标题） ---
    # GUI box x1060..1850 y180..822；裁切 (0,84)-(288,318) → K=790/288=2.7431
    K = 790.0 / 288
    def box(lx0, ly0, lx1, ly1):
        return (int(1060 + lx0 * K), int(180 + (ly0 - 84) * K),
                int(1060 + lx1 * K), int(180 + (ly1 - 84) * K))
    tests = [
        ('粉选中行 标题「第7题」', box(38, 182, 200, 205), 'pink'),
        ('下一行 标题「定积分换元」', box(38, 233, 200, 254), 'dark'),
        ('按钮「批量选择/退出选择」', box(150, 100, 275, 130), 'dark'),
    ]
    for tag, (x0, y0, x1, y1), kind in tests:
        x0 = max(0, x0); y0 = max(0, y0); x1 = min(W - 1, x1); y1 = min(H - 1, y1)
        rows = []
        for y in range(y0, y1):
            n = 0
            for x in range(x0, x1):
                r, g, b = pd[x, y]
                if kind == 'pink':
                    if r > 170 and g < 150 and b > 60 and b < 200: n += 1
                else:
                    if r < 150 and g < 150 and b < 150: n += 1
            if n >= 3: rows.append(y)
        if rows:
            # 分段取最大连续段
            segs = [[rows[0], rows[0]]]
            for y in rows[1:]:
                if y - segs[-1][1] <= 2: segs[-1][1] = y
                else: segs.append([y, y])
            segs.sort(key=lambda s: s[1] - s[0])
            s = segs[-1]
            print('%s: ink 高 = %d px（y %d..%d；box %d..%d）' %
                  (tag, s[1] - s[0] + 1, s[0], s[1], y0, y1))
        else:
            print('%s: 未测到 ink（box %d..%d x %d..%d）' % (tag, y0, y1, x0, x1))


for n in (sys.argv[1:] or ['S4-a', 'S4-e', 'S4-b', 'S4-c', 'S4-d']):
    try:
        analyze(n)
    except Exception as e:
        print('%s 失败: %r' % (n, e))
