# Spore 宣传片 · 交接存档（2026-11-06 17:2x 叫停）

用户决定先修 Pot 的派活链路（见 `docs\dispatch-issues-20261106.md`），再继续做片子。
本文件保存三张卡的完整意图，修好后可原样重建。

---

## 已完成的部分（不用重做）

### 素材：`spore-promo\public\textures\`

| 文件 | 尺寸 | 内容 |
|---|---|---|
| `ext-review-default.png` | 2880×1800 | 整页搜题记录：左 3 科目 + 7 会话，右作答历史（KaTeX 公式 + 表格 + 两种核实态） |
| `ext-review-fav.png` | 2880×1800 | 切「收藏」后：列表收窄 + 星标变粉，**无暖黄底**（`--fav-row` 未接入 `.row.fav`，见 design-spec §8 第 2 条） |
| `ext-review-batch.png` | 2880×1800 | 批量选择，3 张被勾 |
| `ext-review-subject.png` | 2880×1800 | 科目展开中 |
| `ext-drawer.png` | 2880×1800 | 抽屉展开（题在左、答案在右） |
| `ext-drawer-closed.png` | 2880×1800 | 抽屉收起，只剩右缘半角 |
| `ext-options.png` | 2880×1800 | 设置主页 |
| `mob-record.png` / `mob-record-select.png` | 1080×2400 | 手机记录页默认 / 多选 |
| `mob-panel.png` | 1080×2400 | 手机抽屉 |
| `mob-main.png` | 1080×2400 | 手机首页 |
| `mob-settings-sync.png` | 1080×2400 | 配对与同步卡 |
| `gui-records@2x.png` / `gui-records-select@2x.png` | 2880×1800 | 桌面 RecordsPane |
| `gui-login@1x.png` | 652×536 | 桌面登录页（备选） |
| `layout.json` | — | 元素 bbox 表 |

采集脚本在 `spore-promo\capture\`：`capture.py`（扩展）、`capture_gui.py`、`check_safety.py`、`seed.json`、`fixtures\`。

**已人工抽验**：`ext-review-default.png` 与 `mob-record.png` 内容正确、锐利、数据全虚构。

### 注意
`mob-*.png` 与 `mob-*@3x.png` 是**同名重复**（内容一致），阶段 5 前删掉一套，避免歧义。

---

## 待重建的三张卡

### 卡 A · 设计 spec 成文（8 节 + plan.json，2100 帧）

**标签** `coding`，**角色** `executor`，**优先级** urgent。

产出：
- `spore-promo\design-spec.md`
- `spore-promo\plan.json`

必读（只读这些，别扩）：
- `data\skills\video-shotcraft\references\aesthetic-rules.md` 全文
- `spore-kit\Spore-Mobile\app\src\main\assets\web\spore.css` 前 40 行（`:root`，抄行号）
- `spore-kit\Spore\README.md` 全文
- 5 张镜头卡全文：`camera\crash-zoom-punch.md`、`interaction\type-and-filter.md`、`ui-entrance\list-reveal.md`、`outro\ui-strip-away-outro.md`、`ui-entrance\row-embed.md`
- `gallery\api\library.json` 用脚本校验卡名（不读全文）

规格：1920×1080 / 30fps / **2100 帧** / 中文 / 无旁白（说辞全走字幕）。

六段帧级时间轴（必须一字不差）：

| # | from | dur | 秒 | 内容 |
|---|---|---|---|---|
| S1 | 0 | 210 | 0–7 | 题目在网页上 → `Alt+S` → 框选 → 右缘抽屉滑出 → 流式答案 |
| S2 | 210 | 300 | 7–17 | 三端并置 |
| S3 | 510 | 420 | 17–31 | **搜题记录**（重点）：科目分组 → 收藏筛选 → 批量选择 → 右作答历史 + 追问 |
| S4 | 930 | 360 | 31–43 | 手机记录页一滑到底、多选、移入科目；扫码配对 → 桌面出现同一条 |
| S5 | 1290 | 450 | 43–58 | 说辞：记录行堆成墙，镜头穿过；四句依次落定 |
| S6 | 1740 | 360 | 58–70 | 墙剥离 → `Spore.` 字标 + tagline + 三端小字 + 仓库地址 |

字幕逐字稿（照抄，标点不许改）：
- S1：`一道题在屏幕上。` → `你切了几次屏？`
- S2：`同一个 Spore，三个地方。`
- S3：`按科目收好。` → `按收藏挑出来。` → `想追问，就在原题上问。`
- S4：`手机拍完，电脑上接着看。` → `扫一下，两边是一套记录。`
- S5：①`它要你自己的 API Key。` ②`因为模型该由你选，不该由平台替你选。` ③`按次计，不包月。你用多少，付多少。` ④`通用助手回答完就走；Spore 把题留下。`
- S6：tagline `题在屏幕上，答案在旁边，记录在手里。` ＋ `扩展 · Android · Windows` ＋ `github.com/Offblink/Spore`

⚠️ S5 第 ③ 句**不许**写成「一道题，几分钱」——承诺不了具体数字。

视觉 tokens（来源 `spore.css` `:root`，要补行号）：
`--pink #EC4899` · `--pink-dark #DB2777` · `--pink-deep #C2185B` · `--pink-tint #FFF0F7` ·
`--ink #14172A` · `--ink2 #1A1D2E` · `--muted #5A5F78` / `--muted2 #7B81A0` / `--muted3 #A3A8C2` ·
`--line #E6E8F2` / `--line2 #EEF0F8` · `--surface #FFFFFF` / `--bg #F4F6FD` / `--bg2 #F8F9FD` ·
`--fav-row #FFF9EA` · 圆角 `12/16/999` · 缓动 `pop(.16,1,.3,1)` / `spring(.34,1.56,.64,1)` / `damped(.25,.1,.25,1)` ·
时长 `--t-fast .16s` / `--t-pop .26s` / `--t-panel .42s`（≈5f/8f/13f）

动效性格：`--spring` 过冲 1.56 是「物件感」来源 → 收藏星、勾选、抽屉滑出、卡片落位用它；
纯位置位移（列表滚、相机推近）用 `pop` 不过冲。全片不许渐变光斑、霓虹紫、暗黑科技风。

三个产品事实（不许写错）：
1. 整页「搜题记录」= 左 272px 列表 + 右作答历史；左上 `全部 / 收藏` 分段 + `＋新建科目` + `批量选择`；科目置顶、会话可拖入。
2. 抽屉只占右缘约 420/1440 ≈ 29%，页面留在左边 → S1 必须「题在左、答案在右」，不许放大成整屏。
3. `核实` 块三态：`✓ 与初答一致` / `✗ 初答有误 + 正确解析` / `⏭ 已跳过 · 初答自评确定`。

五张卡怎么用：S1 `crash-zoom-punch`（唯一一处急推）· S2 `row-embed` · S3 `type-and-filter` + `list-reveal` · S5 `list-reveal`（复用语法但**换尺度**）· S6 `ui-strip-away-outro`。S4 不套卡，写「录制素材驱动的镜头运镜」。

`design-spec.md` 章节（正好 8 节）：
```
## 1 产品简报 ## 2 需求→执行决策表 ## 3 视觉 tokens 表 ## 4 文字方向
## 5 功能→镜头映射 ## 6 分镜表 ## 7 帧级时间轴 ## 8 风险与未决项
```
第 6 节必须带「用哪张纹理 + 裁切区域」列，用上面 `public\textures\` 的真实文件名，裁切写页面 CSS px。

---

### 卡 B · 手机 + 桌面采集（**已完成，无需重建**）
见上「已完成的部分」。

---

### 卡 C · 扩展采集（**已完成，无需重建**）

---

## 后续阶段（还没建卡）

1. **阶段 5 · Remotion 施工**：拿 `design-spec.md` + `plan.json` + 真实纹理，按镜头卡建工程，逐镜静帧自检。
2. **阶段 6 · 声音**：BGM 选型（`assets\audio\bgm\`）+ SFX 从 Freesound（`assets\scripts\sfx-source.py`），钉帧必须写 `SHOTS.x.from + offset`。
3. **阶段 7 · 独立终检**：干净上下文 + 抽帧 + 逐条 checklist 带帧号证据。

## 已知的环境坑（别重复踩）

- **Qt：不要设 `QT_QPA_PLATFORM=offscreen`** —— 本机该插件必崩（退出码 3221226505）。
  用默认 `windows` 平台；必须 `show()` + `processEvents()` 再 `render()`；
  2x 走 `QPixmap(QSize(w*2,h*2))` + `setDevicePixelRatio(2)` + `widget.render(pm)`，**不要 `grab()`**。
- 本机同时装了 PyQt5 / PyQt6 / PySide6 三个 Qt 绑定，`PATH` 里还有 Pot launcher 的 Compose 目录（也带 Qt DLL）。
- **绝不运行 `spore-kit\Spore\tests\e2e.py`** —— 它会真调模型、真烧 API key。
- 发卡标签只能用 `coding` / `docs` / `test` / `research` / `review`，且 `role` 要钉死，否则认领闸门会永久拒绝。
