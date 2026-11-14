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
import { C, DURATION, SHOTS, type Caption, type ShotId } from './timeline';
import { A1 } from './shots/A1';
import { A2 } from './shots/A2';
import { B } from './shots/B';
import { CShot } from './shots/C';
import { C2 } from './shots/C2';
import { D } from './shots/D';
import { E1 } from './shots/E1';
import { E2 } from './shots/E2';
import { F } from './shots/F';
import { G } from './shots/G';
import { CaptionPill } from '../SporePromo';
import { BGM, SFX, sfxFrom } from './audio';

/**
 * v2 装配层。台词/镜头表全部来自 `./timeline.ts`，声音来自 `./audio.ts`——
 * 与 v1 同一套纪律：**这两份文件之外不许出现绝对帧号**。
 * 字幕实现与 v1 共用 `CaptionPill`（SporePromo 导出），只有一份实现，永不漂移。
 */
const SHOT_COMPONENTS: Record<ShotId, React.FC> = { A1, A2, B, C: CShot, C2, D, E1, E2, F, G };

const CAP_FADE = 8;

const ALL: { shot: ShotId; cap: Caption }[] = SHOTS.flatMap((s) => s.captions.map((cap) => ({ shot: s.id, cap })));

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const hit = ALL.find(({ cap }) => frame >= cap.from && frame <= cap.to);
  if (!hit) return null;
  const { cap } = hit;
  const inT = interpolate(frame, [cap.from, cap.from + CAP_FADE], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outT = interpolate(frame, [cap.to - CAP_FADE, cap.to], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <CaptionPill text={cap.text} opacity={Math.min(inT, outT)} ty={(1 - inT) * 10} />;
};

const SfxLayer: React.FC = () => (
  <>
    {SFX.map((c, i) => (
      <Sequence
        key={`${c.shot}-${c.offset}-${c.file}-${i}`}
        from={sfxFrom(c)}
        durationInFrames={c.dur}
        name={`SFX ${c.note.slice(0, 22)}`}
      >
        <Audio src={staticFile(`audio/sfx/${c.file}`)} volume={c.volume} trimBefore={c.trimBefore} />
      </Sequence>
    ))}
  </>
);

const Bgm: React.FC<{ on: boolean }> = ({ on }) => {
  const frame = useCurrentFrame();
  const gain = interpolate(frame, [0, BGM.fadeIn, DURATION - BGM.fadeOut, DURATION], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  if (!on) return null;
  return <Audio src={staticFile(BGM.file)} volume={gain * BGM.volume} />;
};

export const SporePromoV2: React.FC<{ bgm?: boolean }> = ({ bgm = true }) => (
  <AbsoluteFill style={{ background: C.bg }}>
    {SHOTS.map((s) => {
      const Comp = SHOT_COMPONENTS[s.id];
      return (
        <Sequence key={s.id} from={s.from} durationInFrames={s.dur} name={`${s.id} ${s.title}`}>
          <Comp />
        </Sequence>
      );
    })}
    <Captions />
    <Bgm on={bgm} />
    <SfxLayer />
  </AbsoluteFill>
);

export const RemotionRootV2: React.FC = () => (
  <Composition
    id="SporePromoV2"
    component={SporePromoV2}
    durationInFrames={DURATION}
    fps={30}
    width={1920}
    height={1080}
    defaultProps={{ bgm: true }}
  />
);
