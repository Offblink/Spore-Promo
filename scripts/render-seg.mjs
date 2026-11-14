#!/usr/bin/env node
/**
 * 按镜头增量渲染 + 拼接（改一句台词不必整片重渲）。
 *
 *   node scripts/render-seg.mjs                          # 只渲缓存里缺的镜头，再拼成整片
 *   node scripts/render-seg.mjs --shots C,C2             # 强制重渲这两个镜头，再拼
 *   node scripts/render-seg.mjs --shots G --no-assemble
 *   node scripts/render-seg.mjs --extract-audio=<mp4>    # 从整片里取音轨做缓存（声音变了才要跑）
 *
 * 设计要点（踩过的坑）：
 *  - **每段渲成无声**（`--muted`）。带音频时每段 AAC 尾部有 ~56ms priming/padding，
 *    9 段 concat 会攒出半秒错位；声音与画面解耦后就没有接缝问题。
 *  - 音轨单独缓存成 `public/out/v2/_audio.m4a`，只在 **cue 表/BGM 变了** 时才重建；
 *    平时只改画面/字幕 → 画面段重渲 + 复用旧音轨，一次 mux 就完事。
 *  - 镜头边界**只从 `src/v2/timeline.ts` 解析**，脚本里没有第二份时间表。
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'public/out/v2');
const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const AUDIO = path.join(OUT, '_audio.m4a');

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name) => {
  const hit = argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};

const forced = (value('shots') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
const noAssemble = flag('no-assemble');

function readShots() {
  const src = readFileSync(path.join(ROOT, 'src/v2/timeline.ts'), 'utf8');
  const re = /id:\s*'([^']+)',\s*from:\s*(\d+),\s*dur:\s*(\d+)/g;
  const shots = [...src.matchAll(re)].map((m) => ({ id: m[1], from: Number(m[2]), dur: Number(m[3]) }));
  if (shots.length === 0) throw new Error('timeline.ts 里没解析到 SHOTS');
  return shots;
}

function ffmpeg(args) {
  const r = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (r.status !== 0) throw new Error(`ffmpeg 失败（exit ${r.status}）：${args.join(' ')}`);
}

const shots = readShots();
mkdirSync(path.join(OUT, '_seg'), { recursive: true });

// ---- 音轨缓存：只在声音变了的时候手动刷新 ----
const extractFrom = value('extract-audio');
if (extractFrom) {
  ffmpeg(['-i', path.resolve(ROOT, extractFrom), '-vn', '-c:a', 'copy', AUDIO]);
  console.log(`  ✓ 音轨缓存 ${path.relative(ROOT, AUDIO)} ← ${extractFrom}`);
  process.exit(0);
}

// ---- 逐镜渲染（无声） ----
const todo = shots.filter((s) => forced.includes(s.id) || !existsSync(path.join(OUT, '_seg', `${s.id}.mp4`)));
if (todo.length === 0) console.log('全部镜头缓存都在，跳过渲染（强制重渲用 --shots）');
for (const s of todo) {
  const out = path.join(OUT, '_seg', `${s.id}.mp4`);
  const t0 = Date.now();
  const r = spawnSync(
    process.execPath,
    [
      path.join(ROOT, 'node_modules/@remotion/cli/remotion-cli.js'),
      'render', 'src/index.ts', 'SporePromoV2', out,
      `--frames=${s.from}-${s.from + s.dur - 1}`,
      `--browser-executable=${EDGE}`,
      '--muted',
    ],
    { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] },
  );
  if (r.status !== 0) throw new Error(`渲染 ${s.id} 失败（exit ${r.status}）`);
  console.log(`  ✓ ${s.id} ${s.dur}f  ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

if (noAssemble) process.exit(0);

// ---- 拼接：视频流 copy，再挂上缓存的音轨 ----
const listPath = path.join(OUT, '_seg', 'concat.txt');
writeFileSync(
  listPath,
  shots.map((s) => `file '${path.join(OUT, '_seg', `${s.id}.mp4`).replace(/\\/g, '/')}'`).join('\n'),
  'utf8',
);
const videoOnly = path.join(OUT, '_video.mp4');
ffmpeg(['-f', 'concat', '-safe', '0', '-i', listPath, '-c', 'copy', '-an', videoOnly]);

const out = path.join(OUT, 'spore-v2-mix.mp4');
if (!existsSync(AUDIO)) {
  console.log('⚠ 没有音轨缓存（声音变了才会缺）：先跑一次整片渲染，再 --extract-audio=<该文件>');
  ffmpeg(['-i', videoOnly, '-c', 'copy', '-an', out]);
} else {
  ffmpeg(['-i', videoOnly, '-i', AUDIO, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-shortest', out]);
}
console.log(`  ✓ 成片 ${path.relative(ROOT, out)}  ${(statSync(out).size / 1e6).toFixed(1)} MB`);
