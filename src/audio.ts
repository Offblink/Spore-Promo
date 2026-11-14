/**
 * 声音时间表（阶段6 · SFX 钉帧 + BGM）。**唯一**音频数据源；渲染层见 RootAudio.tsx。
 *
 * 落帧公式（硬规则，禁止裸绝对帧号）：
 *   from = Math.round(SHOTS[shot].from + offset − peakLag − OUTPUT_OFFSET_FRAMES)
 * 其中
 *   - offset      = 目标峰值帧 − SHOTS[shot].from（目标峰值帧见 design 卡「权威帧表」）
 *   - peakLag     = 该文件在**实际播出窗口内**的峰值滞后（帧）＝ manifest 的
 *                   energy_peak_seconds×30 − trimBefore；裁过的样本已扣掉裁切量
 *   - trimBefore  = 从文件头裁掉的帧数（只给峰值靠后的长样本用，选峰值附近的一段）
 *   - OUTPUT_OFFSET_FRAMES = 输出音轨的编码滞后（见下）
 *
 * 未做试听：本表的选材证据是 Freesound 详情页 + ffmpeg 实测（时长/峰值/能量峰/活动区间），
 * 不是听感；混音验收（ebur128）在第二轮渲染后补。
 */
import { SHOTS, type ShotId } from './timeline';

/**
 * 输出音轨偏移（帧）。Remotion 4.0.484 + AAC 48kHz mp4：AAC encoder priming 典型值
 * 2048 samples @48kHz = 1.28f（sound-design §4.6）。**先验值**——第二轮渲出成片后
 * 用 2–3 个尖锐探针做交叉相关复测，残差 ≤0.5f 才算量准，实测值覆盖本常数。
 */
export const OUTPUT_OFFSET_FRAMES = 1.28;

export type SfxCue = {
  shot: ShotId;
  offset: number;
  file: string;
  dur: number; // 播出窗口（帧），动作多长就给多长
  volume: number;
  peakLag: number; // 有效峰值滞后（帧）
  trimBefore?: number; // 从文件头裁掉（帧）
  note: string;
};

/** 目标峰值帧 = SHOTS[shot].from + offset（仅供核对，不进渲染路径）。 */
export const targetPeak = (c: SfxCue): number =>
  SHOTS.find((s) => s.id === c.shot)!.from + c.offset;

export const sfxFrom = (c: SfxCue): number =>
  Math.max(0, Math.round(targetPeak(c) - c.peakLag - OUTPUT_OFFSET_FRAMES));

export const SFX: SfxCue[] = [
  // ---- S1（from 0）----
  { shot: 'S1', offset: 60, file: 'fs-766639.mp3', dur: 6, volume: 0.92, peakLag: 1,
    note: '60 Alt+S 键帽按下（Keyboard_Tactile_8，裁 6f）' },
  { shot: 'S1', offset: 96, file: 'fs-486234.mp3', dur: 6, volume: 0.50, peakLag: 3,
    note: '96 6f 急推（Whoosh For Whip Zoom，裁 6f）' },
  { shot: 'S1', offset: 96, file: 'fs-676351.mp3', dur: 13, volume: 0.42, peakLag: 5, trimBefore: 27,
    note: '96 抽屉滑出 13f（drawer sliding 02，峰值在 32f 处 → 前裁 27f，窗口 13f 与抽屉等长）' },

  // ---- S2（from 210）三记 impact：不同样本 + 音量递减，不加 whoosh ----
  { shot: 'S2', offset: 12, file: 'fs-260003.mp3', dur: 17, volume: 0.40, peakLag: 9,
    note: '222 卡①落基线 impact-01（样本1）' },
  { shot: 'S2', offset: 22, file: 'fs-525105.mp3', dur: 13, volume: 0.30, peakLag: 1,
    note: '232 卡②落基线 PlasticImpactB5（样本2，防机枪）' },
  { shot: 'S2', offset: 31, file: 'fs-532873.mp3', dur: 33, volume: 0.22, peakLag: 3,
    note: '241 卡③落基线 CartImpact2（样本3）' },

  // ---- S3（from 510）----
  { shot: 'S3', offset: 40, file: 'fs-789793.mp3', dur: 7, volume: 0.40, peakLag: 0,
    note: '550 科目行①落位 pop（Pop 4）' },
  { shot: 'S3', offset: 50, file: 'fs-202230.mp3', dur: 20, volume: 0.32, peakLag: 6,
    note: '560 科目行②落位 pop（Pop sound，换样本）' },
  { shot: 'S3', offset: 60, file: 'fs-789793.mp3', dur: 7, volume: 0.25, peakLag: 0,
    note: '570 科目行③落位 pop（Pop 4，A-B-A 错峰 10f）' },
  { shot: 'S3', offset: 150, file: 'fs-622060.mp3', dur: 19, volume: 0.35, peakLag: 6,
    note: '660 切「收藏」button click' },
  { shot: 'S3', offset: 230, file: 'fs-476017.mp3', dur: 9, volume: 0.35, peakLag: 4,
    note: '740 进「批量选择」Press with clicks（换样本）' },
  { shot: 'S3', offset: 330, file: 'fs-423799.mp3', dur: 24, volume: 1.8, peakLag: 12, trimBefore: 21,
    note: '840 右移到作答历史 软 whoosh（Little Whoosh 2，峰值 33f → 裁 21f 取峰值段 24f；源 vol1.0 仅 −17.7dBFS，A6 轻素材 → >1 增益，渲后对床 +4dB 无削波）' },

  // ---- S4（from 930）----
  { shot: 'S4', offset: 0, file: 'fs-445972.mp3', dur: 8, volume: 0.30, peakLag: 3,
    note: '930 手机页内滚动 scroll（裁到与滚动等长 8f）' },
  { shot: 'S4', offset: 120, file: 'fs-789793.mp3', dur: 7, volume: 0.35, peakLag: 0,
    note: '1050 卡勾选① pop（Pop 4）' },
  { shot: 'S4', offset: 130, file: 'fs-202230.mp3', dur: 20, volume: 0.26, peakLag: 6,
    note: '1060 卡勾选② pop（Pop sound，换样本）' },
  { shot: 'S4', offset: 140, file: 'fs-789793.mp3', dur: 7, volume: 0.20, peakLag: 0,
    note: '1070 卡勾选③ pop（Pop 4）' },
  { shot: 'S4', offset: 250, file: 'fs-476017.mp3', dur: 9, volume: 0.40, peakLag: 4,
    note: '1180 配对成功 click（Press with clicks）' },

  // ---- S5（from 1290）----
  { shot: 'S5', offset: 0, file: 'fs-449996.mp3', dur: 80, volume: 1.5, peakLag: 6,
    note: '1290 穿墙 whoosh（whoosh_short_mid 整段长样本 2.68s，不给每行配音；源 vol1.0 仅 −20dBFS → A6 给足 >1 增益，渲染产物验峰无削波）' },
  { shot: 'S5', offset: 20, file: 'fs-668355.mp3', dur: 2, volume: 0.41, peakLag: 1,
    note: '1310 句①落定 tick（single-tick）' },
  { shot: 'S5', offset: 138, file: 'fs-117280.mp3', dur: 15, volume: 0.32, peakLag: 15,
    note: '1428 句②落定 tick（front tick，峰值在片尾 → 整段 15f）' },
  { shot: 'S5', offset: 270, file: 'fs-668355.mp3', dur: 2, volume: 0.28, peakLag: 1,
    note: '1560 句③落定 tick（换回 single-tick）' },
  { shot: 'S5', offset: 370, file: 'fs-117280.mp3', dur: 15, volume: 0.25, peakLag: 15,
    note: '1660 句④落定 tick（front tick）' },

  // ---- S6（from 1740）----
  { shot: 'S6', offset: 0, file: 'fs-486234.mp3', dur: 6, volume: 0.40, peakLag: 3,
    note: '1740 前两层蒸发 whoosh①（Whip Zoom）' },
  { shot: 'S6', offset: 10, file: 'fs-423799.mp3', dur: 18, volume: 1.4, peakLag: 9, trimBefore: 24,
    note: '1750 前两层蒸发 whoosh②（Little Whoosh 2，换样本，峰值 33f → 裁 24f；同 840 轻源，A6 >1 增益）' },
  { shot: 'S6', offset: 22, file: 'fs-802966.mp3', dur: 53, volume: 0.55, peakLag: 3,
    note: '1762 幸存行落屏心 impact（Impact Percs w/ Bass，全片唯一一次中等冲击）' },
  { shot: 'S6', offset: 50, file: 'fs-531729.mp3', dur: 33, volume: 0.52, peakLag: 29,
    note: '1790 字标前 24f riser（Energy Riser 3，峰值 29f → 1790 起 1793 收，收在 1814 前）' },
  { shot: 'S6', offset: 74, file: 'fs-545238.mp3', dur: 17, volume: 0.35, peakLag: 0,
    note: '1814 粉句点亮 sparkle（Item Sparkle，全片仅此一处）' },
];

/**
 * BGM：house-vibez（Lily J / Mixkit，授权见 public/audio/BGM-ATTRIBUTION.md）。
 * 稳态器乐 House，实测 1s 分段 RMS −10.4~−16.9 dBFS，无人声标注；本片取前 70s。
 *
 * BPM/相位与镜头边界对齐（_bgm_phase.py 实测，BPM 取技能库 ATTRIBUTION 的 librosa 值）：
 *   BPM 123 → 拍长 0.48780s = 14.634f@30；第一拍相位 phase = 0.0906s（= 2.72f）
 *   六个镜头边界（0/7/17/31/43/58/70s）到最近一拍的残差：
 *     [2.72, 2.40, 4.91, 5.33, 0.52, 4.18, 4.60] 帧，RMS 3.87f
 *   —— 拍网格对齐（bar 长 1.9512s 无法覆盖 7/10/14/12/15/12s 的镜头差，故不强求小节对齐）。
 *   最大残差 5.33f ≈ 178ms：**这是 123BPM 与整数秒镜头边界的真实不可约残差**，
 *   不是漏算；第二轮渲染时若听感需要，可再评估 ±1BPM 内的相位微调。
 *
 * volume 是乘法系数：BGM 压在 −28dBFS 量级做底。
 * 实测记录（2026-11-07 终检；床 = 剔除全部音效时窗后的纯 BGM，峰值 −16.5 / RMS −27.7 dBFS）：
 *   BGM 0.16→0.10（经验值 + 设计注释的 −28 量级，渲后 RMS 实测 −27.7 ✓）；
 *   8 条被床压住的 SFX 抬音量；两条固有轻源（fs-423799 −17.7、fs-449996 −20.0 @vol1.0）
 *   按 A6 规则给足 >1 增益（840=1.8 / 1750=1.4 / 1290=1.5）。
 *   渲后终值：27/27 条 SFX 峰值 ≥ 床峰，全部 ≥ 床 RMS +10dB；True peak −6.7dBFS 无削波。
 *   未做试听——只有测量结论。
 */
export const BGM = {
  file: 'audio/bgm/house-vibez.mp3',
  volume: 0.10,
  bpm: 123,
  phase: 0.0906, // 第一拍距片头的秒数（= 2.72f@30）
  fadeIn: 30, // 片头 0–30f 淡入
  fadeOut: 30, // 片尾 2070–2100f 淡出
} as const;
