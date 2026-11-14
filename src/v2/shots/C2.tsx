import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from 'remotion';
import { C, E, FONT } from '../timeline';
import { tex } from '../../layout';

/**
 * C2 · 手机独有的两件事：启动画面（**全过程**）+ 拍照搜题（镜内 0–179 = 绝对 840–1019）
 *
 * 启动页不是 4 张静帧：`capture.py` 用 `shot_anim` 按 33ms 一步抽了 0–1320ms 共 41 帧，
 * 这里**按 30fps 1:1 播回去**——那就是 splash.html 自己的动画（粉点从 S 尾巴飞到 e 尾巴、
 * 压扁回弹、小字「让答案触手可及」逐字打出）。抽帧是明色档（这一段在片长的明场里）。
 *
 * 镜内节拍：
 *   0–44    启动页实时播放（41 帧动画 + 3f 停在打完的样子）
 *   46–62   启动页 → 主界面
 *   70–96   青圈圈住「拍照搜题」+ 一次点按涟漪（bbox 来自 `#btnPhoto` 实测）
 *   112–134 主界面 → 记录页（拍完直接进记录）
 *   134–179 hold
 *
 * 音效意图：[SFX] 0 启动 pop · [SFX] 74 tap · [SFX] 118 记录落定 pop
 */

const POP = Easing.bezier(...E.pop);
const DAMP = Easing.bezier(...E.damped);
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const PHONE = { x: 770, y: 108, w: 380, h: 844, bezel: 8, radius: 42 };
const INNER = { w: PHONE.w - PHONE.bezel * 2, h: PHONE.h - PHONE.bezel * 2 };
const SCALE = INNER.w / 360; // 360×800 页面逻辑宽 → 屏幕 px

/** 启动页逐帧素材：0,33,66,…1320ms（41 帧，30fps 一步） */
const SPLASH_STEP_MS = 33;
const SPLASH_LAST = 40;
const splashSrc = (i: number) =>
  staticFile(`textures/mob-splash-${String(Math.min(i, SPLASH_LAST) * SPLASH_STEP_MS).padStart(4, '0')}.png`);

/** #btnPhoto 的页面 CSS px bbox（capture.py 实测）→ 容器 px */
const PHOTO_BTN = { x: 24 * SCALE, y: 540 * SCALE, w: 312 * SCALE, h: 53.2 * SCALE };

export const C2: React.FC = () => {
  const f = useCurrentFrame(); // 0..179

  // [SFX] 0 pop · [SFX] 74 tap · [SFX] 118 pop

  const phoneIn = interpolate(f, [0, 20], [0, 1], { ...CLAMP, easing: POP });
  const toMain = interpolate(f, [46, 62], [0, 1], { ...CLAMP, easing: DAMP });
  const toRecord = interpolate(f, [112, 134], [0, 1], { ...CLAMP, easing: DAMP });
  const ring = interpolate(f, [70, 82], [0, 1], { ...CLAMP, easing: POP });
  const tapT = interpolate(f, [74, 100], [0, 1], { ...CLAMP, easing: DAMP });

  return (
    <AbsoluteFill style={{ background: C.bg, fontFamily: FONT }}>
      <div
        style={{
          position: 'absolute',
          left: PHONE.x,
          top: PHONE.y,
          width: PHONE.w,
          height: PHONE.h,
          borderRadius: PHONE.radius,
          background: C.ink,
          border: `1px solid ${C.line}`,
          boxShadow: '0 26px 60px rgba(20,23,42,0.22)',
          opacity: phoneIn,
          transform: `translateY(${(1 - phoneIn) * 40}px)`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: PHONE.bezel,
            top: PHONE.bezel,
            width: INNER.w,
            height: INNER.h,
            borderRadius: PHONE.radius - 10,
            overflow: 'hidden',
            background: C.surface,
          }}
        >
          {/* 启动页：1:1 实时播放 */}
          {f <= 44 ? (
            <Img
              src={splashSrc(f)}
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 360 * SCALE,
                height: 800 * SCALE,
                opacity: 1 - toMain,
              }}
            />
          ) : null}

          {/* 主界面 → 记录页 */}
          <Img
            src={tex('mob-main')}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 360 * SCALE,
              height: 800 * SCALE,
              opacity: toMain * (1 - toRecord),
            }}
          />
          <Img
            src={tex('mob-record')}
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: 360 * SCALE,
              height: 800 * SCALE,
              opacity: toRecord,
            }}
          />

          {/* 拍照搜题：青圈 + 点按涟漪 */}
          {f >= 70 && toRecord < 0.5 ? (
            <div
              style={{
                position: 'absolute',
                left: PHOTO_BTN.x - 6,
                top: PHOTO_BTN.y - 6,
                width: PHOTO_BTN.w + 12,
                height: PHOTO_BTN.h + 12,
                borderRadius: 18,
                border: `3px solid ${C.pink}`,
                opacity: ring * (1 - toRecord),
                transform: `scale(${0.92 + 0.08 * ring})`,
              }}
            />
          ) : null}
          {f >= 74 && toRecord < 0.5 ? (
            <div
              style={{
                position: 'absolute',
                left: PHOTO_BTN.x + PHOTO_BTN.w / 2 - 40,
                top: PHOTO_BTN.y + PHOTO_BTN.h / 2 - 40,
                width: 80,
                height: 80,
                borderRadius: 999,
                border: `3px solid ${C.pink}`,
                opacity: (1 - tapT) * 0.7,
                transform: `scale(${0.2 + 1.5 * tapT})`,
              }}
            />
          ) : null}

          {/* 刘海 */}
          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 10,
              transform: 'translateX(-50%)',
              width: 92,
              height: 12,
              borderRadius: 999,
              background: C.ink,
              opacity: 0.85,
            }}
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
