# -*- coding: utf-8 -*-
"""地基自检：timeline.ts 的时间不变量 + layout.ts 对 layout.json 的保真度。
用法：python verify-ground.py   （零依赖，只读文件，不改任何东西）
"""
import io, json, re, sys

TL = io.open("src/timeline.ts", encoding="utf-8").read()
LY = io.open("src/layout.ts", encoding="utf-8").read()
J = json.load(io.open("public/textures/layout.json", encoding="utf-8"))

fails = []

# ---------- 1. SHOTS 的 from/dur 链 ----------
block = TL[TL.index("export const SHOTS"):TL.index("export const shot =")]
shots = []
for m in re.finditer(r"id: '(S\d)'.*?from: (\d+),\s*dur: (\d+),", block, re.S):
    shots.append((m.group(1), int(m.group(2)), int(m.group(3))))

print("== SHOTS from/dur ==")
print("%-3s %6s %6s %8s" % ("id", "from", "dur", "from+dur"))
for sid, f, d in shots:
    print("%-3s %6d %6d %8d" % (sid, f, d, f + d))

total = sum(d for _, _, d in shots)
contig = all(shots[i][1] + shots[i][2] == shots[i + 1][1] for i in range(len(shots) - 1))
print("\nshots=%d  sum(dur)=%d  contiguous=%s  DURATION=%s" % (
    len(shots), total, contig, re.search(r"DURATION = (\d+)", TL).group(1)))
if len(shots) != 6: fails.append("SHOTS 不是 6 段")
if total != 2100: fails.append("求和 != 2100（实为 %d）" % total)
if not contig: fails.append("from 链不连续")
if shots and shots[-1][1] + shots[-1][2] != 2100: fails.append("末帧 != 2100")

# ---------- 2. 字幕绝对帧 ----------
print("\n== captions（to 为含端点最后一帧 = from+dur-1）==")
caps = []
for m in re.finditer(r"\{\s*text: '([^']+)', from: (\d+), to: (\d+) \}", block):
    caps.append((m.group(1), int(m.group(2)), int(m.group(3))))

for s in re.finditer(r"id: '(S\d)'(.*?)(?=\n  \{|\n\];)", block, re.S):
    sid, body = s.group(1), s.group(2)
    f, d = [(int(a), int(b)) for a, b in re.findall(r"from: (\d+),\s*dur: (\d+)", body)][0]
    cs = sorted([(int(a), int(b)) for a, b in re.findall(r"from: (\d+), to: (\d+)", body)])
    for (a, b) in cs:
        ok = a >= f and b <= f + d
        if not ok:
            fails.append("%s 字幕 [%d,%d] 越出镜头 [%d,%d)" % (sid, a, b, f, f + d))
        print("  %s [%4d,%4d] dur=%3d  %s" % (sid, a, b, b - a + 1, "ok" if ok else "OUT OF SHOT"))
    for i in range(len(cs) - 1):
        if cs[i][1] >= cs[i + 1][0]:
            fails.append("%s 字幕重叠 %s / %s" % (sid, cs[i], cs[i + 1]))
    print("     %s 镜头 [%d,%d) 字幕数=%d 无重叠=%s" % (sid, f, f + d, len(cs),
          all(cs[i][1] < cs[i + 1][0] for i in range(len(cs) - 1))))

# ---------- 3. 渲染帧 → 应在哪一镜、哪句字幕 ----------
FRAMES = [(105, "S1", 105), (360, "S2", 150), (720, "S3", 210),
          (1110, "S4", 180), (1515, "S5", 225), (1920, "S6", 180)]
print("\n== 静帧取帧 → 镜头 / 局部帧 / 字幕 ==")
print("%6s %4s %6s %7s  %s" % ("frame", "shot", "local", "expect", "caption"))
for fr, want_sid, want_local in FRAMES:
    sid = local = None
    for s, f, d in shots:
        if f <= fr < f + d:
            sid, local = s, fr - f
    cap = next((t for t, a, b in caps if a <= fr <= b), "（本帧落在字幕空档）")
    ok = (sid == want_sid and local == want_local)
    if not ok:
        fails.append("frame %d → %s/%s，期望 %s/%s" % (fr, sid, local, want_sid, want_local))
    print("%6d %4s %6s %7s  %s" % (fr, sid, local, want_local, cap))

# ---------- 4. layout.ts vs layout.json ----------
pages_ts = re.findall(r"^\s{2}'([^']+)':\s*\{", LY[LY.index("export const PAGES"):LY.index("export const BBOX")], re.M)
bbox_ts = re.findall(r"^\s{2}'([^']+)':\s*\{", LY[LY.index("export const BBOX"):LY.index("export type PageKey")], re.M)
print("\n== layout.ts ==\nPAGES=%d (json %d)  BBOX=%d (json %d)" % (
    len(pages_ts), len(J["pages"]), len(bbox_ts), len(J["elements"])))
missing_p = [k for k in J["pages"] if k not in pages_ts]
missing_b = [k for k in J["elements"] if k not in bbox_ts]
print("missing pages=%s  missing elements=%s" % (missing_p or "none", missing_b or "none"))
if missing_p: fails.append("layout.ts 缺 page: %s" % missing_p)
if missing_b: fails.append("layout.ts 缺 element: %s" % missing_b)

val_bad = []
for k, v in J["elements"].items():
    want = "x: %s, y: %s, w: %s, h: %s" % (v["x"], v["y"], v["w"], v["h"])
    if want not in LY:
        val_bad.append(k)
for k, v in J["pages"].items():
    if "file: '%s'" % v["file"] not in LY:
        val_bad.append(k + " (file)")
print("数值/文件名与 json 不一致: %s" % (val_bad or "none"))
if val_bad: fails.append("layout.ts 数值漂移: %s" % val_bad)

print("\n---- %s" % ("ALL PASS" if not fails else "FAIL:\n  " + "\n  ".join(fails)))
sys.exit(0 if not fails else 1)
