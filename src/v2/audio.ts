/**
 * v2 声音时间表（SporePromoV2）。落帧公式与 v1 完全一致：
 *   from = round(SHOTS[x].from + offset − peakLag − OUTPUT_OFFSET_FRAMES)
 *
 * 与 v1 的差别只有内容：v2 是新剪辑，cue 全部按 v2 的动作重钉；
 * 样本从工程内既有 19 个 CC0 里选（来源与许可见 public/audio/sfx/FREESOUND-CREDITS.md），不新增下载。
 * v1 的 A6 结论（轻源给 >1 增益）在 F 的 whoosh 上沿用。
 */
import { SHOTS, type ShotId } from './timeline';

/** AAC priming 先验值（v1 2026-11-07 渲后探针回测过，符号不一致 = 无系统偏移，常数维持） */
export const OUTPUT_OFFSET_FRAMES = 1.28;

export type SfxCue = {
  shot: ShotId;
  offset: number;
  file: string;
  dur: number;
  volume: number;
  peakLag: number;
  trimBefore?: number;
  note: string;
};

export const targetPeak = (c: SfxCue): number => SHOTS.find((s) => s.id === c.shot)!.from + c.offset;

export const sfxFrom = (c: SfxCue): number =>
  Math.max(0, Math.round(targetPeak(c) - c.peakLag - OUTPUT_OFFSET_FRAMES));

export const SFX: SfxCue[] = [
  // ---- A1（from 0）痛点①·题库 ----
  { shot: 'A1', offset: 20, file: 'fs-766639.mp3', dur: 38, volume: 0.30, peakLag: 1,
    note: '20 题干逐字打出（Keyboard_Tactile_8 单键样本拉 38f 当打字床）' },
  { shot: 'A1', offset: 100, file: 'fs-260003.mp3', dur: 17, volume: 0.40, peakLag: 9,
    note: '100 红章「不是同一道题」落定 impact-01（全片 slam 1/3）' },

  // ---- A2（from 150）痛点②·AI ----
  { shot: 'A2', offset: 20, file: 'fs-789793.mp3', dur: 7, volume: 0.34, peakLag: 0,
    note: '20 气泡①pop' },
  { shot: 'A2', offset: 66, file: 'fs-202230.mp3', dur: 20, volume: 0.28, peakLag: 6,
    note: '66 气泡②pop（换样本，A-B 错峰）' },
  { shot: 'A2', offset: 110, file: 'fs-668355.mp3', dur: 2, volume: 0.40, peakLag: 1,
    note: '110 对照条落定 tick' },

  // ---- B（from 300）登场 ----
  { shot: 'B', offset: 8, file: 'fs-486234.mp3', dur: 6, volume: 0.28, peakLag: 3,
    note: '8 菌丝开始生长 轻 whoosh' },
  { shot: 'B', offset: 90, file: 'fs-545238.mp3', dur: 17, volume: 0.38, peakLag: 0,
    note: '90 子集节点点亮 sparkle（全片 2 处之一）' },
  { shot: 'B', offset: 116, file: 'fs-668355.mp3', dur: 2, volume: 0.30, peakLag: 1,
    note: '116 「Spore · 只做搜题」落定 tick' },

  // ---- C（from 480）三端 ----
  { shot: 'C', offset: 12, file: 'fs-260003.mp3', dur: 17, volume: 0.38, peakLag: 9,
    note: '552 网页卡落基线 impact（slam 2/3）' },
  { shot: 'C', offset: 22, file: 'fs-525105.mp3', dur: 13, volume: 0.28, peakLag: 1,
    note: '562 手机卡落基线 PlasticImpactB5（换样本防机枪）' },
  { shot: 'C', offset: 32, file: 'fs-532873.mp3', dur: 33, volume: 0.20, peakLag: 3,
    note: '572 桌面卡落基线 CartImpact2' },
  { shot: 'C', offset: 104, file: 'fs-486234.mp3', dur: 6, volume: 0.34, peakLag: 3,
    note: '584 三条云线描画 whoosh' },

  // ---- C2（from 840）手机独有 ----
  { shot: 'C2', offset: 0, file: 'fs-789793.mp3', dur: 7, volume: 0.28, peakLag: 0,
    note: '840 启动页粉点pop（Pop 4）' },
  { shot: 'C2', offset: 74, file: 'fs-622060.mp3', dur: 19, volume: 0.32, peakLag: 6,
    note: '914 点「拍照搜题」button click' },
  { shot: 'C2', offset: 118, file: 'fs-202230.mp3', dur: 20, volume: 0.28, peakLag: 6,
    note: '958 拍完进记录页 pop（Pop sound，换样本）' },

  // ---- D（from 1020）记录 ----
  { shot: 'D', offset: 196, file: 'fs-449996.mp3', dur: 40, volume: 0.95, peakLag: 6,
    note: '1226 明切暗 长 whoosh（源 −20dBFS，A6 给 >1）' },
  { shot: 'D', offset: 110, file: 'fs-622060.mp3', dur: 19, volume: 0.30, peakLag: 6,
    note: '1010 切「科目展开」button click' },
  { shot: 'D', offset: 176, file: 'fs-476017.mp3', dur: 9, volume: 0.30, peakLag: 4,
    note: '1076 切「收藏」Press with clicks' },
  { shot: 'D', offset: 240, file: 'fs-789793.mp3', dur: 7, volume: 0.30, peakLag: 0,
    note: '1140 进「批量选择」pop' },
  { shot: 'D', offset: 340, file: 'fs-486234.mp3', dur: 6, volume: 0.24, peakLag: 3,
    note: '1240 摇到作答历史 轻 whoosh' },

  // ---- E1（from 1440）抽屉居中 ----
  { shot: 'E1', offset: 80, file: 'fs-486234.mp3', dur: 16, volume: 0.34, peakLag: 3,
    note: '1520 抽屉从右缘滑出（0.42s 过渡，音效比动画更短，只当起手）' },

  // ---- E2（from 1560）手机球 → 半屏面板 ----
  { shot: 'E2', offset: 30, file: 'fs-532873.mp3', dur: 33, volume: 0.20, peakLag: 3,
    note: '1650 推向悬浮球（CartImpact2 低音量，只当气流）' },
  { shot: 'E2', offset: 66, file: 'fs-622060.mp3', dur: 19, volume: 0.34, peakLag: 6,
    note: '1686 点悬浮球（截屏）button click' },
  { shot: 'E2', offset: 62, file: 'fs-766639.mp3', dur: 6, volume: 0.34, peakLag: 1,
    note: '1682 桌面端按下 Alt+Z（Keyboard_Tactile_8）' },
  { shot: 'E2', offset: 70, file: 'fs-486234.mp3', dur: 6, volume: 0.22, peakLag: 3,
    note: '1690 回答浮窗弹出 whoosh' },
  { shot: 'E2', offset: 96, file: 'fs-486234.mp3', dur: 6, volume: 0.26, peakLag: 3,
    note: '1716 半屏面板升起 whoosh' },
  { shot: 'E2', offset: 156, file: 'fs-789793.mp3', dur: 7, volume: 0.32, peakLag: 0,
    note: '1776 桌面窗收进「已在后台」胶囊 pop' },

  // ---- F（from 1770）代价 ----
  { shot: 'F', offset: 0, file: 'fs-449996.mp3', dur: 60, volume: 1.10, peakLag: 6,
    note: '1650 穿到记录墙 长 whoosh（源 −20dBFS，A6 规则给 >1 增益）' },
  { shot: 'F', offset: 60, file: 'fs-668355.mp3', dur: 2, volume: 0.34, peakLag: 1,
    note: '1710 API Key 一行圈住 tick' },
  { shot: 'F', offset: 215, file: 'fs-260003.mp3', dur: 17, volume: 0.26, peakLag: 9,
    note: '1865 「90 道题」计数定版 轻 impact' },

  // ---- G（from 2100）收尾 ----
  { shot: 'G', offset: 46, file: 'fs-545238.mp3', dur: 17, volume: 0.40, peakLag: 0,
    note: '2026 孢子点落定 sparkle（全片 2 处之二）' },
  { shot: 'G', offset: 60, file: 'fs-531729.mp3', dur: 33, volume: 0.46, peakLag: 29,
    note: '2040 字标前 30f riser（峰值 29f → 起于 2011，收在字标前）' },
  { shot: 'G', offset: 60, file: 'fs-802966.mp3', dur: 53, volume: 0.52, peakLag: 3,
    note: '2040 字标定版 impact（slam 3/3，全片最后一次冲击）' },
];

/**
 * BGM：house-vibez（Lily J / Mixkit，授权见 public/audio/BGM-ATTRIBUTION.md）。
 * 文件长 111.46s > 片长 80s，不循环、不拼接；v2 的镜头边界与 123BPM 的拍网格不强求对齐
 * （v1 实测残差 RMS 3.87f 已是该 BPM 与整数秒边界的不可约值，v2 边界更碎，硬对齐只会切碎画面）。
 * volume 0.10 沿用 v1 渲后实测值（床峰 −16.5 / 床 RMS −27.7 dBFS）。
 */
export const BGM = {
  file: 'audio/bgm/house-vibez.mp3',
  volume: 0.10,
  fadeIn: 30,
  fadeOut: 40,
} as const;
