# SHOTS-CONTRACT · 阶段5 地基（后续三张卡必读）

1. 一张卡只改自己那几个 `src/shots/S#.tsx`。别人的文件、`timeline.ts`、`SporePromo.tsx`、`layout.ts`
   一律不动（除非你的卡明确授权）。`SporePromo.tsx` 已装好 6 个 `<Sequence>` 和**全片唯一的字幕层
   `<Captions/>`**——字幕不在镜头里画，所以改镜头永远碰不到字幕。
2. `useCurrentFrame()` 拿到的是**镜内局部帧**（外层 `<Sequence>` 已重基），从 0 到 `dur-1`。
   要绝对帧只能由 `SHOTS[i].from` 推，镜头文件里不许写死 0/210/510…
3. 可用 import：
   - `../timeline` → `SHOTS` `shot(id)` `C`（颜色+圆角）`E`（pop/spring/damped）`FONT` `FPS/WIDTH/HEIGHT/DURATION`
   - `../layout` → `PAGES` `BBOX` `pageSrc(k)` `tex(k)`（14 page / 18 element，值与 `layout.json` 逐条相同）
   - `../lib/PageCam`（props：`src` `pageW` `pageH` `keys` `bg` `ease` `children` `blur` `saturate` `dof` `frame`）
   - `../lib/Caption`（单句信息条；全片字幕已统一渲染，一般不用）
   - `../lib/helpers/rand` → `mulberry32(seed)`；`motion` → `velocityAt` `lagged` `dampedSettle`；`shake` → `handheld`
4. 纹理引用（本卡实测可用）：
   - `<Img src={staticFile('textures/ext-review-default.png')} />`，或 `tex('ext-review-default')`（已包 staticFile）
   - `<PageCam src={pageSrc('ext-review-default')} … />`——PageCam 内部**自己**调 staticFile，别包两层
   - 路径相对 `public/`、无前导 `/`；不要 `import` png
5. 不加 npm 依赖；不用 `Math.random()` / `Date.now()`（噪声用 `mulberry32` 定种子）。
6. 验收：`npx tsc --noEmit` + `python verify-ground.py`（应 `ALL PASS`）。静帧命令：
   `npx remotion still src/index.ts SporePromo public/out/<name>.png --frame=<绝对帧> --browser-executable="C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"`
   ——不传该参数本机必失败；单张 11–16s。
7. 已知、别当 bug 修：S4 的 `1090–1159` 是 spec 定的**字幕空档**（多选节拍不给词）；
   `gui-*` 的 bbox 标 `approx:true`（只用整图，别按它裁）。
