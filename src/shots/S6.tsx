import React from 'react';
import {
  AbsoluteFill,
  Easing,
  interpolate,
  interpolateColors,
  spring,
  useCurrentFrame,
} from 'remotion';
import { C, E, FONT, FPS } from '../timeline';
import { Wall, SURVIVOR_ID, slotId, type RowFx, type WallRow } from './_wall';

/**
 * S6 · 剥离收尾（镜内 0–359 = 绝对 1740–2099）· ui-strip-away-outro
 *
 * 承接 S5：同一面 `_wall`，progress = 1 + f/409（12.96px/f 连续不切，20f 内墙还在下坠）。
 *   · 0–34   六层错峰蒸发（外围→中心）：层间 4f、每层 14f ease-in、50–140px 向外位移 + 0→7px 蒸发模糊
 *             分组见 evapGroup：+0 第三层(远层) → +4 最外层(右翼 col4) → +8 侧列(col1/3)
 *             → +12 中列(col2) → +16 首列(col0) → +20 最后一行(=幸存行，转入滑出)
 *   · 0–26   底色 --bg → --ink #14172A（E.pop，用 --ink 当暗场，不引入第四种黑）
 *   · 2–14   S5 的 0.72 压暗层同步退场（f0 精确对上 S5 末帧）
 *   · 22–62  唯一幸存行滑到屏心、×1.4、白晕 30→70px；62–74 淡出交棒（先迁移后熄灭）
 *   · 74–104 `Spore` 字标 spring 定版（damping 14 / stiffness 90，86% → 100%）：
 *             180px 白字 + --pink 句点，暗场反白；**无渐变/无发光/无描边/无描影**（产品自己就是一个点）
 *   · 104 起 hold（≥1.2s 静止）；120+ tail、150+ 三端、180+ 仓库依次淡入；320–359 全静止 40f
 *
 * 音效意图（只留注释，不接音频）：
 *   [SFX] 1740 whoosh ×2（前两层蒸发，+0f / +4f）
 *   [SFX] 1762 impact（幸存行落定屏心，全片唯一一次中等冲击）
 *   [SFX] 1790 riser（字标前 24f）
 *   [SFX] 1814 sparkle（句点亮起，全片仅此一处）
 */

const POP = Easing.bezier(...E.pop);
const DAMP = Easing.bezier(...E.damped);
const EASE_IN = Easing.in(Easing.cubic); // 蒸发 ease-in
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

/** 六层蒸发：起始帧与向外位移幅度（50–140px） */
const EVAP_DELAY = [0, 4, 8, 12, 16, 20];
const EVAP_MAG = [140, 126, 112, 92, 74, 50];

/** 外围→中心的分层（卡面：第三层→最外层→侧列→中列→首列→最后一行） */
export const evapGroup = (r: WallRow): number => {
  if (r.id === SURVIVOR_ID) return 5; // 最后一行 = 唯一幸存行（不蒸发，转滑出）
  if (r.layer === 2) return 0; // 第三层：纵深最远的雾层先散
  if (r.col === 4) return 1; // 最外层：右翼一列
  if (r.col === 1 || r.col === 3) return 2; // 侧列
  if (r.col === 2) return 3; // 中列
  return 4; // 首列：col0（幸存行所在列，除幸存行外最后散）
};

/** S5 第④句落点行 —— 跨接 S6 的蒸发（点亮态 6f 释放，先迁移后熄灭） */
const LIT4 = slotId(1, 1);

/** 与全片字幕层（SporePromo <Captions/>，bottom 96）逐像素同位同字的 tail 副本 */
const tailStyle: React.CSSProperties = {
  maxWidth: 1520,
  padding: '18px 40px',
  borderRadius: C.r16,
  background: '#FFFFFF', // 不透明：字幕层末 8f 淡出后由本层托底，末帧四元素齐全
  color: C.ink,
  fontFamily: FONT,
  fontSize: 60,
  lineHeight: 1.28,
  letterSpacing: '0.01em',
  textAlign: 'center',
  boxShadow: '0 10px 30px rgba(20,23,42,0.10)',
};

export const S6: React.FC = () => {
  const f = useCurrentFrame(); // 镜内局部帧 0..359

  // [SFX] 1740 whoosh ×2（前两层蒸发）
  // [SFX] 1762 impact（幸存行落定屏心，唯一一次中等冲击）
  // [SFX] 1790 riser（字标前 24f）
  // [SFX] 1814 sparkle（句点亮起，全片仅此一处）

  // 底色压暗（E.pop 26f）+ 墙体延续（progress 从 S5 的 1.0 接着走）+ 轻微 z 推近延续
  const bgT = interpolate(f, [0, 26], [0, 1], { ...CLAMP, easing: POP });
  const bg = interpolateColors(bgT, [0, 1], [C.bg, C.ink]);
  const wallScale = 1.05 + 0.01 * Math.min(1, f / 34);
  const dim = interpolate(f, [2, 14], [0.72, 1], { ...CLAMP, easing: DAMP });

  const fx: RowFx = (r, pos) => {
    // ---- 唯一幸存行：不蒸发。22–62 滑向屏心、×1.4（换算掉墙的 z 缩放），白晕 30→70px；62–74 淡出 ----
    if (r.id === SURVIVOR_ID) {
      const k = interpolate(f, [22, 62], [0, 1], { ...CLAMP, easing: POP });
      const cx = pos.x + 131.5;
      const cy = pos.y + 32;
      const fade = interpolate(f, [62, 74], [1, 0], { ...CLAMP, easing: DAMP });
      const glow = 30 + 40 * k;
      return {
        style: {
          transform: `translate(${(960 - cx) * k}px, ${(540 - cy) * k}px) scale(${1 + (1.4 / wallScale - 1) * k})`,
          opacity: fade,
          boxShadow:
            k > 0
              ? `0 0 ${glow}px rgba(255,255,255,0.5), 0 0 ${glow * 0.45}px rgba(255,255,255,0.35)`
              : undefined,
        },
      };
    }

    // ---- 第④句落点行：跨接 S5 末帧的点亮态，6f 释放（缩放/粉缝落回，亮度靠 1/dim 抵消） ----
    const isLit4 = r.id === LIT4;
    const litScale = isLit4 ? interpolate(f, [0, 6], [1.06, 1], { ...CLAMP, easing: DAMP }) : 1;
    const seam = isLit4 ? interpolate(f, [0, 6], [1, 0], { ...CLAMP, easing: DAMP }) : 0;

    // ---- 其余行：六层错峰蒸发（ease-in 14f，向外位移 + 0→7px 模糊，淡到 0 就不进 DOM） ----
    const g = evapGroup(r);
    const p = interpolate(f, [EVAP_DELAY[g], EVAP_DELAY[g] + 14], [0, 1], { ...CLAMP, easing: EASE_IN });
    if (p >= 1) return { style: { opacity: 0 } };
    const dx = pos.x + 131.5 - 960;
    const dy = pos.y + 32 - 540;
    const len = Math.hypot(dx, dy) || 1;
    const m = (EVAP_MAG[g] * p) / len;
    return {
      style: {
        transform: `translate(${dx * m}px, ${dy * m}px) scale(${litScale})`,
        opacity: (1 - p) * (isLit4 ? 1 / dim : 1),
        filter: p > 0 ? `blur(${7 * p}px)` : undefined,
      },
      seam,
    };
  };

  const tailIn = interpolate(f, [120, 128], [0, 1], { ...CLAMP, easing: DAMP });
  const wordScale =
    f >= 74
      ? 0.86 +
        0.14 * spring({ frame: f - 74, fps: FPS, config: { damping: 14, stiffness: 90 } })
      : 0.86;

  return (
    <AbsoluteFill style={{ background: bg }}>
      {/* 墙体延续 + 六层剥离（progress >1 = 接着 S5 的下坠） */}
      <AbsoluteFill style={{ transform: `scale(${wallScale})` }}>
        <Wall progress={1 + f / 409} dim={dim} fx={fx} />
      </AbsoluteFill>

      {/* 字标：Spore + 粉句点，180px 白字暗场反白，版心居中、约 46% 高度。
          无渐变 / 无发光 / 无描边 / 无描影 —— 产品自己就是一个点。 */}
      {f >= 74 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: '46%',
            transform: 'translateY(-50%)',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              fontFamily: FONT,
              fontSize: 180,
              fontWeight: 600,
              letterSpacing: '-0.01em',
              lineHeight: 1,
              color: '#FFFFFF',
              transform: `scale(${wordScale})`,
              opacity: interpolate(f, [74, 84], [0, 1], { ...CLAMP, easing: DAMP }),
            }}
          >
            Spore<span style={{ color: C.pink }}>.</span>
          </div>
        </div>
      ) : null}

      {/* tail：字幕层在渲（timeline 1860–2099），这里同位垫一层同字副本——
          字幕层最后 8f（镜内 351–359）淡出到 0，副本托底保证末帧四元素齐全；
          逐像素同位同字，叠放无重影，之后全静止。 */}
      {f >= 120 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 96,
            display: 'flex',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <div style={{ ...tailStyle, opacity: tailIn, transform: `translateY(${(1 - tailIn) * 10}px)` }}>
            题在屏幕上，答案在旁边，记录在手里。
          </div>
        </div>
      ) : null}

      {/* 三端小字（150+ = 绝对 1890 起）——Q11：辅助文字 ≥32px，fontSize 20→44（实测墨高 16→35px） */}
      {f >= 150 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 650,
            textAlign: 'center',
            fontFamily: FONT,
            fontSize: 44,
            letterSpacing: 6,
            color: C.muted3,
            opacity: interpolate(f, [150, 164], [0, 1], { ...CLAMP, easing: DAMP }),
          }}
        >
          扩展 · Android · Windows
        </div>
      ) : null}

      {/* 仓库地址（180+ = 绝对 1920 起）——Q11：收尾 URL 是全片最不该小的一行，同抬 44 */}
      {f >= 180 ? (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 718,
            textAlign: 'center',
            fontFamily: FONT,
            fontSize: 44,
            letterSpacing: 1,
            color: C.muted3,
            opacity: interpolate(f, [180, 194], [0, 1], { ...CLAMP, easing: DAMP }),
          }}
        >
          github.com/Offblink/Spore
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
