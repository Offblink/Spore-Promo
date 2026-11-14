import io, json, re, sys

SPEC = r"spore-promo\design-spec.md"
PLAN = r"spore-promo\plan.json"

spec = io.open(SPEC, encoding="utf-8").read()
plan = json.load(io.open(PLAN, encoding="utf-8"))

print("=== 1. plan.json 求和 ===")
tot = 0
prev_end = None
ok_contig = True
for s in plan["shots"]:
    tot += s["dur"]
    end = s["from"] + s["dur"]
    print("  %-3s from=%-5d dur=%-4d end=%-5d" % (s["id"], s["from"], s["dur"], end))
    if prev_end is not None and s["from"] != prev_end:
        ok_contig = False
    prev_end = end
print("  sum(dur) = %d   durationInFrames = %d   -> %s"
      % (tot, plan["durationInFrames"], "MATCH" if tot == plan["durationInFrames"] else "MISMATCH"))
print("  contiguous = %s   last frame = %d" % (ok_contig, prev_end))
print("  算式: " + " + ".join(str(s["dur"]) for s in plan["shots"]) + " = %d" % tot)

print("\n=== 2. 占位符扫描 ===")
bad = ["TODO", "TBD", "待补", "待定", "XXX", "???", "lorem", "FIXME"]
hits = {b: spec.upper().count(b.upper()) for b in bad}
print("  " + "  ".join("%s=%d" % (k, v) for k, v in hits.items()))
nb = sum(hits.values())
print("  total = %d -> %s" % (nb, "PASS" if nb == 0 else "FAIL"))

print("\n=== 3. 章节（grep '^## '）===")
heads = re.findall(r"(?m)^## .*$", spec)
for h in heads:
    print("  " + h)
print("  count = %d -> %s" % (len(heads), "PASS(8)" if len(heads) == 8 else "FAIL"))

print("\n=== 4. 逐字稿逐句核对（spec 与 plan 都必须含原文）===")
REQ = [
    "一道题在屏幕上。", "你切了几次屏？",
    "同一个 Spore，三个地方。",
    "按科目收好。", "按收藏挑出来。", "想追问，就在原题上问。",
    "手机拍完，电脑上接着看。", "扫一下，两边是一套记录。",
    "它要你自己的 API Key。",
    "因为模型该由你选，不该由平台替你选。",
    "按次计，不包月。你用多少，付多少。",
    "通用助手回答完就走；Spore 把题留下。",
    "题在屏幕上，答案在旁边，记录在手里。",
    "扩展 · Android · Windows", "github.com/Offblink/Spore",
]
plan_blob = json.dumps(plan, ensure_ascii=False)
bad4 = 0
for t in REQ:
    a, b = (t in spec), (t in plan_blob)
    if not (a and b):
        bad4 += 1
    print("  %-4s spec=%-5s plan=%-5s  %s" % ("OK" if (a and b) else "MISS", a, b, t))
print("  miss = %d -> %s" % (bad4, "PASS" if bad4 == 0 else "FAIL"))

print("\n=== 5. 禁用句「一道题，几分钱」===")
print("  spec 命中 = %d -> %s" % (spec.count("几分钱"), "PASS" if spec.count("几分钱") == 0 else "FAIL"))

print("\n=== 6. 分镜表（限定在 §6 区块内取样）===")
m = re.search(r"(?ms)^## 6 分镜表(.*?)^## 7", spec)
block6 = m.group(1) if m else ""
rows6 = [l for l in block6.splitlines() if re.match(r"^\| S\d \|", l)]
for l in rows6:
    print("  cols=%d  %s" % (l.count("|") - 1, l[:36] + "..."))
print("  分镜数据行 = %d -> %s" % (len(rows6), "PASS(6)" if len(rows6) == 6 else "FAIL"))
print("  每行 8 列 = %s" % all((l.count("|") - 1) == 8 for l in rows6))

sys.exit(0 if (tot == 2100 and nb == 0 and len(heads) == 8 and bad4 == 0
               and spec.count("几分钱") == 0 and len(rows6) == 6) else 1)
