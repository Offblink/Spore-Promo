import React from 'react';
import { AbsoluteFill, Img } from 'remotion';
import { C } from '../timeline';
import { tex, type PageKey } from '../layout';
import { mulberry32 } from '../lib/helpers/rand';

/**
 * _wall.tsx —— S5「建墙」与 S6「拆墙」**共用**的同一面记录墙（两张卡唯一允许共用的组件）。
 *
 * 成分（design-spec §6 S5 行 / §8 第 5 条）：30 行，全部是四张真图 `ext-review-*.png`
 * 的**行级裁片**，每片 263×64 CSS px（左栏 x8..271 —— 卡面写的 `x288..551` 是 +280 的
 * 坐标系错位，与 S3 卡实测到的同一处勘误一致，见 shots/S3.tsx 头注），不伪造任何页面。
 *
 * 排布：5 列 × 7 行 = 35 槽位（35 片裁片一一占位，无同图同屏重复）。每列有自己的相位/行距/周期：
 *   · 列距 COL_X = [101,464,827,1190,1553]（列间距/页边距 ≈101）；行距 166–190（64 行高 + 薄雾隙）
 *   · 每列周期 T = 行距×7 = [1162,1204,1246,1288,1330]，**全部 ≥1144**（= 1080 视口 + 64 行高）
 *     → 同一行的两个周期副本永远不会同屏，重复裁片不撞脸（§8.5 ③）
 *   · 列周期互不相等 → 整墙图案不会周期性自我重复
 *   · 纵向 y = mod(相位 + 行×行距 + 抖动 − 滚动, T)，画两份副本（本周期 + 上一周期）铺满视口
 *
 * 三层纵深（§8.6，只靠位移+雾+尺寸差，不加光）：layer = (col+row+1)%3，
 *   近层 1.0 / 1.0 / 0px / 无雾 · 中层 0.93 / 0.93 / 0.7px / 雾 0.18 · 远层 0.85 / 0.85 / 1.5px / 雾 0.34
 * （同 y 的重复裁片强制不站近层，§8.5 ①）。滚动三等速——匀速下穿是卡面硬指标，
 * 层间速度比只在渲出来读作"平铺滑动"时才作为备调（§8.6），此处不做，避免列内节奏解体。
 *
 * 四句落点槽位（S5 的 LIT_IDS 与 S6 的幸存行都钉在这些网格点上，定版帧行顶 y=780，见 COL_OFF/COL_PITCH）：
 *   w-0-4 = 第①句落点 + **S6 唯一幸存行**（ext-review-default y156「第7题 求极限」）
 *   w-3-4 = 第②句落点 · w-4-5 = 第③句落点 · w-1-1 = 第④句落点（跨接到 S6 蒸发）
 */

export type WallRow = {
  id: string;
  src: string;
  crop: { x: number; y: number; w: number; h: number };
  col: number;
  row: number;
  layer: number;
};

/** 行裁片：CSS px，取自 layout.json 实测左栏（x8..271 宽 263，行高 64） */
const CROP_X = 8;
const CROP_W = 263;
const CROP_H = 64;

const COL_X = [101, 464, 827, 1190, 1553]; // 列间距与页边距 ≈101
const COL_OFF = [116, 69, 50, 26, 150]; // 列相位：w-0-4/3-4/4-5/1-1 四个落点行定版帧行顶 y=780
const COL_PITCH = [166, 172, 178, 184, 190];
const COL_T = COL_PITCH.map((p) => p * 7); // [1162,1204,1246,1288,1330] ≥1144 → 同行副本不同屏
const TRAVEL = 409 * 12.96; // progress 0→1 = 5300.64px（12.96px/f = 1080×1.2%/f，409f 走完一整面墙）

/** 列内横/纵抖动（定种子常量表，不用 Math.random；落点行的纵抖动钉 0 以保网格对齐） */
const XJ = [
  [-10, 14, -6, 18, -16, 8, -12],
  [12, -18, 6, -8, 16, -12, 4],
  [-14, 8, 18, -12, 4, 14, -6],
  [16, -6, -14, 10, -18, 6, 12],
  [-8, 12, -16, 6, 14, -10, 8],
];
const YJ = [
  [14, -10, 20, -16, 0, 8, -14], // col0 · row4 = 落点①/幸存行
  [-12, 0, 16, -20, 10, -8, 18], // col1 · row1 = 落点④
  [8, -16, 12, -6, 18, -12, 4],
  [-18, 6, -10, 14, 0, 16, -8], // col3 · row4 = 落点②
  [10, -14, 6, -20, 12, 0, -8], // col4 · row5 = 落点③
];

/** 35 片真图行级裁片（每张图 64px 网格带 + 四条错位带，逐带目检过：无断字切行） */
const POOL: { img: PageKey; y: number }[] = [
  // ext-review-default（高数展开：3 成员行 + 4 未分组行 + 3 科目行 + 时间戳带）
  { img: 'ext-review-default', y: 156 }, // ★ 第7题 求极限（粉底）
  { img: 'ext-review-default', y: 220 }, // 定积分换元
  { img: 'ext-review-default', y: 284 }, // 极限的等价无穷小
  { img: 'ext-review-default', y: 104 }, // 高数 科目行
  { img: 'ext-review-default', y: 336 }, // 线代 科目行
  { img: 'ext-review-default', y: 390 }, // 英语 科目行
  { img: 'ext-review-default', y: 448 }, // 天空为什么是蓝的
  { img: 'ext-review-default', y: 512 }, // 条件概率怎么算
  { img: 'ext-review-default', y: 576 }, // 泰勒展开的余项
  { img: 'ext-review-default', y: 640 }, // 洛必达的使用条件
  { img: 'ext-review-default', y: 668 }, // 时间戳带（09-26 18:37，静行）
  // ext-review-subject（同侧栏 + 高数行编辑态图标）
  { img: 'ext-review-subject', y: 156 },
  { img: 'ext-review-subject', y: 220 },
  { img: 'ext-review-subject', y: 284 },
  { img: 'ext-review-subject', y: 104 },
  { img: 'ext-review-subject', y: 336 },
  { img: 'ext-review-subject', y: 390 },
  { img: 'ext-review-subject', y: 448 },
  { img: 'ext-review-subject', y: 512 },
  { img: 'ext-review-subject', y: 576 },
  { img: 'ext-review-subject', y: 640 },
  { img: 'ext-review-subject', y: 668 },
  // ext-review-batch（批量态：粉底 + 圈选 + 铅笔/删除图标）
  { img: 'ext-review-batch', y: 156 },
  { img: 'ext-review-batch', y: 220 }, // 定积分换元（粉底圈选）
  { img: 'ext-review-batch', y: 284 }, // 极限的等价无穷小（粉底圈选）
  { img: 'ext-review-batch', y: 104 },
  { img: 'ext-review-batch', y: 336 },
  { img: 'ext-review-batch', y: 390 },
  { img: 'ext-review-batch', y: 448 },
  { img: 'ext-review-batch', y: 512 },
  { img: 'ext-review-batch', y: 576 },
  { img: 'ext-review-batch', y: 640 },
  { img: 'ext-review-batch', y: 668 },
  // ext-review-fav（收藏视图只有两行）
  { img: 'ext-review-fav', y: 100 }, // 第7题 求极限（粉底）
  { img: 'ext-review-fav', y: 168 }, // 矩阵的秩怎么求
];

/** 四个钉死的槽位：S5 四句落点 + S6 幸存行 */
const FIXED: Record<string, { img: PageKey; y: number }> = {
  '0,4': { img: 'ext-review-default', y: 156 }, // 落点① + S6 唯一幸存行（第7题 求极限）
  '3,4': { img: 'ext-review-batch', y: 284 }, // 落点②
  '4,5': { img: 'ext-review-batch', y: 448 }, // 落点③（批量圈选行）
  '1,1': { img: 'ext-review-subject', y: 336 }, // 落点④（跨接 S6 蒸发）
};

export const slotId = (col: number, row: number): string => `w-${col}-${row}`;
export const SURVIVOR_ID = slotId(0, 4); // = FIXED['0,4'] = 第7题 求极限

const cropKey = (s: { img: PageKey; y: number }): string => `${s.img}@${s.y}`;

const build = (): { rows: WallRow[]; opJit: Map<string, number> } => {
  const used = new Set<string>();
  for (const spec of Object.values(FIXED)) used.add(cropKey(spec));
  const rng = mulberry32(20261107); // 定种子：不透明度阶梯（0.94–1.0）
  const ySeen = new Map<number, number>();
  const rows: WallRow[] = [];
  const opJit = new Map<string, number>();
  for (let col = 0; col < 5; col++) {
    for (let row = 0; row < 7; row++) {
      const slot = `${col},${row}`;
      const spec = FIXED[slot] ?? POOL.find((p) => !used.has(cropKey(p)))!;
      used.add(cropKey(spec));
      let layer = (col + row + 1) % 3;
      const seen = ySeen.get(spec.y) ?? 0;
      ySeen.set(spec.y, seen + 1);
      if (seen >= 1 && layer === 0) layer = 1; // 同 y 的重复裁片不站近层（§8.5 ①）
      if (FIXED[slot]) layer = 0; // 四个落点行/幸存行钉近层：锐利、不带雾（否则 S6 屏心行被 0.86 缩放+blur+雾洗白）
      const id = slotId(col, row);
      rows.push({
        id,
        src: tex(spec.img),
        crop: { x: CROP_X, y: spec.y, w: CROP_W, h: CROP_H },
        col,
        row,
        layer,
      });
      opJit.set(id, 0.94 + 0.06 * rng());
    }
  }
  return { rows, opJit };
};

const built = build();
export const WALL_ROWS: WallRow[] = built.rows;
const OP_JIT = built.opJit;

const LAYER_OP = [1, 0.93, 0.85];
const LAYER_SCALE = [1, 0.93, 0.86];
const LAYER_BLUR = [0, 0.7, 1.5]; // ≤2px
const LAYER_MIST = [0, 0.18, 0.34]; // --bg2 薄雾
/** 行的极淡投影（S4 手机同款克制级）——白卡浮在浅底上靠它读出"墙"的边 */
const BASE_SHADOW = '0 2px 10px rgba(20,23,42,0.05)';

const mod = (a: number, n: number): number => ((a % n) + n) % n;

/** 每行的附加样式（S5 = 落点高亮，S6 = 蒸发/幸存行滑出）。seam 0..1 = 底边粉缝展开度。 */
export type RowFx = (
  r: WallRow,
  pos: { x: number; y: number },
) => { style?: React.CSSProperties; seam?: number } | undefined;

/**
 * 墙。`progress` 0..1 = 纵深走完整面墙（S6 可 >1 延续下坠）；`dim` = 全局不透明度乘子；
 * `fx` = 逐行覆盖（opacity 与 dim 相乘，transform 叠在层缩放之外）。
 */
export const Wall: React.FC<{ progress: number; dim?: number; fx?: RowFx }> = ({ progress, dim = 1, fx }) => {
  const scroll = progress * TRAVEL;
  const nodes: React.ReactNode[] = [];
  for (const r of WALL_ROWS) {
    const yBase = COL_OFF[r.col] + r.row * COL_PITCH[r.col] + YJ[r.col][r.row];
    const x = COL_X[r.col] + XJ[r.col][r.row];
    const y0 = mod(yBase - scroll, COL_T[r.col]);
    const copies: Array<[string, number]> = [
      ['a', y0],
      ['b', y0 - COL_T[r.col]],
    ];
    for (const [tag, y] of copies) {
      if (y <= -CROP_H || y >= 1080) continue; // 视口裁剪
      const res = fx?.(r, { x, y });
      const fxOp = typeof res?.style?.opacity === 'number' ? res.style.opacity : 1;
      const op = LAYER_OP[r.layer] * (OP_JIT.get(r.id) ?? 1) * dim * fxOp;
      if (op <= 0.004) continue; // 蒸发完的行直接不进 DOM
      const layerBlur = LAYER_BLUR[r.layer] > 0 ? `blur(${LAYER_BLUR[r.layer]}px) ` : '';
      const filter = `${layerBlur}${res?.style?.filter ?? ''}`.trim() || undefined;
      nodes.push(
        <div
          key={`${r.id}#${tag}`}
          style={{
            position: 'absolute',
            left: x,
            top: y,
            width: CROP_W,
            height: CROP_H,
            borderRadius: C.r12, // 只用 --r12（全片不出现第四种圆角）
            overflow: 'hidden',
            opacity: op,
            transform: `${res?.style?.transform ?? ''} scale(${LAYER_SCALE[r.layer]})`,
            filter,
            boxShadow: [BASE_SHADOW, res?.style?.boxShadow ?? ''].filter(Boolean).join(', '),
          }}
        >
          {/* 真图整页反向偏移裁切：只用 ext-review-*.png，不手绘 */}
          <Img src={r.src} style={{ position: 'absolute', left: -r.crop.x, top: -r.crop.y, width: 1440, height: 900 }} />
          {LAYER_MIST[r.layer] > 0 ? (
            <div style={{ position: 'absolute', inset: 0, background: C.bg2, opacity: LAYER_MIST[r.layer] }} />
          ) : null}
          {res?.seam ? (
            <div
              style={{
                position: 'absolute',
                left: `${(1 - res.seam) * 50}%`,
                right: `${(1 - res.seam) * 50}%`,
                bottom: 0,
                height: 2,
                background: C.pink, // 底边 2px --pink 缝，从中心展开，裁在圆角内
              }}
            />
          ) : null}
        </div>,
      );
    }
  }
  return <AbsoluteFill>{nodes}</AbsoluteFill>;
};
