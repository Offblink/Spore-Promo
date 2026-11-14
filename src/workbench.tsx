/**
 * v2 动效工作台清单（video-shotcraft `references/workbench.md` §2）。
 * 交付后：`node workbench/scripts/open.mjs <spore-promo 目录>` → http://localhost:5198
 *
 * **同源原则**：shots/captions 从 `./v2/timeline.ts` import、SFX/BGM 从 `./v2/audio.ts` import；
 * 没有第二份时间表。字幕走与 `SporePromoV2` **同一份** `CaptionPill` 实现。
 *
 * v1（70s 六段式）的清单留在 `src/workbench-v1.tsx.bak`：工作台只认 `src/workbench.ts(x)` 一个文件，
 * 现在的交付物是 v2，所以这个文件名给 v2。要调 v1，把两个文件互换即可。
 */
import { useCurrentFrame } from 'remotion';
import type { FC } from 'react';
import { DURATION, FPS, HEIGHT, WIDTH, SHOTS, C } from './v2/timeline';
import { SFX, BGM, sfxFrom } from './v2/audio';
import { SporePromoV2 } from './v2/Promo';
import { CaptionPill } from './SporePromo';
import { A1 } from './v2/shots/A1';
import { A2 } from './v2/shots/A2';
import { B } from './v2/shots/B';
import { CShot } from './v2/shots/C';
import { C2 } from './v2/shots/C2';
import { D } from './v2/shots/D';
import { E1 } from './v2/shots/E1';
import { E2 } from './v2/shots/E2';
import { F } from './v2/shots/F';
import { G } from './v2/shots/G';

/** 单条字幕单元：clip 局部帧复刻字幕层淡入淡出（进 8f、出 8f，`to` 是含端点最后一帧） */
const CaptionUnit: FC<{ text?: string; duration?: number; fontSize?: number; bottom?: number }> = ({
  text = '',
  duration = 40,
  fontSize = 60,
  bottom = 96,
}) => {
  const local = useCurrentFrame();
  const inT = Math.max(0, Math.min(1, local / 8));
  const outT = Math.max(0, Math.min(1, (duration - 1 - local) / 8));
  return <CaptionPill text={text} opacity={Math.min(inT, outT)} ty={(1 - inT) * 10} fontSize={fontSize} bottom={bottom} />;
};
CaptionUnit.displayName = 'CaptionUnit';

const SHOT_COMPONENTS: Record<string, FC> = { A1, A2, B, C: CShot, C2, D, E1, E2, F, G };

export const WORKBENCH = {
  name: 'Spore 宣传片 v2',
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
  total: DURATION,
  background: C.bg,

  shots: SHOTS.map((s) => ({
    id: s.id.toLowerCase(),
    label: `${s.id} ${s.title}`,
    from: s.from,
    duration: s.dur,
    component: SHOT_COMPONENTS[s.id],
  })),

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

  sfx: SFX.map((c) => ({
    from: sfxFrom(c),
    duration: c.dur,
    src: `audio/sfx/${c.file}`,
    volume: c.volume,
    label: c.note,
  })),

  bgm: [{ from: 0, duration: DURATION, src: BGM.file, volume: BGM.volume, label: 'house-vibez' }],

  original: SporePromoV2,
};
