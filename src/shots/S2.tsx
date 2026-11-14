import React from 'react';
import { AbsoluteFill, Img, Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, E } from '../timeline';
import { tex } from '../layout';

/**
 * S2 · 210–509 · row-embed（三端行嵌入同一条基线）
 * 依据：design-spec.md §6 S2 行 + 阶段5-A 施工卡。useCurrentFrame() = 镜内局部帧（0..299）。
 * 节拍：0–20 基线自左长出 → cue 12/22/31 三卡从画外降下（rotateX 16°→0 收平嵌入基线）
 *       → 落地各 5f 粉缝自中心向两端展开（裁在卡片圆角内）→ 58–76 整组上浮 4px 站稳 → 80–299 完全静止。
 * 本阶段只留 // [SFX] 位置标记，不写音频代码（阶段 6 实现）。
 */

const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;
const ePop = Easing.bezier(...E.pop); // 位置位移（落位/展开）
const eSpring = Easing.bezier(...E.spring); // 物件动作（整组站稳）

/* ---- 版面常量（1920×1080） ---- */
const CARD_W = 260;
const CARD_H = 162;
const GAP = 120;
const ROW_W = 3 * CARD_W + 2 * GAP; // 1020
const ROW_X = (1920 - ROW_W) / 2; // 450（三卡居中、间距均匀）
const BASE_Y = 620; // 基线 y = 卡片底边（嵌进槽位）
const CARD_Y = BASE_Y - CARD_H; // 458 → 三卡同一水平中线 539 ≈ 画面中线
const LINE_X = ROW_X - 80;
const LINE_W = ROW_W + 160; // 1180
const FALL = 660; // 起始高度：卡底在画外上方（-40px），从画外降下

/* ---- 三张端卡片：cue（起） / land（落点，末行 58f） ---- */
type EndCard = {
  cue: number;
  land: number;
  src: string;
  img: React.CSSProperties;
  sfx: string;
};

const s1 = 260 / 420; // 扩展抽屉裁 420×900 → 宽贴 260
const s2 = 260 / 360; // 手机裁 360×739 → 宽贴 260
const s3 = 260 / 1440; // 桌面整图 1440×900 → 宽贴 260（高 162.5，溢出 0.5px 裁掉）

const CARDS: EndCard[] = [
  {
    cue: 12,
    land: 34, // 飞行 12f
    src: tex('ext-drawer'),
    img: { left: -1020 * s1, top: 0, width: 1440 * s1, height: 900 * s1 },
    // [SFX] 12 impact 0.40（① 浏览器扩展）
    sfx: '[SFX] 12 impact 0.40 — ① 浏览器扩展',
  },
  {
    cue: 22,
    land: 44, // 飞行 12f
    src: tex('mob-record'),
    img: { left: 0, top: -61 * s2, width: 360 * s2, height: 800 * s2 },
    // [SFX] 22 impact 0.30（② Android）
    sfx: '[SFX] 22 impact 0.30 — ② Android',
  },
  {
    cue: 31,
    land: 58, // 末行 58f 落地（卡面硬指标；飞行比前两卡长，画面无空档）
    src: tex('gui-records'),
    img: { left: 0, top: 0, width: 1440 * s3, height: 900 * s3 },
    // [SFX] 31 impact 0.22（③ Windows 桌面；不加 whoosh，下行本身就是视觉拟音）
    sfx: '[SFX] 31 impact 0.22 — ③ Windows 桌面（无 whoosh）',
  },
];

const EndCardView: React.FC<{ def: EndCard; x: number }> = ({ def, x }) => {
  const f = useCurrentFrame();
  // 12f（末行 27f）飞行：E.pop 落位；起点画外，故 cue 前自然不可见
  const t = interpolate(f, [def.cue, def.land], [0, 1], { ...CLAMP, easing: ePop });
  const fallY = -FALL * (1 - t);
  const rotX = 16 * (1 - t); // rotateX 16° → 0 收平（transformOrigin 底边 = 嵌进基线）
  // 落地瞬间：底边 2px --pink 缝自中心向两端展开 5f（卡片 overflow:hidden + r16 裁住，不许溢出）
  const seam = interpolate(f, [def.land, def.land + 5], [0, 1], { ...CLAMP, easing: ePop });

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: CARD_Y,
        width: CARD_W,
        height: CARD_H,
        perspective: 1200,
        transform: `translateY(${fallY}px)`,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          boxSizing: 'border-box',
          borderRadius: C.r16,
          overflow: 'hidden',
          background: C.surface,
          border: `1px solid ${C.line}`,
          boxShadow: '0 16px 34px rgba(20, 23, 42, 0.12)',
          transform: `rotateX(${rotX}deg)`,
          transformOrigin: 'center bottom',
        }}
      >
        <Img src={def.src} style={{ position: 'absolute', maxWidth: 'none', ...def.img }} />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 0,
            width: `${seam * 100}%`,
            height: 2,
            background: C.pink,
            transform: 'translateX(-50%)',
          }}
        />
      </div>
    </div>
  );
};

export const S2: React.FC = () => {
  const f = useCurrentFrame();

  // 0–20 水平基线（1px --line 发丝线）自左向右长出
  const lineW = interpolate(f, [0, 20], [0, LINE_W], { ...CLAMP, easing: ePop });
  // 58–76 三卡落定后整组上浮 4px 站稳（E.spring 轻微过冲），80 起完全静止
  const groupY = -4 * interpolate(f, [58, 76], [0, 1], { ...CLAMP, easing: eSpring });

  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      {/* 水平基线：卡片底边嵌在这条线上 */}
      <div style={{ position: 'absolute', left: LINE_X, top: BASE_Y, width: lineW, height: 1, background: C.line }} />

      {/* 三卡整组（含上浮 4px） */}
      <div style={{ position: 'absolute', inset: 0, transform: `translateY(${groupY}px)` }}>
        {CARDS.map((def, i) => (
          <EndCardView key={i} def={def} x={ROW_X + i * (CARD_W + GAP)} />
        ))}
      </div>

      {/* 音效位置（阶段 6 接）：三记 impact 阶梯 0.40 → 0.30 → 0.22，换样本防机枪；不加 whoosh */}
      {/* [SFX] 12 impact 0.40 */}
      {/* [SFX] 22 impact 0.30 */}
      {/* [SFX] 31 impact 0.22 */}
    </AbsoluteFill>
  );
};
