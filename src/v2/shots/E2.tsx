import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';
import { E, FONT } from '../timeline';
import { DARK } from '../timeline';
import { tex } from '../../layout';

/**
 * E2 · 移动端悬浮窗 + 桌面端常驻，**左右并排**
 * （镜内 0–239 = 绝对 1620–1859）· **暗场**
 *
 * 2026-11-14 用户口径：这一幕要加桌面端（原来只有手机），左右排布；台词去掉「侧边抽屉」
 * （已在 E1 讲过），只留「悬浮窗——答案在眼前，页面不用动。」
 *
 * 左：手机 —— 悬浮球（按 BallView.java 重画）→ 推近 → 点按（截屏）→ 底部半屏面板
 * 右：桌面 —— 真实 RecordsPane 暗色截图 + **按 Alt+Z 呼出的回答浮窗**（`AnswerWindow` 真构造渲染的
 *      `gui-answer-dark@2x.png`）→ 关窗后整体缩成「已在后台」胶囊
 *
 * 镜内节拍：
 *   0–18 / 8–26  手机、桌面错峰浮入
 *   30–62        手机推到球上（1 → 1.9×，origin 压球心）
 *   62–76        点按：球下压 + 涟漪 + 截屏闪白；66–88 退回 1.0×
 *   88–120       底部半屏面板升起
 *   44–62        Alt+Z 键帽提示浮出 · 62–74 按下
 *   68–100       回答浮窗自右滑入（叠在桌面窗右缘外）
 *   150–186      桌面窗 + 浮窗一起缩成后台胶囊
 *   186–239      hold
 *
 * 音效意图：[SFX] 30 推进 · [SFX] 66 点按 · [SFX] 96 面板 · [SFX] 70 Alt+Z · [SFX] 156 胶囊
 */

const POP = Easing.bezier(...E.pop);
const DAMP = Easing.bezier(...E.damped);
const CLAMP = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const;

const PHONE = { x: 320, y: 217, w: 300, h: 646, bezel: 9, radius: 38 };
const INNER = { w: PHONE.w - PHONE.bezel * 2, h: PHONE.h - PHONE.bezel * 2 };
const S = INNER.w / 360;

const BALL_PAGE = { cx: 322, cy: 650 };
const BALL_SCREEN = { x: PHONE.x + PHONE.bezel + BALL_PAGE.cx * S, y: PHONE.y + PHONE.bezel + BALL_PAGE.cy * S };
const SHEET = { w: 360 * S, h: 430 * S };

const DESK = { x: 780, y: 282, w: 820, h: 546, bar: 34 }; // h = bar + 820/1440*900
const ANSWER = { x: 1372, y: 316, w: 252, h: 384 }; // 420×640 的浮窗按 0.6 放
const KEYCAP = { x: 1180, y: 620, w: 132, h: 48 };
const CAPSULE = { x: 780, y: 838, w: 340, h: 64 };

/** 悬浮球：照 BallView.java onDraw 的几何重画 */
const Ball: React.FC<{ size: number; press: number }> = ({ size, press }) => {
  const d = 0.70710678;
  const r = 42;
  const lensR = r * 0.4;
  const lenK = 1.8;
  const g = (lensR * (lenK - 1)) / 2;
  const lc = { x: 50 - g * d, y: 50 - g * d };
  const from = { x: lc.x + lensR * d, y: lc.y + lensR * d };
  const to = { x: lc.x + lensR * lenK * d, y: lc.y + lensR * lenK * d };
  return (
    <div
      style={{
        width: size * (58 / 48),
        height: size * (58 / 48),
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transform: `scale(${1 - 0.12 * press})`,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 999,
          background: `linear-gradient(to bottom, ${DARK.accentStrong}, ${DARK.accent})`,
          boxShadow: `0 0 ${size * 0.5}px rgba(45,212,191,0.34)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width={size} height={size} viewBox="0 0 100 100">
          <circle cx={lc.x} cy={lc.y} r={lensR} fill="none" stroke="#FFFFFF" strokeWidth={5.4} strokeLinecap="round" />
          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#FFFFFF" strokeWidth={5.4} strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

export const E2: React.FC = () => {
  const f = useCurrentFrame(); // 0..239

  // [SFX] 30 推进 · 66 点按 · 96 面板 · 132 胶囊

  const phoneIn = interpolate(f, [0, 18], [0, 1], { ...CLAMP, easing: POP });
  const deskIn = interpolate(f, [8, 26], [0, 1], { ...CLAMP, easing: POP });

  const zoomUp = interpolate(f, [30, 62], [0, 1], { ...CLAMP, easing: POP });
  const zoomBack = interpolate(f, [66, 88], [0, 1], { ...CLAMP, easing: POP });
  const zoom = 1 + 0.9 * zoomUp - 0.9 * zoomBack;

  const press = interpolate(f, [62, 70, 78], [0, 1, 0], { ...CLAMP, easing: DAMP });
  const ripple = interpolate(f, [64, 100], [0, 1], { ...CLAMP, easing: DAMP });
  const flash = interpolate(f, [66, 70, 80], [0, 0.85, 0], { ...CLAMP, easing: DAMP });

  const sheetIn = spring({ frame: f - 88, fps: 30, config: { damping: 16, stiffness: 90 } });
  const sheetT = Math.max(0, Math.min(1, sheetIn));

  const keyIn = interpolate(f, [44, 62], [0, 1], { ...CLAMP, easing: POP });
  const keyPress = interpolate(f, [62, 70, 78], [0, 1, 0], { ...CLAMP, easing: DAMP });
  const answerIn = spring({ frame: f - 68, fps: 30, config: { damping: 15, stiffness: 95 } });
  const answerT = Math.max(0, Math.min(1, answerIn));

  const toCapsule = interpolate(f, [150, 186], [0, 1], { ...CLAMP, easing: POP });
  const deskScale = 1 - 0.86 * toCapsule;
  const deskX = (CAPSULE.x + CAPSULE.w / 2 - (DESK.x + DESK.w / 2)) * toCapsule;
  const deskY = (CAPSULE.y + CAPSULE.h / 2 - (DESK.y + DESK.h / 2)) * toCapsule;
  const deskOpacity = deskIn * (1 - 0.92 * toCapsule);

  return (
    <AbsoluteFill style={{ background: DARK.bg, fontFamily: FONT }}>
      {/* ---------- 左：手机 ---------- */}
      <AbsoluteFill
        style={{
          opacity: phoneIn,
          transform: `translateY(${(1 - phoneIn) * 40}px) scale(${zoom})`,
          transformOrigin: `${BALL_SCREEN.x}px ${BALL_SCREEN.y}px`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: PHONE.x,
            top: PHONE.y,
            width: PHONE.w,
            height: PHONE.h,
            borderRadius: PHONE.radius,
            background: '#05070D',
            border: `1px solid ${DARK.line}`,
            boxShadow: '0 26px 60px rgba(0,0,0,0.6)',
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
              background: DARK.surface,
            }}
          >
            <Img src={tex('mob-main-dark')} style={{ width: 360 * S, height: 800 * S }} />
            <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: 0.35 * sheetT }} />

            {f >= 88 ? (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  bottom: 0,
                  width: SHEET.w,
                  height: SHEET.h,
                  borderTopLeftRadius: 18,
                  borderTopRightRadius: 18,
                  overflow: 'hidden',
                  transform: `translateY(${(1 - sheetT) * SHEET.h}px)`,
                  boxShadow: '0 -18px 40px rgba(0,0,0,0.55)',
                }}
              >
                <Img src={staticFile('textures/mob-panel-half-dark.png')} style={{ width: 360 * S, height: 430 * S }} />
              </div>
            ) : null}

            <div
              style={{
                position: 'absolute',
                left: BALL_PAGE.cx * S - 24 * S - 8 * S,
                top: BALL_PAGE.cy * S - 24 * S - 8 * S,
              }}
            >
              <Ball size={48 * S} press={press} />
            </div>

            {f >= 64 && f < 102 ? (
              <div
                style={{
                  position: 'absolute',
                  left: BALL_PAGE.cx * S - 34,
                  top: BALL_PAGE.cy * S - 34,
                  width: 68,
                  height: 68,
                  borderRadius: 999,
                  border: `3px solid ${DARK.accent}`,
                  opacity: (1 - ripple) * 0.75,
                  transform: `scale(${0.3 + 1.4 * ripple})`,
                }}
              />
            ) : null}

            <div style={{ position: 'absolute', inset: 0, background: '#FFFFFF', opacity: flash }} />
          </div>

          <div
            style={{
              position: 'absolute',
              left: '50%',
              top: 10,
              transform: 'translateX(-50%)',
              width: 80,
              height: 10,
              borderRadius: 999,
              background: '#05070D',
              opacity: 0.9,
            }}
          />
        </div>
      </AbsoluteFill>

      {/* ---------- 右：桌面端窗口 ---------- */}
      <div
        style={{
          position: 'absolute',
          left: DESK.x,
          top: DESK.y,
          width: DESK.w,
          height: DESK.h,
          borderRadius: 14,
          background: DARK.surface,
          border: `1px solid ${DARK.line}`,
          overflow: 'hidden',
          boxShadow: '0 26px 60px rgba(0,0,0,0.6)',
          opacity: deskOpacity,
          transform: `translate(${deskX}px, ${deskY}px) scale(${deskScale})`,
        }}
      >
        <div
          style={{
            height: DESK.bar,
            background: DARK.surface2,
            borderBottom: `1px solid ${DARK.line}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingLeft: 14,
            paddingRight: 14,
          }}
        >
          <span style={{ fontSize: 15, color: DARK.muted3, letterSpacing: 1 }}>Spore · 搜题记录</span>
          <span style={{ display: 'flex', gap: 9 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 8, height: 8, borderRadius: 999, background: DARK.muted3, opacity: 0.6 }} />
            ))}
          </span>
        </div>
        <Img
          src={tex('gui-records-dark')}
          style={{
            position: 'absolute',
            left: 0,
            top: DESK.bar,
            width: 1440 * (DESK.w / 1440),
            height: 900 * (DESK.w / 1440),
          }}
        />
      </div>

      {/* ---------- Alt+Z 键帽 ---------- */}
      {f >= 44 && toCapsule < 0.6 ? (
        <div
          style={{
            position: 'absolute',
            left: KEYCAP.x,
            top: KEYCAP.y,
            width: KEYCAP.w,
            height: KEYCAP.h,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            opacity: keyIn * (1 - toCapsule),
            transform: `translateY(${(1 - keyIn) * 8}px) scale(${1 - 0.08 * keyPress})`,
          }}
        >
          {['Alt', 'Z'].map((k, i) => (
            <React.Fragment key={k}>
              {i === 1 ? <span style={{ fontSize: 20, color: DARK.muted3 }}>+</span> : null}
              <span
                style={{
                  fontFamily: FONT,
                  fontSize: 22,
                  letterSpacing: 1,
                  color: keyPress > 0.2 ? DARK.accentDeep : DARK.ink2,
                  background: keyPress > 0.2 ? DARK.accentSoft : DARK.surface2,
                  border: `1.5px solid ${keyPress > 0.2 ? DARK.accent : DARK.line}`,
                  borderRadius: 9,
                  padding: '7px 14px',
                  boxShadow: '0 6px 16px rgba(0,0,0,0.45)',
                }}
              >
                {k}
              </span>
            </React.Fragment>
          ))}
        </div>
      ) : null}

      {/* ---------- 桌面回答浮窗（Alt+Z） ---------- */}
      {f >= 68 ? (
        <div
          style={{
            position: 'absolute',
            left: ANSWER.x + (1 - answerT) * 110,
            top: ANSWER.y,
            width: ANSWER.w,
            height: ANSWER.h,
            borderRadius: 14,
            overflow: 'hidden',
            background: DARK.surface,
            border: `1px solid ${DARK.line}`,
            boxShadow: '0 26px 60px rgba(0,0,0,0.62)',
            opacity: answerT * (1 - toCapsule * 0.9),
            transform: `scale(${1 - 0.86 * toCapsule})`,
            transformOrigin: `${CAPSULE.x + CAPSULE.w / 2 - ANSWER.x}px ${CAPSULE.y + CAPSULE.h / 2 - ANSWER.y}px`,
          }}
        >
          <Img src={tex('gui-answer-dark')} style={{ width: ANSWER.w, height: 640 * (ANSWER.w / 420) }} />
        </div>
      ) : null}

      {/* ---------- 桌面收进后台胶囊 ---------- */}
      {f >= 150 ? (
        <div
          style={{
            position: 'absolute',
            left: CAPSULE.x,
            top: CAPSULE.y,
            width: CAPSULE.w,
            height: CAPSULE.h,
            borderRadius: 999,
            background: DARK.surface,
            border: `1.5px solid ${DARK.line}`,
            boxShadow: '0 12px 30px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingLeft: 10,
            opacity: toCapsule,
            transform: `scale(${0.9 + 0.1 * toCapsule})`,
          }}
        >
          <Img
            src={staticFile('textures/app-icon.png')}
            style={{ width: 42, height: 42, borderRadius: 11, border: `1px solid ${DARK.line}` }}
          />
          <span style={{ fontSize: 24, color: DARK.ink2, letterSpacing: 1 }}>桌面端 · 已在后台</span>
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
