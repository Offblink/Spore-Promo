#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""手机端采集：真 Chromium 渲染 Spore-Mobile 的 WebView 页面，落 3x PNG。

桥名从哪来
----------
`assets/web/common.js` 第 4 行原文：`JS → 原生：window.Spore.<method>(...)，即各页宿主对象`。
即桥名是 **`window.Spore`**，方法名逐页不同（record/panel/main/settings 各自一套）。
`common.js:25` 的 `call()` 就是 `var f = window.Spore && window.Spore[method]`，
所以只要在页面脚本跑之前塞一个同名对象即可——用 `context.add_init_script()`
（比 `addJavascriptInterface` 早、比页面 inline script 早，页面一加载就能用）。

为什么要替身：这些页面在真机里靠 Android `addJavascriptInterface("Spore", host)`
拿 JSON 字符串；没有原生的浏览器里 `window.Spore` 是 undefined，页面就停在空态。
替身返回**与原生同形状的 JSON 字符串**（不是对象——`common.js` 会 `JSON.parse`）。

视口 360×800 / device_scale_factor=3 → 成品 1080×2400。
页面经过 `http.server`（127.0.0.1:8732）而不是 file://，避开 file:// 的跨源限制。

跑法：
    python spore-promo/capture/capture_mobile.py
产出（public/textures/）：
    mob-record@3x.png          mob-record.png
    mob-record-select@3x.png   mob-record-select.png
    mob-panel@3x.png           mob-panel.png
    mob-main@3x.png            mob-main.png
    mob-settings-sync@3x.png   mob-settings-sync.png
    外加 assets/question.png（给桌面端右栏当「题图」，由 fixtures/question.html 渲出）
"""

from __future__ import annotations

import functools
import http.server
import json
import shutil
import threading
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROMO = HERE.parent
OUT = PROMO / "public" / "textures"
FIX = HERE / "fixtures"
# 题图落在 assets/ 而不是 fixtures/：fixtures/ 被 check_safety.py 逐个 glob 当**文本**读，
# 放个 PNG 进去会让那个脚本 UnicodeDecodeError（不碰别人的脚本，改自己的落点）。
ASSETS = HERE / "assets"
KIT = PROMO.parent.parent / "spore-kit"
MOBILE_WEB = KIT / "Spore-Mobile" / "app" / "src" / "main" / "assets" / "web"

PORT = 8732
W, H, DPR = 360, 800, 3
SETTLE_MS = 600
EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"

SEED = json.loads((HERE / "seed.json").read_text(encoding="utf-8"))


# ---------------------------------------------------------------- seed → 桥数据
def epoch_ms(when: str) -> int:
    """'09-27 14:32' → epoch ms（原生 VO 里就是这个单位；固定 2025 年保证可重跑）。"""
    dt = datetime(2025, int(when[0:2]), int(when[3:5]), int(when[6:8]), int(when[9:11]))
    return int(dt.timestamp() * 1000)


def mobile_state(seed: dict) -> dict:
    """record.js / panel.js 的 VO 口径（与原生 SessionMeta / Session 同形）。"""
    metas, by_id = [], {}
    for s in seed["sessions"]:
        ts = epoch_ms(s["when"])
        metas.append({
            "id": s["id"],
            "title": s["title"],
            "updated": ts,
            "fav": bool(s.get("fav")),
            "subjectId": s.get("sub") or "",
        })
        msgs = []
        for m in s["messages"]:
            if m.get("role") == "user":
                msgs.append({"role": "user", "kind": "answer", "text": m.get("text", "")})
                continue
            v = m.get("verify") or {}
            msgs.append({
                "role": "bot",
                "kind": m.get("kind", "answer"),
                "no": "" if m.get("no") is None else str(m["no"]),
                "ans": m.get("ans", ""),
                "why": m.get("why", ""),
                "think": m.get("think", ""),
                "thinkOpen": False,
                "tools": m.get("tools", []),
                "verifyRan": bool(v.get("ran")),
                "verifySkipped": bool(v.get("skipped")),
                "verifyPending": bool(v.get("pending")),
                "verifyVerdict": v.get("verdict", ""),
                "verifyNote": v.get("note", ""),
            })
        by_id[s["id"]] = {
            "id": s["id"],
            "title": s["title"],
            "fav": bool(s.get("fav")),
            "subjectId": s.get("sub") or "",
            "updated": ts,
            "messages": msgs,
        }
    return {
        "metas": metas,
        "byId": by_id,
        "first": by_id[metas[0]["id"]],
        "subjects": [{"id": x["id"], "name": x["name"]} for x in seed["subjects"]],
        "model": seed.get("model", "演示模型"),
    }


# 桥替身：方法名逐个对齐 common.js/record.js/panel.js/main.js/settings.js 的调用点。
# 一律返回 **JSON 字符串**（原生 addJavascriptInterface 的返回类型），common.js 会 parse。
STUB = r"""
window.__SPORE__ = %s;
(function () {
  var D = window.__SPORE__;
  var J = function (v) { return JSON.stringify(v); };
  window.Spore = {
    ready: function () {
      return J({ sessions: D.metas, subjects: D.subjects,
                 session: D.first, busy: false,
                 running: ["sess-001"], overlay: true, projection: true,
                 endpoint: 'https://example.invalid/v1/chat',
                 model: D.model, apiKey: '', proxy: '',
                 maxToolRounds: 5, historyLimit: 10,
                 fastNoThink: true, autoVerify: true, panelRender: 'web' });
    },
    sessions: function () { return J({ sessions: D.metas, subjects: D.subjects }); },
    state: function () { return J({ session: D.byId[D.metas[0].id], sessions: D.metas, busy: false }); },
    session: function (id) { return J(D.byId[id] || null); },
    pairInfo: function () {
      return J({ paired: true, nick: '演示电脑', api: '演示网关',
                 lastSyncAt: %d, lastSyncMsg: '已同步 11 条记录 · 3 个科目' });
    },
    logRead: function () { return ''; },
    logClear: function () { return true; },
    logCopy: function () { return true; },
    image: function () { return ''; },
    fav: function () { return true; },
    rename: function () { return true; },
    'delete': function () { return true; },
    subjAssign: function () { return true; },
    subjCreate: function () { return true; },
    subjRename: function () { return true; },
    subjDelete: function () { return true; },
    followup: function () { return true; },
    stop: function () { return true; },
    toggleBall: function () { return true; },
    photoSearch: function () { return true; },
    reauth: function () { return true; },
    save: function () { return true; },
    close: function () { return true; }
  };
})();
"""


# ------------------------------------------------------------------- http server
def serve(directory: Path, port: int) -> http.server.ThreadingHTTPServer:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


# ---------------------------------------------------------------------- capture
def shot(page, name: str) -> None:
    """同一帧写两份：`<name>@3x.png`（本卡命名）+ `<name>.png`（layout.json 沿用的旧名）。"""
    for n in (name + "@3x.png", name + ".png"):
        page.screenshot(path=str(OUT / n))
    print("  shot %-22s %dx%d" % (name + "@3x.png", W * DPR, H * DPR))


def settle(page, ms: int = SETTLE_MS) -> None:
    page.evaluate("() => document.fonts.ready")
    page.wait_for_timeout(ms)


def capture_mobile(p) -> None:
    mob = mobile_state(SEED)
    stub = STUB % (json.dumps(mob, ensure_ascii=False), epoch_ms("09-27 14:35"))

    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    ctx = browser.new_context(
        viewport={"width": W, "height": H},
        device_scale_factor=DPR,
        is_mobile=True,
        has_touch=True,
        locale="zh-CN",
        reduced_motion="reduce",
    )
    ctx.add_init_script(stub)          # ← 桥在页面任何脚本之前就位
    page = ctx.new_page()
    page.set_default_timeout(20000)
    base = "http://127.0.0.1:%d" % PORT

    def go(name: str) -> None:
        page.goto(f"{base}/{name}", wait_until="load")
        settle(page)

    try:
        # 1) 记录页默认态
        go("record.html")
        page.wait_for_selector("#rows .rrow", timeout=15000)
        print("  record rows:", page.locator("#rows .rrow").count(),
              "| chips:", page.locator("#subBar .chip, #subBar > *").count())
        shot(page, "mob-record")

        # 2) 记录页多选涂抹中：长按第一行进模式，再勾两张
        rows = page.locator("#rows .rrow")
        b = rows.first.bounding_box()
        page.mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)
        page.mouse.down()
        page.wait_for_timeout(900)      # 长按阈值
        page.mouse.up()
        page.wait_for_timeout(300)
        for i in (1, 2):
            rows.nth(i).click()
            page.wait_for_timeout(150)
        settle(page, 300)
        print("  selecting:", page.locator("#batchbar").is_visible(),
              "| checked:", page.locator("#rows .rrow.on").count())
        shot(page, "mob-record-select")

        # 3) 抽屉面板：题 + 答案 + 核实
        go("panel.html")
        shot(page, "mob-panel")

        # 4) 首页
        go("main.html")
        shot(page, "mob-main")

        # 5) 设置页滚到「配对与同步」
        go("settings.html")
        page.evaluate(
            """() => {
                const t = [...document.querySelectorAll('.group-title')]
                    .find(e => e.textContent.includes('配对与同步'));
                if (t) t.scrollIntoView({block: 'start', behavior: 'instant'});
            }"""
        )
        settle(page, 300)
        shot(page, "mob-settings-sync")
    finally:
        ctx.close()
        browser.close()


def render_question(p) -> None:
    """把 fixtures/question.html 渲成 assets/question.png（桌面端右栏的「题图」）。
    纯本地、无网络、无模型调用。"""
    out = ASSETS / "question.png"
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    ctx = browser.new_context(viewport={"width": 720, "height": 420},
                              device_scale_factor=2, locale="zh-CN")
    page = ctx.new_page()
    try:
        page.goto((FIX / "question.html").as_uri(), wait_until="load")
        page.evaluate("() => document.fonts.ready")
        page.wait_for_timeout(500)
        page.screenshot(path=str(out))
        print("  assets/question.png", page.viewport_size)
    finally:
        ctx.close()
        browser.close()


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    print("[mobile] 360x800 @3x → %dx%d" % (W * DPR, H * DPR))
    httpd = serve(MOBILE_WEB, PORT)
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            capture_mobile(p)
            if (FIX / "question.html").exists():
                render_question(p)
    finally:
        httpd.shutdown()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
