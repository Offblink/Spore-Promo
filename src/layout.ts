/**
 * `public/textures/layout.json` 的**内联**类型化副本（14 page + 18 element，逐条照抄，未改数值）。
 * 不运行时 fetch / 不 import json：Remotion 内 fetch 会卡渲染。
 *
 * 坐标口径：pageW/pageH 是页面**逻辑 CSS px**，dpr 说明纹理实际像素（1440×900 @dpr2 = 2880×1800）。
 * bbox 的 x/y/w/h 同样是页面 CSS px（= 截图像素 ÷ dpr），可直接与 PageCam 的 children 共用坐标。
 */
import { staticFile } from 'remotion';

export type PageSpec = {
  file: string;
  pageW: number;
  pageH: number;
  dpr: number;
  constructed?: boolean;
  note?: string;
};

export type BBox = {
  page: string;
  x: number;
  y: number;
  w: number;
  h: number;
  approx?: boolean;
};

export const PAGES = {
  'ext-review-default': { file: 'ext-review-default.png', pageW: 1440, pageH: 900, dpr: 2 },
  'ext-review-fav': { file: 'ext-review-fav.png', pageW: 1440, pageH: 900, dpr: 2 },
  'ext-review-batch': { file: 'ext-review-batch.png', pageW: 1440, pageH: 900, dpr: 2 },
  'ext-review-subject': { file: 'ext-review-subject.png', pageW: 1440, pageH: 900, dpr: 2 },
  'ext-options': { file: 'ext-options.png', pageW: 1440, pageH: 900, dpr: 2 },
  'ext-drawer-closed': { file: 'ext-drawer-closed.png', pageW: 1440, pageH: 900, dpr: 2 },
  'ext-drawer': { file: 'ext-drawer.png', pageW: 1440, pageH: 900, dpr: 2 },
  'mob-record': { file: 'mob-record.png', pageW: 360, pageH: 800, dpr: 3 },
  'mob-record-select': { file: 'mob-record-select.png', pageW: 360, pageH: 800, dpr: 3 },
  'mob-panel': { file: 'mob-panel.png', pageW: 360, pageH: 800, dpr: 3 },
  'mob-main': { file: 'mob-main.png', pageW: 360, pageH: 800, dpr: 3 },
  'mob-settings-sync': { file: 'mob-settings-sync.png', pageW: 360, pageH: 800, dpr: 3 },
  'gui-login': {
    file: 'gui-login@1x.png',
    pageW: 652,
    pageH: 536,
    dpr: 1,
    constructed: false,
    note: '退路素材：真实登录页截图（非构造）。本机 PySide6 6.10.2 + qfluentwidgets 构造任何 widget 即进程 fastfail，RecordsPane 无法实例化 → 缺 GUI 记录页素材。',
  },
  'gui-records': {
    file: 'gui-records@2x.png',
    pageW: 1440,
    pageH: 900,
    dpr: 2,
    note: '真实 Qt 渲染（RecordsPane），非退路。占位 bbox 标 approx=true，阶段5 需实测校准。',
  },
  // ---- 深色套（capture.py SPORE_THEME=dark 采集；页面逻辑尺寸与明色逐像素一致，坐标表可共用） ----
  'ext-review-default-dark': { file: 'ext-review-default-dark.png', pageW: 1440, pageH: 900, dpr: 2 },
  'ext-review-subject-dark': { file: 'ext-review-subject-dark.png', pageW: 1440, pageH: 900, dpr: 2 },
  'ext-review-fav-dark': { file: 'ext-review-fav-dark.png', pageW: 1440, pageH: 900, dpr: 2 },
  'ext-review-batch-dark': { file: 'ext-review-batch-dark.png', pageW: 1440, pageH: 900, dpr: 2 },
  'ext-drawer-dark': { file: 'ext-drawer-dark.png', pageW: 1440, pageH: 900, dpr: 2 },
  'ext-drawer-closed-dark': { file: 'ext-drawer-closed-dark.png', pageW: 1440, pageH: 900, dpr: 2 },
  'ext-options-dark': { file: 'ext-options-dark.png', pageW: 1440, pageH: 900, dpr: 2 },
  'mob-record-dark': { file: 'mob-record-dark.png', pageW: 360, pageH: 800, dpr: 3 },
  'mob-panel-dark': { file: 'mob-panel-dark.png', pageW: 360, pageH: 800, dpr: 3 },
  'mob-main-dark': { file: 'mob-main-dark.png', pageW: 360, pageH: 800, dpr: 3 },
  'gui-records-dark': { file: 'gui-records-dark@2x.png', pageW: 1440, pageH: 900, dpr: 2 },
  // Alt+Z 呼出的桌面回答浮窗（真 QWidget 树，420×640）
  'gui-answer-dark': { file: 'gui-answer-dark@2x.png', pageW: 420, pageH: 640, dpr: 2 },
} satisfies Record<string, PageSpec>;

export const BBOX = {
  'ext-row-1': { page: 'ext-review-default', x: 30.0, y: 156.3, w: 241.0, h: 63.1 },
  'ext-subject-1': { page: 'ext-review-default', x: 8.0, y: 109.0, w: 263.0, h: 42.3 },
  'ext-detail': { page: 'ext-review-default', x: 280.0, y: 54.0, w: 1160.0, h: 775.0 },
  'ext-detail-content': { page: 'ext-review-default', x: 456.0, y: 54.0, w: 808.0, h: 729.0 },
  'ext-verify': { page: 'ext-review-default', x: 470.0, y: 305.9, w: 794.0, h: 137.5 },
  'ext-options-card-1': { page: 'ext-options', x: 240.0, y: 34.0, w: 1160.0, h: 665.3 },
  'ext-drawer-panel': { page: 'ext-drawer', x: 1020.0, y: 0.0, w: 420.0, h: 900.0 },
  'ext-drawer-content': { page: 'ext-drawer', x: 1021.0, y: 59.0, w: 419.0, h: 770.0 },
  'ext-drawer-verify': { page: 'ext-drawer', x: 1049.0, y: 293.7, w: 375.0, h: 157.3 },
  'mob-row-1': { page: 'mob-record', x: 10.0, y: 170.1, w: 340.0, h: 72.8 },
  'mob-chips': { page: 'mob-record', x: 0.0, y: 114.0, w: 360.0, h: 46.1 },
  'mob-topbar': { page: 'mob-record', x: 0.0, y: 0.0, w: 360.0, h: 61.0 },
  'mob-batchbar': { page: 'mob-record-select', x: 0.0, y: 738.1, w: 360.0, h: 61.9 },
  'mob-panel-stream': { page: 'mob-panel', x: 0.0, y: 59.0, w: 360.0, h: 674.0 },
  'mob-main-ball': { page: 'mob-main', x: 24.0, y: 362.8, w: 312.0, h: 52.8 },
  'mob-sync': { page: 'mob-settings-sync', x: 37.0, y: 211.1, w: 286.0, h: 64.5 },
  'gui-left-rail': { page: 'gui-records', x: 0, y: 0, w: 288, h: 900, approx: true },
  'gui-detail': { page: 'gui-records', x: 288, y: 0, w: 1152, h: 900, approx: true },
} satisfies Record<string, BBox>;

export type PageKey = keyof typeof PAGES;
export type BBoxKey = keyof typeof BBOX;

/** PageCam 的 src：它内部会自己 staticFile()，**不要**再包一层。 */
export const pageSrc = (key: PageKey): string => `textures/${PAGES[key].file}`;

/** 裸 <Img> / CSS background 用：已 staticFile()，本卡实测可用（PageCam 同路径）。 */
export const tex = (key: PageKey): string => staticFile(pageSrc(key));
