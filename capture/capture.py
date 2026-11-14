#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Spore 宣传片 · 三端真实界面素材采集（一条命令重跑全部）。

用法（Windows cmd，仓库根 Pot\\ 下）：
    python spore-promo\\capture\\capture.py

产出：
    spore-promo/public/textures/<name>@2x.png | @3x.png
    spore-promo/public/textures/layout.json      # pages + elements(page,x,y,w,h，单位=CSS px)
    spore-promo/capture/_log/run.log

三端数据同源：全部来自 capture/seed.json（虚构内容，零模型调用、零 key）。
  · 扩展  —— Playwright + Edge(--load-extension)，chrome.storage.local 直接播种
  · 手机  —— 同一 Chromium 引擎真渲染 WebView 页面，注入 window.Spore 桥替身
  · 桌面  —— PySide6 offscreen 真跑 RecordsPane，路线 B（不连后端）
"""

from __future__ import annotations

import functools
import http.server
import json
import os
import shutil
import struct
import subprocess
import sys
import threading
import traceback
from datetime import datetime
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROMO = HERE.parent                      # spore-promo/
POT = PROMO.parent                       # Pot/
KIT = POT.parent / "spore-kit"           # 三端源码（只读）
SPORE = KIT / "Spore"
MOBILE_WEB = KIT / "Spore-Mobile" / "app" / "src" / "main" / "assets" / "web"
GUI_CLIENT = KIT / "spore-gui" / "client"

OUT = PROMO / "public" / "textures"
FIX = HERE / "fixtures"
LOG_DIR = HERE / "_log"
PROFILE_EXT = HERE / "_profile_ext"
PROFILE_MOB = HERE / "_profile_mob"

EDGE = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
FIXTURE_PORT = 8731
SETTLE_MS = 600

# 外观档位：SPORE_THEME=dark 时拍深色一套（文件名加 -dark 后缀，不写 layout.json）。
# 三端都只认 <html data-theme>，所以深色不需要另一条链路，只是截图前换一次档。
THEME = os.environ.get("SPORE_THEME", "light").strip().lower()
if THEME not in ("light", "dark"):
    THEME = "light"
SUFFIX = "" if THEME == "light" else "-dark"

LAYOUT: dict = {"pages": {}, "elements": {}}
ERRORS: list[str] = []
WARNINGS: list[str] = []
LOG_LINES: list[str] = []


# --------------------------------------------------------------------------- log
def log(msg: str) -> None:
    line = f"[{datetime.now().strftime('%H:%M:%S')}] {msg}"
    print(line, flush=True)
    LOG_LINES.append(line)


def fail(where: str, exc: BaseException) -> None:
    msg = f"{where}: {type(exc).__name__}: {exc}"
    log("FAIL " + msg)
    LOG_LINES.append(traceback.format_exc())
    ERRORS.append(msg)


# ----------------------------------------------------------------------- helpers
def png_size(path: Path) -> tuple[int, int]:
    """读 PNG IHDR，避免依赖 Pillow。"""
    with path.open("rb") as fh:
        head = fh.read(26)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        return (0, 0)
    w, h = struct.unpack(">II", head[16:24])
    return (w, h)


def r1(v: float) -> float:
    return round(float(v), 1)


def add_page(key: str, file: str, w: int, h: int, dpr: int) -> None:
    if THEME != "light":
        return  # 深色套只出图：坐标与明色逐像素一致，layout.json 归明色那一次运行所有
    LAYOUT["pages"][key] = {"file": file, "pageW": w, "pageH": h, "dpr": dpr}


def add_el(key: str, page: str, x, y, w, h) -> None:
    if THEME != "light":
        return
    if w is None or h is None or w < 1 or h < 1:
        log(f"  bbox miss {key} (w={w}, h={h})")
        return
    LAYOUT["elements"][key] = {"page": page, "x": r1(x), "y": r1(y), "w": r1(w), "h": r1(h)}
    log(f"  bbox {key}: x={r1(x)} y={r1(y)} w={r1(w)} h={r1(h)}")


def settle(page, ms: int = SETTLE_MS) -> None:
    try:
        page.evaluate("() => document.fonts && document.fonts.ready")
    except Exception:
        pass
    page.wait_for_timeout(ms)


def shot(page, key: str, dpr: int, w: int, h: int) -> None:
    file = f"{key}{SUFFIX}.png"
    if THEME != "light":
        # 扩展页走 SporeTheme.set（同时改 DOM 与 storage，抽屉 host 由 storage.onChanged 跟上）；
        # 手机 WebView 页没有 SporeTheme，直接改 <html data-theme>。
        try:
            page.evaluate(
                "async (t) => { if (window.SporeTheme) await window.SporeTheme.set(t);"
                " else document.documentElement.setAttribute('data-theme', t); }",
                THEME,
            )
        except Exception:
            page.evaluate("(t) => document.documentElement.setAttribute('data-theme', t)", THEME)
        page.wait_for_timeout(550)  # theme-tween 260ms + 抽屉 host 收 storage 事件
    page.screenshot(path=str(OUT / file), animations="disabled", caret="hide")
    add_page(key, file, w, h, dpr)
    pw, ph = png_size(OUT / file)
    log(f"  shot {file} {pw}x{ph}")


def shot_anim(page, key: str, dpr: int, w: int, h: int) -> None:
    """动画帧：保留正在跑的 CSS/JS 动画（启动页的点在飞、字在打），用于抽帧做序列。"""
    file = f"{key}{SUFFIX}.png"
    if THEME != "light":
        try:
            page.evaluate(
                "async (t) => { if (window.SporeTheme) await window.SporeTheme.set(t);"
                " else document.documentElement.setAttribute('data-theme', t); }",
                THEME,
            )
        except Exception:
            page.evaluate("(t) => document.documentElement.setAttribute('data-theme', t)", THEME)
    page.screenshot(path=str(OUT / file), animations="allow", caret="hide")
    # 抽帧序列不登记进 layout.json（41 张是同一页的动画帧，不是 41 个页面）
    pw, ph = png_size(OUT / file)
    log(f"  shot(anim) {file} {pw}x{ph}")


def el_box(page, sel: str, key: str, page_key: str) -> None:
    try:
        loc = page.locator(sel).first
        if loc.count() == 0:
            log(f"  bbox miss {key} (no match {sel})")
            return
        bb = loc.bounding_box()
        if not bb:
            log(f"  bbox miss {key} (not visible)")
            return
        add_el(key, page_key, bb["x"], bb["y"], bb["width"], bb["height"])
    except Exception as exc:
        log(f"  bbox skip {key}: {exc}")


def el_union(page, sel: str, key: str, page_key: str, clip: str | None = None) -> None:
    """多个元素的并集包围盒：取内容真实外框（用于 detail-content）。

    clip 给出视口内可见区域的容器：内容滚动出屏时不产生负坐标，
    裁出来的 bbox 一定落在截图内。
    """
    try:
        bb = page.evaluate(
            """([sel, clipSel]) => {
                const els = [...document.querySelectorAll(sel)];
                const c = clipSel ? document.querySelector(clipSel) : null;
                const cr = c ? c.getBoundingClientRect() : null;
                let x1 = 1e9, y1 = 1e9, x2 = -1e9, y2 = -1e9, n = 0;
                for (const e of els) {
                    const r = e.getBoundingClientRect();
                    if (r.width < 1 || r.height < 1) continue;
                    let ax = r.x, ay = r.y, bx = r.right, by = r.bottom;
                    if (cr) {
                        ax = Math.max(ax, cr.x); ay = Math.max(ay, cr.y);
                        bx = Math.min(bx, cr.right); by = Math.min(by, cr.bottom);
                        if (bx - ax < 1 || by - ay < 1) continue;
                    }
                    x1 = Math.min(x1, ax); y1 = Math.min(y1, ay);
                    x2 = Math.max(x2, bx); y2 = Math.max(y2, by); n++;
                }
                return n ? { x: x1, y: y1, w: x2 - x1, h: y2 - y1 } : null;
            }""",
            [sel, clip],
        )
        if not bb:
            log(f"  bbox miss {key} (empty set {sel})")
            return
        add_el(key, page_key, bb["x"], bb["y"], bb["w"], bb["h"])
    except Exception as exc:
        log(f"  bbox skip {key}: {exc}")


def shadow_box(page, host: str, inner: str, key: str, page_key: str) -> None:
    try:
        bb = page.evaluate(
            """([h, i]) => {
                const el = document.querySelector(h);
                if (!el || !el.shadowRoot) return null;
                const t = el.shadowRoot.querySelector(i);
                if (!t) return null;
                const r = t.getBoundingClientRect();
                return { x: r.x, y: r.y, w: r.width, h: r.height };
            }""",
            [host, inner],
        )
        if not bb:
            log(f"  bbox miss {key}")
            return
        add_el(key, page_key, bb["x"], bb["y"], bb["w"], bb["h"])
    except Exception as exc:
        log(f"  bbox skip {key}: {exc}")


# -------------------------------------------------------------------------- data
def load_seed() -> dict:
    return json.loads((HERE / "seed.json").read_text(encoding="utf-8"))


def epoch_ms(when: str) -> int:
    """'09-27 14:32' → epoch ms（固定 2025 年，保证时间戳稳定可重跑）。"""
    dt = datetime(2025, int(when[0:2]), int(when[3:5]), int(when[6:8]), int(when[9:11]))
    return int(dt.timestamp() * 1000)


def ext_storage(seed: dict) -> dict:
    """chrome.storage.local 三把键：spore.index / spore.subjects / spore.sess.<id>"""
    index, subjects, store = [], [], {}
    for s in seed["subjects"]:
        subjects.append({"id": s["id"], "name": s["name"], "created": epoch_ms("09-01 09:00")})
    for s in seed["sessions"]:
        ts = epoch_ms(s["when"])
        index.append(
            {
                "id": s["id"],
                "title": s["title"],
                "created": ts,
                "updated": ts,
                "count": s.get("count", 1),
                "status": s.get("status", "idle"),
                "unread": bool(s.get("unread")),
                "fav": bool(s.get("fav")),
                "sub": s.get("sub") or None,
            }
        )
        store["spore.sess." + s["id"]] = {
            "id": s["id"],
            "title": s["title"],
            "created": ts,
            "updated": ts,
            "status": s.get("status", "idle"),
            "unread": bool(s.get("unread")),
            "messages": s["messages"],
        }
    data = {"spore.index": index, "spore.subjects": subjects}
    data.update(store)
    return data


def mobile_state(seed: dict) -> dict:
    """手机页桥替身要的形状（record.js / panel.js 的 VO 口径）。"""
    metas, by_id = [], {}
    for s in seed["sessions"]:
        ts = epoch_ms(s["when"])
        metas.append(
            {
                "id": s["id"],
                "title": s["title"],
                "updated": ts,
                "fav": bool(s.get("fav")),
                "subjectId": s.get("sub") or "",
            }
        )
        msgs = []
        for m in s["messages"]:
            if m.get("role") == "user":
                msgs.append({"role": "user", "kind": "answer", "text": m.get("text", "")})
                continue
            v = m.get("verify") or {}
            msgs.append(
                {
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
                }
            )
        by_id[s["id"]] = {
            "id": s["id"],
            "title": s["title"],
            "fav": bool(s.get("fav")),
            "subjectId": s.get("sub") or "",
            "updated": ts,
            "messages": msgs,
        }
    subjects = [{"id": x["id"], "name": x["name"]} for x in seed["subjects"]]
    return {
        "metas": metas,
        "byId": by_id,
        "first": by_id[metas[0]["id"]],
        "subjects": subjects,
        "model": seed.get("model", "演示模型"),
    }


MOBILE_STUB = r"""
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


# ------------------------------------------------------------------ fixture server
def serve_fixtures() -> http.server.ThreadingHTTPServer:
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(FIX))
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", FIXTURE_PORT), handler)
    httpd.daemon_threads = True
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return httpd


# -------------------------------------------------------------------- 扩展 capture
def capture_extension(p, seed: dict) -> None:
    log("[1/3] 浏览器扩展（Edge + MV3，headless，1440x900 @2x）")
    storage = ext_storage(seed)
    ctx = p.chromium.launch_persistent_context(
        str(PROFILE_EXT),
        executable_path=EDGE,
        headless=True,
        args=[
            f"--disable-extensions-except={SPORE}",
            f"--load-extension={SPORE}",
            "--no-first-run",
            "--no-default-browser-check",
        ],
        viewport={"width": 1440, "height": 900},
        device_scale_factor=2,
        accept_downloads=True,
        locale="zh-CN",
    )
    try:
        sw = ctx.service_workers[0] if ctx.service_workers else ctx.wait_for_event(
            "serviceworker", timeout=20000
        )
        ext_id = sw.url.split("/")[2]
        log(f"  extension id = {ext_id}")
        sw.evaluate(
            "async (data) => { await chrome.storage.local.clear();"
            " await chrome.storage.local.set(data); return Object.keys(data).length; }",
            storage,
        )

        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.set_default_timeout(20000)

        # ---------- review.html：默认态 ----------
        page.goto(f"chrome-extension://{ext_id}/review.html", wait_until="load")
        page.wait_for_selector("#list .row, #list .sub", timeout=15000)
        settle(page)
        n_row = page.locator("#list .row").count()
        n_sub = page.locator("#list .sub").count()
        log(f"  review default: {n_sub} subjects / {n_row} rows")
        shot(page, "ext-review-default", 2, 1440, 900)
        el_box(page, "#list .row", "ext-row-1", "ext-review-default")
        el_box(page, "#list .sub", "ext-subject-1", "ext-review-default")
        el_box(page, "#history", "ext-detail", "ext-review-default")
        el_union(page, ".hist-wrap .msg", "ext-detail-content", "ext-review-default",
                 clip="#history")
        el_box(page, ".verify", "ext-verify", "ext-review-default")

        # ---------- 收藏视图 ----------
        page.locator(".seg-b", has_text="收藏").first.click()
        settle(page)
        log(f"  review fav: {page.locator('#list .row').count()} rows")
        shot(page, "ext-review-fav", 2, 1440, 900)

        # ---------- 批量选择：3 张卡被勾 ----------
        page.locator(".seg-b", has_text="全部").first.click()
        settle(page, 200)
        page.click("#selBtn")
        page.wait_for_timeout(250)
        rows = page.locator("#list .row")
        for i in range(min(3, rows.count())):
            rows.nth(i).click()
            page.wait_for_timeout(120)
        log(f"  review batch: selected={page.locator('#list .row.on').count()}"
            f" bar={page.locator('#batchbar').is_visible()}")
        settle(page)
        shot(page, "ext-review-batch", 2, 1440, 900)
        page.click("#selBtn")            # 退出多选
        page.wait_for_timeout(250)

        # ---------- 科目展开（半开半合的中间态）----------
        # 点 .sub 是 toggle：上一次操作可能已把它留在展开态，所以点到 .row.in 出现为止
        page.wait_for_timeout(300)          # 让退出多选后的重绘落地
        members = 0
        for _ in range(3):
            page.locator("#list .sub").first.click()
            page.wait_for_timeout(450)
            members = page.locator("#list .row.in").count()
            if members > 0:
                break
        log(f"  review subject open: members={members}")
        settle(page, 200)
        shot(page, "ext-review-subject", 2, 1440, 900)

        # ---------- options.html ----------
        page.goto(f"chrome-extension://{ext_id}/options.html", wait_until="load")
        settle(page)
        log(f"  options cards: {page.locator('.card').count()}")
        shot(page, "ext-options", 2, 1440, 900)
        el_box(page, "body > .shell > .card:first-of-type, .card", "ext-options-card-1",
               "ext-options")

        # ---------- 抽屉：收起 / 展开 ----------
        page.goto(f"http://127.0.0.1:{FIXTURE_PORT}/question.html", wait_until="load")
        page.wait_for_selector("spore-drawer", state="attached", timeout=15000)
        settle(page)
        shot(page, "ext-drawer-closed", 2, 1440, 900)

        # ---- 抽屉滑出全过程（0.42s cubic-bezier(.16,1,.3,1)）----
        # 直接点 toggle 再截图会有 ~60ms 的截图延迟，第 0 帧已经滑了一半。
        # 这里不点动画：把 #root 的 transition 关掉，按**同一条 bezier**把 transform 打到目标时刻。
        # 元素、曲线、像素都是产品自己的，只是取样时刻精确（t=0 就是完全收起态）。
        for t in range(0, 430, 33):
            page.goto(f"http://127.0.0.1:{FIXTURE_PORT}/question.html", wait_until="load")
            page.wait_for_selector("spore-drawer", state="attached", timeout=15000)
            settle(page, 250)
            if THEME != "light":
                page.evaluate(
                    "async (t) => { if (window.SporeTheme) await window.SporeTheme.set(t);"
                    " else document.documentElement.setAttribute('data-theme', t); }",
                    THEME,
                )
                page.wait_for_timeout(200)
            page.evaluate(
                """(t) => {
                    const h = document.querySelector('spore-drawer');
                    const sh = h && h.shadowRoot;
                    const root = sh && sh.querySelector('#root');
                    if (!root) return;
                    // 与 CSS 里 transition:transform .42s cubic-bezier(.16,1,.3,1) 完全一致
                    const bez = (p1x, p1y, p2x, p2y) => (x) => {
                        if (x <= 0) return 0;
                        if (x >= 1) return 1;
                        let lo = 0, hi = 1, tt = x;
                        for (let i = 0; i < 30; i++) {
                            const cx = 3 * p1x * tt * (1 - tt) ** 2 + 3 * p2x * tt ** 2 * (1 - tt) + tt ** 3;
                            if (cx < x) lo = tt; else hi = tt;
                            tt = (lo + hi) / 2;
                        }
                        return 3 * p1y * tt * (1 - tt) ** 2 + 3 * p2y * tt ** 2 * (1 - tt) + tt ** 3;
                    };
                    const ease = bez(0.16, 1, 0.3, 1);
                    const k = ease(Math.min(1, t / 420));
                    root.style.transition = 'none';
                    root.style.transform = `translateX(${(420 * (1 - k)).toFixed(3)}px)`;
                }""",
                t,
            )
            page.wait_for_timeout(80)
            f_name = f"ext-drawer-open-{t:03d}{SUFFIX}.png"
            page.screenshot(path=str(OUT / f_name), animations="allow", caret="hide")
            log(f"  shot(anim) {f_name}")

        opened = False
        for _ in range(3):
            geo = page.evaluate(
                """() => {
                    const h = document.querySelector('spore-drawer');
                    if (!h || !h.shadowRoot) return null;
                    const p = h.shadowRoot.querySelector('#panel');
                    if (!p) return null;
                    const r = p.getBoundingClientRect();
                    return { x: r.x, w: r.width };
                }"""
            )
            if geo and geo["x"] < 1400:
                opened = True
                break
            page.evaluate(
                """() => {
                    const h = document.querySelector('spore-drawer');
                    const t = h && h.shadowRoot && h.shadowRoot.querySelector('#toggle');
                    if (t) t.click();
                }"""
            )
            page.wait_for_timeout(650)
        log(f"  drawer open = {opened} (panel x={geo and geo['x']})")
        page.wait_for_timeout(400)
        settle(page, 200)
        shot(page, "ext-drawer", 2, 1440, 900)
        shadow_box(page, "spore-drawer", "#panel", "ext-drawer-panel", "ext-drawer")
        shadow_box(page, "spore-drawer", "#stream", "ext-drawer-content", "ext-drawer")
        shadow_box(page, "spore-drawer", "#stream .verify, #stream .vhead",
                   "ext-drawer-verify", "ext-drawer")
        try:
            txt = page.evaluate(
                """() => {
                    const h = document.querySelector('spore-drawer');
                    const s = h && h.shadowRoot && h.shadowRoot.querySelector('#stream');
                    return s ? s.innerText.slice(0, 120) : '';
                }"""
            )
            log(f"  drawer stream head: {txt!r}")
        except Exception as exc:
            log(f"  drawer text read failed: {exc}")
    finally:
        ctx.close()


# ---------------------------------------------------------------------- 手机 capture
def capture_mobile(p, seed: dict) -> None:
    log("[2/3] 手机 WebView（真 Chromium 渲染，360x800 @3x）")
    mob = mobile_state(seed)
    stub = MOBILE_STUB % (
        json.dumps(mob, ensure_ascii=False),
        epoch_ms("09-27 14:35"),
    )
    browser = p.chromium.launch(executable_path=EDGE, headless=True)
    ctx = browser.new_context(
        viewport={"width": 360, "height": 800},
        device_scale_factor=3,
        is_mobile=True,
        has_touch=True,
        locale="zh-CN",
    )
    ctx.add_init_script(stub)
    page = ctx.new_page()
    page.set_default_timeout(20000)
    base = MOBILE_WEB.as_uri()

    def go(name: str) -> None:
        page.goto(f"{base}/{name}", wait_until="load")
        settle(page)

    try:
        # 启动页（splash）：全过程逐帧抽——33ms 一步（≈30fps），0–1320ms 共 41 帧。
        # 片子按 1:1 帧率播回去，就是启动页本身的动画，不是几张静帧摆着。
        for ms in range(0, 1321, 33):
            page.goto(f"{base}/splash.html", wait_until="load")
            page.wait_for_timeout(ms)
            shot_anim(page, f"mob-splash-{ms:04d}", 3, 360, 800)

        # 记录页
        go("record.html")
        page.wait_for_selector("#rows .rrow", timeout=15000)
        log(f"  record rows: {page.locator('#rows .rrow').count()}")
        shot(page, "mob-record", 3, 360, 800)
        el_box(page, "#rows .rrow", "mob-row-1", "mob-record")
        el_box(page, "#subBar", "mob-chips", "mob-record")
        el_box(page, "#listView .topbar", "mob-topbar", "mob-record")

        # 多选涂抹中：长按第一张卡进模式，再勾两张
        rows = page.locator("#rows .rrow")
        b = rows.first.bounding_box()
        page.mouse.move(b["x"] + b["width"] / 2, b["y"] + b["height"] / 2)
        page.mouse.down()
        page.wait_for_timeout(900)          # 长按阈值
        page.mouse.up()
        page.wait_for_timeout(300)
        log(f"  record selecting: bar={page.locator('#batchbar').is_visible()}"
            f" cls={page.evaluate('() => document.getElementById(\"listView\").classList.contains(\"sel\")')}")
        for i in range(1, 3):
            rows.nth(i).click()
            page.wait_for_timeout(150)
        settle(page)
        log(f"  record selected: {page.locator('#rows .rrow.on').count()}")
        shot(page, "mob-record-select", 3, 360, 800)
        el_box(page, "#batchbar", "mob-batchbar", "mob-record-select")

        # 面板（抽屉：题 + 答案）
        go("panel.html")
        page.wait_for_timeout(400)
        shot(page, "mob-panel", 3, 360, 800)
        el_box(page, "#stream", "mob-panel-stream", "mob-panel")

        # 面板 · 原生悬浮窗尺寸（底部起、约半屏）：原生窗口就是给 WebView 这么高，
        # 页面是 100vh 布局，所以按 360×430 重新排版再拍才是「半屏」的真实样子。
        page.set_viewport_size({"width": 360, "height": 430})
        go("panel.html")
        page.wait_for_timeout(500)
        shot(page, "mob-panel-half", 3, 360, 430)
        page.set_viewport_size({"width": 360, "height": 800})

        # 首页（Spore 字标 + 悬浮球）
        go("main.html")
        page.wait_for_timeout(400)
        shot(page, "mob-main", 3, 360, 800)
        el_box(page, "#btnBall", "mob-main-ball", "mob-main")
        el_box(page, "#btnPhoto", "mob-photo-btn", "mob-main")

        # 设置页：滚到「配对与同步」
        go("settings.html")
        page.wait_for_timeout(400)
        page.evaluate(
            """() => {
                const t = [...document.querySelectorAll('.group-title')]
                    .find(e => e.textContent.includes('配对与同步'));
                if (t) t.scrollIntoView({block: 'start', behavior: 'instant'});
            }"""
        )
        page.wait_for_timeout(300)
        settle(page, 200)
        shot(page, "mob-settings-sync", 3, 360, 800)
        el_union(page, "#syncState, #syncHint", "mob-sync", "mob-settings-sync")
    finally:
        ctx.close()
        browser.close()


# ---------------------------------------------------------------------- 桌面 GUI
def capture_gui() -> None:
    log("[3/3] 桌面 GUI（PySide6 offscreen，路线 B：直接喂 _on_cats / _on_rows）")
    name = "gui-records@2x.png" if THEME == "light" else "gui-records-dark@2x.png"
    out = OUT / name
    # ⚠ 必须用工程 venv 的 python：本机「全局」Python 里同时装着 PyQt5，
    # qfluentwidgets 会优先绑到 PyQt5，于是在 PySide6 的 QApplication 下构造任何 widget 都
    # "QWidget: Must construct a QApplication before a QWidget" 并 fastfail（2026-11-14 实测）。
    # 工程的 .venv 只有 PySide6，qfw 绑对，RecordsPane 正常构造。
    venv_py = GUI_CLIENT / ".venv" / "Scripts" / "python.exe"
    py = str(venv_py) if venv_py.exists() else sys.executable
    log(f"  gui python: {py}")
    cmd = [py, str(HERE / "gui_capture.py"), str(out)]
    env = dict(os.environ)
    # **不要**设 QT_QPA_PLATFORM=offscreen：本机 offscreen 插件下 Qt 取不到中文字体，
    # 整页渲染成方框（2026-11-14 实测）。窗口模式 + 手工 2x 位图（gui_capture.py）才是对的。
    env.pop("QT_QPA_PLATFORM", None)
    # 缩放率钉 1：窗口逻辑尺寸才等于 1440×900（本机屏幕 150% 会把窗口压成 ~1496×914@1.5x）。
    # 2x 由 gui_capture.py 手工渲染大位图得到，不依赖系统缩放。
    env["QT_SCALE_FACTOR"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"
    env["SPORE_THEME"] = THEME
    env["SPORE_HOME"] = str(LOG_DIR / "_spore_home")  # 别碰真实 %LOCALAPPDATA%\Spore
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", env=env,
                         cwd=str(GUI_CLIENT), timeout=180)
    log("  gui stdout: " + (res.stdout or "").strip()[-1200:])
    if res.returncode != 0 or not out.exists():
        raise RuntimeError("gui_capture exited %d: %s" % (res.returncode, (res.stderr or "")[-400:]))
    w, h = png_size(out)
    add_page("gui-records", out.name, 1440, 900, 2)
    log(f"  shot {out.name} {w}x{h}")


def capture_gui_answer() -> None:
    """桌面端 Alt+Z 呼出的回答浮窗（AnswerWindow 真构造，喂引擎同形状事件）。"""
    log("[3b/3] 桌面回答浮窗（AnswerWindow，Alt+Z）")
    name = "gui-answer-light@2x.png" if THEME == "light" else "gui-answer-dark@2x.png"
    out = OUT / name
    venv_py = GUI_CLIENT / ".venv" / "Scripts" / "python.exe"
    py = str(venv_py) if venv_py.exists() else sys.executable
    cmd = [py, str(HERE / "gui_capture_answer.py"), str(out)]
    env = dict(os.environ)
    env.pop("QT_QPA_PLATFORM", None)
    env["QT_SCALE_FACTOR"] = "1"
    env["PYTHONIOENCODING"] = "utf-8"
    env["SPORE_THEME"] = THEME
    env["SPORE_HOME"] = str(LOG_DIR / "_spore_home")
    res = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", env=env,
                         cwd=str(GUI_CLIENT), timeout=180)
    if res.returncode != 0 or not out.exists():
        raise RuntimeError("gui_capture_answer exited %d: %s" % (res.returncode, (res.stderr or "")[-400:]))
    log(f"  shot {out.name} {png_size(out)[0]}x{png_size(out)[1]}")


def capture_gui_fallback() -> None:
    """Qt 起不来时的退路（卡里写明的）：用仓库自带的**真实**登录页截图顶上，
    绝不手绘 GUI；同时在 layout.json 与 README 里显式标注「缺 GUI 记录页素材」。"""
    src = KIT / "spore-gui" / "docs" / "screenshots" / "login-page.png"
    dst = OUT / "gui-login@1x.png"
    shutil.copyfile(src, dst)
    w, h = png_size(dst)
    add_page("gui-login", dst.name, w, h, 1)
    LAYOUT["pages"]["gui-login"]["constructed"] = False
    LAYOUT["pages"]["gui-login"]["note"] = (
        "退路素材：真实登录页截图（非构造）。本机 PySide6 6.10.2 + qfluentwidgets "
        "构造任何 widget 即进程 fastfail，RecordsPane 无法实例化 → 缺 GUI 记录页素材。"
    )
    log(f"  fallback shot {dst.name} {w}x{h}（真实登录页；缺 GUI 记录页素材）")


# --------------------------------------------------------------------------- main
def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    LOG_DIR.mkdir(parents=True, exist_ok=True)
    seed = load_seed()
    log(f"seed: {len(seed['sessions'])} sessions / {len(seed['subjects'])} subjects")

    httpd = serve_fixtures()
    try:
        from playwright.sync_api import sync_playwright

        with sync_playwright() as p:
            for name, fn in (
                ("extension", lambda: capture_extension(p, seed)),
                ("mobile", lambda: capture_mobile(p, seed)),
            ):
                try:
                    fn()
                except Exception as exc:
                    fail(name, exc)
    finally:
        httpd.shutdown()

    try:
        capture_gui()
        capture_gui_answer()
    except Exception as exc:
        log(f"WARN gui: {type(exc).__name__}: {exc}")
        LOG_LINES.append(traceback.format_exc())
        WARNINGS.append("gui: RecordsPane 无法实例化 → 走登录页退路（缺 GUI 记录页素材）")
        try:
            capture_gui_fallback()
        except Exception as exc2:
            fail("gui-fallback", exc2)

    if THEME == "light":
        (OUT / "layout.json").write_text(
            json.dumps(LAYOUT, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    (LOG_DIR / "run.log").write_text("\n".join(LOG_LINES), encoding="utf-8")

    pngs = sorted(x.name for x in OUT.glob("*.png"))
    log("")
    log(f"产出 {len(pngs)} 张纹理 + layout.json")
    for n in pngs:
        w, h = png_size(OUT / n)
        log(f"  {n}  {w}x{h}")
    log(f"layout: {len(LAYOUT['pages'])} pages / {len(LAYOUT['elements'])} elements")
    if WARNINGS:
        log(f"降级 {len(WARNINGS)} 项（已在 README 声明）：")
        for w in WARNINGS:
            log("  ~ " + w)
    if ERRORS:
        log(f"失败 {len(ERRORS)} 项：")
        for e in ERRORS:
            log("  - " + e)
        return 1
    log("完成")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
