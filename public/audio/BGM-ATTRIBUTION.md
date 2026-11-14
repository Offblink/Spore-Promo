# BGM 授权记录（Spore 宣传片 · 阶段6）

选中曲目：`public/audio/bgm/house-vibez.mp3`
（源文件：`data/skills/video-shotcraft/assets/audio/bgm/house-vibez.mp3`，原样拷贝，未剪辑、未变速、未转码。）

| 字段 | 值 |
|---|---|
| 原曲名 | House Vibez |
| 艺术家 | Lily J |
| 风格 | House（器乐，无人声标注） |
| BPM | ~123（librosa beat grid 最小二乘拟合，见技能库 `assets/audio/ATTRIBUTION.md`） |
| 时长 | 111.5s（ffmpeg 实测；本片 70.0s，取前 70s + 首尾淡入淡出） |
| 来源 | https://assets.mixkit.co/music/745/745.mp3 |
| 许可 | Mixkit Stock Music Free License — 免署名、可商用（随技能库 `assets/audio/ATTRIBUTION.md` 交付，使用前按其要求复核最新条款） |

## 选型理由（测量口径，未试听）

- **稳态**：全曲 1s 分段 RMS 落在 −10.4 ~ −16.9 dBFS（ffmpeg 解码实测），无大起大落；
  本片六段能量需求一致（无爆发段），平直能量曲线不会与字幕/SFX 抢动态。
- **无人声**：Mixkit 曲目元数据标注为器乐 House；**未试听**，此条依据是元数据而非听感。
- **loop / 首尾**：开头即进入（首 0.5s −12.2 dBFS，无长 intro），结尾自带淡出（末 0.5s −75.3 dBFS），
  本片只取前 70s，尾部淡出落在片尾 70s 之外，用 `<Audio>` 的 0–1s 淡入、68–70s 淡出补齐。
- **对比未选**：`bgm-tech-house`（288.7s，有 15s intro 爬升 + 明显分段，能量更"抢戏"）、
  `cat-walk` / `tonight-hiphop`（分段落差大，`tonight-hiphop` 峰值 −3.9 dBFS 过响）、
  `g-eazy-nba-type`（13s 极低电平 intro，起手对不上 S1 的 0 帧动作）。
- **BPM/相位**：见 `src/audio.ts` 顶部注释（BPM 123、第一拍相位实测值、逐边界残差）。
