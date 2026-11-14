import React from 'react';
import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from 'remotion';
import { C, E } from '../timeline';
import { Wall, slotId, type RowFx } from './_wall';

/**
 * S5 · 记录墙穿越（镜内 0–449 = 绝对 1290–1739）· list-reveal 换尺度
 *
 * 30 条真实记录行（`_wall.tsx` 的同一面墙，S6 拆的就是它）错落堆成一面墙，镜头向下匀速穿墙：
 *   · 0–40    画面整体压暗 8% 后透视穿入（18f，墙 0.86 → 1.0，E.pop）
 *   · 40–449  progress 0 → 1 线性：12.96px/f ≈ 1080×1.2%/f，409f 走完 5300px 一整面墙；
 *             同时轻微 z 推近（1.00 → 1.05，总 5%）
 *   · 四句各配一次「行落定」：定版帧 = 句首 + 10f → 20 / 138 / 270 / 370；
 *             落点行 1.06 + 底边 2px --pink 缝（5f 展开，[定版−5, 定版]），其余行降到 0.72；
 *             下一定版帧旧落点行用 5f 释放（不闪）。句与句之间高亮静止，只有下穿继续。
 *   · 三层纵深（§8.6）：尺寸差 1.0/0.93/0.86 + 不透明度 1.0/0.9/0.78 + blur 0/0.7/1.5px
 *             + --bg2 薄雾 0/0.22/0.40 —— 只靠位移/雾/尺寸，不加光。
 *
 * 音效意图（只留注释，不接音频）：
 *   [SFX] 1290 whoosh（穿墙，1 记长样本；不给每行配音——S2 已用 impact 三连，不重复）
 *   [SFX] 1310 tick 0.35 · [SFX] 1428 tick 0.32 · [SFX] 1560 tick 0.29 · [SFX] 1660 tick 0.25
 */

const POP = Easing.bezier(...E.pop); // 位置位移（墙落位 / 行落定）
const DAMP = Easing.bezier(...E.damped); // 透明度（压暗 / 释放）
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 四句行落定的镜内定版帧（= 各句句首 + 10f：1300/1418/1550/1650 绝对帧起算） */
const CUES = [20, 138, 270, 370];
/** 落点行 = _wall 钉死的四个槽位（w-0-4 同时是 S6 的唯一幸存行） */
const LIT_IDS = [slotId(0, 4), slotId(3, 4), slotId(4, 5), slotId(1, 1)];

export const S5: React.FC = () => {
  const f = useCurrentFrame(); // 镜内局部帧 0..449

  // [SFX] 1290 whoosh（穿墙，1 记长样本）
  // [SFX] 1310 tick 0.35 · [SFX] 1428 tick 0.32 · [SFX] 1560 tick 0.29 · [SFX] 1660 tick 0.25

  // 下穿：0–40f 穿入段 progress=0；40–449 线性 0→1（12.96px/f）
  const progress = f <= 40 ? 0 : Math.min(1, (f - 40) / 409);
  const intro = interpolate(f, [0, 18], [0.86, 1], { ...CLAMP, easing: POP });
  const zPush = interpolate(f, [40, 449], [1, 1.05], CLAMP);
  const dark = interpolate(f, [0, 18], [0.08, 0], { ...CLAMP, easing: DAMP });

  // 落点：litIdx 在定版前 5f 接管；dim 从首句落点降到 0.72 后保持（句间不回弹）
  let litIdx = -1;
  for (let i = 0; i < CUES.length; i++) if (f >= CUES[i] - 5) litIdx = i;
  const dim =
    f < CUES[0] - 5
      ? 1
      : interpolate(f, [CUES[0] - 5, CUES[0]], [1, 0.72], { ...CLAMP, easing: DAMP });

  const fx: RowFx = (r) => {
    // 当前句的落点行：全程抵消 dim（始终全亮）+ 1.06 定版 + 粉缝
    if (litIdx >= 0 && r.id === LIT_IDS[litIdx]) {
      const c = CUES[litIdx];
      return {
        style: {
          opacity: 1 / dim,
          transform: `scale(${interpolate(f, [c - 5, c], [1, 1.06], { ...CLAMP, easing: POP })})`,
        },
        seam: interpolate(f, [c - 5, c], [0, 1], { ...CLAMP, easing: POP }),
      };
    }
    // 上一句的落点行：下一定版帧起 5f 释放（缩放/粉缝/亮度一起落回）
    if (litIdx >= 1 && r.id === LIT_IDS[litIdx - 1]) {
      const c = CUES[litIdx];
      return {
        style: {
          opacity: interpolate(f, [c, c + 5], [1 / dim, 1], { ...CLAMP, easing: DAMP }),
          transform: `scale(${interpolate(f, [c, c + 5], [1.06, 1], { ...CLAMP, easing: DAMP })})`,
        },
        seam: interpolate(f, [c, c + 5], [1, 0], { ...CLAMP, easing: DAMP }),
      };
    }
    return undefined; // 其余行：交给全局 dim（0.72）
  };

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* 透视穿入：整墙 0.86 → 1.0（18f），随后 40f 起匀速下穿 + z 推近 */}
      <AbsoluteFill style={{ transform: `scale(${intro * zPush})` }}>
        <Wall progress={progress} dim={dim} fx={fx} />
      </AbsoluteFill>
      {/* S4→S5 转场：整体压暗 8%，18f 退场（穿入墙后画面回到 --bg） */}
      <AbsoluteFill style={{ background: C.ink, opacity: dark }} />
    </AbsoluteFill>
  );
};
