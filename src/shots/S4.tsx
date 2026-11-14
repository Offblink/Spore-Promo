import React from 'react';
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, Easing } from 'remotion';
import { C, E } from '../timeline';
import { tex } from '../layout';

/**
 * S4 · 手机记录页滚动 / 多选 → 配对同步 → 桌面出现同一条（镜内 0–359 = 绝对 930–1289）
 * 素材驱动运镜，无镜头卡（design-spec §6 F5）。**返工后改左右对置构图**（左偏空修复）：
 *
 *   左：手机 343.8×764（页面 360×800 × 0.955），x350..694 / y48..812
 *   中：配对与同步卡 400×75.9，x740..1140 / y36..112（在中缝上方搭桥，不压机身；只留标题行）
 *   右：桌面窗口特写 790×620，x1060..1850 / y180..800
 *   → 三块沿一条叙事轴排开，左右两半都有实内容；三块下缘全部 ≥41px 让开字幕带 y871..984
 *
 * 结构：
 *   · 手机框 343.8×764（zoom 0.955），--r16 + 极淡投影；**PhoneCam 推近到 1.08 后**
 *     包围盒 y17.4..842.6 —— 推近会四边各外扩 4%，是手机不能按 5–8% 缩的根因（见报告）
 *   · 页面拆三条带：顶带（topbar/标题/chips，**固定**）、列表带（滚动 60px）、底带（导航/批量底栏，固定）
 *     —— chips 在滚动中保持可见，就是这么保证的
 *   · 多选：整页 8f 交叉淡化到 `mob-record-select`，底栏单独从下往上 10f（E.pop）盖掉原导航
 *   · 配对卡：`BBOX['mob-sync']` 标题行裁片 logical x28..163 y211.1..236.7 放大到 400×75.9（≈1:1），20f 滑入
 *   · 末 60f：右半屏桌面窗口淡入，末 40f 再切 `gui-records-select`（12f 慢淡、机位不动）
 *     —— **裁切放大**而非整图缩略：按源像素裁 `(0,192)-(576,644)`@2x = 逻辑 (0,96)-(288,322)
 *     显示成 790×620，选中行 14px 逻辑字号 → **38.4px** 有效字高（Q11 ≥32px 可读线）
 *     —— 两张图只差选中态，慢切让观众读出「同一条记录被点亮」
 *
 * 音效意图（卡面原文，注释不接音频）：
 *   [SFX] 930 scroll（裁到与滚动等长）
 *   [SFX] 1050 pop ×3（勾选）
 *   [SFX] 1180 click（配对成功）
 */

const POP = Easing.bezier(...E.pop);
const DAMP = Easing.bezier(...E.damped);

const ramp = (f: number, a: number, b: number, easing: (t: number) => number): number =>
  interpolate(f, [a, b], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

const SHADOW = '0 8px 32px rgba(20,23,42,.10)';

/** 手机屏：页面 360×800 × 0.955 = 343.8×764，左缘 x350（左右对置的左半） */
const PHONE = { left: 350, top: 48, w: 343.8, h: 764 };
const PAGE_ZOOM = 0.955; // 343.8/360；原 1.125 居中版放不进字幕带以上（1.08 推近后 h=999 > 871）

/** 配对与同步卡（屏幕坐标）：Q11 终检裁决（2026-11-07，用户选「裁切放大只留标题」）——
 * 只显示标题行「已配对 · 演示电脑」，正文两行（演示网关·上次同步…）裁掉不显示。
 * 源 logical裁片 135×25.6（real 405×77，标题墨高 42px @3x）→ 显示 400×75.9（≈1:1 降采样）
 * → 标题墨高 ≈41.5px ≥32px ✓；容器自绘白卡+阴影+圆角，右切口是纯白无痕。 */
const SYNC = { left: 740, top: 36, w: 400, h: 75.9, sx: 28, sy: 211.1, sw: 135, sh: 25.6 };
const SYNC_K = SYNC.w / SYNC.sw; // 2.963（logical → 显示）

/**
 * 桌面窗口特写（右半）：整图缩略 715×447 时内部文字只有 6.9px（Q11 中间态，返工根因），
 * 改为**按源像素裁切放大**：源 @2x 裁 (0,192)-(576,644) = 逻辑 (0,96)-(288,322)
 * = 左栏（rail 实测 0..280 + 分隔线）+ 按钮/高数/粉选中行/两条同组记录，
 * 上下边缘落在 rail 实测的两条空白缝里（tabs 容器止于 90.5、按钮起于 101；
 * 上一行日期止于 315、下一枚分组 pill 起于 327）—— 不切任何控件。
 * 显示 790×620 → 显示宽/裁切逻辑宽 = 790/288 = 2.7431。
 * 选中行 14px 逻辑字号（实测 ink 12.5px ÷0.89）→ 14×2.7431 = **38.4px ≥32px**。
 * 纵横比 576:452 = 1.2743 ≈ 790:620 = 1.2742（0.01% 拉伸，不可见）。
 */
const GUI = { left: 1060, top: 180, w: 790, h: 620, sx: 0, sy: 192, sw: 576, sh: 452 };
const GUI_K = GUI.w / GUI.sw; // 1.3715（源像素 → 显示像素）
const GUI_SRC = { w: 2880, h: 1800 }; // gui-records@2x 实际像素（1440×900 @2x）

export const S4: React.FC = () => {
  const f = useCurrentFrame(); // 镜内局部帧 0..359

  // 0–120 PhoneCam 轻推 1.0 → 1.08 + 页面内滚动 60px（位置位移 → E.pop）
  const push = interpolate(f, [0, 120], [1, 1.08], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: POP,
  });
  const scroll = interpolate(f, [0, 120], [0, 60], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: POP,
  });
  // 120–128 多选态整页交叉淡化（勾选标记出现）
  const sel = ramp(f, 120, 128, DAMP);
  // 120–130 底栏从下往上 10f（整个固定底带先藏到画外，再滑回归位）
  const barT = interpolate(f, [120, 130], [170, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: POP,
  });
  // 230–250 配对卡 20f 滑入
  const syncX = interpolate(f, [230, 250], [200, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: POP,
  });
  const syncOp = ramp(f, 230, 238, DAMP);
  // 300–312 GUI 淡入；320–332 慢切到选中态（切换前后机位/画面完全不动）
  const guiOp = ramp(f, 300, 312, DAMP);
  const guiSel = ramp(f, 320, 332, DAMP);

  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* ================= 手机 ================= */}
      <div
        style={{
          position: 'absolute',
          left: PHONE.left,
          top: PHONE.top,
          width: PHONE.w,
          height: PHONE.h,
          borderRadius: C.r16,
          overflow: 'hidden',
          background: C.bg,
          boxShadow: SHADOW,
          transform: `scale(${push})`,
          transformOrigin: '50% 50%',
        }}
      >
        {/* 页面坐标系：360×800 用 zoom 缩到 343.8×764，纹理直接从 1080×2400 源重采样 */}
        <div style={{ position: 'absolute', left: 0, top: 0, width: 360, height: 800, zoom: PAGE_ZOOM }}>
          {/* ---- 列表带（唯一滚动的部分） y160..632；下沿必须 ≤ 715−滚动量(60)=655，
                  否则滚动层会把页底（导航/批量底栏）带上来 → 画面里出现"两条底栏" ---- */}
          <div style={{ position: 'absolute', left: 0, top: 160, width: 360, height: 472, overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 360,
                height: 472,
                transform: `translateY(${-scroll}px)`,
              }}
            >
              <Img
                src={tex('mob-record')}
                style={{ position: 'absolute', left: 0, top: -160, width: 360, height: 800 }}
              />
              <Img
                src={tex('mob-record-select')}
                style={{ position: 'absolute', left: 0, top: -160, width: 360, height: 800, opacity: sel }}
              />
            </div>
          </div>

          {/* ---- 顶带（topbar / 标题 / chips，固定：滚动中保持可见） y0..160 ---- */}
          <div style={{ position: 'absolute', left: 0, top: 0, width: 360, height: 160, overflow: 'hidden' }}>
            <Img src={tex('mob-record')} style={{ position: 'absolute', left: 0, top: 0, width: 360, height: 800 }} />
            <Img
              src={tex('mob-record-select')}
              style={{ position: 'absolute', left: 0, top: 0, width: 360, height: 800, opacity: sel }}
            />
          </div>

          {/* ---- 底带（固定） y630..800 ----
                  上沿取 630 而不是 715：既要 ≤715−60 挡住滚动层里的页底，又要让接缝两侧
                  都落在页底色的纯色段（y≥690 后选中态底色由 #F4F6FD 渐变到 #EFF1F8，
                  接在渐变段上会露出 4/255 的横向色阶）。 ---- */}
          <div style={{ position: 'absolute', left: 0, top: 630, width: 360, height: 170, overflow: 'hidden' }}>
            <Img
              src={tex('mob-record')}
              style={{ position: 'absolute', left: 0, top: -630, width: 360, height: 800 }}
            />
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                width: 360,
                height: 170,
                overflow: 'hidden',
                transform: `translateY(${barT}px)`,
              }}
            >
              <Img
                src={tex('mob-record-select')}
                style={{ position: 'absolute', left: 0, top: -630, width: 360, height: 800 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ================= 配对与同步卡（中缝上方滑入，右缘不越 GUI、左缘不压机身） ================= */}
      {f >= 230 ? (
        <div
          style={{
            position: 'absolute',
            left: SYNC.left,
            top: SYNC.top,
            width: SYNC.w,
            height: SYNC.h,
            overflow: 'hidden',
            borderRadius: C.r12,
            background: C.surface,
            boxShadow: SHADOW,
            opacity: syncOp,
            transform: `translateX(${syncX}px)`,
          }}
        >
          <Img
            src={tex('mob-settings-sync')}
            style={{
              position: 'absolute',
              left: -SYNC.sx * SYNC_K,
              top: -SYNC.sy * SYNC_K,
              width: 360 * SYNC_K,
              height: 800 * SYNC_K,
            }}
          />
        </div>
      ) : null}

      {/* ================= 桌面端：同一行被点亮 ================= */}
      {f >= 300 ? (
        <div
          style={{
            position: 'absolute',
            left: GUI.left,
            top: GUI.top,
            width: GUI.w,
            height: GUI.h,
            overflow: 'hidden',
            borderRadius: C.r16,
            background: C.surface,
            boxShadow: SHADOW,
            opacity: guiOp,
          }}
        >
          <Img
            src={tex('gui-records')}
            style={{
              position: 'absolute',
              left: -GUI.sx * GUI_K,
              top: -GUI.sy * GUI_K,
              width: GUI_SRC.w * GUI_K,
              height: GUI_SRC.h * GUI_K,
            }}
          />
          <Img
            src={staticFile('textures/gui-records-select@2x.png')}
            style={{
              position: 'absolute',
              left: -GUI.sx * GUI_K,
              top: -GUI.sy * GUI_K,
              width: GUI_SRC.w * GUI_K,
              height: GUI_SRC.h * GUI_K,
              opacity: guiSel,
            }}
          />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
