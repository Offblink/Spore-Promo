import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, E, FONT } from '../timeline';
import { DARK } from '../timeline';

/**
 * F · 代价：自备 API，按次计费（镜内 0–329 = 绝对 1650–1979）· **暗场**
 *
 * 文档原话：「最大的缺点……需要我们自己配置大模型的 API」「90 道题……开销不过 1.3 元」
 * 「工作日使用 deepseek-flash 测得」。
 * 左边是设置页里那张「模型」卡（手搓，非复刻），右边是这次实测的结算数字——**先给门槛，再给账单**。
 * 这一段已在暗色板里（D 末切过），所以强调色用 **青 #2DD4BF**，不用粉。
 *
 * 镜内节拍：
 *   0–30    设置卡浮入；60–76 API Key 一行被青框圈住
 *   120–150 数字区浮入
 *   160–215 「90」从 0 数到 90
 *   190–245 「¥1.3」从 0.0 数到 1.3
 *   245–329 hold
 *
 * 音效意图：[SFX] 0 一记长 whoosh · [SFX] 60 tick · [SFX] 215 数字定版 轻 impact
 */

const POP = Easing.bezier(...E.pop);
const DAMP = Easing.bezier(...E.damped);
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const Row: React.FC<{ label: string; value: string; top: number; ring?: number; mono?: boolean }> = ({
  label,
  value,
  top,
  ring = 0,
  mono,
}) => (
  <div style={{ position: 'absolute', left: 40, right: 40, top }}>
    <div style={{ fontSize: 23, color: DARK.muted3, letterSpacing: 2, marginBottom: 10 }}>{label}</div>
    <div style={{ position: 'relative', display: 'inline-flex' }}>
      {ring > 0 ? (
        <span
          style={{
            position: 'absolute',
            left: -10,
            right: -10,
            top: -8,
            bottom: -8,
            border: `2.5px solid ${DARK.accent}`,
            borderRadius: 12,
            background: DARK.accentSoft,
            opacity: 0.75 * ring,
            transform: `scaleX(${0.85 + 0.15 * ring})`,
          }}
        />
      ) : null}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 14,
          height: 62,
          padding: '0 22px',
          borderRadius: 10,
          background: DARK.surface2,
          border: `1px solid ${DARK.line}`,
          fontSize: 28,
          color: DARK.ink,
          fontFamily: mono ? '"Consolas", "Cascadia Mono", monospace' : FONT,
          letterSpacing: mono ? 2 : 0.5,
        }}
      >
        {value}
        <svg width="14" height="9" viewBox="0 0 14 9">
          <path d="M1 1.5 L7 7 L13 1.5" fill="none" stroke={DARK.muted3} strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  </div>
);

export const F: React.FC = () => {
  const f = useCurrentFrame(); // 0..329

  // [SFX] 0 whoosh · [SFX] 60 tick · [SFX] 215 impact

  const cardIn = interpolate(f, [0, 30], [0, 1], { ...CLAMP, easing: POP });
  const ring = interpolate(f, [60, 76], [0, 1], { ...CLAMP, easing: DAMP });
  const numsIn = interpolate(f, [120, 150], [0, 1], { ...CLAMP, easing: POP });

  const n90 = Math.round(90 * interpolate(f, [160, 215], [0, 1], { ...CLAMP, easing: Easing.out(Easing.quad) }));
  const cost = 1.3 * interpolate(f, [190, 245], [0, 1], { ...CLAMP, easing: Easing.out(Easing.quad) });

  return (
    <AbsoluteFill style={{ background: DARK.bg, fontFamily: FONT }}>
      {/* 设置页「模型」卡 */}
      <div
        style={{
          position: 'absolute',
          left: 200,
          top: 196,
          width: 700,
          height: 486,
          borderRadius: C.r16,
          background: DARK.surface,
          border: `1px solid ${DARK.line}`,
          boxShadow: '0 20px 50px rgba(0,0,0,0.55)',
          opacity: cardIn,
          transform: `translateY(${(1 - cardIn) * 28}px)`,
        }}
      >
        <div style={{ position: 'absolute', left: 40, top: 34, display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 10, height: 10, borderRadius: 999, background: DARK.accent }} />
          <span style={{ fontSize: 30, color: DARK.ink2, letterSpacing: 3 }}>模型</span>
        </div>
        <div style={{ position: 'absolute', right: 40, top: 38, fontSize: 22, color: DARK.muted3 }}>设置 · 只存本机</div>

        <Row label="供应商" value="DeepSeek" top={104} />
        <Row label="模型" value="deepseek-flash" top={212} />
        <Row label="API Key" value="••••••••••••••••••••" top={320} ring={ring} mono />
      </div>

      {/* 结算数字 */}
      <div
        style={{
          position: 'absolute',
          left: 1010,
          top: 208,
          opacity: numsIn,
          transform: `translateY(${(1 - numsIn) * 24}px)`,
        }}
      >
        <div style={{ fontSize: 22, color: DARK.muted3, letterSpacing: 4, marginBottom: 6 }}>两节课 · 阶段测试</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 16 }}>
          <span
            style={{
              fontSize: 168,
              lineHeight: 1,
              color: DARK.ink,
              fontWeight: 600,
              letterSpacing: -2,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {n90}
          </span>
          <span style={{ fontSize: 34, color: DARK.ink2 }}>道题</span>
        </div>

        <div style={{ height: 2, background: DARK.line, margin: '34px 0 30px', width: 620 }} />

        <div style={{ fontSize: 22, color: DARK.muted3, letterSpacing: 4, marginBottom: 6 }}>一共花了</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span
            style={{
              fontSize: 132,
              lineHeight: 1,
              color: DARK.accent,
              fontWeight: 600,
              letterSpacing: -2,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            ¥{cost.toFixed(1)}
          </span>
          <span style={{ fontSize: 30, color: DARK.ink2, letterSpacing: 1 }}>按次计费</span>
        </div>
        <div style={{ marginTop: 22, fontSize: 24, color: DARK.muted3, letterSpacing: 1 }}>工作日 · deepseek-flash · 模型由你自己选</div>
      </div>
    </AbsoluteFill>
  );
};
