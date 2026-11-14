#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""数据安全自查：扫 seed.json / layout.json / fixtures / 脚本里会进画面的文本。

红线（卡里写的）：不得出现真实 key、真实账号、C:\\Users\\... 路径、真实邮箱、真实手机号；
模型名一律「演示模型」。扫到任何一条就退出码 1。

    python spore-promo\\capture\\check_safety.py
"""

from __future__ import annotations

import io
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROMO = HERE.parent
TEXTURES = PROMO / "public" / "textures"

TARGETS = [
    HERE / "seed.json",
    TEXTURES / "layout.json",
    *sorted((HERE / "fixtures").glob("*.*")),
]

# (标签, 正则, 说明)
RULES = [
    ("用户名路径", re.compile(r"[A-Za-z]:\\\\?Users|/Users/|/home/[a-z]"), "本机绝对路径"),
    ("邮箱", re.compile(r"[\w.+-]+@[\w-]+\.[A-Za-z]{2,}"), "真实邮箱"),
    ("手机号", re.compile(r"(?<![\d.])1[3-9]\d{9}(?![\d.])"), "中国大陆手机号"),
    ("密钥前缀", re.compile(r"\b(sk|pk|ak)-[A-Za-z0-9_\-]{12,}"), "API key"),
    ("密钥字段名", re.compile(r'"(api_?key|apiKey|authorization|token)"\s*:\s*"[^"]+"', re.I),
     "非空密钥字段"),
    ("真实厂商", re.compile(r"deepseek|openai|anthropic|azure|aliyun|qwen|gpt-4|claude", re.I),
     "真实厂商 / 模型名"),
    ("本地端口", re.compile(r"\b(3306|6379|5432)\b"), "数据库端口（后端地址线索）"),
]

# 模型名白名单：出现「模型」字段时只允许 演示模型
MODEL_OK = "演示模型"


def main() -> int:
    bad = 0
    print(f"扫描 {len(TARGETS)} 个文本产物 + 2 个脚本\n")
    for path in TARGETS + [HERE / "capture.py", HERE / "gui_capture.py"]:
        if not path.exists():
            print(f"  [skip] {path.name} 不存在")
            continue
        text = io.open(path, encoding="utf-8").read()
        hits = []
        for label, rx, why in RULES:
            for m in rx.finditer(text):
                snip = m.group(0).replace("\n", " ")[:60]
                # 「name@2x.png」这类素材命名不是邮箱，别误报
                if label == "邮箱" and snip.lower().endswith(
                        (".png", ".jpg", ".jpeg", ".webp", ".json", ".html")):
                    continue
                hits.append(f"{label}（{why}）: {snip!r}")
        if path.name == "seed.json":
            for m in re.finditer(r'"(model|演示模型)"\s*:\s*"([^"]*)"', text):
                if m.group(2) != MODEL_OK:
                    hits.append(f"模型名越界: {m.group(2)!r}（应一律 {MODEL_OK}）")
        if hits:
            bad += len(hits)
            print(f"  [HIT] {path.name}")
            for h in hits:
                print(f"        - {h}")
        else:
            print(f"  [OK ] {path.name}")

    print()
    if bad:
        print(f"未通过：{bad} 处命中")
        return 1
    print("通过：0 处命中（无本机路径 / 邮箱 / 手机号 / key / 真实厂商名）")
    print(f"模型名：全文仅「{MODEL_OK}」")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
