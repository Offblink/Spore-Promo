# Spore 宣传片 · 阶段 4 素材采集

把 **Spore 三端（浏览器扩展 / 手机 WebView / 桌面 GUI）** 的真实界面渲染成 2x/3x 纹理，
外加元素级 bbox，供 Remotion 镜头（PageCam 平面贴图 + 元素切片）直接使用。

一条命令重跑全部：

```bat
cd "C:\Users\37549\Desktop\Vibe Coding\useful\Pot"
python spore-promo\capture\capture.py
```

退出码 0 = 全部成功（允许「已声明的降级」，见下）。日志逐行打在 stdout，同时落到
`capture/_log/run.log`。

---

## 1. 依赖

| 依赖 | 版本/路径 | 用在哪 |
|---|---|---|
| Python | 3.13 | 本脚本 |
| playwright | 1.61.0 | 扩展 / 手机两段 |
| Microsoft Edge | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` | 两段共用同一个 Chromium 内核（卡里验过 headless + MV3 可加载） |
| PySide6 | 6.10.2 | 桌面 GUI 段（**本机不可用**，见 §5） |
| qfluentwidgets | 已装 | 同上 |

三端源码一律**只读**：脚本不写、不 pull、不 clean `spore-kit\{Spore,Spore-Mobile,spore-gui}`。
临时浏览器 profile 落在 `capture/_profile_ext` / `capture/_profile_mob`（可随时删）。

## 2. 产出

`spore-promo/public/textures/`：

| 文件 | 尺寸 | 页面 | 状态 / 触发方式 |
|---|---|---|---|
| `ext-review-default.png` | 2880×1800 | `review.html` | 默认态：左 3 科目（高数 3 / 线代 2 / 英语 2）+ 4 条未分组会话；右栏作答历史（含 KaTeX 公式 + 一张表 + ✗ 初答有误 + ✓ 与初答一致） |
| `ext-review-fav.png` | 2880×1800 | 同上 | 点顶部 `.seg-b「收藏」` → 只剩 2 条收藏行 |
| `ext-review-batch.png` | 2880×1800 | 同上 | 点 `#selBtn`（批量选择）→ 勾 3 张卡 → 底栏「已选 3 项 / 全选 / 收藏 / 移入科目 / 删除」 |
| `ext-review-subject.png` | 2880×1800 | 同上 | 点 `#list .sub`（高数）→ 展开露出 3 条缩进成员行（半开半合） |
| `ext-options.png` | 2880×1800 | `options.html` | 设置页默认（左索引 + 设置卡） |
| `ext-drawer.png` | 2880×1800 | 题目页 fixture + 抽屉 | 抽屉展开（右缘 420px），含「核实 ✗ 初答有误」块 |
| `ext-drawer-closed.png` | 2880×1800 | 同上 | 抽屉收起，只剩右缘半圆角 |
| `mob-record.png` | 1080×2400 | `record.html` | 列表：chips「未分组 / 高数 / 线代 / 英语」（**没有「全部」**）+ 底部玻璃导航 |
| `mob-record-select.png` | 1080×2400 | 同上 | 长按进多选 + 勾 3 张 → 底栏「已选 3 / 全选 / 收藏 / 移入科目 / 删除」 |
| `mob-panel.png` | 1080×2400 | `panel.html` | 抽屉：题 + 答案 + KaTeX + FIX 核实块 + 表格 |
| `mob-main.png` | 1080×2400 | `main.html` | 首页：`Spore.` 字标 + 「悬浮球运行中」胶囊 |
| `mob-settings-sync.png` | 1080×2400 | `settings.html` | 滚到「配对与同步」卡片（已配对 · 演示电脑） |
| `gui-login@1x.png` | 652×536 | 桌面端登录窗 | **退路素材**（真实登录页截图），见 §5 |

`layout.json`（同目录）：`pages` 记每页 file / pageW / pageH / dpr；`elements` 记
`page + x/y/w/h`，单位 = **CSS px**（截图尺寸 ÷ dpr）。当前 13 页 / 16 个元素，含：

- `ext-row-1`（单条会话行）、`ext-subject-1`（科目行）
- `ext-detail`（右栏滚动容器）、**`ext-detail-content`**（`.msg` 并集 ∩ `#history`，
  即「内容真实包围盒」——右栏 1160px 宽而内容只有 808px，S3 按这个裁才不会带进右边大片空白）
- `ext-verify`（核实块）、`ext-drawer-panel` / `ext-drawer-content` / `ext-drawer-verify`
- `mob-chips` / `mob-topbar` / `mob-row-1` / `mob-batchbar` / `mob-panel-stream` / `mob-main-ball` / `mob-sync`

## 3. 数据从哪来（零模型调用、零 key）

**三端共用同一份 `capture/seed.json`。** 11 条会话 / 3 个科目，全部虚构：

- 科目：高数（第7题 求极限★、定积分换元、极限的等价无穷小）、线代（矩阵的秩、特征值）、英语（虚拟语气、从句）+ 4 条未分组
- 三条「必须做对」的核实态都在：`✗ 初答有误`（sess-001 第7题、sess-011）、
  `⏭ 已跳过 · 初答自评确定`（sess-003、sess-004、sess-006、sess-009）、`✓ 与初答一致`（sess-001 第8题等）
- 时间串固定写 `09-27 14:32` 这类，脚本按固定年 2025 换算成 epoch ms，**重跑像素级一致**
- 模型名一律「演示模型」

三端怎么吃这份数据：

| 端 | 途径 | 是否调模型 |
|---|---|---|
| 扩展 | `sw.evaluate` 把 `spore.index` / `spore.subjects` / `spore.sess.<id>` 写进 `chrome.storage.local`，再 `goto chrome-extension://<id>/review.html` | **否** |
| 手机 | `context.add_init_script` 注入 `window.Spore` 桥替身（`record.js`/`panel.js`/`main.js`/`settings.js` 要的那几个方法），页面走真渲染 | **否** |
| 桌面 | PySide6 直接喂 `_on_cats` / `_on_rows`（路线 B） | **否** |

**端口与 token**：唯一用到的端口是 fixture 静态服务 `127.0.0.1:8731`（`question.html` 给抽屉镜头当底页），
进程内起、跑完 `shutdown()`，不常驻。**全程不需要任何 token / key**，
`tests/e2e.py` 与 `tests/_run/e2e_key` 一次都没读过、没跑过。

## 4. 哪张是构造的

- **`gui-login@1x.png` 是真实截图**（`spore-gui/docs/screenshots/login-page.png`，仓库自带），
  但不是记录页，是退路顶包。
- **其余 12 张都是「真渲染 + 构造数据」**：UI 是产品自己跑的，画面里的会话内容全部由
  `seed.json` 生成。不是手绘、不是拼图。
- `reference`：`Spore/tests/_shots/11-review-page.png`、`19-drawer-katex.png` 只当构图对照，
  内容（e2e 测试题）没有进任何素材。

## 5. 已知降级：桌面 GUI 缺「记录页」素材

`client/spore_client/records.py` 的 `RecordsPane(QWidget)` 在本机**无法实例化**：

```
PySide6 6.10.2 + qfluentwidgets：import 正常，但构造任何 widget 即进程 fastfail
（exit 0xC0000409，无 Python traceback）
```

已确认不是本脚本的问题——最小复现 `qf.SearchLineEdit()`（连 parent 都不传）同样直接终止进程。
`gui_capture.py`（路线 B）因此拿不到一帧，`capture.py` 按卡里的退路处理：

1. 复制仓库自带的**真实**登录页截图 → `gui-login@1x.png`
2. `layout.json` 里该页带 `"constructed": false` 与说明
3. 本 README 在此明确：**缺 GUI 记录页素材**

**没有手绘 GUI。** 若日后修好 Qt（换 PySide6/qfluentwidgets 版本组合），
`python spore-promo\capture\capture.py` 会自动走 `gui-records@2x.png` 那条路，无需改代码。

## 6. 与卡里描述的两处实测偏差（照实记录，不修饰）

1. `--fav-row #FFF9EA`（暖黄底）在当前 `Spore` 构建里**不存在**：收藏视图 `.row.fav` 没有独立底色，
   只有当前选中行有 `.row.active` 的粉色底（`#fff0f7`）。素材按真实渲染出，未手动补色。
2. `layout.json` 的 `ext-detail` 是**滚动容器**（1160×775），真正的文字内容只有 808px 宽
   （`.hist-wrap` max-width 860，两侧 26px padding）——所以另给 `ext-detail-content`，
   S3 取景请用后者。

## 7. 排错

| 现象 | 处理 |
|---|---|
| `serviceworker` 超时 | Edge 在跑别的实例会锁 profile：关掉所有 Edge，或删 `capture/_profile_ext` |
| 扩展 id 每次不同 | 正常（persistent profile 里会稳定；脚本每次都从 `sw.url` 读，不写死） |
| 抽屉是空壳 | 抽屉靠 `chrome.storage` 里的 `spore.index` 自动选第一条会话；确认播种成功（看日志 `extension id=`） |
| GUI 段报 `gui_capture exited 3221226505` | 已知环境问题，走 §5 退路，不影响其余 12 张 |
| 想只重跑手机段 | 临时注释 `capture_extension(...)` 那一行，或复制 `capture_mobile()` 单独调 |

## 8. 数据安全

```bat
python spore-promo\capture\check_safety.py
```

扫 `seed.json` / `layout.json` / `fixtures/question.html` / 两个脚本，规则：本机绝对路径、
邮箱、手机号、密钥前缀与字段、真实厂商名与模型名、数据库端口。当前结果：

```
通过：0 处命中（无本机路径 / 邮箱 / 手机号 / key / 真实厂商名）
模型名：全文仅「演示模型」
```

---

# 9. 手机端 + 桌面端单独重跑（本卡：p-3175e484）

`capture.py` 一次跑三端；手机与桌面另有两个**独立、可单跑**的脚本，不加载扩展、不碰扩展的浏览器 profile。
三个脚本共用同一份 `seed.json`，产物同名互相覆盖也无妨（同一套数据、同一套渲染路径）。

```bat
:: 手机端（Playwright + Edge，5 张）
python spore-promo\capture\capture_mobile.py

:: 桌面端（真跑 spore-gui 的 RecordsPane，2 张）——必须用项目 venv，见 §9.2.1
"C:\Users\37549\Desktop\Vibe Coding\useful\spore-kit\spore-gui\client\.venv\Scripts\python.exe" spore-promo\capture\capture_gui.py

:: 只看尺寸 / 校验和（只读）
python spore-promo\capture\list_textures.py

:: 数据安全扫描
python spore-promo\capture\check_safety.py
```

## 9.1 手机端：桥名从哪来、怎么注入

- **桥名 = `window.Spore`**，不是 `SporeBridge`。出处：`Spore-Mobile/app/src/main/assets/web/common.js`
  第 4 行注释「`JS → 原生：window.Spore.<method>(...)`，即各页宿主对象」，第 25 行
  `var f = window.Spore && window.Spore[method]`。
- 真机里 `WebView.addJavascriptInterface(host, "Spore")` 把它挂上去；纯浏览器里它是 `undefined`，
  页面就停在空态。脚本用 **`context.add_init_script()`** 在页面任何脚本之前塞同名替身
  （早于页面 inline script、早于 `load`，`common.js` 一跑就能用）。
- 替身**返回 JSON 字符串**（原生 `addJavascriptInterface` 的返回类型，`common.js` 会 `JSON.parse`），
  方法名逐页对齐：`ready / sessions / state / session / pairInfo / logRead / logClear / logCopy /
  image / fav / rename / delete / subj* / followup / stop / toggleBall / photoSearch / reauth / save / close`。
- 页面走 `http.server`（`127.0.0.1:8732`，跑完 `shutdown()`），不用 `file://`，避开 file:// 的跨源限制。
- 视口 **360×800 / dpr 3 → 1080×2400**；截图前 `document.fonts.ready` + `wait_for_timeout(600)`，
  上下文另加 `reduced_motion="reduce"` 压掉入场动画。

| 文件 | 尺寸 | 页面 / 状态 | 来源 |
|---|---|---|---|
| `mob-record@3x.png` | 1080×2400 | `record.html` 默认态：chips「未分组 / 高数 / 线代 / 英语」+ 4 条未分组会话 + 3 个科目行 + 底部玻璃导航 | **WebView 渲染** |
| `mob-record-select@3x.png` | 1080×2400 | 长按进多选 → 勾 3 张：顶栏「已选 3 项 / 取消」+ 底栏「已选 3 / 全选 / ★收藏 / 移入科目 / 删除」 | **WebView 渲染** |
| `mob-panel@3x.png` | 1080×2400 | `panel.html` 抽屉：「第7题 求极限」+ KaTeX 公式 + 核实 FIX 块 + 三行方法对照表 | **WebView 渲染** |
| `mob-main@3x.png` | 1080×2400 | `main.html` 首页：`Spore.` 字标 + 「悬浮球运行中 · 点球即截屏」+ 隐藏悬浮球 / 拍照搜题 | **WebView 渲染** |
| `mob-settings-sync@3x.png` | 1080×2400 | `settings.html` 滚到「配对与同步」：已配对·演示电脑 / 重新扫码 / 立即同步 / 取消配对 | **WebView 渲染** |

每张另写一份同名无 `@3x` 的副本（`mob-record.png` 等），因为 `layout.json` 还沿用旧名；
两份**逐字节相同**（md5 见 `list_textures.py` 输出）。

**两处真实差异，没抹平**：

1. chips 是「未分组 + 各科目」，**没有「全部」**——`record.html:35` 的注释也这么写。
   顶栏那个「全部 ⬬ 收藏」是**收藏筛选开关**（`record.html:23-25` 的 `#scopeSwitch`），不是一个 chip。
2. 时间戳按页面自己的格式写成 `2025-09-27 13:48`（`record.js` 的 `fmtStamp`），
   而桌面端是 `09-27 14:32`（`records.py::_fmt_stamp` 只切 `s[5:16]`）。两端格式化本就不同，照实出图。

## 9.2 桌面端：真跑 RecordsPane（路线 B），不是退路

`RecordsPane(api, parent=None)` 的 `__init__` 末尾会 `load_categories()` + `reload()`，各起一个 QThread。
脚本给 `StubApi`：`articles()` / `category_tree()` 返回**空**结构（线程正常结束、不炸槽函数），
然后 `_on_cats(cats)` / `_on_rows({"list": rows, "total": n})` 把 `seed.json` 直接灌进去。
屏幕上是产品自己的 QWidget 树真渲染。

| 文件 | 尺寸 | 内容 | 来源 |
|---|---|---|---|
| `gui-records@2x.png` | 2880×1800 | 左：搜索 + 全部/收藏分段 + 4 条会话卡 + 3 个科目（前两个展开）；右：题图 + 标题 + `idle · 09-27 14:32` + 初答/核实/三行对照表 + 追问栏 | **Qt 真渲染** |
| `gui-records-select@2x.png` | 2880×1800 | 点「批量选择」→ 勾 3 张；左栏底部「已选 3 项 / 全选 / 取消」+「★收藏 / ⇄移入 / ✕删除」 | **Qt 真渲染** |

2x 手法（实测，缺一个就白屏或崩）：

```python
pm = QPixmap(QSize(1440 * 2, 900 * 2))   # 逻辑 1440×900 → 物理 2880×1800
pm.setDevicePixelRatio(2)
pm.fill(0)
pane.render(pm)                          # ← 不是 grab()：grab() 只按逻辑像素出图
```

另需 `pane.show()` + `processEvents()` 再 `render()`（不 show 出来是全白）。
`grab()` 实测只给 1440×900。

题图来自 `capture/assets/question.png`：由 `fixtures/question.html` 用同一个 Edge 渲成 720×420@2x，
再让 `StubApi.resolve_attachment()` 返回它，`article_shot()` 就找得到。**不是拼贴、不是手绘。**
（放 `assets/` 不放 `fixtures/`，因为 `check_safety.py` 把 `fixtures/*.*` 当**文本**逐个读，
丢个 PNG 进去会让它 `UnicodeDecodeError` —— 不改别人的脚本，改自己的落点。）

### 9.2.1 更正：Qt 崩溃的根因不是 `offscreen`

Planner 的评论说「本机 offscreen 插件坏、默认 windows 平台好」。实测**两半都不准**，真因是**绑定混用**：

| 试法 | 结果 |
|---|---|
| 全局 `python`（3.13），不设 `QT_QPA_PLATFORM` | ❌ `0xC0000409`（连只 `PushButton("x")` 都死） |
| 全局 `python` + `QT_QPA_PLATFORM=offscreen` | ❌ 同上 |
| **`spore-gui\client\.venv\Scripts\python.exe`**（设不设 offscreen 都一样） | ✅ 全部出图 |

原因是**两个同名包撞车**：`pip list` 里同时有 `PyQt-Fluent-Widgets 1.11.3` 与 `PyQt6-Fluent-Widgets 1.11.3`，
两者都安装成 `site-packages\qfluentwidgets\` —— **全局 Python 拿到的是 PyQt 版**，而 `spore_client`
全是 `from PySide6.*`。在 PySide6 的 `QApplication` 里构造 PyQt 的 widget → 跨绑定 → fail-fast
`0xC0000409`（无 traceback，`faulthandler` 也抓不到）。项目自带的 `client\.venv` 里那份
`qfluentwidgets` 是 **PySide6 版**，所以一切正常。

结论：**桌面端用 `client\.venv\Scripts\python.exe` 跑，`QT_QPA_PLATFORM` 设不设都行。**
最小复现：

```bat
:: 全局 python：import 正常，构造任意 qfluentwidgets widget 即 0xC0000409
python -c "from PySide6.QtWidgets import QApplication;a=QApplication([]);from qfluentwidgets import PushButton;PushButton('x')"
:: 项目 venv：同一句正常返回 sizeHint
```

`gui-login@1x.png`（652×536，真实登录页截图）是上一轮走退路留下的，**现在不需要了**——
记录页已有真渲染。留着不影响，但别再当桌面端主素材用。

## 9.3 数据安全

`python spore-promo\capture\check_safety.py` → `通过：0 处命中`（扫 `seed.json` / `layout.json` /
`fixtures/question.html` / `capture.py` / `gui_capture.py`）。本卡新增/改动的复核：

| 项 | 结论 |
|---|---|
| 真实用户名 / 账号 | 无。会话内容全来自 `seed.json`（虚构），配对设备名写死「演示电脑」 |
| 绝对路径 | 产物 PNG 里没有任何路径文字；`layout.json` 未改。脚本里有本机 Edge / `.venv` 路径（系统与环境路径，不含用户名），与既有 `capture.py` 同风格 |
| api key / token | 无。桥替身 `apiKey: ''`、`endpoint: 'https://example.invalid/v1/chat'`，全程零网络模型调用 |
| 模型名 | 全文只有「演示模型」 |
| 邮箱 / 手机号 | 无 |
| 真实厂商名 | 无（`example.invalid` 是保留域名） |

## 9.4 两端素材是否同源

同一份 `seed.json`：3 科目（高数 3 / 线代 2 / 英语 2）+ 4 条未分组 = 11 条会话；
标题、时间串、收藏位、核实态三端共用。手机端 4 条未分组会话 = 桌面左栏 4 条未分组卡，
标题逐条对得上（`天空为什么是蓝的` / `条件概率怎么算` / `泰勒展开的余项` / `洛必达的使用条件`）。

**可重跑**：`gui-records@2x.png` 连跑两次 md5 一致（`e8261c2919`）；
`gui-records-select@2x.png` 底栏动效仍在收尾，连跑有极小差异（只影响多选态那张）。
