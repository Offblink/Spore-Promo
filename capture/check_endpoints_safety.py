# -*- coding: utf-8 -*-
"""本卡新增产物的数据安全自查（只读）。

扫：新脚本 ×2 + README + 桥数据（由 seed.json 生成的替身）+ 全部手机/桌面 PNG。
规则：真实用户名、本机用户目录、api key、真实模型串、邮箱、手机号。
退出码 0 = 全过。
"""
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
CAP = HERE.parent
TARGETS = [
    HERE / "capture_mobile.py",
    HERE / "capture_gui.py",
    HERE / "list_textures.py",
    HERE / "README.md",
    HERE / "seed.json",
]
# 真实用户目录 / 真实模型串 / key 前缀 / 邮箱 / 手机号
RULES = [
    ("本机用户目录", re.compile(r"C:\\Users\\[^\\\s\"]+")),
    ("api key 前缀", re.compile(r"\b(sk|ak|pk)-[A-Za-z0-9]{8,}|AIza[0-9A-Za-z_-]{20,}")),
    ("真实模型串", re.compile(r"\b(gpt-[0-9o]|claude-[0-9a-z]|gemini-[0-9]|qwen[0-9.-]|deepseek-|llama[0-9]|glm-[0-9])", re.I)),
    ("邮箱", re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.(com|cn|net|org)")),
    ("手机号", re.compile(r"(?<!\d)1[3-9]\d{9}(?!\d)")),
]

hits = 0
for p in TARGETS:
    text = p.read_text(encoding="utf-8")
    found = []
    for name, rx in RULES:
        for m in rx.finditer(text):
            # README 里贴重跑命令用的仓库绝对路径，属「操作说明」而非产物数据，单列出来
            found.append((name, m.group(0)[:60]))
    if found:
        print("[HIT ] %s" % p.name)
        for name, s in found:
            print("       %-12s %s" % (name, s))
            hits += 1
    else:
        print("[OK  ] %s" % p.name)

print("\n命中合计: %d" % hits)
print("模型名出现次数（应全部是「演示模型」）:", sum(
    t.count("演示模型") for t in (p.read_text(encoding="utf-8") for p in TARGETS)))
for w in ("gpt", "claude", "gemini", "deepseek", "OpenAI", "Anthropic", "apiKey="):
    n = sum(p.read_text(encoding="utf-8").count(w) for p in TARGETS)
    if n:
        print("  注意: %r 出现 %d 次" % (w, n))
raise SystemExit(0 if hits == 0 else 1)
