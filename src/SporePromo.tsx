import React from 'react';
import { AbsoluteFill, Sequence, interpolate, useCurrentFrame } from 'remotion';
import { C, FONT, SHOTS, type Caption, type ShotId } from './timeline';
import { S1 } from './shots/S1';
import { S2 } from './shots/S2';
import { S3 } from './shots/S3';
import { S4 } from './shots/S4';
import { S5 } from './shots/S5';
import { S6 } from './shots/S6';

/** 镜头 id → 组件。后续三张卡只换 shot 文件内容，这张表不用动。 */
const SHOT_COMPONENTS: Record<ShotId, React.FC> = { S1, S2, S3, S4, S5, S6 };

const CAP_FADE = 8; // 进出各 8f（≈ spore.css --t-pop 8f）

const ALL_CAPTIONS: { shot: ShotId; cap: Caption }[] = SHOTS.flatMap((s) =>
  s.captions.map((cap) => ({ shot: s.id, cap })),
);

/**
 * 单条字幕药丸的呈现——**字幕层与动效工作台清单（workbench.ts）共用这一份实现**，
 * 两边永不漂移。opacity/位移由调用方按帧算好传入（字幕层用绝对帧，工作台用 clip 局部帧）。
 */
export const CaptionPill: React.FC<{
  text: string;
  opacity: number;
  ty: number;
  fontSize?: number;
  bottom?: number;
}> = ({ text, opacity, ty, fontSize = 60, bottom = 96 }) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      right: 0,
      bottom, // design-spec: 底部居中、离底 96px（工作台可调）
      display: 'flex',
      justifyContent: 'center',
      pointerEvents: 'none',
    }}
  >
    <div
      style={{
        maxWidth: 1520,
        padding: '18px 40px',
        borderRadius: C.r16,
        background: 'rgba(255,255,255,0.92)',
        color: C.ink,
        fontFamily: FONT,
        fontSize,
        lineHeight: 1.28,
        letterSpacing: '0.01em',
        textAlign: 'center',
        boxShadow: '0 10px 30px rgba(20,23,42,0.10)',
        opacity,
        transform: `translateY(${ty}px)`,
      }}
    >
      {text}
    </div>
  </div>
);

/**
 * 全片字幕层——**唯一字幕实现点**，放在每个镜头的 <Sequence> 之外，
 * 因此用的是合成绝对帧（不用镜内局部帧），也永远不会被镜头自己的 transform 带跑。
 * 后续改镜头的卡不该碰这里。
 */
const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const hit = ALL_CAPTIONS.find(({ cap }) => frame >= cap.from && frame <= cap.to);
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

export const SporePromo: React.FC = () => (
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
  </AbsoluteFill>
);
