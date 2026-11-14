/**
 * v1（70s 六段式）动效工作台清单——**文件名不是工作台认的那一个**（工作台只读
 * `src/workbench.ts(x)`，现在给的是 v2）。要调 v1：两个文件互换名字即可。
 *
 * 原说明（2026-11-06）：
 * 动效工作台清单（video-shotcraft `references/workbench.md` §2）——交付后
 * `node workbench/scripts/open.mjs spore-promo` 按这份清单把成片拆成多轨。
 *
 * **同源原则**：shots/captions 从 `timeline.ts` import、SFX/BGM 从 `audio.ts` import，
 * 没有第二份时间表；改 timeline.ts / audio.ts，工作台跟着变。
 *
 * **可编辑度（如实声明）**：六个镜头在制作期没有按 §3 参数化（语境级参数没提成 props）
 * → 只上「时间与图层」轨（起点/时长/变速/位移/不透明度），属性面板无可调字段；
 * 字幕走与 SporePromo **同一份** `CaptionPill` 实现，文案/字号/离底可调；
 * SFX/BGM 可调音量与位置。已知边界：3 条带 `trimBefore` 的 SFX（fs-676351/423799×2）
 * 在工作台里从文件头播（ManifestAudio 无裁切字段）——仅影响工作台试听/导出的音频，
 * 成片本身与画面 parity 不受影响。
 */
import { useCurrentFrame } from 'remotion';
import type { FC } from 'react';
import { SHOTS, DURATION, FPS, WIDTH, HEIGHT, C } from './timeline';
import { SFX, BGM, sfxFrom } from './audio';
import { SporePromo, CaptionPill } from './SporePromo';
import { S1 } from './shots/S1';
import { S2 } from './shots/S2';
import { S3 } from './shots/S3';
import { S4 } from './shots/S4';
import { S5 } from './shots/S5';
import { S6 } from './shots/S6';

/**
 * 单条字幕单元：clip 局部帧复刻 SporePromo 字幕层的淡入淡出
 * （进 8f、出 8f，`to` 是含端点最后一帧 → 出淡止于 local = duration−1）。
 * `duration` 由清单的 `durationProp` 注入，拉长 clip 出淡跟着挪。
 */
const CaptionUnit: FC<{ text?: string; duration?: number; fontSize?: number; bottom?: number }> = ({
  text = '',
  duration = 40,
  fontSize = 60,
  bottom = 96,
}) => {
  const local = useCurrentFrame();
  const inT = Math.max(0, Math.min(1, local / 8));
  const outT = Math.max(0, Math.min(1, (duration - 1 - local) / 8));
  return (
    <CaptionPill
      text={text}
      opacity={Math.min(inT, outT)}
      ty={(1 - inT) * 10}
      fontSize={fontSize}
      bottom={bottom}
    />
  );
};
CaptionUnit.displayName = 'CaptionUnit';

const SHOT_COMPONENTS: Record<string, FC> = { S1, S2, S3, S4, S5, S6 };

export const WORKBENCH = {
  name: 'Spore 宣传片',
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
  total: DURATION,
  background: C.bg,

  /** 镜头：from/duration 与 SporePromo 的 <Sequence> 一一对应（同源 timeline.ts）。 */
  shots: SHOTS.map((s) => ({
    id: s.id.toLowerCase(),
    label: `${s.id} ${s.title}`,
    from: s.from,
    duration: s.dur,
    component: SHOT_COMPONENTS[s.id],
  })),

  /** 字幕：逐条同源 SHOTS[].captions；共享一张「字幕药丸」卡（cardId 归组）。 */
  captions: SHOTS.flatMap((s) =>
    s.captions.map((cap) => ({
      id: `cap-${cap.from}`,
      label: cap.text,
      from: cap.from,
      duration: cap.to - cap.from + 1,
      component: CaptionUnit as FC,
      props: { text: cap.text },
      schema: [
        { type: 'textarea', key: 'text', label: '文案', default: '' },
        { type: 'slider', key: 'fontSize', label: '字号', default: 60, min: 24, max: 120, step: 1, unit: 'px' },
        { type: 'slider', key: 'bottom', label: '离底', default: 96, min: 0, max: 300, step: 1, unit: 'px' },
      ],
      durationProp: 'duration',
      cardId: 'caption-pill',
      cardName: '字幕药丸',
    })),
  ),

  /** SFX：绝对帧由 sfxFrom() 派生（同源 audio.ts），音量=成片实际值。 */
  sfx: SFX.map((c) => ({
    from: sfxFrom(c),
    duration: c.dur,
    src: `audio/sfx/${c.file}`,
    volume: c.volume,
    label: c.note,
  })),

  bgm: [{ from: 0, duration: DURATION, src: BGM.file, volume: BGM.volume, label: 'house-vibez' }],

  /** 原合成，供 parity 对照（ProjImported vs ProjOriginal 逐帧比对）。 */
  original: SporePromo,
};
