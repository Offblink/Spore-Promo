#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""桌面端采集：真跑 spore-gui 的 `RecordsPane`，喂 fixture 数据，落 2x PNG。

路线（卡的「推荐路线」= 路线 B：不碰后端，直接喂数据）
--------------------------------------------------------
`RecordsPane(api, parent=None)` 的 `__init__` 末尾会 `load_categories()` + `reload()`，
各起一个 QThread 通过 `api` 取数。这里给一个 `StubApi`：`articles()` / `category_tree()`
返回**空**结构（线程立刻正常返回，不报错），随后用 `_on_cats()` / `_on_rows()` 把
`seed.json` 里的虚构数据直接灌进 widget。屏幕上是产品自己的 QWidget 树真渲染，
不是手绘、不是拼图。

三个本机实测要点（Planner 复现过，缺一个就白屏或崩）
--------------------------------------------------
1. **不要设 `QT_QPA_PLATFORM`** —— 本机 offscreen 插件是坏的（退出码 0xC0000409），
   默认 `windows` 平台正常。脚本开头会主动 `os.environ.pop`。
2. **必须 `show()` + `processEvents()` 再 `render()`** —— 不 show 渲染出来全白。
3. **2x 走 `QPixmap(w*2,h*2)` + `setDevicePixelRatio(2)` + `widget.render(pm)`**，
   `grab()` 只按逻辑像素出图拿不到 2x。

跑法：
    python spore-promo/capture/capture_gui.py
产出：
    spore-promo/public/textures/gui-records@2x.png        (2880×1800)
    spore-promo/public/textures/gui-records-select@2x.png (2880×1800，多选态)
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path

# ── 关键 1：本机 offscreen 插件坏，必须走默认 windows 平台 ────────────────
os.environ.pop("QT_QPA_PLATFORM", None)

HERE = Path(__file__).resolve().parent
PROMO = HERE.parent
OUT = PROMO / "public" / "textures"
KIT = PROMO.parent.parent / "spore-kit"
CLIENT = KIT / "spore-gui" / "client"
SEED = json.loads((HERE / "seed.json").read_text(encoding="utf-8"))

LOGIC_W, LOGIC_H = 1440, 900
SCALE = 2


def stamp(when: str) -> str:
    """'09-27 14:32' → '2025-09-27 14:32:00'。

    `records.py::_fmt_stamp` 直接切字符串 `s[5:16]`（MV3 review.js 同款），
    所以要喂**字符串**时间戳；喂 epoch 毫秒会在界面上原样印出 13 位数字。
    固定 2025 年 + 固定串 → 重跑像素级一致。
    """
    return f"2025-{when[0:2]}-{when[3:5]} {when[6:11]}:00"


class StubApi:
    """ApiClient 替身：不打网络、不碰数据库。

    - `articles()` / `category_tree()` 返回空结构 → `__init__` 里起的两个线程
      正常结束，不会因 None 炸在槽函数里。
    - 其余方法一律返回 None（`update_article` 之类不会被触发）。
    """

    def articles(self, **_kw):
        return {"page": 1, "size": 200, "list": [], "total": 0}

    def category_tree(self):
        return []

    def resolve_attachment(self, path: str):
        return path if path and Path(path).exists() else ""

    def __getattr__(self, _name):
        def _noop(*_a, **_kw):
            return None

        return _noop


def build_cats() -> list[dict]:
    return [
        {"id": s["id"], "name": s["name"], "depth": 0, "status": 1, "sort": i}
        for i, s in enumerate(SEED["subjects"])
    ]


def build_rows(shot_path: str = "") -> list[dict]:
    rows = []
    for i, s in enumerate(SEED["sessions"]):
        ts = stamp(s["when"])
        msgs = [dict(m) for m in s["messages"]]
        if shot_path and i == 0:
            msgs[0]["imagePath"] = shot_path     # 首条会话带题图 → 右栏出「题图」
        rows.append(
            {
                "id": s["id"],
                "title": s["title"],
                "categoryId": s.get("sub") or "",
                "fav": 1 if s.get("fav") else 0,
                "status": s.get("status", "idle"),
                "updateTime": ts,
                "createTime": ts,
                "messages": msgs,
            }
        )
    return rows


def settle(app, n: int = 15) -> None:
    for _ in range(n):
        app.processEvents()


def render_to(app, pane, out: Path) -> tuple[int, int, float]:
    """QPixmap(w*2,h*2) + dpr 2 + render(pm)：真正的 2x 位图。"""
    from PySide6.QtCore import QSize
    from PySide6.QtGui import QPixmap

    settle(app, 6)
    pm = QPixmap(QSize(LOGIC_W * SCALE, LOGIC_H * SCALE))
    pm.setDevicePixelRatio(SCALE)
    pm.fill(0)
    pane.render(pm)
    out.parent.mkdir(parents=True, exist_ok=True)
    if not pm.save(str(out), "PNG"):
        raise RuntimeError("QPixmap.save 失败：" + str(out))
    return pm.width(), pm.height(), pm.devicePixelRatio()


def main() -> int:
    if str(CLIENT) not in sys.path:
        sys.path.insert(0, str(CLIENT))

    import spore_client.records as rec
    from PySide6.QtWidgets import QApplication

    app = QApplication.instance() or QApplication([])

    # 题图：可选。capture/assets/question.png 存在才用（capture_mobile.py 里
    # 用 Playwright 把 question.html 渲出来放这儿），没有就右栏不出图。
    shot = HERE / "assets" / "question.png"
    shot_path = str(shot) if shot.exists() else ""

    pane = rec.RecordsPane(StubApi())
    pane.resize(LOGIC_W, LOGIC_H)
    pane.show()                       # 关键 2
    settle(app)

    cats = build_cats()
    rows = build_rows(shot_path)
    pane.current_id = rows[0]["id"]   # 让 _on_rows 保留选中 → 右栏出详情
    pane._expanded = {cats[0]["id"], cats[1]["id"]}   # 前两个科目展开，露出成员行
    pane._on_cats(cats)
    settle(app)
    pane._on_rows({"list": rows, "total": len(rows)})
    settle(app, 20)

    out1 = OUT / "gui-records@2x.png"
    print("gui-records@2x %dx%d dpr=%s" % render_to(app, pane, out1))

    # 多选态：与手机/扩展同一套语义（点「批量选择」进模式，勾 3 张 → 底部批量栏）
    try:
        pane._set_selecting(True)
        settle(app, 3)
        by_id = {c._id: c for c in pane._session_cards}
        for _id in [r["id"] for r in rows[:3]]:
            card = by_id.get(_id)
            if card is not None:
                pane._set_checked(card, True)
        settle(app, 10)
        out2 = OUT / "gui-records-select@2x.png"
        print("gui-records-select@2x %dx%d dpr=%s" % render_to(app, pane, out2))
        print("selected:", sorted(pane._multi))
    except Exception as exc:                       # 多选是加分项，失败不拖垮主图
        print("select-state skipped:", type(exc).__name__, exc)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
