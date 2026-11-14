import React from 'react';
import { Img, interpolate, useCurrentFrame, Easing } from 'remotion';
import { C, E } from '../timeline';
import { pageSrc, tex } from '../layout';
import { PageCam, type CamKey } from '../lib/PageCam';

/**
 * S3 · 搜题记录：科目分组 → 收藏筛选 → 批量选择 → 作答历史（镜内 0–419 = 绝对 510–929）
 *
 * 核心手法（design-spec §8.1）：**靠状态变化撑住，不靠运镜**。
 * 四个状态全部用真纹理交叉淡化（四张 2880×1800 / 逻辑 1440×900 / dpr2，同一机位同一坐标系，
 * 所以 8f 交叉淡化即可完美对齐）——不自己画任何状态。
 *
 * 取景（实测：状态变化全部落在左栏 x0..279，`ext-subject-1` = x8..271；
 * 卡面写的「左栏 x280..551」与 layout.json 不符，按实测的左栏 0..279 取景，
 * 否则四态切换一帧都看不见）：
 *   · 0–330  整页取景 z=1.21：左栏、分段按钮、批量底栏全部在画面内
 *   · 330–419 平移到作答历史内容包围盒（`BBOX['ext-detail-content']` x456..1264, y54..783），
 *             落点 z=1.72 / c(860,571)：表格与 `✓ 与初答一致` 在字幕上方，输入条在字幕下方
 *
 * 音效意图（卡面原文，注释不接音频）：
 *   [SFX] 58 pop ×3 错峰（科目行落位，0.40→0.25）
 *   [SFX] 240 click（切收藏）
 *   [SFX] 320 click（进批量）
 *   [SFX] 400 whoosh-soft（右移）
 */

const POP = Easing.bezier(...E.pop); // 位置位移（相机 / 行落位）
const DAMP = Easing.bezier(...E.damped); // 透明度（纹理交叉淡化）

const ramp = (f: number, a: number, b: number, easing: (t: number) => number): number =>
  interpolate(f, [a, b], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

/** 整页纹理层：作为 PageCam 的 children，坐标 = 页面 CSS px（与相机同一坐标系） */
const Tex: React.FC<{ src: string; opacity: number }> = ({ src, opacity }) => (
  <Img src={src} style={{ position: 'absolute', left: 0, top: 0, width: 1440, height: 900, opacity }} />
);

/** 纹理裁片：wrapper 按页面 CSS px 定位并裁切，内部整页图反向偏移 —— 只用真图，不手绘 */
const Slice: React.FC<{
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
  opacity: number;
}> = ({ src, x, y, w, h, scale, opacity }) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      overflow: 'hidden',
      transform: `scale(${scale})`,
      transformOrigin: '50% 50%',
      opacity,
    }}
  >
    <Img src={src} style={{ position: 'absolute', left: -x, top: -y, width: 1440, height: 900 }} />
  </div>
);

/**
 * 三个科目行（实测填充：x9..269；高数 y110..149.5 / 线代 y346..386.5 / 英语 y394..433.5）。
 * 遮盖/裁片比填充外扩 3px —— pill 还有 1px 描边（#EDF0F8），不外扩会在白底上留一圈描边残影。
 */
const PILLS = [
  { x: 6, y: 107, w: 266, h: 46, start: 40 },
  { x: 6, y: 343, w: 266, h: 46, start: 50 },
  { x: 6, y: 391, w: 266, h: 46, start: 60 },
];
const PILL_DUR = 20; // stagger 10f，总窗口 40–80，落在卡面的 40–90 list-reveal 内

/**
 * 高数的 3 条成员行区（侧栏白底 #FFFFFF）——默认态按「科目折叠」先盖住，90–98f 随展开态一起露出。
 * 上下边界卡在两条 pill 的描边之外（151 = 高数底边之下，344 = 线代顶边之上），避免吃掉 pill 描边。
 */
const MEMBERS = { x: 0, y: 151, w: 278, h: 193 };

export const S3: React.FC = () => {
  const f = useCurrentFrame(); // 镜内局部帧 0..419

  // 相机：0–40 页面 0.92→1.0 落位；40–330 静止（撑住四个状态节拍）；330–419 右移到作答历史
  const keys: CamKey[] = [
    { frame: 0, cx: 720, cy: 445, zoom: 1.113 },
    { frame: 40, cx: 720, cy: 445, zoom: 1.21 },
    { frame: 330, cx: 720, cy: 445, zoom: 1.21 },
    { frame: 419, cx: 860, cy: 571, zoom: 1.72 },
  ];

  // 四态交叉淡化（8f）：默认 → 科目展开(90) → 收藏(150) → 批量(230)
  const oSubject = ramp(f, 90, 98, DAMP);
  const oFav = ramp(f, 150, 158, DAMP);
  const oBatch = ramp(f, 230, 238, DAMP);
  // 成员行的遮盖随展开同步退场（98f 后不再渲染，像素与底图一致）
  const oMemberCover = 1 - oSubject;

  // 末尾光标落到输入条（页 x322 / y840，闪 2 次）
  const caretOn = (f >= 376 && f < 388) || (f >= 396 && f < 408) || f >= 416;

  return (
    <PageCam
      src={pageSrc('ext-review-default')}
      pageW={1440}
      pageH={900}
      bg={C.bg}
      keys={keys}
      ease={POP}
      frame={f}
    >
      {/* ---- 状态纹理栈：整页叠放，8f 交叉淡化，坐标系完全一致 ---- */}
      <Tex src={tex('ext-review-subject')} opacity={oSubject} />
      <Tex src={tex('ext-review-fav')} opacity={oFav} />
      <Tex src={tex('ext-review-batch')} opacity={oBatch} />

      {/* ---- 默认态按「科目折叠」读：成员行区盖白，90–98f 随展开态一起露出 ---- */}
      {f < 98 ? (
        <div
          style={{
            position: 'absolute',
            left: MEMBERS.x,
            top: MEMBERS.y,
            width: MEMBERS.w,
            height: MEMBERS.h,
            background: '#FFFFFF',
            opacity: oMemberCover,
          }}
        />
      ) : null}

      {/* ---- list-reveal：3 个科目行逐条 scale 0.82→1 找位（stagger 10f，E.pop，末帧归位） ---- */}
      {PILLS.map((p) =>
        f < p.start + PILL_DUR ? (
          <React.Fragment key={`pill-${p.y}`}>
            {/* 落位前先遮住底图同位置的行，否则下面那条会先亮着（ghost） */}
            <div
              style={{
                position: 'absolute',
                left: p.x,
                top: p.y,
                width: p.w,
                height: p.h,
                background: '#FFFFFF',
              }}
            />
            {f >= p.start ? (
              <Slice
                src={tex('ext-review-default')}
                x={p.x}
                y={p.y}
                w={p.w}
                h={p.h}
                scale={interpolate(f, [p.start, p.start + PILL_DUR], [0.82, 1], {
                  extrapolateLeft: 'clamp',
                  extrapolateRight: 'clamp',
                  easing: POP,
                })}
                opacity={ramp(f, p.start, p.start + 8, DAMP)}
              />
            ) : null}
          </React.Fragment>
        ) : null,
      )}

      {/* ---- 末尾光标落到输入条（闪 2 次） ---- */}
      {caretOn ? (
        <div
          style={{
            position: 'absolute',
            left: 322,
            top: 840,
            width: 2,
            height: 24,
            background: C.pink,
          }}
        />
      ) : null}
    </PageCam>
  );
};
