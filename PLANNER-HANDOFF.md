# Spore 宣传片 · Planner 交接（2026-11-06 23:2x）

> 给下一个 Planner 会话。上下文已满，这份文件是完整状态。
> **先读「§0 你现在必须知道的三件事」，再读 §1 看进度。**

---

## §0 现在必须知道的三件事

### 1. 模型余额又空了，而且这次是**死循环**在烧

日志 `logs/pot-20261106.log` 实测：

| 模型 | 402 次数 | 时间窗 |
|---|---|---|
| deepseek | 78 | 14:41:47 → 19:09:25（两段） |
| **xiaomimimo** | **2459** | **22:26:12 → 23:18:04，连续 52 分钟，每分钟 45–50 次** |

`mimo-v2.6-flash` 从 **22:26:12** 起每分钟稳定 44–52 次 402，直到 23:18。

**这就是 `docs/dispatch-issues-20261106.md` 里的 P0-3（没修）**：
`server.py:1234` 的 `aborted = abort_event.is_set()` 只在**用户主动停止**时为 True，
模型报错不算 → `:1078` 的 `if aborted: return` 不生效 → `:1080` 照常 `dispatch_pending`
→ 唤醒同一个坏实例 → 再失败 → 无限循环。

**P0-2 也没修**（实例选择只看空位不看健康）。两条一起，就是这 52 分钟。

**→ 用户需要先给 xiaomimimo 充值，或者再换模型。** 没有可用模型，任何卡都跑不动。

### 2. 两条我没修的 P0 问题（`docs/dispatch-issues-20261106.md` 已写全）

- **P0-2** `pot/dispatch.py:261` `if _held_by_instance(...) < role.wip` → 坏实例持有 0 张，
  `0 < 5` 恒成立 → **永远选中它**；`maxInstances: 3` 白设，自动增殖分支（:263-264）永远走不到。
- **P0-3** 见上。建议加指数退避 + 冷却跳过。

已修的两条：`02c3464`（role wakes 不再重放 transcript，model view 每次重建，零历史行）、
`f25c85e`（创建时拒绝无角色覆盖的标签）。

### 3. 我在卡面里写错了两处，下游会踩

**(a) S3 取景 `x 280..551` 是错的** —— 应为 `x 0..279`。
`layout.json` 的 `ext-subject-1` = **x 8**, `ext-row-1` = **x 30** → 侧栏是 `x 0..280`。
我把"侧栏宽 280"误写成了"侧栏 x 起点 280"。**`design-spec.md` §6 也带着这个错**（spec 卡照抄了我的）。
卡 B 的执行者自己发现了，按 `x0..279` 取景并 flag 了——**它的判断是对的，不要改回去**。

**(b) S3 的 SFX 帧号与分帧表对不上**：卡面写 `58/240/320/400`，分帧表是 `40-90/150/230/330`。
执行者按分帧表落画面、SFX 按卡面写注释。**声音卡要自己定口径**，建议用分帧表：`40/50/60 pop ×3`、`150 click`、`230 click`、`330 whoosh-soft`。

---

## §1 进度总览

| # | 卡 | 内容 | 状态 |
|---|---|---|---|
| 1 | `p-0372b27a` | 素材采集（扩展+手机+桌面，一张卡做完的） | ✅ **done** |
| 2 | `p-ba38a1dc` | 设计 spec 成文（8 节 + plan.json，2100 帧） | ✅ **done** |
| 3 | `p-02d06740` | Remotion 工程骨架 + PageCam + 链路自检 | ✅ **done** |
| 4 | `p-a843ea7d` | 阶段5 地基：timeline/layout/6 占位/字幕层 | ✅ **done** |
| 5 | `p-f4ed912f` | **S3 + S4** | ✅ **done**（报告完整） |
| 6 | `p-fe6e98d8` | **S1 + S2** | ✅ **done**（report 完整，中途 3 次租约到期后续上） |
| 7 | `p-233035d6` | **S5 + S6** | ✅ **done**（2026-11-07 01:3x 报告进来） |
| 8 | `p-5c3b6750` | spec 修正（S3 坐标 + SFX 帧号口径） | ⬜ todo |
| 9 | `p-baf457b6` | **阶段6 声音**（BGM + SFX 钉帧 + 双版渲染） | ⬜ todo，urgent |

### 🎉 阶段 5 六段全部完成（2026-11-07 01:3x）
```
S1 187 行 · S2 136 · S3 170 · S4 210 · S5 77 · S6 222 · _wall 204
npx tsc --noEmit → 退出 0
静帧：S1-a..d / S2-a..c / S3-a..e / S4-a..d / S5-a..c / S6-a..f 全齐
```
**我亲自验过的三张**：
- `S6-b.png`(1770) 剥离中 → **无矩形色块、无灰边带**（历史 bug 未复发），暗场干净，幸存行带指定白晕
- `S6-d.png`(1830) 字标 → 白字 + 粉句点，**无发光无渐变**，水平居中 ✓
- `S3-c.png`(700) 收藏态 → 白底 + 粉星 + 列表塌成 2 行，**无暖黄底** ✓，KaTeX 锐利

**S5/S6 报告要点**（原文被截断，我记关键的）：
- `_wall.tsx` 204 行：35 行行级裁片（>20 ✓），5 列×7 行全占位；**坐标勘误 +280（与 S3 卡同一处）→ 实测取 x8..271**
- 列周期 = 行距×7 = [1162,1204,1246,1288,1330] 全部 ≥1144（=1080+64）→ 同行两副本永不同屏；列周期互不相等 → 整墙不自我重复
- 三层纵深只靠尺寸/不透明度/blur≤2px/雾（不加光）；**落点行与幸存行钉 layer0**（否则被 0.86+blur+雾洗白——本轮实测踩过）
- S5 `progress = f≤40 ? 0 : (f−40)/409` 线性 → **12.96px/f 匀速下穿**；四句 CUES=[20,138,270,370]，落点行 scale 1.06 + 粉缝、其余 dim 0.72 不回弹
- S6 `progress = 1 + f/409` 与 S5 f449 逐值连续（不切）
- ⚠️ 报告截断处提到"行顶 y=780（字幕药丸上方 27px）"——**落点行的纵向定位要终检复核是否真不被字幕遮**

### 卡 6（`p-fe6e98d8`）——已 done，报告要点
- `src/shots/S1.tsx` **187 行**：键帽压弹、四角标锁题干(page x140..730/y445..620)、6f 急推 zoom→1.28、抽屉 13f 滑出（左缘 1416 不切）、**白幕裁切流式揭示**（关键帧 55→140→220→293→451→900）
- `src/shots/S2.tsx` **136 行**：三卡 260×162、中线 y539/620、cue 12/22/31、粉缝被 r16 裁住、80–299 完全静止
- 7 张静帧 `S1-a..d` + `S2-a..c`，**自报 7/7 目视通过**
- `tsc --noEmit` 退出 0；零音频代码（只有 `// [SFX]` 注释）
- **自报的返工风险**：S1 白幕揭示的关键帧与 `ext-drawer.png` 纹理段落坐标**强耦合**，换纹理要重标定；白幕是**段落级**揭示，不是真逐字 3f/字——若终检坚持逐字观感要换实现
- **次要**：S2 卡③ 飞行 27f（前两卡 12f）是为满足「末行 58f 落地」的折中

### 卡 7（`p-233035d6`）——真正没做的
- `src/shots/S5.tsx` / `S6.tsx` 仍是 **13 行占位**（mtime 18:58:06 = 地基卡写入的）
- **没有 `_wall.tsx`**
- `public/out/` 无任何 `S5-*` / `S6-*`
- 两次认领（`executor:...-190524`）、两次租约到期，期间正是 22:26 起的 402 死循环

→ **处理方式**：这张卡可以原样留在 todo，等模型可用后重派。**卡面很完整**（含 `_wall.tsx` 接口定义、S6 六层剥离时序、字标规格、9 张静帧清单），不需要重写。

---

## §2 已验证的产出（可以直接用，别重做）

### 素材 `spore-promo/public/textures/`（14 页 + layout.json，18 元素 bbox）
```
ext-review-default.png / -fav / -batch / -subject   2880×1800（1440×900 @2x）
ext-drawer.png / -closed / ext-options.png          2880×1800
mob-record / -select / mob-panel / mob-main /
mob-settings-sync                                    1080×2400（360×800 @3x）
gui-records@2x.png / gui-records-select@2x.png      2880×1800（**真实 Qt 渲染**）
gui-login@1x.png                                    652×536（退路，本片不用）
layout.json                                          14 page / 18 element
```
关键 bbox（页面 CSS px）：
- `ext-detail-content` = **x456 y54 w808 h729** ← S3 取景用这个，**不是** `ext-detail`（x280..1440，会带进左栏和滚动条）
- `ext-drawer-panel` = **x1020 y0 w420 h900**（抽屉确实 29%）
- `ext-verify` = x470 y306 w794 h138 · `ext-drawer-verify` = x1049 y294 w375 h157
- `mob-chips` = x0 y114 w360 h46 · `mob-batchbar` = x0 y738 w360 h62 · `mob-sync` = x37 y211 w286 h64
- `gui-left-rail` / `gui-detail` 标 `approx: true` → **只用整图，别按它裁**

采集脚本：`spore-promo/capture/capture.py`（一条命令重跑）+ `capture/README.md` + `seed.json` + `check_safety.py`

### 设计 `spore-promo/design-spec.md`（8 节 / 189 行）+ `plan.json`
- slogan 选定：**「问完就走的是助手，留下题的是 Spore。」**
- 六段 `0/210, 210/300, 510/420, 930/360, 1290/450, 1740/360` = **2100**，from 链连续
- **注意 §6 有 `x280..551` 那个错**（见 §0-3a）
- spec 卡自己纠正过 7 处（侧栏 280、内容包围盒、收藏无暖黄底、文件名伪名、S4 用 gui-select、GUI 风险已消失、S6 暗场用 `--ink`）

### 工程 `spore-promo/`（自包含 Remotion 4.0.484）
```
package.json / tsconfig.json / remotion.config.ts
src/index.ts  Root.tsx  SporePromo.tsx      ← 装配：6 个 <Sequence> + 全片唯一 <Captions/>
src/timeline.ts   ← 唯一时间源（SHOTS/C/E/FONT/shot()），六段 + 13 条字幕绝对帧
src/layout.ts     ← 14 page / 18 bbox 内联成 TS（PAGES/BBOX/pageSrc/tex）
src/SHOTS-CONTRACT.md  ← 11 行，**后续镜头卡必读**
src/lib/PageCam.tsx  Caption.tsx  helpers/{rand,motion,shake}.ts
src/shots/S1..S6.tsx
src/verify-ground.py  ← 可复跑断言，当前 ALL PASS
```
- `PageCam` 不依赖 three；本地改了 `pageW`/`bg` props + 平面分支用 CSS `zoom`（避免先栅格化再放大）
- **渲染必须带 `--browser-executable "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"`**
- 单张 still ≈ 12s（含打包），三卡并行时会涨到 30s+

### 静帧（`spore-promo/public/out/`）
```
smoke-000/900.png          链路自检（骨架卡）
seq-S1..S6.png + S4-cap1/2 地基占位验证（local frame 全对）
S3-a..e.png  (560/630/700/790/900)   ✅ 卡 B 交付
S4-a..d.png  (1000/1120/1230/1285)   ✅ 卡 B 交付
S1-a..d / S2-a..c          ✅ 卡 6 交付（但没报卡）
```

---

## §3 我亲自验过的（不用再验）

- `npx tsc --noEmit` → 退出 0
- `python verify-ground.py` → **ALL PASS**（2100 连续 / 13 字幕无重叠 / 6 取样帧 local frame 全对 / PAGES=14 BBOX=18 与 json 逐值相同）
- `S3-c.png`（700f）我看过：收藏态 = **白底 + 粉星 + 列表塌成 2 行**，**无暖黄底** ✓，KaTeX 锐利，字幕「按收藏挑出来。」正确
- 卡 B 的 report 质量高，9 张静帧逐张有结论，且它**主动 flag 了我卡面的取景错误**

---

## §4 剩余管线（还没派的卡）

### 阶段 6 · 声音（等 S5/S6 完成 + 画面锁定后）
- BGM：`data/skills/video-shotcraft/assets/audio/bgm/` 5 首备选，读 `references/sound-design.md`
- SFX：`assets/scripts/sfx-source.py search/get`，Freesound 默认 CC0，产出 `audio-manifest.json` + `FREESOUND-CREDITS.md`
- **钉帧**：`from = SHOTS.x.from + offset − peakLag − OUTPUT_OFFSET_FRAMES`，禁止裸绝对帧号
- 音效位置已在各镜头文件里用 `// [SFX] <帧> <动作>` 注释标好（S1/S2/S3/S4 有，S5/S6 待做）
- ⚠️ **S3 的 SFX 帧号两套口径未定**，见 §0-3b
- 两版渲染：带 BGM + `--props=props-nobgm.json`（`{"bgm":false}`，Windows 必须走文件）
- 预期问题：S1 打字/急推的 whoosh 在 BGM 下可能偏轻（Pot 那轮实测低 8dB），BGM 压到 0.10 + SFX 抬到 3.0 是经验解

### 阶段 7 · 独立终检（干净上下文 + 抽帧 + 逐条帧号证据）
必读 `references/final-review.md`、`aesthetic-rules.md`。
重点必查：
1. **Q11 小字**（≥32px 要读 或 虚化，不许中间态）—— Pot 那轮栽在这
2. **R4 整画面 slam ≤3 处**
3. **S6 剥离有无矩形色块/灰边带**（历史高发）
4. **字标有无发光/渐变**（不许）
5. **数据安全**：无真实 key/路径/账号/模型名
6. 两版同源同帧数

---

## §5 已知问题（待决，别忘了）

### (1) S4 构图左偏空 —— 我卡面欠的账
`S4-d.png` 实测：内容集中在 x 730..1889，**左侧 730px 全是空 `--bg`**，且手机屏幕底部被字幕白条盖住一块。
根因：**我的卡面只写了「手机嵌在横屏中部，左右各留 --bg」，没规定左半屏放什么** → 执行者照做。
→ 需要一轮 S4 重构图（建议：手机左移至 x≈420，同步卡与 GUI 占右半，或手机/GUI 左右对置）。
**这条留给终检或专门的返工卡。**

### (2) GUI 缩略图文字过小
`S4-d` 里 GUI 窗口约 700×447，其内部文字远低于 32px 可读线 → 落在 Q11 禁止的"中间态"。
要么放大到可读，要么虚化到纹理级。

### (3) S4 的 1090–1159 字幕空档（2.3 秒无词）
spec 定的，不是 bug。**但成片里观感可能偏静**——终检时看，太静就补一句（需 planner 决定，不能自行改 `timeline.ts`）。

### (4) 卡 B flag 的 SFX 帧号口径
见 §0-3b。

### (5) `web/` 有未提交改动
`git status`：`M web/app.js / common.js / i18n.js / index.html / style.css`、`M tests/test_scene.py`。
**不是宣传片任务改的**（两张卡都明确报过没碰）。用户没回应我的两次提醒。**确认归属再决定动不动。**

### (6) 卡 B 自报的次要风险
- `mob-record` 只有 4 行，"滚动露出更多行"不成立 → 实做为顶/底带固定 + 列表上滚
- S4-d 字幕与 GUI 卡左下角小面积重叠（高亮行 y≈530 不受影响）

---

## §6 环境与坑（照抄别改）

| 项 | 值 |
|---|---|
| Pot 根 | `C:\Users\37549\Desktop\Vibe Coding\useful\Pot` |
| 三端源码（只读） | `C:\Users\37549\Desktop\Vibe Coding\useful\spore-kit\{Spore,Spore-Mobile,spore-gui}` |
| 技能库 | `data\skills\video-shotcraft` |
| 影片目录 | `spore-promo\` |
| 当前模型 | `mimo-v2.6-flash` @ `https://api.xiaomimimo.com/v1/chat/completions`（**余额空**） |
| Edge | `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` |
| Playwright | 1.61.0 |
| PySide6 | 6.10.2 + qfluentwidgets（**注意：`QT_QPA_PLATFORM=offscreen` 在本机必崩 0xC0000409，用默认 windows 平台 + `show()` + `render(pm)`**） |
| Python | 3.13.7 |

**发卡标签只能是** `coding` / `docs` / `test` / `research` / `review`，且 `role` 要钉死
（`board.py:339` 要求 `labels ⊆ canClaim`；`f25c85e` 后创建时就会拒）。

**别跑 `spore-kit\Spore\tests\e2e.py`**（要真 key、真调模型）。

**渲染必须带 `--browser-executable`**，否则去下载 chrome-headless-shell。

**别用 PowerShell 默认参数读 JSON**（GBK 会把中文读成乱码，用 `-Encoding utf8` 或 Python）。

---

## §7 我建议的下一步顺序

1. ~~等模型可用~~ ✅ 已恢复（S5/S6 卡 01:3x 成功报告，说明模型能跑）
2. ~~S1/S2~~ ✅ · ~~S3/S4~~ ✅ · ~~S5/S6~~ ✅ —— **阶段 5 六段全完成**
3. **`p-5c3b6750`（spec 修正）** —— todo，等认领。修 S3 坐标 + SFX 帧号口径
4. **`p-baf457b6`（阶段6 声音）** —— todo，urgent，已派。**SFX 权威帧表已直接写进卡面**，不依赖 spec 修正
5. 声音完成 → **阶段 7 独立终检**（重点查 §5 的 (1) S4 左偏空、(2) GUI 字过小、(3) S5 落点行是否被字幕遮）
6. 交付 + 按 SKILL 交付收尾（开动效工作台、@ 作者、邀请进 showcase）

---

## §8 关键文件速查

```
spore-promo/design-spec.md          设计 spec（§6 有 x280 错误待修）
spore-promo/plan.json               六段 2100 帧
spore-promo/src/timeline.ts         唯一时间源 + 13 条字幕绝对帧
spore-promo/src/layout.ts           14 page / 18 bbox
spore-promo/src/SHOTS-CONTRACT.md   镜头卡契约（11 行）
spore-promo/src/verify-ground.py    可复跑断言，当前 ALL PASS
spore-promo/capture/capture.py      素材采集一条命令
spore-promo/public/textures/        14 张真图 + layout.json
spore-promo/public/out/             全部静帧
spore-promo/HANDOVER.md             三张卡的完整意图（早期版，部分内容已被 spec 取代）
docs/dispatch-issues-20261106.md    Pot 派活链路 7 条问题（P0-2/P0-3 未修）
data/sessions-archive/              被我移走的 10.47MB 坏会话（可还原）
```
