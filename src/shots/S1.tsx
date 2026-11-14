import React from 'react';
import { AbsoluteFill, Img, Easing, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, E, FONT } from '../timeline';

/**
 * S1 · 0–209 · crash-zoom-punch（回弹款）
 * 依据：design-spec.md §6 S1 行 + 阶段5-A 施工卡。useCurrentFrame() = 镜内局部帧（0..209）。
 * 分层：
 *   · 页面世界（相机容器内，随 zoom/取景移动）：question.png 整页 1440×840 + 四只粉色角标（锁题干）
 *   · 屏幕世界（不随相机）：Alt+S 键帽（右下）、抽屉（右缘 504px，ext-drawer 裁 x1020..1440 / y0..900 ×1.2）
 * 本阶段只留 // [SFX] 位置标记，不写音频代码（阶段 6 实现）。
 */

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ePop = Easing.bezier(...E.pop); // 位置位移（spore.css --pop-ease）
const eSpring = Easing.bezier(...E.spring); // 物件动作（--spring，回弹/按键）
const eDamped = Easing.bezier(...E.damped); // 淡入淡出（--damped，不回弹）
const eInCubic = Easing.in(Easing.cubic); // 96f 急推（卡面指定 E.inCubic）

const PAGE_W = 1440;
const PAGE_H = 840;

/** 题干锁定区（page CSS px，四角各留 ~24px 呼吸边）：「第 7 题」+ 题干行 */
const MARK = { x0: 140, y0: 445, x1: 730, y1: 620, arm: 56, th: 2 };
const CORNERS = [
  { x: MARK.x0, y: MARK.y0, dx: 1, dy: 1 },
  { x: MARK.x1, y: MARK.y0, dx: -1, dy: 1 },
  { x: MARK.x0, y: MARK.y1, dx: 1, dy: -1 },
  { x: MARK.x1, y: MARK.y1, dx: -1, dy: -1 },
];

/** 抽屉：ext-drawer.png 裁 420×900 CSS → ×1.2 = 504×1080 屏幕 px（等比，右缘满高） */
const DS = 1.2;
const DW = 420 * DS; // 504
const DH = 900 * DS; // 1080
const DRAWER_IN = 1920; // 画外右缘
const DRAWER_OUT = 1920 - DW; // 1416

export const S1: React.FC = () => {
  const f = useCurrentFrame();

  /* ---------------- 相机（页面世界） ---------------- */
  const creep = interpolate(f, [0, 60], [1, 1.03], { ...CLAMP, easing: ePop }); // 0–60 极缓 creep 3%，E.pop 无过冲
  // [SFX] 96 whoosh（6f 急推）
  const crash = interpolate(f, [96, 102], [1, 1.28 / 1.03], { ...CLAMP, easing: eInCubic }); // 96–102 6f 急推 → zoom 1.0→1.28
  // 落点 3% 回弹：102–106 过冲 +3%（E.pop），106–118 用 E.spring 收回（自带过冲 = 轻微下坠再归位）
  const punch =
    interpolate(f, [102, 106], [0, 1], { ...CLAMP, easing: ePop }) -
    interpolate(f, [106, 118], [0, 1], { ...CLAMP, easing: eSpring });
  const zoom = creep * crash * (1 + 0.03 * punch);
  // 取景中心移到「题干与右缘之间」（96–102，随急推）＋ 页面左移让位（99–109，与抽屉同拍）
  const cx =
    interpolate(f, [96, 102], [720, 820], { ...CLAMP, easing: eInCubic }) +
    interpolate(f, [99, 109], [0, 40], { ...CLAMP, easing: ePop });
  const cy = 420;
  const pageIn = interpolate(f, [0, 8], [0, 1], CLAMP); // 转场：从 --bg 淡入 8f，无黑场

  /* ---------------- Alt+S 键帽（屏幕右下） ---------------- */
  // [SFX] 60 keyboard（Alt+S 按键，裁 6f）
  const keyOp = interpolate(f, [56, 60, 72, 96], [0, 1, 1, 0], { ...CLAMP, easing: eDamped });
  // 60–66 下压 6f；66–72 回弹 6f（E.spring 12% 过冲 = keyPush 会短暂 < 0，弹起 1.2px）
  const keyPush =
    interpolate(f, [60, 66], [0, 1], { ...CLAMP, easing: eDamped }) -
    interpolate(f, [66, 72], [0, 1], { ...CLAMP, easing: eSpring });

  /* ---------------- 四只粉色角标 ---------------- */
  const markT = interpolate(f, [60, 72], [0, 1], { ...CLAMP, easing: ePop }); // 每只 12f，从画外四方向收拢

  /* ---------------- 抽屉滑出 + 流式出字 ---------------- */
  // [SFX] 96 panel-slide（13f，--t-panel，与抽屉等长）
  const drawerX = interpolate(f, [96, 109], [DRAWER_IN, DRAWER_OUT], { ...CLAMP, easing: ePop });
  // 流式出字 = 裁切高度逐步揭示（白幕下移，真纹理锐利出字）：
  // 120 第7题/答案 → 132 解析 → 146 检索·核对 chips → 160 停在核实块上沿
  // → 170–182 核实块落成（E.damped，✗ 初答有误 + 粉红左竖条都在纹理里）→ 182–198 全量（初答/表格/输入条）
  const revealCss =
    f < 170
      ? interpolate(f, [120, 132, 146, 160], [55, 140, 220, 293], { ...CLAMP, easing: ePop })
      : f < 182
        ? interpolate(f, [170, 182], [293, 451], { ...CLAMP, easing: eDamped })
        : interpolate(f, [182, 198], [451, 900], { ...CLAMP, easing: ePop });

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      {/* ===== 页面世界：题目页（整页 · r16 · 轻投影）+ 角标 ===== */}
      <div
        style={{
          position: 'absolute',
          width: PAGE_W,
          height: PAGE_H,
          zoom,
          transform: `translate(${960 / zoom - cx}px, ${540 / zoom - cy}px)`,
          transformOrigin: '0 0',
          opacity: pageIn,
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: C.r16,
            overflow: 'hidden',
            background: C.surface,
            boxShadow: '0 26px 70px rgba(20, 23, 42, 0.16)',
          }}
        >
          <Img src={staticFile('assets/question.png')} style={{ position: 'absolute', inset: 0, width: PAGE_W, height: PAGE_H }} />
        </div>

        {/* 四只粉色角标：60–72 从画外收拢，72 后停在题干四角（2px --pink 描边） */}
        {f >= 60 &&
          CORNERS.map((c, i) => {
            const ox = -c.dx * 1000 * (1 - markT);
            const oy = -c.dy * 1000 * (1 - markT);
            return (
              <div key={i} style={{ position: 'absolute', left: 0, top: 0, transform: `translate(${c.x + ox}px, ${c.y + oy}px)` }}>
                {/* 横臂 */}
                <div
                  style={{
                    position: 'absolute',
                    left: c.dx > 0 ? 0 : -MARK.arm,
                    top: c.dy > 0 ? 0 : -MARK.th,
                    width: MARK.arm,
                    height: MARK.th,
                    background: C.pink,
                  }}
                />
                {/* 竖臂 */}
                <div
                  style={{
                    position: 'absolute',
                    left: c.dx > 0 ? 0 : -MARK.th,
                    top: c.dy > 0 ? 0 : -MARK.arm,
                    width: MARK.th,
                    height: MARK.arm,
                    background: C.pink,
                  }}
                />
              </div>
            );
          })}
      </div>

      {/* ===== 屏幕世界：Alt+S 键帽（右下角，56 进 / 60 压 / 72 弹 / 96 淡出） ===== */}
      <div
        style={{
          position: 'absolute',
          right: 150,
          bottom: 205,
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          opacity: keyOp,
          transform: `translateY(${keyPush * 10}px) scale(${1 - 0.04 * keyPush})`,
          transformOrigin: 'center',
        }}
      >
        {['Alt', '+', 'S'].map((k, i) => (
          <div
            key={k}
            style={
              i === 1
                ? { fontFamily: FONT, fontSize: 30, color: C.muted2 }
                : {
                    fontFamily: FONT,
                    fontSize: 34,
                    fontWeight: 600,
                    color: C.ink,
                    background: C.surface,
                    border: `2px solid ${C.line}`,
                    borderRadius: C.r12,
                    padding: '12px 20px',
                    lineHeight: 1,
                    boxShadow: '0 10px 24px rgba(20, 23, 42, 0.16)',
                  }
            }
          >
            {k}
          </div>
        ))}
      </div>

      {/* ===== 屏幕世界：抽屉（右缘滑出 13f，内容白幕裁切揭示） ===== */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: DW,
          height: DH,
          overflow: 'hidden',
          background: C.surface,
          transform: `translateX(${drawerX}px)`,
          boxShadow: '-36px 0 72px rgba(20, 23, 42, 0.18)',
        }}
      >
        {/* 裁切：页坐标 x1020..1440 / y0..900（BBOX['ext-drawer-panel']） */}
        <Img
          src={staticFile('textures/ext-drawer.png')}
          style={{ position: 'absolute', left: -1020 * DS, top: 0, width: 1440 * DS, height: 900 * DS, maxWidth: 'none' }}
        />
        {/* 流式白幕：自 revealCss 向下盖住未出字内容（纹理白底，接缝不可见） */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: revealCss * DS, bottom: 0, background: C.surface }} />
      </div>
    </AbsoluteFill>
  );
};
