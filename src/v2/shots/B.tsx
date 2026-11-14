import React from 'react';
import { AbsoluteFill, Easing, interpolate, spring, useCurrentFrame } from 'remotion';
import { C, E, FONT, FPS } from '../timeline';

/**
 * B · 登场：Spore 是 Fungi 的子集（镜内 0–209 = 绝对 330–539）
 *
 * 文档原话：「Fungi 是分布式的全能 Agent……Spore 更像是 Fungi 的子集……只跑在一部主机上」。
 * 画面把这句话拆成两步因果：**先长出一整张菌丝网，再只点亮其中一个节点**。
 *
 * 坐标全部写死（16 节点 17 条边，无随机数）：任何一帧都可独立复现。
 * 动效：边用 pathLength=1 + strokeDashoffset 描画（8–56f 错峰），节点 spring 落位，
 *       90f 起其余节点压到 0.28、菌丝压到 0.18，唯一点亮节点放大 1.35 并换 --pink。
 *
 * 镜内节拍：
 *   8–56   菌丝描画 · 18–46 节点落位
 *   60–78  「Fungi / 分布式全能 Agent」标题落定
 *   90–108 其余节点压暗、中心节点点亮
 *   104–122 取景框括住点亮节点
 *   116–132 「Spore · 只做搜题」· 140–156 「只跑一部主机」
 *   156–209 hold（整网 1 → 1.03 极缓推近）
 *
 * 音效意图：[SFX] 8 网络生长 1 记轻 whoosh · [SFX] 90 点亮 sparkle（全片仅两处之一）· [SFX] 116 标签 tick
 */

const POP = Easing.bezier(...E.pop);
const DAMP = Easing.bezier(...E.damped);
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

type P = { x: number; y: number; r: number };

/** 16 节点（0 号是最终点亮的 Spore 节点，位于版心偏上） */
const NODES: P[] = [
  { x: 960, y: 456, r: 17 }, // 0 ← Spore
  { x: 786, y: 372, r: 9 },
  { x: 1132, y: 388, r: 9 },
  { x: 676, y: 548, r: 10 },
  { x: 1216, y: 556, r: 8 },
  { x: 872, y: 262, r: 8 },
  { x: 1064, y: 240, r: 7 },
  { x: 606, y: 424, r: 7 },
  { x: 1318, y: 436, r: 7 },
  { x: 812, y: 646, r: 9 },
  { x: 1108, y: 664, r: 8 },
  { x: 960, y: 172, r: 6 },
  { x: 548, y: 590, r: 6 },
  { x: 1386, y: 336, r: 6 },
  { x: 706, y: 232, r: 6 },
  { x: 1258, y: 712, r: 6 },
];

const EDGES: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 5], [2, 6], [1, 7], [2, 8],
  [3, 9], [4, 10], [5, 11], [3, 12],
  [2, 13], [5, 14], [4, 15], [7, 12], [8, 13],
];

export const B: React.FC = () => {
  const f = useCurrentFrame(); // 0..209

  // [SFX] 8 whoosh · [SFX] 90 sparkle · [SFX] 116 tick

  const lit = interpolate(f, [90, 108], [0, 1], { ...CLAMP, easing: DAMP });
  const dimOthers = 0.28 + 0.72 * (1 - lit);
  const zoom = interpolate(f, [0, 209], [1, 1.03], CLAMP);

  const titleIn = interpolate(f, [60, 78], [0, 1], { ...CLAMP, easing: DAMP });
  const bracket = interpolate(f, [104, 122], [0, 1], { ...CLAMP, easing: POP });
  const chip1 = interpolate(f, [116, 132], [0, 1], { ...CLAMP, easing: POP });
  const chip2 = interpolate(f, [140, 156], [0, 1], { ...CLAMP, easing: POP });

  const nodeScale = (i: number) => {
    const s = spring({ frame: f - (18 + i * 1.2), fps: FPS, config: { damping: 14, stiffness: 140 } });
    return Math.max(0, Math.min(1, s));
  };

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <AbsoluteFill style={{ transform: `scale(${zoom})`, transformOrigin: '960px 456px' }}>
        <svg width={1920} height={1080} style={{ position: 'absolute', left: 0, top: 0 }}>
          {EDGES.map(([a, b], i) => {
            const p = interpolate(f, [8 + i * 2.2, 30 + i * 2.2], [0, 1], { ...CLAMP, easing: DAMP });
            const A = NODES[a];
            const Bn = NODES[b];
            // 点亮的节点相连的边保持亮一档（它是「子集」的枝叶）
            const hot = (a === 0 || b === 0) && lit > 0;
            return (
              <line
                key={i}
                x1={A.x}
                y1={A.y}
                x2={Bn.x}
                y2={Bn.y}
                stroke={hot ? C.pink : C.muted3}
                strokeWidth={hot ? 2.4 : 1.8}
                opacity={(hot ? 0.55 : 0.5) * (hot ? 1 : dimOthers) * p}
                pathLength={1}
                strokeDasharray={1}
                strokeDashoffset={1 - p}
                strokeLinecap="round"
              />
            );
          })}
          {NODES.map((n, i) => {
            const s = nodeScale(i);
            if (s <= 0) return null;
            const isLit = i === 0;
            const r = n.r * s * (isLit ? 1 + 0.35 * lit : 1);
            return (
              <g key={i} opacity={isLit ? 1 : dimOthers}>
                <circle cx={n.x} cy={n.y} r={r} fill={isLit && lit > 0.05 ? C.pink : C.surface} stroke={isLit && lit > 0.05 ? C.pink : C.muted3} strokeWidth={2} />
                {isLit ? <circle cx={n.x} cy={n.y} r={r * 0.34} fill={C.surface} opacity={0.9} /> : null}
              </g>
            );
          })}
        </svg>

        {/* 网络标题 */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 96,
            textAlign: 'center',
            opacity: titleIn,
            transform: `translateY(${(1 - titleIn) * 8}px)`,
          }}
        >
          <div style={{ fontSize: 44, color: C.ink, letterSpacing: 10, fontWeight: 500 }}>Fungi</div>
          <div style={{ marginTop: 10, fontSize: 26, color: C.muted3, letterSpacing: 4 }}>分布式的全能 Agent</div>
        </div>

        {/* 取景框：括住点亮的那个节点 */}
        {f >= 104 ? (
          <div
            style={{
              position: 'absolute',
              left: 960 - 96,
              top: 456 - 76,
              width: 192,
              height: 152,
              borderRadius: 22,
              border: `2.5px solid ${C.pink}`,
              opacity: bracket * 0.85,
              transform: `scale(${0.9 + 0.1 * bracket})`,
            }}
          />
        ) : null}

        {/* 子集标签 */}
        {f >= 116 ? (
          <div
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 592,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 14,
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'baseline',
                gap: 14,
                opacity: chip1,
                transform: `translateY(${(1 - chip1) * 10}px)`,
              }}
            >
              <span style={{ fontSize: 54, color: C.ink, fontWeight: 600, letterSpacing: 1 }}>Spore</span>
              <span style={{ fontSize: 30, color: C.muted, letterSpacing: 3 }}>· 只做搜题</span>
            </div>
            <div
              style={{
                fontSize: 28,
                color: C.pinkDeep,
                background: C.pinkTint,
                borderRadius: 999,
                padding: '8px 22px',
                letterSpacing: 2,
                opacity: chip2,
                transform: `translateY(${(1 - chip2) * 10}px)`,
              }}
            >
              只跑一部主机
            </div>
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
