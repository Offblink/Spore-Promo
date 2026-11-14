import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { E, FONT } from '../timeline';
import { DARK } from '../timeline';

/**
 * E1 · 答题界面 + 右缘抽屉滑出（镜内 0–179 = 绝对 1440–1619）· **暗场，独立成镜**
 *
 * 2026-11-14 用户口径：先给**答题界面**，台词「答题最怕切屏」；然后右边**真的滑出**抽屉，
 * 台词「网页端的侧边抽屉解决了这个问题」——所以抽屉不能是交叉淡化，必须是逐帧动画。
 *
 * 抽屉帧来自 `capture.py`：`#root{transform:translateX(420px)}` → `.open{0}`，
 * `transition: transform .42s cubic-bezier(.16,1,.3,1)`；按 33ms 一步抽了 14 帧
 * （`ext-drawer-open-{000..429}-dark.png`），片里 1:1 播回。
 * 答题页本身是 fixture（别人的题库页），暗色档只让 Spore 的抽屉变暗，页面保持原样——这是真实行为。
 *
 * 镜内节拍：
 *   0–14    答题界面浮入
 *   80–94   抽屉滑出（14 帧 1:1）
 *   94–179  hold + 1.20 → 1.23 缓推
 *
 * 音效意图：[SFX] 80 抽屉滑出 whoosh
 */

const POP = Easing.bezier(...E.pop);
const DAMP = Easing.bezier(...E.damped);
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const BAR = 44;
const S0 = 1.2;
const SLIDE_AT = 80;
const SLIDE_FRAMES = 14; // 0,33,…,429

const drawerFrame = (i: number) =>
  staticFile(`textures/ext-drawer-open-${String(Math.min(i, SLIDE_FRAMES - 1) * 33).padStart(3, '0')}-dark.png`);

export const E1: React.FC = () => {
  const f = useCurrentFrame(); // 0..179

  // [SFX] 80 抽屉滑出

  const inT = interpolate(f, [0, 14], [0, 1], { ...CLAMP, easing: POP });
  const s = interpolate(f, [94, 179], [S0, S0 * 1.025], CLAMP);
  const left = (1920 - 1440 * s) / 2;

  // 抽屉帧：滑出段 1:1，之后停在最后一帧；开头用收起态
  const slideIdx = f < SLIDE_AT ? -1 : Math.min(SLIDE_FRAMES - 1, f - SLIDE_AT);
  const src = slideIdx < 0 ? staticFile('textures/ext-drawer-closed-dark.png') : drawerFrame(slideIdx);

  return (
    <AbsoluteFill style={{ background: DARK.bg, fontFamily: FONT }}>
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: BAR,
          right: 0,
          bottom: 0,
          overflow: 'hidden',
          opacity: inT,
          transform: `translateY(${(1 - inT) * 14}px)`,
        }}
      >
        <Img
          src={src}
          style={{
            position: 'absolute',
            left,
            top: -(900 * s - (1080 - BAR)) / 2,
            width: 1440 * s,
            height: 900 * s,
            boxShadow: '0 0 90px rgba(0,0,0,0.55)',
          }}
        />
      </div>

      {/* 浏览器顶栏 */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          height: BAR,
          background: DARK.surface2,
          borderBottom: `1px solid ${DARK.line}`,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          paddingLeft: 20,
        }}
      >
        {['#FF6B6B', '#FFD166', '#4CD4A0'].map((c) => (
          <span key={c} style={{ width: 11, height: 11, borderRadius: 999, background: c, opacity: 0.75 }} />
        ))}
        <div
          style={{
            marginLeft: 14,
            height: 26,
            width: 420,
            borderRadius: 999,
            background: DARK.surface3,
            border: `1px solid ${DARK.line}`,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 14,
            fontSize: 15,
            color: DARK.muted3,
            letterSpacing: 0.4,
          }}
        >
          题库练习 · 第 7 题 · Alt+S 截屏
        </div>
      </div>
    </AbsoluteFill>
  );
};
