#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""桌面端回答浮窗（Alt+Z 呼出的 AnswerWindow）采集。

调用方（capture.py）负责 SPORE_HOME / SPORE_THEME / 无 QT_QPA_PLATFORM 的窗口模式，
本脚本只落一张 PNG，路径由 argv[1] 给出。

做法：真构造 `AnswerWindow`，用 `on_event()` 喂一串与引擎同形状的事件（题面 → 答案流 → 工具票 → 收尾），
这不是手绘——窗口里每一个像素都是产品自己的 QWidget 树渲出来的；数据全虚构。
窗口尺寸按 Alt+Z 浮窗的实际形态取 420×640。
"""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
CLIENT = HERE.parent.parent.parent / "spore-kit" / "spore-gui" / "client"

W, H = 420, 640


def main() -> int:
    out = Path(sys.argv[1])

    from PySide6.QtWidgets import QApplication  # noqa: E402

    app = QApplication.instance() or QApplication([])

    from spore_client import theme  # noqa: E402

    theme.set_mode(os.environ.get("SPORE_THEME", "light").strip().lower())

    from spore_client.answer.settings import LlmSettings  # noqa: E402
    from spore_client.answer_window import AnswerWindow  # noqa: E402

    win = AnswerWindow(LlmSettings())
    win.resize(W, H)
    win.show()
    app.processEvents()

    events = [
        {"type": "title", "title": "第7题 求极限"},
        {"type": "status", "status": "running", "text": ""},
        {"type": "answer-start"},
        {
            "type": "answer-delta",
            "no": "7",
            "ans": r"$$\lim_{x\to 0}\frac{\sin 3x}{2x}=\frac{3}{2}$$",
            "why": r"当 $x\to0$ 时 $\sin 3x\sim 3x$，代回即得 $\frac{3x}{2x}=\frac{3}{2}$。"
            r"等价无穷小替代只在乘除结构里成立，加减结构要先通分或提公因式。",
        },
        {"type": "tool", "name": "web", "brief": "等价无穷小 常用公式表"},
        {"type": "tool", "name": "verify", "brief": "核对 sin3x 在 x→0 的等价量"},
        {
            "type": "verify-delta",
            "done": True,
            "verdict": "OK",
            "note": "与初答一致：等价无穷小替换合法，极限为 3/2。",
        },
        {"type": "turn-end"},
    ]
    for ev in events:
        win.on_event(ev)
        for _ in range(6):
            app.processEvents()

    for _ in range(20):
        app.processEvents()
        win.repaint()

    from PySide6.QtCore import Qt  # noqa: E402
    from PySide6.QtGui import QPixmap  # noqa: E402

    pm = QPixmap(win.width() * 2, win.height() * 2)
    pm.setDevicePixelRatio(2.0)
    pm.fill(Qt.GlobalColor.transparent)
    win.render(pm)
    out.parent.mkdir(parents=True, exist_ok=True)
    ok = pm.save(str(out), "PNG")
    print(json.dumps({"saved": bool(ok), "path": str(out), "size": [pm.width(), pm.height()], "events": len(events)}, ensure_ascii=False))
    return 0 if ok else 2


if __name__ == "__main__":
    sys.path.insert(0, str(CLIENT)) if str(CLIENT) not in sys.path else None
    raise SystemExit(main())
