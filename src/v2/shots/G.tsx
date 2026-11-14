import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from 'remotion';
import { E, FONT, FPS } from '../timeline';
import { DARK } from '../timeline';

/**
 * G · 收尾：一切收束成一颗孢子点 → 字标 → 入口（镜内 0–419 = 绝对 2100–2519）· **暗场**
 *
 * 收尾不给「产品卡墙 + 大字标」的常规解：这一片的记忆物是一颗**点**。
 * 三张界面卡与十二条记录行向版心收束、缩到看不见，只剩那颗点；点就是 `Spore.` 的句点，
 * 字标从点左侧长出来。
 *
 * **居中口径（2026-11-14 修）**：字标 + 句点是一个 flex 行，整行 `justify-content:center`，
 * 字的容器用 `maxWidth: 0 → 900` + `overflow:hidden` 由右往左揭开——所以
 * 「只有点」时点在正中，「点和字」时整块也在正中，不再靠估字宽去摆 left。
 *
 * 镜内节拍：
 *   0–54    卡与行收束进版心（scale → 0.04，opacity → 0）
 *   46–66   青色点 spring 落位
 *   60–100  「Spore」自右向左揭开（点 = 句点，整行始终居中）
 *   108–126 副标「一个基于 Agent 的搜题应用」
 *   150–168 三端与云端一行
 *   200–218 主仓地址
 *   236–254 其余三个仓库
 *   254–419 hold
 *
 * 音效意图：[SFX] 46 点落定 sparkle · [SFX] 60 字标 riser + impact（全片第 3 处 slam）
 */

const POP = Easing.bezier(...E.pop);
const DAMP = Easing.bezier(...E.damped);
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const CENTER = { x: 960, y: 452 };
const DOT = 11;
const WORD_BOX = 900; // 足够放下 150px 的 "Spore"，只用作揭开动画的上限，不参与实际排版宽度

/** 收束对象：三张「卡」（位置沿用 C 镜三端落点）+ 十二条记录行（位置是墙的抽样） */
const CARDS = [
  { x: 110, y: 348, w: 660, h: 412, d: 0, r: 16 },
  { x: 858, y: 271, w: 220, h: 489, d: 4, r: 26 },
  { x: 1200, y: 410, w: 560, h: 350, d: 8, r: 14 },
];
const ROWS = [
  { x: 60, y: 120, d: 12 }, { x: 360, y: 96, d: 16 }, { x: 660, y: 130, d: 20 },
  { x: 1230, y: 150, d: 14 }, { x: 1520, y: 120, d: 18 }, { x: 1760, y: 190, d: 22 },
  { x: 80, y: 830, d: 10 }, { x: 420, y: 860, d: 14 }, { x: 760, y: 820, d: 18 },
  { x: 1180, y: 840, d: 12 }, { x: 1500, y: 866, d: 16 }, { x: 1740, y: 780, d: 20 },
];

export const G: React.FC = () => {
  const f = useCurrentFrame(); // 0..419

  // [SFX] 46 sparkle · [SFX] 60 riser + impact

  const conv = interpolate(f, [0, 54], [0, 1], { ...CLAMP, easing: Easing.in(Easing.cubic) });
  const dotS = spring({ frame: f - 46, fps: FPS, config: { damping: 12, stiffness: 150 } });
  const dot = Math.max(0, Math.min(1, dotS));

  const wordT = interpolate(f, [60, 100], [0, 1], { ...CLAMP, easing: POP });
  const sub = interpolate(f, [108, 126], [0, 1], { ...CLAMP, easing: DAMP });
  const ends = interpolate(f, [150, 168], [0, 1], { ...CLAMP, easing: DAMP });
  const repo = interpolate(f, [200, 218], [0, 1], { ...CLAMP, easing: DAMP });
  const repos = interpolate(f, [236, 254], [0, 1], { ...CLAMP, easing: DAMP });

  const travel = (x: number, y: number, w: number, h: number, delay: number) => {
    const t = interpolate(conv, [delay / 60, 1], [0, 1], CLAMP);
    const cx = x + w / 2;
    const cy = y + h / 2;
    return {
      left: x + (CENTER.x - cx) * t,
      top: y + (CENTER.y - cy) * t,
      transform: `scale(${1 - 0.96 * t})`,
      opacity: 0.85 * (1 - t),
    };
  };

  return (
    <AbsoluteFill style={{ background: DARK.bg, fontFamily: FONT }}>
      {/* 收束的影子：三张卡 + 十二条记录行 */}
      {conv < 1 ? (
        <>
          {CARDS.map((k, i) => (
            <div
              key={`c${i}`}
              style={{
                position: 'absolute',
                width: k.w,
                height: k.h,
                borderRadius: k.r,
                background: DARK.surface,
                border: `1px solid ${DARK.line}`,
                boxShadow: '0 18px 44px rgba(0,0,0,0.5)',
                ...travel(k.x, k.y, k.w, k.h, k.d),
              }}
            />
          ))}
          {ROWS.map((r, i) => (
            <div
              key={`r${i}`}
              style={{
                position: 'absolute',
                width: 263,
                height: 64,
                borderRadius: 10,
                background: DARK.surface2,
                border: `1px solid ${DARK.line2}`,
                ...travel(r.x, r.y, 263, 64, r.d),
              }}
            />
          ))}
        </>
      ) : null}

      {/* 字标 + 句点：整行 flex 居中，字由右往左揭开（点先在正中，字长出来后整块仍在正中） */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: CENTER.y - 75,
          height: 150,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            maxWidth: wordT * WORD_BOX,
            overflow: 'hidden',
            whiteSpace: 'nowrap',
            fontSize: 150,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            lineHeight: 1,
            color: DARK.ink,
          }}
        >
          Spore
        </div>
        <div
          style={{
            flex: '0 0 auto',
            width: DOT * 2,
            height: DOT * 2,
            borderRadius: 999,
            background: DARK.accent,
            marginLeft: 12,
            transform: `scale(${dot})`,
            marginRight: DOT, // 让「点」的视觉重心（而不是外框右缘）参与居中
          }}
        />
      </div>

      {/* 副标 */}
      {f >= 108 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 546,
            textAlign: 'center',
            fontSize: 38,
            color: DARK.muted,
            letterSpacing: 2,
            opacity: sub,
            transform: `translateY(${(1 - sub) * 8}px)`,
          }}
        >
          一个基于 Agent 的搜题应用
        </div>
      ) : null}

      {/* 三端与云端 */}
      {f >= 150 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 612,
            textAlign: 'center',
            fontSize: 30,
            color: DARK.muted3,
            letterSpacing: 6,
            opacity: ends,
          }}
        >
          网页扩展 · Android · Windows · 云端
        </div>
      ) : null}

      {/* 仓库入口 */}
      {f >= 200 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 676,
            textAlign: 'center',
            fontSize: 42,
            color: DARK.ink,
            letterSpacing: 1,
            opacity: repo,
          }}
        >
          github.com/Offblink/<span style={{ color: DARK.accent, fontWeight: 600 }}>Spore</span>
        </div>
      ) : null}
      {f >= 236 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 734,
            textAlign: 'center',
            fontSize: 27,
            color: DARK.muted3,
            letterSpacing: 2,
            opacity: repos,
          }}
        >
          Spore-Mobile · Spore-GUI · Spore-Cloud
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
