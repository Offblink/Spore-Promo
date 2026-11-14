/**
 * 唯一时间源。改时间只改这里；镜头文件里不许出现绝对帧号。
 * 数据逐字来自 plan.json（from/dur 未改动）与 design-spec.md §6「字幕」列、§7 帧级时间轴。
 *
 * 字幕 from/to 的口径：`to` 是**含端点的最后一帧** = from + dur - 1。
 * 这样每段字幕恰占 dur 帧，且 to 永远 ≤ 该镜头的 from+dur（= 镜末的下一帧）。
 */
export type ShotId = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6';

export type Caption = { text: string; from: number; to: number }; // 绝对帧

export type Shot = {
  id: ShotId;
  from: number;
  dur: number;
  title: string;
  captions: Caption[];
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const DURATION = 2100;

export const SHOTS: Shot[] = [
  {
    id: 'S1',
    from: 0,
    dur: 210,
    title: '框选 → 急推 → 抽屉滑出 → 流式答案',
    captions: [
      { text: '一道题在屏幕上。', from: 0, to: 89 },
      { text: '你切了几次屏？', from: 96, to: 209 },
    ],
  },
  {
    id: 'S2',
    from: 210,
    dur: 300,
    title: '三端行嵌入同一条基线',
    captions: [{ text: '同一个 Spore，三个地方。', from: 230, to: 509 }],
  },
  {
    id: 'S3',
    from: 510,
    dur: 420,
    title: '搜题记录：科目分组 → 收藏筛选 → 批量选择 → 作答历史',
    captions: [
      { text: '按科目收好。', from: 520, to: 639 },
      { text: '按收藏挑出来。', from: 650, to: 759 },
      { text: '想追问，就在原题上问。', from: 800, to: 929 },
    ],
  },
  {
    id: 'S4',
    from: 930,
    dur: 360,
    title: '手机记录页滚动 / 多选 → 配对同步 → 桌面出现同一条',
    captions: [
      { text: '手机拍完，电脑上接着看。', from: 940, to: 1089 },
      { text: '扫一下，两边是一套记录。', from: 1160, to: 1289 },
    ],
  },
  {
    id: 'S5',
    from: 1290,
    dur: 450,
    title: '记录墙穿越 + 四句说辞',
    captions: [
      { text: '它要你自己的 API Key。', from: 1300, to: 1407 },
      { text: '因为模型该由你选，不该由平台替你选。', from: 1418, to: 1539 },
      { text: '按次计，不包月。你用多少，付多少。', from: 1550, to: 1639 },
      { text: '通用助手回答完就走；Spore 把题留下。', from: 1650, to: 1739 },
    ],
  },
  {
    id: 'S6',
    from: 1740,
    dur: 360,
    title: '墙剥离 → 字标 + tagline + 三端 + 仓库',
    captions: [{ text: '题在屏幕上，答案在旁边，记录在手里。', from: 1860, to: 2099 }],
  },
];

export const shot = (id: ShotId): Shot => SHOTS.find((s) => s.id === id)!;

/** 来源 spore-kit\Spore-Mobile\app\src\main\assets\web\spore.css（:root 起于第 6 行）——
 *  行号见各项注释，逐条对应 design-spec.md §3.1。 */
export const C = {
  pink: '#EC4899', // spore.css:7
  pinkDark: '#DB2777', // spore.css:7
  pinkDeep: '#C2185B', // spore.css:7
  pinkTint: '#FFF0F7', // spore.css:8
  ink: '#14172A', // spore.css:10
  ink2: '#1A1D2E', // spore.css:10
  muted: '#5A5F78', // spore.css:11
  muted2: '#7B81A0', // spore.css:11
  muted3: '#A3A8C2', // spore.css:11
  line: '#E6E8F2', // spore.css:13
  line2: '#EEF0F8', // spore.css:13
  surface: '#FFFFFF', // spore.css:14
  bg: '#F4F6FD', // spore.css:14
  bg2: '#F8F9FD', // spore.css:14
  r12: 12, // spore.css:21
  r16: 16, // spore.css:21
  r999: 999, // spore.css:21
} as const;

/** 缓动：只用这三条（design-spec.md §3.2，spore.css:22/25/26）。位置位移用 pop，
 *  物件动作用 spring，颜色/透明度用 damped。 */
export const E = {
  pop: [0.16, 1, 0.3, 1] as const, // spore.css:22
  spring: [0.34, 1.56, 0.64, 1] as const, // spore.css:25
  damped: [0.25, 0.1, 0.25, 1] as const, // spore.css:26
};

/** 字体栈（design-spec.md §3.2，spore.css:33） */
export const FONT = '"Noto Sans CJK SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif';
