#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""桌面 GUI 采集：PySide6 offscreen 真跑 RecordsPane（路线 B）。

不连 MySQL、不连后端：构造一个「什么都返回 None」的 ApiClient 替身，
跳过 reload()/load_categories() 的线程，直接把虚构数据喂进 _on_cats() / _on_rows()，
再 grab() 落盘。这样渲染出来的仍然是产品自己的 QWidget 树，不是手绘。

调用方（capture.py）负责设 QT_QPA_PLATFORM=offscreen 与 QT_SCALE_FACTOR=2，
本脚本只落一张 PNG，路径由 argv[1] 给出。
"""

from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
CLIENT = HERE.parent.parent.parent / "spore-kit" / "spore-gui" / "client"
SEED = json.loads((HERE / "seed.json").read_text(encoding="utf-8"))


def epoch_ms(when: str) -> int:
    dt = datetime(2025, int(when[0:2]), int(when[3:5]), int(when[6:8]), int(when[9:11]))
    return int(dt.timestamp() * 1000)


class StubApi:
    """ApiClient 替身：任何属性都返回「返回 None 的可调用对象」。"""

    def __getattr__(self, name):
        def _noop(*_a, **_kw):
            return None

        return _noop


def build_cats() -> list[dict]:
    cats = []
    for i, s in enumerate(SEED["subjects"]):
        cats.append({"id": s["id"], "name": s["name"], "depth": 0, "status": 1, "sort": i})
    return cats


def stamp(when: str) -> str:
    """seed 的 "09-27 14:32" → records.py 期望的 "2025-09-27 14:32:00"（_fmt_stamp 切 [5:16]）。"""
    return f"2025-{when}:00"


def build_rows() -> list[dict]:
    rows = []
    for s in SEED["sessions"]:
        ts = stamp(s["when"])
        rows.append(
            {
                "id": s["id"],
                "title": s["title"],
                "categoryId": s.get("sub") or "",
                "fav": 1 if s.get("fav") else 0,
                "status": s.get("status", "idle"),
                "updateTime": ts,
                "createTime": ts,
                "messages": s["messages"],
            }
        )
    return rows


def main() -> int:
    out = Path(sys.argv[1])

    # QApplication 必须先于任何 Qt 模块导入：qfluentwidgets / records 的模块级代码
    # 会碰 QWidget，逆序会有 "Must construct a QApplication before a QWidget"（2026-11-14 实测）
    from PySide6.QtWidgets import QApplication  # noqa: E402

    app = QApplication.instance() or QApplication([])

    from spore_client import theme  # noqa: E402

    # 一律 set_mode（不是 apply）：SPORE_HOME 的 scratch 里可能留着上一次跑另一套主题时的
    # theme=dark，apply() 会照抄它，导致「跑明色拿到暗色图」（2026-11-14 实测踩到）。
    theme.set_mode(os.environ.get("SPORE_THEME", "light").strip().lower())

    import spore_client.records as rec  # noqa: E402

    pane = rec.RecordsPane(StubApi())
    pane.resize(1440, 900)
    pane.show()
    app.processEvents()

    # 路线 B：绕过线程，直接喂数据
    cats = build_cats()
    rows = build_rows()
    pane.current_id = rows[0]["id"]        # 让 _on_rows 保留选中，右栏出详情
    pane._expanded = {cats[0]["id"], cats[1]["id"]}   # 前两个科目展开（露出成员行）
    pane._on_cats(cats)
    app.processEvents()
    pane._on_rows({"list": rows, "total": len(rows)})
    app.processEvents()

    # 让 qfluentwidgets 的样式与布局结算完
    for _ in range(12):
        app.processEvents()
        pane.repaint()

    from PySide6.QtCore import Qt  # noqa: E402
    from PySide6.QtGui import QPixmap  # noqa: E402

    pm = QPixmap(pane.width() * 2, pane.height() * 2)
    pm.setDevicePixelRatio(2.0)
    pm.fill(Qt.GlobalColor.transparent)
    pane.render(pm)   # 逻辑坐标 → 2x 设备像素；与屏幕缩放率无关，恒为 2880×1800
    out.parent.mkdir(parents=True, exist_ok=True)
    ok = pm.save(str(out), "PNG")
    print(json.dumps({
        "saved": bool(ok),
        "path": str(out),
        "size": [pm.width(), pm.height()],
        "rows": len(rows),
        "cats": len(cats),
        "current": pane.current_id,
    }, ensure_ascii=False))
    return 0 if ok else 2


if __name__ == "__main__":
    sys.path.insert(0, str(CLIENT)) if str(CLIENT) not in sys.path else None
    raise SystemExit(main())
