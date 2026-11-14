import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, interpolateColors, spring, useCurrentFrame } from 'remotion';
import { C, E, FONT } from '../timeline';
import { tex, type PageKey } from '../../layout';

/**
 * C · 三端并置 + 云端连线（镜内 0–359 = 绝对 480–839）· **明场**
 *
 * 三张**真实界面**卡（扩展记录页 / 手机记录页 / 桌面 RecordsPane），各自的窗口外壳落基线。
 * 明场（2026-11-14 调整）：深浅切换挪到 D 镜中段（片长 40s 处），这里保持浅色，
 * 强调色用明色板的粉；暗色图在这段不加载。
 *
 * 镜内节拍：
 *   0/8/16   三卡错峰落基线（spring，60px 上浮；第 2 处 slam）
 *   74–100   「云端」节点弹簧落位
 *   104–150  三条线自上而下描画（错 6f）
 *   150–309  三条脉冲循环（周期 66f，错 14f）
 *   300–359  缓推 1 → 1.015
 *
 * 音效意图：[SFX] 12/22/31 三记 impact · [SFX] 104 描线 whoosh
 */

const POP = Easing.bezier(...E.pop);
const DAMP = Easing.bezier(...E.damped);
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

type CardSpec = {
  key: string;
  label: string;
  light: PageKey;
  dark: PageKey;
  pageW: number;
  pageH: number;
  x: number;
  y: number;
  w: number;
  h: number;
  inset: { top: number; side: number };
  chrome: 'browser' | 'phone' | 'desktop';
};

const CARDS: CardSpec[] = [
  {
    key: 'web',
    label: '网页 · MV3 扩展',
    light: 'ext-review-default',
    dark: 'ext-review-default-dark',
    pageW: 1440,
    pageH: 900,
    x: 110,
    y: 348,
    w: 660,
    h: 412,
    inset: { top: 42, side: 0 },
    chrome: 'browser',
  },
  {
    key: 'mob',
    label: '手机 · Android',
    light: 'mob-record',
    dark: 'mob-record-dark',
    pageW: 360,
    pageH: 800,
    x: 858,
    y: 271,
    w: 220,
    h: 489,
    inset: { top: 0, side: 8 },
    chrome: 'phone',
  },
  {
    key: 'gui',
    label: '桌面 · Windows',
    light: 'gui-records',
    dark: 'gui-records-dark',
    pageW: 1440,
    pageH: 900,
    x: 1200,
    y: 410,
    w: 560,
    h: 350,
    inset: { top: 36, side: 0 },
    chrome: 'desktop',
  },
];

const Chrome: React.FC<{ kind: CardSpec['chrome']; w: number }> = ({ kind, w }) => {
  const barBg = C.surface;
  const barLine = C.line;
  const barInk = C.muted3;
  const urlBg = C.bg2;

  if (kind === 'browser')
    return (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          height: 42,
          background: barBg,
          borderBottom: `1px solid ${barLine}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          paddingLeft: 16,
        }}
      >
        {['#FF6B6B', '#FFD166', '#4CD4A0'].map((c) => (
          <span key={c} style={{ width: 11, height: 11, borderRadius: 999, background: c, opacity: 0.75 }} />
        ))}
        <div
          style={{
            marginLeft: 14,
            height: 24,
            width: Math.min(340, w - 200),
            borderRadius: 999,
            background: urlBg,
            border: `1px solid ${barLine}`,
            display: 'flex',
            alignItems: 'center',
            paddingLeft: 12,
            fontSize: 15,
            color: barInk,
            letterSpacing: 0.4,
          }}
        >
          搜题记录 · Spore
        </div>
      </div>
    );
  if (kind === 'desktop')
    return (
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          right: 0,
          height: 36,
          background: barBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        <span style={{ fontSize: 16, color: barInk, letterSpacing: 1 }}>Spore</span>
        <span style={{ display: 'flex', gap: 10 }}>
          {[0, 1, 2].map((i) => (
            <span key={i} style={{ width: 9, height: 9, borderRadius: 999, background: barInk, opacity: 0.6 }} />
          ))}
        </span>
      </div>
    );
  // phone：外壳本身就是边框，这里只画刘海
  return (
    <div
      style={{
        position: 'absolute',
        left: '50%',
        top: 10,
        transform: 'translateX(-50%)',
        width: 84,
        height: 12,
        borderRadius: 999,
        background: '#05070D',
        opacity: 0.9,
      }}
    />
  );
};

export const CShot: React.FC = () => {
  const f = useCurrentFrame(); // 0..359

  // [SFX] 12/22/31 impact · [SFX] 104 描线

  const cloudIn = spring({ frame: f - 74, fps: 30, config: { damping: 13, stiffness: 110 } });
  const zoom = interpolate(f, [300, 359], [1, 1.015], CLAMP);

  const bg = C.bg;
  const accent = C.pink;
  const surface = C.surface;
  const cardLine = C.line2;
  const muted = C.muted3;
  const ink = C.ink;

  return (
    <AbsoluteFill style={{ background: bg, fontFamily: FONT }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: '960px 600px' }}>
        {/* 云端连线 */}
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
          {CARDS.map((card, i) => {
            const x2 = card.x + card.w / 2;
            const y2 = card.y;
            const p = interpolate(f, [104 + i * 6, 136 + i * 6], [0, 1], CLAMP);
            const phase = ((f - 150 - i * 14) % 66) / 66;
            const running = f >= 150;
            const px = 960 + (x2 - 960) * (running ? phase : 0);
            const py = 214 + (y2 - 214) * (running ? phase : 0);
            return (
              <g key={card.key}>
                <line
                  x1={960}
                  y1={214}
                  x2={x2}
                  y2={y2}
                  stroke={accent}
                  strokeWidth={3}
                  opacity={0.45 * p}
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1 - p}
                  strokeLinecap="round"
                />
                {running ? (
                  <circle cx={px} cy={py} r={7} fill={accent} opacity={Math.sin(Math.PI * phase) * 0.95} />
                ) : null}
              </g>
            );
          })}
        </svg>

        {/* 云端节点 */}
        <div
          style={{
            position: 'absolute',
            left: 960 - 190,
            top: 214 - 84,
            width: 380,
            height: 84,
            borderRadius: 999,
            background: surface,
            border: `2px solid ${cardLine}`,
            boxShadow: '0 10px 26px rgba(20,23,42,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 14,
            opacity: Math.min(1, cloudIn),
            transform: `scale(${0.86 + 0.14 * Math.min(1, cloudIn)})`,
          }}
        >
          <svg width="34" height="24" viewBox="0 0 34 24">
            <path
              d="M9 21h16a6 6 0 0 0 0.6-11.96A8 8 0 0 0 10.3 7.2A5.4 5.4 0 0 0 9 21z"
              fill="none"
              stroke={accent}
              strokeWidth="2.4"
              strokeLinejoin="round"
            />
          </svg>
          <span style={{ fontSize: 30, color: ink, letterSpacing: 1 }}>云端</span>
          <span style={{ fontSize: 22, color: muted, letterSpacing: 1 }}>Spore-Cloud</span>
        </div>

        {/* 三端卡 */}
        {CARDS.map((card, i) => {
          const s = spring({ frame: f - i * 8, fps: 30, config: { damping: 15, stiffness: 120 } });
          const t = Math.max(0, Math.min(1, s));
          const innerW = card.w - card.inset.side * 2;
          const innerH = card.h - card.inset.top;
          const scale = innerW / card.pageW;
          return (
            <div
              key={card.key}
              style={{
                position: 'absolute',
                left: card.x,
                top: card.y,
                width: card.w,
                height: card.h,
                borderRadius: card.chrome === 'phone' ? 30 : 14,
                background: card.chrome === 'phone' ? '#05070D' : surface,
                border: `1px solid ${cardLine}`,
                overflow: 'hidden',
                boxShadow: '0 18px 44px rgba(0,0,0,0.18)',
                opacity: t,
                transform: `translateY(${(1 - t) * 60}px) scale(${0.97 + 0.03 * t})`,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  left: card.inset.side,
                  top: card.inset.top,
                  width: innerW,
                  height: innerH,
                  overflow: 'hidden',
                  borderRadius: card.chrome === 'phone' ? 22 : 0,
                  background: surface,
                }}
              >
                <Img
                  src={tex(card.light)}
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: card.pageW,
                    height: card.pageH,
                    transform: `scale(${scale})`,
                    transformOrigin: '0 0',
                  }}
                />
              </div>
              <Chrome kind={card.chrome} w={card.w} />
            </div>
          );
        })}

        {/* 三端标签 */}
        {CARDS.map((card, i) => {
          const t = interpolate(f, [40 + i * 8, 56 + i * 8], [0, 1], { ...CLAMP, easing: DAMP });
          return (
            <div
              key={card.key}
              style={{
                position: 'absolute',
                left: card.x,
                width: card.w,
                top: 786,
                textAlign: 'center',
                fontSize: 26,
                color: muted,
                letterSpacing: 4,
                opacity: t,
              }}
            >
              {card.label}
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
