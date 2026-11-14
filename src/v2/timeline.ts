/**
 * v2 时间源（SporePromoV2）。台词逐句来自《移动开发课程设计——Spore》。
 *
 * 与 v1（src/timeline.ts）的关系：**同一套视觉 tokens 与真实纹理，重排的片子**。
 * v1 是六段式产品演示；v2 按文档叙事重做：痛点 → 登场 → 三端 → 手机独有 → 记录 → 抽屉 → 代价 → 收尾。
 *
 * 字幕 from/to 口径沿用 v1：`to` 是**含端点的最后一帧** = from + dur − 1。
 */
export type ShotId = 'A1' | 'A2' | 'B' | 'C' | 'C2' | 'D' | 'E1' | 'E2' | 'F' | 'G';

export type Caption = { text: string; from: number; to: number };

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
export const DURATION = 2610; // 87s

/** 从 v1 继承的 tokens（唯一来源仍是 src/timeline.ts，别在这里复制一份颜色值） */
export { C, E, FONT } from '../timeline';

/** 暗色板：逐值抄自 `Spore/src/lib/theme.css` 的 `html[data-theme="dark"]`。
 *  关键事实：**暗色的强调色是青（#2DD4BF），不是粉**——粉只属于明色板。
 *  全片在 D 镜内 336–354 一次性切到这套，之后 E/F/G 都在这套里落地。 */
export const DARK = {
  bg: '#12141C',
  surface: '#1B1E29',
  surface2: '#22252F',
  surface3: '#272B38',
  ink: '#E6E8F2',
  ink2: '#A6ACC4',
  muted: '#7B82A0',
  muted3: '#5C6382',
  line: '#2A2E3E',
  line2: '#242836',
  accent: '#2DD4BF',
  accentStrong: '#4BE0CD',
  accentDeep: '#99F6E4',
  accentSoft: 'rgba(45,212,191,0.12)',
} as const;

export const SHOTS: Shot[] = [
  {
    id: 'A1',
    from: 0,
    dur: 150,
    title: '痛点①：题库搜到的是另一道题',
    captions: [{ text: '题库搜题，搜到的常常是另一道题。', from: 0, to: 149 }],
  },
  {
    id: 'A2',
    from: 150,
    dur: 150,
    title: '痛点②：大模型上面说 A、结论说 C',
    captions: [{ text: '大模型搜题：上面说选 A，结论说选 C。', from: 150, to: 299 }],
  },
  {
    id: 'B',
    from: 300,
    dur: 180,
    title: 'Spore 登场：Fungi 的子集，只做搜题',
    captions: [
      { text: 'Spore 是一个 Agent。', from: 310, to: 395 },
      { text: '从 Fungi 里长出来的子集：只搜题，只跑一部主机。', from: 402, to: 479 },
    ],
  },
  {
    id: 'C',
    from: 480,
    dur: 360,
    title: '三端并置 → 云端连线',
    captions: [
      { text: '网页、手机、桌面，三端各存一份。', from: 490, to: 640 },
      { text: '连上云端，三端就是同一套记录。', from: 646, to: 839 },
    ],
  },
  {
    id: 'C2',
    from: 840,
    dur: 180,
    title: '手机独有：启动画面（全过程）+ 拍照搜题',
    captions: [{ text: '手机上，拍一张照片就能搜。', from: 850, to: 1019 }],
  },
  {
    id: 'D',
    from: 1020,
    dur: 420,
    title: '搜题记录：科目分组 / 收藏 / 批量 / 追问 + 明切暗（片长中段）',
    captions: [
      { text: '按科目分类。', from: 1030, to: 1112 },
      { text: '收藏、重命名、批量移动。', from: 1118, to: 1200 },
      { text: '浅色，或者深色。', from: 1216, to: 1316 },
      { text: '要追问，就在原题上问。', from: 1322, to: 1439 },
    ],
  },
  {
    id: 'E1',
    from: 1440,
    dur: 180,
    title: '答题界面 → 右缘抽屉滑出（14 帧真实动画）',
    captions: [
      { text: '答题最怕切屏。', from: 1450, to: 1516 },
      { text: '网页端的侧边抽屉解决了这个问题。', from: 1528, to: 1619 },
    ],
  },
  {
    id: 'E2',
    from: 1620,
    dur: 240,
    title: '手机悬浮窗 + 桌面端常驻（左右并排）',
    captions: [{ text: '悬浮窗——答案在眼前，页面不用动。', from: 1640, to: 1859 }],
  },
  {
    id: 'F',
    from: 1860,
    dur: 330,
    title: '代价：自备 API；90 题 1.3 元',
    captions: [
      { text: '唯一的门槛：你自己的大模型 API。', from: 1870, to: 1970 },
      { text: '90 道题，1.3 元——按次计，不包月。', from: 1976, to: 2189 },
    ],
  },
  {
    id: 'G',
    from: 2190,
    dur: 420,
    title: '收束成孢子点 → 字标 → 三端与四仓',
    captions: [{ text: '题在屏幕上，答案在旁边，记录在手里。', from: 2140, to: 2519 }],
  },
];

export const shot = (id: ShotId): Shot => SHOTS.find((s) => s.id === id)!;

/** 校验：镜头首尾相接、字幕不越界、总时长自洽（脚本与运行时断言共用同一口径） */
export const checkTimeline = (): string[] => {
  const errs: string[] = [];
  let at = 0;
  for (const s of SHOTS) {
    if (s.from !== at) errs.push(`${s.id} from=${s.from} 应为 ${at}`);
    at = s.from + s.dur;
    let prevTo = -1;
    for (const c of s.captions) {
      if (c.from < s.from || c.to > s.from + s.dur - 1) errs.push(`${s.id} 字幕越界：${c.text}`);
      if (c.from <= prevTo) errs.push(`${s.id} 字幕重叠：${c.text}`);
      if (c.to - c.from + 1 < 40) errs.push(`${s.id} 字幕过短（<40f）：${c.text}`);
      prevTo = c.to;
    }
  }
  if (at !== DURATION) errs.push(`总时长 ${at} ≠ DURATION ${DURATION}`);
  return errs;
};
