import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, interpolateColors, useCurrentFrame } from 'remotion';
import { C, E } from '../timeline';
import { DARK } from '../timeline';
import { PageCam, type CamKey } from '../../lib/PageCam';
import { pageSrc, tex } from '../../layout';

/**
 * D · 搜题记录 + **明切暗（片长中段）**（镜内 0–419 = 绝对 1020–1439）
 *
 * 深浅切点从 C（26s）挪到这一段的中点（镜内 186–206 = 绝对 1206–1226 ≈ 40s）：
 * 全片 84s 于是变成 明 0–40s / 暗 40–84s，前后各占一半。
 *
 * 实现：两层 PageCam 完全同机位叠着——底层明色页、顶层暗色页，`flipT` 交叉淡化。
 * 明暗是同一页两套真图（capture.py 同一脚本、同一 seed、同一坐标系），
 * 所以淡化出来就是产品自己的主题过渡，不是给画面调色；底部底色同步走 --bg → 暗色 --bg。
 *
 * 镜内节拍：
 *   0–110   总的记录页：zoom 1.06 → 1.5 推向左栏科目
 *   110–122 切「科目展开」· 176–188 切「收藏」· 240–252 切「批量选择」
 *   186–206 明 → 暗
 *   280–419 相机右移摇到作答历史，350 起推近「接着问」输入行
 *
 * 音效意图：[SFX] 110/176/240 三次状态切换 · [SFX] 196 切暗 whoosh · [SFX] 340 摇向作答历史
 */

const POP = Easing.bezier(...E.pop);
const DAMP = Easing.bezier(...E.damped);
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const FLIP_AT = 186;
const FLIP_DUR = 20;

const KEYS: CamKey[] = [
  { frame: 0, cx: 720, cy: 450, zoom: 1.06 },
  { frame: 56, cx: 430, cy: 356, zoom: 1.5 },
  { frame: 150, cx: 430, cy: 384, zoom: 1.58 },
  { frame: 210, cx: 700, cy: 400, zoom: 1.38 },
  { frame: 280, cx: 900, cy: 420, zoom: 1.26 },
  { frame: 350, cx: 880, cy: 560, zoom: 1.24 },
  { frame: 419, cx: 860, cy: 632, zoom: 1.3 },
];

/** 整页纹理层（页面 CSS px 坐标，与相机同一坐标系） */
const Tex: React.FC<{ src: string; opacity: number }> = ({ src, opacity }) => {
  if (opacity <= 0.001) return null;
  return <Img src={src} style={{ position: 'absolute', left: 0, top: 0, width: 1440, height: 900, opacity }} />;
};

export const D: React.FC = () => {
  const f = useCurrentFrame(); // 0..419

  // [SFX] 110/176/240 状态切换 · [SFX] 196 切暗 · [SFX] 340 摇向作答历史

  const toSubject = interpolate(f, [110, 122], [0, 1], { ...CLAMP, easing: DAMP });
  const toFav = interpolate(f, [176, 188], [0, 1], { ...CLAMP, easing: DAMP });
  const toBatch = interpolate(f, [240, 252], [0, 1], { ...CLAMP, easing: DAMP });
  const flipT = interpolate(f, [FLIP_AT, FLIP_AT + FLIP_DUR], [0, 1], { ...CLAMP, easing: DAMP });

  const bg = interpolateColors(flipT, [0, 1], [C.bg, DARK.bg]);

  // 明色层：批量态之后一直停在批量态（f 240+），暗色层同理——两层状态同步，只是配色不同
  const lightStates = (
    <>
      <Tex src={tex('ext-review-subject')} opacity={toSubject * (1 - toFav)} />
      <Tex src={tex('ext-review-fav')} opacity={toFav * (1 - toBatch)} />
      <Tex src={tex('ext-review-batch')} opacity={toBatch} />
    </>
  );
  const darkStates = (
    <>
      <Tex src={tex('ext-review-subject-dark')} opacity={toSubject * (1 - toFav)} />
      <Tex src={tex('ext-review-fav-dark')} opacity={toFav * (1 - toBatch)} />
      <Tex src={tex('ext-review-batch-dark')} opacity={toBatch} />
    </>
  );

  return (
    <AbsoluteFill style={{ background: bg }}>
      <PageCam src={pageSrc('ext-review-default')} pageW={1440} pageH={900} bg={bg} keys={KEYS} ease={POP} children={lightStates} />
      {flipT > 0.001 ? (
        <AbsoluteFill style={{ opacity: flipT }}>
          <PageCam
            src={pageSrc('ext-review-default-dark')}
            pageW={1440}
            pageH={900}
            bg={DARK.bg}
            keys={KEYS}
            ease={POP}
            children={darkStates}
          />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};
