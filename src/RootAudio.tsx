/**
 * 阶段6 装配层：**音频在 SporePromo 之外渲染**（阶段6 卡硬约束——不改任何既有 .tsx，
 * 尤其 SporePromo.tsx 的 6 个 <Sequence> + 字幕层装配契约）。本文件是新增文件：
 *  - PromoWithAudio = SporePromo（画面，原样）+ BGM 层 + SFX 层
 *  - RemotionRoot   = 与 Root.tsx 相同的 Composition 参数，只把 component 指向 PromoWithAudio
 *  - src/index.ts（.ts，非 .tsx）改一行 import 指向本文件；Root.tsx / SporePromo.tsx 字节不变
 * 双版渲染：带 BGM 直接渲；无 BGM 用 --props=props-nobgm.json（{"bgm":false}），SFX 保留。
 */
import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Composition,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from 'remotion';
import { SporePromo } from './SporePromo';
import { DURATION } from './timeline';
import { BGM, SFX, sfxFrom } from './audio';

/** SFX：每条按 sfxFrom()（= SHOTS.x.from + offset − peakLag − OUTPUT_OFFSET_FRAMES）落帧。 */
const SfxLayer: React.FC = () => (
  <>
    {SFX.map((c, i) => (
      <Sequence
        key={`${c.shot}-${c.offset}-${c.file}-${i}`}
        from={sfxFrom(c)}
        durationInFrames={c.dur}
        name={`SFX ${c.note.slice(0, 24)}`}
      >
        <Audio
          src={staticFile(`audio/sfx/${c.file}`)}
          volume={c.volume}
          trimBefore={c.trimBefore} // Remotion 4.0.484：单位是帧（audio/props.d.ts "in frames"）——曾误除 /30 当秒，裁切实际为 0，2026-11-07 终检修
        />
      </Sequence>
    ))}
  </>
);

/** BGM：单曲覆盖 70s，首尾淡入淡出；bgm=false（props-nobgm.json）时整层不渲染。 */
const Bgm: React.FC<{ on: boolean }> = ({ on }) => {
  const frame = useCurrentFrame();
  const gain = interpolate(
    frame,
    [0, BGM.fadeIn, DURATION - BGM.fadeOut, DURATION],
    [0, 1, 1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
  );
  if (!on) return null;
  return <Audio src={staticFile(BGM.file)} volume={gain * BGM.volume} />;
};

export const PromoWithAudio: React.FC<{ bgm?: boolean }> = ({ bgm = true }) => (
  <AbsoluteFill>
    <SporePromo />
    <Bgm on={bgm} />
    <SfxLayer />
  </AbsoluteFill>
);

export const RemotionRoot: React.FC = () => (
  <Composition
    id="SporePromo"
    component={PromoWithAudio}
    durationInFrames={2100}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{ bgm: true }}
  />
);
