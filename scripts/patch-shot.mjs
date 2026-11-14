#!/usr/bin/env node
/**
 * 单镜替换：只渲染改过的镜头，然后把它**剪进**已有成片（其余镜头原样保留）。
 *
 *   node scripts/patch-shot.mjs E            # 重渲 E（含该段的 BGM/SFX），拼回 spore-v2-mix.mp4
 *   node scripts/patch-shot.mjs E,G          # 一次改多个镜头
 *   node scripts/patch-shot.mjs E --nobgm    # 无 BGM 版同理（基底换成 spore-v2-nobgm.mp4）
 *
 * 与 render-seg.mjs 的分工：
 *  - render-seg：从零建整片的逐镜缓存（第一次投入大，之后每镜 1–2 min）。
 *  - patch-shot：**已有成片**上做外科手术——只重渲改动镜头，再用一次 ffmpeg 把该帧段换掉。
 *    视频/音频都只重编一次（x264 crf18 / aac 192k），不改任何未动的帧。
 *
 * 为什么不是 `-c:v copy` 拼接：帧段边界通常落在关键帧之间，copy 会吃到关键帧前的花屏，
 * 所以这里走 filter trim + concat（解码后按帧精确切），代价是一次全片重编码（~2 min）。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, rmSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/out/v2');
const NOBGM = process.argv.includes('--nobgm');
const BASE = path.join(OUT, NOBGM ? 'spore-v2-nobgm.mp4' : 'spore-v2-mix.mp4');
const PATCH_DIR = path.join(OUT, NOBGM ? '_patch-nobgm' : '_patch');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const FPS = 30;

// 支持 `E,G` 与 `E G` 两种写法
const ids = process.argv.slice(2).filter((a) => !a.startsWith('-')).flatMap((a) => a.split(',')).filter(Boolean);
if (ids.length === 0) {
  console.error('用法：node scripts/patch-shot.mjs <镜头id...>   例：patch-shot.mjs E');
  process.exit(1);
}
if (!existsSync(BASE)) {
  console.error(`没有基底成片 ${path.relative(ROOT, BASE)}：第一次请先跑 scripts/render-seg.mjs`);
  process.exit(1);
}

const src = readFileSync(path.join(ROOT, 'src/v2/timeline.ts'), 'utf8');
const shots = [...src.matchAll(/id:\s*'([^']+)',\s*from:\s*(\d+),\s*dur:\s*(\d+)/g)].map((m) => ({
  id: m[1],
  from: Number(m[2]),
  dur: Number(m[3]),
}));
for (const id of ids) if (!shots.some((s) => s.id === id)) throw new Error(`timeline 里没有镜头 ${id}`);

mkdirSync(PATCH_DIR, { recursive: true });

// ---- 1. 只渲染改动的镜头（带音频：这一段要连声音一起换掉） ----
for (const id of ids) {
  const s = shots.find((x) => x.id === id);
  const out = path.join(PATCH_DIR, `${id}.mp4`);
  const t0 = Date.now();
  const r = spawnSync(
    process.execPath,
    [
      path.join(ROOT, 'node_modules/@remotion/cli/remotion-cli.js'),
      'render', 'src/index.ts', 'SporePromoV2', out,
      `--frames=${s.from}-${s.from + s.dur - 1}`,
      `--browser-executable=${EDGE}`,
      ...(NOBGM ? ['--props=props-nobgm-v2.json'] : []),
    ],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] },
  );
  if (r.status !== 0) throw new Error(`渲染 ${id} 失败（exit ${r.status}）`);
  console.log(`  ✓ 渲染 ${id} ${s.dur}f  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

// ---- 2. 按时间轴顺序重排：没改的段从基底裁，改过的段用新文件 ----
const kept = shots.filter((s) => !ids.includes(s.id));
if (kept.length === 0) throw new Error('所有镜头都被替换了，直接用 render-seg 整片渲');

const parts = [];
const g = [];
g.push(`[0:v]split=${kept.length}${kept.map((_, i) => `[sv${i}]`).join('')}`);
g.push(`[0:a]asplit=${kept.length}${kept.map((_, i) => `[sa${i}]`).join('')}`);
kept.forEach((s, i) => {
  g.push(`[sv${i}]trim=start_frame=${s.from}:end_frame=${s.from + s.dur},setpts=PTS-STARTPTS[v${i}]`);
  g.push(`[sa${i}]atrim=start=${s.from / FPS}:end=${(s.from + s.dur) / FPS},asetpts=PTS-STARTPTS[a${i}]`);
});
ids.forEach((id, j) => {
  const dur = shots.find((x) => x.id === id).dur / FPS;
  g.push(`[${j + 1}:v]setpts=PTS-STARTPTS[pv${j}]`);
  // ⚠ 必须按「视频秒数」裁掉音频尾巴：Remotion 每段音频比视频长约 1 帧（AAC padding），
  // 不裁的话 concat 会按声音时长排段，后面每段都往后蹭 ~1 帧，几次 patch 就攒成 0.2s 音画错位。
  g.push(`[${j + 1}:a]atrim=start=0:end=${dur.toFixed(6)},asetpts=PTS-STARTPTS,apad=whole_dur=${dur.toFixed(6)}[pa${j}]`);
});

let ki = 0;
let pj = 0;
const order = shots.map((s) => (ids.includes(s.id) ? `pv${pj++}/pa${pj - 1}` : `v${ki++}/a${ki - 1}`));
const vLabels = order.map((o) => `[${o.split('/')[0]}]`).join('');
const aLabels = order.map((o) => `[${o.split('/')[1]}]`).join('');
g.push(`${vLabels}concat=n=${order.length}:v=1:a=0[vout]`);
g.push(`${aLabels}concat=n=${order.length}:v=0:a=1[aout]`);

const tmp = path.join(OUT, '_patch', 'mix.tmp.mp4');
const ffArgs = ['-y', '-hide_banner', '-loglevel', 'error', '-i', BASE, ...ids.map((id) => ['-i', path.join(PATCH_DIR, `${id}.mp4`)]).flat(), '-filter_complex', g.join(';'), '-map', '[vout]', '-map', '[aout]', '-c:v', 'libx264', '-crf', '18', '-pix_fmt', 'yuv420p', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', 'faststart', '-shortest', tmp];
const t1 = Date.now();
const r2 = spawnSync('ffmpeg', ffArgs, { stdio: ['ignore', 'ignore', 'inherit'] });
if (r2.status !== 0) throw new Error(`拼接失败（exit ${r2.status}）`);
console.log(`  ✓ 拼接 ${((Date.now() - t1) / 1000).toFixed(0)}s`);

for (const id of ids) rmSync(path.join(PATCH_DIR, `${id}.mp4`), { force: true });
renameSync(tmp, BASE);
console.log(`  ✓ 已就地更新 ${path.relative(ROOT, BASE)}`);
