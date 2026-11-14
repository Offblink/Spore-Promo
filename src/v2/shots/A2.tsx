import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, E, FONT } from '../timeline';

/**
 * A2 · 痛点②：大模型上面说 A、结论说 C（镜内 0–179 = 绝对 150–329）
 *
 * 与 A1 同一套「面板 + 标注」语言：气泡按真实对话的节奏逐条落位，
 * 最后一条**对照条**才做判断（先陈述、后裁决，不提前剧透）。
 * 手搓 UI，非复刻；配色只用 tokens（--ink 说话、--pink 系做裁决）。
 *
 * 镜内节拍：
 *   0–16   面板浮入
 *   20–40  气泡①「这道题选 A。」
 *   66–88  气泡②「综上，正确选项为 C。」（隔 26f 的读题时间）
 *   100–112 对照条浮入：初答 选 A ｜ 结论 选 C ｜ ✗ 对不上
 *   118–126 两枚选项 token 同时亮一下（scale 1 → 1.08 → 1）
 *   126–179 hold
 *
 * 音效意图：[SFX] 20 / 66 气泡 pop（同音色 A-B 错峰）· [SFX] 110 对照条落定 tick
 */

const POP = Easing.bezier(...E.pop);
const DAMP = Easing.bezier(...E.damped);
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const Bubble: React.FC<{
  left?: number;
  right?: number;
  top: number;
  t: number;
  bg: string;
  border: string;
  children: React.ReactNode;
}> = ({ left, right, top, t, bg, border, children }) => (
  <div
    style={{
      position: 'absolute',
      left,
      right,
      top,
      maxWidth: 720,
      padding: '20px 28px',
      borderRadius: C.r16,
      background: bg,
      border: `1px solid ${border}`,
      color: C.ink,
      fontSize: 36,
      lineHeight: 1.35,
      opacity: t,
      transform: `translateY(${(1 - t) * 14}px)`,
    }}
  >
    {children}
  </div>
);

const Tok: React.FC<{ k: string; lit: number }> = ({ k, lit }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: 52,
      height: 52,
      margin: '0 8px',
      borderRadius: 10,
      background: lit > 0 ? C.pinkTint : C.surface,
      border: `2px solid ${lit > 0 ? C.pink : C.line}`,
      color: lit > 0 ? C.pinkDeep : C.ink,
      fontSize: 30,
      fontWeight: 600,
      transform: `scale(${1 + 0.08 * lit})`,
    }}
  >
    {k}
  </span>
);

export const A2: React.FC = () => {
  const f = useCurrentFrame(); // 0..179

  // [SFX] 20 / 66 气泡 pop · [SFX] 110 对照条 tick

  const panelIn = interpolate(f, [0, 16], [0, 1], { ...CLAMP, easing: POP });
  const b1 = interpolate(f, [20, 40], [0, 1], { ...CLAMP, easing: POP });
  const b2 = interpolate(f, [66, 88], [0, 1], { ...CLAMP, easing: POP });
  const strip = interpolate(f, [100, 112], [0, 1], { ...CLAMP, easing: POP });
  // 118–126 亮一下：上 4f 起、下 4f 落
  const lit = interpolate(f, [118, 122, 126], [0, 1, 0.35], { ...CLAMP, easing: DAMP });

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <div
        style={{
          position: 'absolute',
          left: 380,
          top: 226,
          width: 1160,
          height: 470,
          borderRadius: C.r16,
          background: C.surface,
          border: `1px solid ${C.line2}`,
          boxShadow: '0 18px 48px rgba(20,23,42,0.10)',
          opacity: panelIn,
          transform: `translateY(${(1 - panelIn) * 26}px) scale(${0.986 + 0.014 * panelIn})`,
        }}
      >
        <div style={{ position: 'absolute', left: 40, top: 34, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: C.ink }} />
          <span style={{ fontSize: 30, color: C.muted2, letterSpacing: 3 }}>AI 搜题</span>
        </div>
        <div style={{ position: 'absolute', right: 40, top: 38, fontSize: 26, color: C.muted3, letterSpacing: 1 }}>
          解析 1 篇 · 已作答
        </div>

        <Bubble left={48} top={96} t={b1} bg={C.surface} border={C.line}>
          这道题选 A。
        </Bubble>

        <Bubble right={48} top={200} t={b2} bg={C.pinkTint} border="transparent">
          综上，正确选项为 C。
        </Bubble>

        {/* 对照条：先陈述、后裁决 */}
        <div
          style={{
            position: 'absolute',
            left: 48,
            right: 48,
            bottom: 40,
            height: 92,
            borderRadius: 12,
            background: C.bg2,
            border: `1px solid ${C.line}`,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 28,
            fontSize: 32,
            color: C.muted,
            opacity: strip,
            transform: `translateY(${(1 - strip) * 10}px)`,
          }}
        >
          <span>初答</span>
          <Tok k="A" lit={lit} />
          <span style={{ margin: '0 30px', color: C.muted3 }}>｜</span>
          <span>结论</span>
          <Tok k="C" lit={lit} />
          <span style={{ flex: 1 }} />
          <span style={{ color: C.pinkDeep, fontSize: 32, fontWeight: 600, letterSpacing: 2, marginRight: 30 }}>
            ✗ 对不上
          </span>
        </div>
      </div>
    </AbsoluteFill>
  );
};
