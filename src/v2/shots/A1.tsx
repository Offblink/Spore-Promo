import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from 'remotion';
import { C, E, FONT, FPS } from '../timeline';

/**
 * A1 · 痛点①：题库搜题搜到的是「另一道题」（镜内 0–149 = 绝对 0–149）
 *
 * 手搓 UI（非复刻场景：不指向任何真实产品，无品牌、无 logo、无配色借壳）。
 * 手法：`marker-underline-title` 的标注语义 —— **落定后**才动手，8–12f 一笔呵成；
 * 这里把「划线」换成「框住 + 红章」，因为要比对的是两串等长表达式，框比分隔线更能读出「不一样」。
 *
 * 镜内节拍：
 *   0–18   面板自下 26px 浮入（E.pop）
 *   20–58  题面逐字打出（1.7f/字，caret 到 58 停）
 *   60–76  结果行「相似题」浮入 12px
 *   84–96  两处表达式被粉框圈住（先题面、后结果，错 4f）
 *   100–116 红章「不是同一道题」spring 落定（rotate −7° → −5°）
 *   116–149 hold
 *
 * 音效意图（只留注释，不接音频）：
 *   [SFX] 20   打字（keyboard 0.30，窗口 38f）
 *   [SFX] 100  红章落定 impact（样本 1，0.34）
 */

const POP = Easing.bezier(...E.pop);
const DAMP = Easing.bezier(...E.damped);
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 题面三段：中段是表达式，单独成 span 才能被框（不影响字距：两端各有空格） */
const PRE = '求极限 ';
const MATH3 = 'sin3x / 2x';
const SUF = ' 的值为（ ）';
const TOTAL = (PRE + MATH3 + SUF).length;

const MATH_FONT = '"Cambria Math", Cambria, "Times New Roman", serif';
const INK = 40;
const MathSpan: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span style={{ fontFamily: MATH_FONT, fontStyle: 'italic', letterSpacing: '0.01em' }}>{children}</span>
);

/** 粉框：绝对定位在表达式外 5px，**不参与布局**，只做 opacity 进出（不挤动文字） */
const Ring: React.FC<{ t: number }> = ({ t }) =>
  t <= 0 ? null : (
    <span
      style={{
        position: 'absolute',
        left: -9,
        right: -9,
        top: -7,
        bottom: -7,
        border: '2.5px solid ' + C.pink,
        borderRadius: 10,
        background: C.pinkTint,
        opacity: 0.9 * t,
        transform: `scaleX(${0.82 + 0.18 * t})`,
      }}
    />
  );

export const A1: React.FC = () => {
  const f = useCurrentFrame(); // 0..149

  // [SFX] 20 打字 · [SFX] 100 红章落定

  const panelIn = interpolate(f, [0, 18], [0, 1], { ...CLAMP, easing: POP });

  // 逐字打出：20 起、1.7f/字 → 20 + 22×1.7 ≈ 57.4 打完
  const n = Math.max(0, Math.min(TOTAL, Math.floor((f - 20) / 1.7)));
  const pre = PRE.slice(0, Math.max(0, Math.min(PRE.length, n)));
  const math = MATH3.slice(0, Math.max(0, Math.min(MATH3.length, n - PRE.length)));
  const suf = SUF.slice(0, Math.max(0, Math.min(SUF.length, n - PRE.length - MATH3.length)));
  const typing = f >= 20 && n < TOTAL;
  const caretOn = typing && Math.floor((f - 20) / 8) % 2 === 0;

  const resultIn = interpolate(f, [60, 76], [0, 1], { ...CLAMP, easing: POP });
  const ringQ = interpolate(f, [84, 96], [0, 1], { ...CLAMP, easing: DAMP });
  const ringR = interpolate(f, [88, 100], [0, 1], { ...CLAMP, easing: DAMP });

  const stampT = f >= 100 ? spring({ frame: f - 100, fps: FPS, config: { damping: 12, stiffness: 120 } }) : 0;
  const stamp = Math.min(1, stampT);

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <div
        style={{
          position: 'absolute',
          left: 380,
          top: 246,
          width: 1160,
          height: 430,
          borderRadius: C.r16,
          background: C.surface,
          border: `1px solid ${C.line2}`,
          boxShadow: '0 18px 48px rgba(20,23,42,0.10)',
          opacity: panelIn,
          transform: `translateY(${(1 - panelIn) * 26}px) scale(${0.986 + 0.014 * panelIn})`,
        }}
      >
        {/* 标题行 */}
        <div style={{ position: 'absolute', left: 40, top: 34, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: C.pink }} />
          <span style={{ fontSize: 30, color: C.muted2, letterSpacing: 3 }}>题库搜题</span>
        </div>
        <div style={{ position: 'absolute', right: 40, top: 38, fontSize: 26, color: C.muted3, letterSpacing: 1 }}>
          命中 1 条 · 相似度 87%
        </div>

        {/* 题干输入条 */}
        <div
          style={{
            position: 'absolute',
            left: 40,
            top: 86,
            width: 1080,
            height: 84,
            borderRadius: 999,
            background: C.bg2,
            border: `1px solid ${C.line}`,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 26,
          }}
        >
          <svg width="26" height="26" viewBox="0 0 26 26" style={{ marginRight: 18, flex: '0 0 auto' }}>
            <circle cx="11" cy="11" r="7.5" fill="none" stroke={C.muted3} strokeWidth="2.2" />
            <path d="M16.5 16.5 L22 22" stroke={C.muted3} strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: INK, color: C.ink, whiteSpace: 'nowrap', display: 'flex', alignItems: 'baseline' }}>
            <span>{pre}</span>
            <span style={{ position: 'relative', padding: '0 2px' }}>
              <Ring t={ringQ} />
              <MathSpan>{math}</MathSpan>
            </span>
            <span>
              {suf}
              {caretOn ? (
                <span
                  style={{
                    display: 'inline-block',
                    width: 3,
                    height: INK - 6,
                    marginLeft: 2,
                    background: C.pink,
                    verticalAlign: -6,
                  }}
                />
              ) : null}
            </span>
          </div>
        </div>

        {/* 结果行 */}
        <div
          style={{
            position: 'absolute',
            left: 40,
            top: 208,
            right: 40,
            opacity: resultIn,
            transform: `translateY(${(1 - resultIn) * 12}px)`,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              fontSize: 24,
              color: C.pinkDeep,
              background: C.pinkTint,
              borderRadius: 999,
              padding: '5px 16px',
              letterSpacing: 1,
            }}
          >
            相似题
          </span>
          <div style={{ marginTop: 22, fontSize: INK, color: C.ink, whiteSpace: 'nowrap' }}>
            <span>求极限 </span>
            <span style={{ position: 'relative', padding: '0 2px' }}>
              <Ring t={ringR} />
              <MathSpan>sin2x / 3x</MathSpan>
            </span>
            <span> 的值为（ ）</span>
          </div>
        </div>

        {/* 红章 */}
        {f >= 100 ? (
          <div
            style={{
              position: 'absolute',
              right: 56,
              bottom: 46,
              padding: '10px 24px',
              borderRadius: 12,
              border: `3px solid ${C.pinkDeep}`,
              color: C.pinkDeep,
              fontSize: 34,
              letterSpacing: 3,
              fontWeight: 600,
              opacity: Math.min(1, stamp * 1.4),
              transform: `rotate(${-7 + 2 * stamp}deg) scale(${0.78 + 0.22 * stamp})`,
            }}
          >
            ✗ 不是同一道题
          </div>
        ) : null}
      </div>
    </AbsoluteFill>
  );
};
